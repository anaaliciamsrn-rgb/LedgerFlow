import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  brasilApiMock,
  TestContext,
  TENANT_A,
  TENANT_B,
} from './test-utils';

describe('Activity feed (e2e)', () => {
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

  describe('GET /api/activity', () => {
    it('lists tenant activity newest-first with parsed metadata', async () => {
      await ctx.prisma.activityLog.create({
        data: {
          tenantId: TENANT_A,
          actorId: 'usr_test',
          action: 'company.created',
          entityType: 'company',
          entityId: 'c1',
          metadata: JSON.stringify({ situacao: 'ATIVA' }),
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
      });
      await ctx.prisma.activityLog.create({
        data: {
          tenantId: TENANT_A,
          actorId: 'usr_test',
          action: 'company.updated',
          entityType: 'company',
          entityId: 'c1',
          createdAt: new Date('2026-01-01T11:00:00Z'),
        },
      });

      const response = await http().get('/api/activity').expect(200);

      expect(response.body.pagination.total).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].action).toBe('company.updated');
      expect(response.body.data[1].metadata).toEqual({ situacao: 'ATIVA' });
      expect(response.body.data[0].metadata).toBeNull();
    });

    it('never lists activity from another tenant', async () => {
      await ctx.prisma.activityLog.create({
        data: {
          tenantId: TENANT_B,
          actorId: 'x',
          action: 'company.created',
          entityType: 'company',
          entityId: 'z',
        },
      });

      const response = await http().get('/api/activity').expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('filters by entityType', async () => {
      await ctx.prisma.activityLog.createMany({
        data: [
          {
            tenantId: TENANT_A,
            actorId: 'u',
            action: 'company.created',
            entityType: 'company',
            entityId: 'c1',
          },
          {
            tenantId: TENANT_A,
            actorId: 'u',
            action: 'obligation.created',
            entityType: 'obligation',
            entityId: 'o1',
          },
        ],
      });

      const response = await http()
        .get('/api/activity')
        .query({ entityType: 'obligation' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].entityType).toBe('obligation');
    });
  });
});
