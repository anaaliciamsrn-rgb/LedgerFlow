import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  companyFactory,
  brasilApiMock,
  TestContext,
  TENANT_A,
  TENANT_B,
} from './test-utils';

describe('Companies (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await seedTenants(ctx.prisma);
    brasilApiMock.reset();
  });

  const http = () => request(ctx.app.getHttpServer());

  describe('GET /api/companies', () => {
    it('returns the tenant companies wrapped in the paginated envelope', async () => {
      await ctx.prisma.company.createMany({
        data: [
          companyFactory(TENANT_A, { name: 'Alpha', cnpj: '11111111000111' }),
          companyFactory(TENANT_A, { name: 'Beta', cnpj: '22222222000122' }),
        ],
      });

      const response = await http().get('/api/companies').expect(200);

      expect(response.body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      });
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        name: expect.any(String),
        cnpj: expect.any(String),
        healthScore: expect.any(Number),
      });
      // Não deve vazar campos internos.
      expect(response.body.data[0].tenantId).toBeUndefined();
    });

    it('never returns companies from another tenant', async () => {
      await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { name: 'Secreta', cnpj: '33333333000133' }),
      });

      const response = await http().get('/api/companies').expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('filters by search across name, tradeName and cnpj', async () => {
      await ctx.prisma.company.createMany({
        data: [
          companyFactory(TENANT_A, { name: 'Padaria Central', cnpj: '44444444000144' }),
          companyFactory(TENANT_A, { name: 'Mercado Sul', cnpj: '55555555000155' }),
        ],
      });

      const response = await http()
        .get('/api/companies')
        .query({ search: 'padaria' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Padaria Central');
    });

    it('filters by porte', async () => {
      await ctx.prisma.company.createMany({
        data: [
          {
            ...companyFactory(TENANT_A, { cnpj: '20202020000120' }),
            porte: 'ME',
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '21212121000121' }),
            porte: 'EPP',
          },
        ],
      });

      const response = await http().get('/api/companies?porte=ME').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].porte).toBe('ME');
    });

    it('filters by situacao cadastral', async () => {
      await ctx.prisma.company.createMany({
        data: [
          {
            ...companyFactory(TENANT_A, { cnpj: '22222222000123' }),
            situacaoCadastral: 'ATIVA',
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '23232323000123' }),
            situacaoCadastral: 'BAIXADA',
          },
        ],
      });

      const response = await http()
        .get('/api/companies?situacao=BAIXADA')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].situacaoCadastral).toBe('BAIXADA');
    });

    it('never leaks another tenant company when filtering by porte', async () => {
      await ctx.prisma.company.createMany({
        data: [
          {
            ...companyFactory(TENANT_A, { cnpj: '24242424000124' }),
            porte: 'ME',
          },
          {
            ...companyFactory(TENANT_B, { cnpj: '25252525000125' }),
            porte: 'ME',
          },
        ],
      });

      const response = await http().get('/api/companies?porte=ME').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].cnpj).toBe('24242424000124');
    });
  });

  describe('POST /api/companies', () => {
    const validPayload = {
      name: 'Nova Empresa LTDA',
      tradeName: 'Nova',
      cnpj: '66666666000166',
      status: 'active',
      email: 'nova@empresa.com.br',
      phone: '1130000000',
      city: 'São Paulo',
      state: 'SP',
    };

    it('creates a company and returns it in the { data } envelope', async () => {
      const response = await http()
        .post('/api/companies')
        .send(validPayload)
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: 'Nova Empresa LTDA',
        cnpj: '66666666000166',
        status: 'active',
      });
      expect(response.body.data.id).toEqual(expect.any(String));

      const inDb = await ctx.prisma.company.findFirst({
        where: { tenantId: TENANT_A, cnpj: '66666666000166' },
      });
      expect(inDb).not.toBeNull();
    });

    it('records a company.created activity log for the acting user', async () => {
      const response = await http()
        .post('/api/companies')
        .send(validPayload)
        .expect(201);

      const logs = await ctx.prisma.activityLog.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        action: 'company.created',
        entityType: 'company',
        entityId: response.body.data.id,
        actorId: 'usr_test',
      });
    });

    it('rejects a duplicate CNPJ within the tenant with 409', async () => {
      await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '66666666000166' }),
      });

      await http().post('/api/companies').send(validPayload).expect(409);
    });

    it('rejects an invalid payload with 422 and field-level details', async () => {
      const response = await http()
        .post('/api/companies')
        .send({ ...validPayload, cnpj: '123', email: 'invalido' })
        .expect(422);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details.cnpj).toBeDefined();
      expect(response.body.details.email).toBeDefined();
    });

    it('persists the official fields and the shareholder structure (QSA) coming from BrasilAPI', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: {
          cnpj: '33000167000101',
          razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
          nome_fantasia: 'PETROBRAS',
          descricao_situacao_cadastral: 'ATIVA',
          cnae_fiscal: 1921700,
          cnae_fiscal_descricao: 'Refino de petróleo',
          porte: 'DEMAIS',
          natureza_juridica: 'Sociedade Anônima Aberta',
          data_inicio_atividade: '1953-10-03',
          logradouro: 'REPUBLICA DO CHILE',
          numero: '65',
          bairro: 'CENTRO',
          cep: '20031912',
          municipio: 'RIO DE JANEIRO',
          uf: 'RJ',
          qsa: [
            { nome_socio: 'FULANO', qualificacao_socio: 'Diretor' },
            { nome_socio: 'CICLANA', qualificacao_socio: 'Sócia', faixa_etaria: '31 a 40 anos' },
          ],
        },
      };

      const response = await http()
        .post('/api/companies')
        .send({
          name: 'PETROLEO BRASILEIRO S A PETROBRAS',
          tradeName: 'PETROBRAS',
          cnpj: '33000167000101',
          email: 'contato@petrobras.com.br',
          phone: '2132242000',
          city: 'Rio de Janeiro',
          state: 'RJ',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        situacaoCadastral: 'ATIVA',
        cnaeCodigo: '1921700',
        cnaeDescricao: 'Refino de petróleo',
        porte: 'DEMAIS',
        naturezaJuridica: 'Sociedade Anônima Aberta',
        logradouro: 'REPUBLICA DO CHILE',
        numero: '65',
        bairro: 'CENTRO',
        cep: '20031912',
      });
      expect(response.body.data.dataAbertura).toContain('1953-10-03');
      expect(response.body.data.partners).toHaveLength(2);
      expect(response.body.data.partners[0]).toMatchObject({
        nome: 'FULANO',
        qualificacao: 'Diretor',
        faixaEtaria: null,
      });
      expect(response.body.data.partners[1]).toMatchObject({
        nome: 'CICLANA',
        qualificacao: 'Sócia',
        faixaEtaria: '31 a 40 anos',
      });

      const inDb = await ctx.prisma.company.findFirst({
        where: { tenantId: TENANT_A, cnpj: '33000167000101' },
        include: { partners: true },
      });
      expect(inDb?.cnaeCodigo).toBe('1921700');
      expect(inDb?.partners).toHaveLength(2);
    });
  });

  describe('GET /api/companies/:id', () => {
    it('returns a single company in the { data } envelope', async () => {
      const created = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '77777777000177' }),
      });

      const response = await http()
        .get(`/api/companies/${created.id}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: created.id,
        cnpj: '77777777000177',
      });
      expect(response.body.data.tenantId).toBeUndefined();
    });

    it('returns 404 for an unknown id', async () => {
      await http().get('/api/companies/cmp_inexistente').expect(404);
    });

    it('returns 404 when the company belongs to another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '88888888000188' }),
      });

      await http().get(`/api/companies/${other.id}`).expect(404);
    });
  });

  describe('PATCH /api/companies/:id', () => {
    it('updates fields and records a company.updated activity log', async () => {
      const created = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '99999999000199', status: 'pending' }),
      });

      const response = await http()
        .patch(`/api/companies/${created.id}`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.data.status).toBe('active');

      const logs = await ctx.prisma.activityLog.findMany({
        where: { action: 'company.updated' },
      });
      expect(logs).toHaveLength(1);
    });

    it('returns 404 when updating another tenant company', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '10101010000110' }),
      });

      await http()
        .patch(`/api/companies/${other.id}`)
        .send({ status: 'active' })
        .expect(404);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('deletes the company and records a company.deleted activity log', async () => {
      const created = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '12121212000112' }),
      });

      await http().delete(`/api/companies/${created.id}`).expect(200);

      const inDb = await ctx.prisma.company.findUnique({
        where: { id: created.id },
      });
      expect(inDb).toBeNull();

      const logs = await ctx.prisma.activityLog.findMany({
        where: { action: 'company.deleted' },
      });
      expect(logs).toHaveLength(1);
    });

    it('returns 404 when deleting another tenant company', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '13131313000113' }),
      });

      await http().delete(`/api/companies/${other.id}`).expect(404);
    });
  });

  describe('BrasilAPI integration', () => {
    const RAW_ATIVA = {
      cnpj: '14141414000114',
      razao_social: 'Comércio Ativo LTDA',
      nome_fantasia: 'Ativo',
      municipio: 'Curitiba',
      uf: 'PR',
      descricao_situacao_cadastral: 'ATIVA',
    };

    it('GET /companies/lookup/:cnpj returns normalized data when found', async () => {
      brasilApiMock.respondWith = { status: 200, body: RAW_ATIVA };

      const response = await http()
        .get('/api/companies/lookup/14141414000114')
        .expect(200);

      expect(response.body.data).toMatchObject({
        razaoSocial: 'Comércio Ativo LTDA',
        municipio: 'Curitiba',
        uf: 'PR',
        situacao: 'ATIVA',
      });
    });

    it('GET /companies/lookup/:cnpj returns null data when not found', async () => {
      // brasilApiMock default -> 404
      const response = await http()
        .get('/api/companies/lookup/00000000000000')
        .expect(200);

      expect(response.body.data).toBeNull();
    });

    it('enriches status/healthScore from BrasilAPI when status is left as default', async () => {
      brasilApiMock.respondWith = { status: 200, body: RAW_ATIVA };

      const response = await http()
        .post('/api/companies')
        .send({
          name: 'Comércio Ativo LTDA',
          tradeName: 'Ativo',
          cnpj: '14141414000114',
          email: 'ativo@empresa.com.br',
          phone: '4133334444',
          city: 'Curitiba',
          state: 'PR',
          // status omitido -> default 'pending' -> dispara enriquecimento
        })
        .expect(201);

      expect(response.body.data.status).toBe('active');
      expect(response.body.data.healthScore).toBe(90);
    });

    it('still creates the company when BrasilAPI is unavailable (resilient)', async () => {
      brasilApiMock.fail = true;

      const response = await http()
        .post('/api/companies')
        .send({
          name: 'Empresa Sem Rede LTDA',
          tradeName: 'SemRede',
          cnpj: '15151515000115',
          email: 'semrede@empresa.com.br',
          phone: '4133334444',
          city: 'Curitiba',
          state: 'PR',
        })
        .expect(201);

      expect(response.body.data.status).toBe('pending');
    });
  });
});
