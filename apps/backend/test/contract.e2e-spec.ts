import request from 'supertest';
import { z } from 'zod';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  companyFactory,
  brasilApiMock,
  TestContext,
  TENANT_A,
} from './test-utils';

// ── Espelho EXATO dos contratos que o frontend consome ──
// (apps/frontend: company.schema.ts + api.types.ts). Se o backend divergir
// desta forma, estes testes quebram — barrando o drift entre as frentes.

const companyContract = z.object({
  id: z.string(),
  name: z.string(),
  tradeName: z.string(),
  cnpj: z.string(),
  status: z.enum(['active', 'inactive', 'pending']),
  email: z.string().email(),
  phone: z.string(),
  city: z.string(),
  state: z.string(),
  healthScore: z.number().min(0).max(100),
  createdAt: z.string(),
});

const paginationContract = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const paginatedCompanies = z.object({
  data: z.array(companyContract),
  pagination: paginationContract,
});

const singleCompany = z.object({
  data: companyContract,
  message: z.string().optional(),
});

const errorContract = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number(),
  details: z.record(z.array(z.string())).optional(),
});

describe('API contract (e2e)', () => {
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

  it('GET /companies matches the frontend PaginatedResponse<Company> contract', async () => {
    await ctx.prisma.company.create({
      data: companyFactory(TENANT_A, { cnpj: '11222333000181' }),
    });

    const response = await http().get('/api/companies').expect(200);

    expect(() => paginatedCompanies.parse(response.body)).not.toThrow();
  });

  it('GET /companies/:id matches the frontend ApiResponse<Company> contract', async () => {
    const created = await ctx.prisma.company.create({
      data: companyFactory(TENANT_A, { cnpj: '22222222000122' }),
    });

    const response = await http()
      .get(`/api/companies/${created.id}`)
      .expect(200);

    expect(() => singleCompany.parse(response.body)).not.toThrow();
  });

  it('POST /companies matches the frontend ApiResponse<Company> contract', async () => {
    brasilApiMock.reset();
    const response = await http()
      .post('/api/companies')
      .send({
        name: 'Contrato LTDA',
        tradeName: 'Contrato',
        cnpj: '33333333000133',
        status: 'active',
        email: 'contrato@empresa.com.br',
        phone: '1133334444',
        city: 'São Paulo',
        state: 'SP',
      })
      .expect(201);

    expect(() => singleCompany.parse(response.body)).not.toThrow();
  });

  it('validation errors match the frontend ApiError contract (code/message/status/details)', async () => {
    const response = await http()
      .post('/api/companies')
      .send({ cnpj: '123', email: 'x' })
      .expect(422);

    const parsed = errorContract.parse(response.body);
    expect(parsed.code).toBe('VALIDATION_ERROR');
    expect(parsed.details).toBeDefined();
  });

  it('not-found errors match the frontend ApiError contract', async () => {
    const response = await http()
      .get('/api/companies/inexistente')
      .expect(404);

    expect(() => errorContract.parse(response.body)).not.toThrow();
  });
});
