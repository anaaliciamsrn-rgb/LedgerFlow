import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import type { PrismaService } from '../src/prisma/prisma.service';

/**
 * Este arquivo sobe a aplicação em `AUTH_MODE=jwt` — os demais e2e usam
 * `stub`. Sem isso o modo que vai para produção nunca seria exercitado, que é
 * exatamente como uma falha de autenticação chega ao ar.
 *
 * Os módulos da aplicação são importados **dentro** do `beforeAll`, depois de
 * `process.env` estar ajustado: `ConfigModule.forRoot({ validate })` lê o
 * ambiente no momento em que o módulo é importado, e um `import` no topo do
 * arquivo aconteceria antes de qualquer atribuição aqui. Em produção isso não
 * é problema — o ambiente existe antes do processo subir.
 */
const JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-ok';

const SENHA = 'senha-correta-123';
const TENANT_A = 'tnt_test';
const TENANT_B = 'tnt_other';

describe('Auth (e2e, AUTH_MODE=jwt)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let hashPassword: (plain: string) => Promise<string>;
  let cleanDatabase: (prisma: PrismaService) => Promise<void>;
  let seedTenants: (prisma: PrismaService) => Promise<void>;

  beforeAll(async () => {
    process.env.AUTH_MODE = 'jwt';
    process.env.JWT_SECRET = JWT_SECRET;
    jest.resetModules();

    const { AppModule } = await import('../src/app.module');
    const { ResponseInterceptor } = await import(
      '../src/common/interceptors/response.interceptor'
    );
    const { HttpExceptionFilter } = await import(
      '../src/common/filters/http-exception.filter'
    );
    const { HTTP_FETCHER } = await import('../src/brasil-api/http-fetcher');
    const { PrismaService: PrismaToken } = await import(
      '../src/prisma/prisma.service'
    );
    ({ hashPassword } = await import('../src/auth/password'));
    ({ cleanDatabase, seedTenants } = await import('./test-utils'));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HTTP_FETCHER)
      .useValue(async () => ({ ok: false, status: 404, json: async () => ({}) }))
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaToken);
  });

  afterAll(async () => {
    await app.close();
    process.env.AUTH_MODE = 'stub';
    delete process.env.JWT_SECRET;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await seedTenants(prisma);
    await prisma.user.create({
      data: {
        tenantId: TENANT_A,
        name: 'Ana Administradora',
        email: 'ana@escritorioa.com.br',
        passwordHash: await hashPassword(SENHA),
        role: 'owner',
      },
    });
  });

  const http = () => request(app.getHttpServer());

  /** Extrai o cookie de sessão da resposta do login. */
  const cookieDe = (response: request.Response): string => {
    const bruto = response.headers['set-cookie'];
    const lista = Array.isArray(bruto) ? bruto : [bruto];
    const sessao = lista.find((c) => c?.startsWith('lf_session='));
    if (!sessao) {
      throw new Error('login não devolveu o cookie de sessão');
    }
    return sessao.split(';')[0]!;
  };

  describe('POST /api/auth/login', () => {
    it('autentica e devolve a sessão num cookie httpOnly', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      expect(response.body.data.user).toMatchObject({
        name: 'Ana Administradora',
        email: 'ana@escritorioa.com.br',
        role: 'owner',
      });

      const cookie = (response.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain('lf_session=');
      expect(cookie).toContain('HttpOnly');
    });

    it('nunca devolve o token no corpo da resposta', async () => {
      // Token no JSON permitiria ao JavaScript da página guardá-lo, e aí o
      // httpOnly do cookie não protegeria coisa alguma.
      const response = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    });

    it('nunca devolve o hash da senha', async () => {
      const response = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('$2b$');
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('recusa senha errada', async () => {
      await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: 'errada' })
        .expect(401);
    });

    it('usa a mesma mensagem para e-mail inexistente e senha errada', async () => {
      // Mensagens diferentes entregariam de graça quem tem conta no sistema.
      const inexistente = await http()
        .post('/api/auth/login')
        .send({ email: 'ninguem@lugar.nenhum', password: SENHA })
        .expect(401);

      const senhaErrada = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: 'errada' })
        .expect(401);

      expect(inexistente.body.message).toBe(senhaErrada.body.message);
    });

    it('recusa usuário desativado', async () => {
      await prisma.user.update({
        where: { email: 'ana@escritorioa.com.br' },
        data: { active: false },
      });

      await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(401);
    });
  });

  describe('rotas protegidas', () => {
    it('recusa acesso sem cookie', async () => {
      await http().get('/api/companies').expect(401);
      await http().get('/api/calendar/obligations').expect(401);
      await http().get('/api/auth/session').expect(401);
    });

    it('recusa token adulterado', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      const adulterado = `${cookieDe(login).slice(0, -3)}xyz`;
      await http().get('/api/companies').set('Cookie', adulterado).expect(401);
    });

    it('ignora o header x-tenant-id quando em modo jwt', async () => {
      // A brecha do modo stub: em jwt, o tenant vem do token assinado e
      // nenhum header muda isso.
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      await prisma.company.create({
        data: {
          tenantId: TENANT_B,
          name: 'Empresa do outro escritório',
          tradeName: 'Outro',
          cnpj: '33000167000101',
          status: 'active',
          email: 'x@y.com.br',
          phone: '1130000000',
          city: 'São Paulo',
          state: 'SP',
          healthScore: 100,
        },
      });

      const response = await http()
        .get('/api/companies')
        .set('Cookie', cookieDe(login))
        .set('x-tenant-id', TENANT_B)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('devolve a sessão com o cookie válido', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      const response = await http()
        .get('/api/auth/session')
        .set('Cookie', cookieDe(login))
        .expect(200);

      expect(response.body.data.user.email).toBe('ana@escritorioa.com.br');
      expect(response.body.data.tenant.id).toBe(TENANT_A);
    });

    it('recusa sessão de usuário desativado depois do login', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@escritorioa.com.br', password: SENHA })
        .expect(200);

      await prisma.user.update({
        where: { email: 'ana@escritorioa.com.br' },
        data: { active: false },
      });

      await http()
        .get('/api/auth/session')
        .set('Cookie', cookieDe(login))
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('apaga o cookie e funciona mesmo sem sessão válida', async () => {
      const response = await http().post('/api/auth/logout').expect(204);

      const cookie = (response.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain('lf_session=;');
    });
  });
});
