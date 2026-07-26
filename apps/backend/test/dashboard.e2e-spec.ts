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

describe('Dashboard (e2e)', () => {
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

    await ctx.prisma.company.createMany({
      data: [
        companyFactory(TENANT_A, { cnpj: '11111111000111', status: 'active', healthScore: 90 }),
        companyFactory(TENANT_A, { cnpj: '22222222000122', status: 'active', healthScore: 60 }),
        companyFactory(TENANT_A, { cnpj: '33333333000133', status: 'pending', healthScore: 30 }),
        // Outro tenant — deve ser ignorado em todas as agregações.
        companyFactory(TENANT_B, { cnpj: '44444444000144', status: 'active', healthScore: 100 }),
      ],
    });
  });

  const http = () => request(ctx.app.getHttpServer());

  describe('GET /api/dashboard/overview', () => {
    it('aggregates company counts and average health for the tenant only', async () => {
      const response = await http().get('/api/dashboard/overview').expect(200);

      expect(response.body.data.companies).toEqual({
        total: 3,
        active: 2,
        inactive: 0,
        pending: 1,
      });
      expect(response.body.data.averageHealthScore).toBe(60);
    });
  });

  describe('GET /api/dashboard/health-score', () => {
    it('returns the average and the health distribution buckets', async () => {
      const response = await http()
        .get('/api/dashboard/health-score')
        .expect(200);

      expect(response.body.data.average).toBe(60);
      expect(response.body.data.distribution).toEqual({
        healthy: 1,
        attention: 1,
        critical: 1,
      });
    });
  });
});
