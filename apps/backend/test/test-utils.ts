import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { HTTP_FETCHER } from '../src/brasil-api/http-fetcher';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * Fetcher fake programável para a BrasilAPI — evita rede real nos testes.
 * Defina `brasilApiMock.respondWith` antes de exercitar o endpoint;
 * `null` (default) simula CNPJ não encontrado (404).
 */
export const brasilApiMock: {
  respondWith: { status: number; body: unknown } | null;
  fail: boolean;
  reset(): void;
} = {
  respondWith: null,
  fail: false,
  reset() {
    this.respondWith = null;
    this.fail = false;
  },
};

const fakeFetcher = async (): Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}> => {
  if (brasilApiMock.fail) {
    throw new Error('BrasilAPI indisponível (simulado)');
  }
  const r = brasilApiMock.respondWith ?? { status: 404, body: {} };
  return {
    ok: r.status >= 200 && r.status < 300,
    status: r.status,
    json: async () => r.body,
  };
};

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(HTTP_FETCHER)
    .useValue(fakeFetcher)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Limpa todas as tabelas mutáveis entre os testes (ordem de FK). */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.auditFinding.deleteMany();
  await prisma.auditRun.deleteMany();
  await prisma.obligation.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export const TENANT_A = 'tnt_test';
export const TENANT_B = 'tnt_other';

export async function seedTenants(prisma: PrismaService): Promise<void> {
  await prisma.tenant.createMany({
    data: [
      { id: TENANT_A, name: 'Escritório A', slug: 'escritorio-a' },
      { id: TENANT_B, name: 'Escritório B', slug: 'escritorio-b' },
    ],
  });
}

export function collaboratorFactory(
  tenantId: string,
  overrides: Partial<{ name: string; color: string; active: boolean }> = {},
) {
  return {
    tenantId,
    name: overrides.name ?? 'Ana Souza',
    color: overrides.color ?? 'blue',
    active: overrides.active ?? true,
  };
}

export function companyFactory(
  tenantId: string,
  overrides: Partial<{
    name: string;
    tradeName: string;
    cnpj: string;
    status: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    healthScore: number;
  }> = {},
) {
  return {
    tenantId,
    name: overrides.name ?? 'Empresa Exemplo LTDA',
    tradeName: overrides.tradeName ?? 'Exemplo',
    cnpj: overrides.cnpj ?? '11222333000181',
    status: overrides.status ?? 'active',
    email: overrides.email ?? 'contato@exemplo.com.br',
    phone: overrides.phone ?? '1133334444',
    city: overrides.city ?? 'São Paulo',
    state: overrides.state ?? 'SP',
    healthScore: overrides.healthScore ?? 90,
  };
}
