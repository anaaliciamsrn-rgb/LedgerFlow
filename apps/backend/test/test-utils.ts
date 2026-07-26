import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Limpa todas as tabelas mutáveis entre os testes. */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.activityLog.deleteMany();
  await prisma.company.deleteMany();
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
