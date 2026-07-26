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

describe('Audit (e2e)', () => {
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

  describe('POST /api/audit/companies/:companyId', () => {
    it('runs an audit, returns findings and updates the company healthScore', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '11222333000181', healthScore: 50 }),
      });

      const response = await http()
        .post(`/api/audit/companies/${company.id}`)
        .expect(201);

      expect(response.body.data.score).toBe(100);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.findings).toHaveLength(5);

      const reloaded = await ctx.prisma.company.findUnique({
        where: { id: company.id },
      });
      expect(reloaded?.healthScore).toBe(100);

      const logs = await ctx.prisma.activityLog.findMany({
        where: { action: 'audit.completed' },
      });
      expect(logs).toHaveLength(1);
    });

    it('returns 404 when auditing a company from another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '22222222000122' }),
      });

      await http().post(`/api/audit/companies/${other.id}`).expect(404);
    });
  });

  describe('GET /api/audit', () => {
    it('lists the tenant audit runs in the paginated envelope', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '33333333000133' }),
      });
      await http().post(`/api/audit/companies/${company.id}`).expect(201);
      await http().post(`/api/audit/companies/${company.id}`).expect(201);

      const response = await http().get('/api/audit').expect(200);

      expect(response.body.pagination.total).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        companyId: company.id,
        score: expect.any(Number),
        findingsCount: 5,
      });
    });

    it('never lists audit runs from another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '44444444000144' }),
      });
      await ctx.prisma.auditRun.create({
        data: {
          tenantId: TENANT_B,
          companyId: other.id,
          score: 80,
          status: 'healthy',
        },
      });

      const response = await http().get('/api/audit').expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/audit/:id', () => {
    it('returns an audit run with its findings', async () => {
      const company = await ctx.prisma.company.create({
        data: companyFactory(TENANT_A, { cnpj: '55555555000155' }),
      });
      const created = await http()
        .post(`/api/audit/companies/${company.id}`)
        .expect(201);
      const runId = created.body.data.id;

      const response = await http().get(`/api/audit/${runId}`).expect(200);

      expect(response.body.data.id).toBe(runId);
      expect(response.body.data.findings).toHaveLength(5);
    });

    it('returns 404 for a run from another tenant', async () => {
      const other = await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '66666666000166' }),
      });
      const run = await ctx.prisma.auditRun.create({
        data: {
          tenantId: TENANT_B,
          companyId: other.id,
          score: 80,
          status: 'healthy',
        },
      });

      await http().get(`/api/audit/${run.id}`).expect(404);
    });
  });
});
