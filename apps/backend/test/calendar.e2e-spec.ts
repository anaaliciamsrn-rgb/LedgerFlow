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

describe('Calendar (e2e)', () => {
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

  describe('GET /api/calendar/obligations', () => {
    it('lists tenant obligations in the date range ordered by dueDate, flagging overdue', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          {
            tenantId: TENANT_A,
            title: 'DAS Janeiro',
            type: 'DAS',
            dueDate: new Date('2026-01-20T00:00:00Z'),
            status: 'pending',
          },
          {
            tenantId: TENANT_A,
            title: 'DCTF Fevereiro',
            type: 'DCTF',
            dueDate: new Date('2026-02-15T00:00:00Z'),
            status: 'pending',
          },
          {
            tenantId: TENANT_A,
            title: 'Fora do intervalo',
            type: 'DAS',
            dueDate: new Date('2026-05-20T00:00:00Z'),
            status: 'pending',
          },
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-01-01', to: '2026-03-01' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('DAS Janeiro');
      expect(response.body.data[1].title).toBe('DCTF Fevereiro');
      // Vencidas (dueDate no passado e pending) marcadas como overdue.
      expect(response.body.data[0].overdue).toBe(true);
    });

    it('never lists obligations from another tenant', async () => {
      await ctx.prisma.obligation.create({
        data: {
          tenantId: TENANT_B,
          title: 'Segredo',
          type: 'DAS',
          dueDate: new Date('2026-02-10T00:00:00Z'),
          status: 'pending',
        },
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-01-01', to: '2026-03-01' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /api/calendar/obligations', () => {
    it('creates an obligation and returns it', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'GFIP Março',
          type: 'GFIP',
          dueDate: '2026-03-07',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: 'GFIP Março',
        type: 'GFIP',
        status: 'pending',
      });

      const inDb = await ctx.prisma.obligation.findMany({
        where: { tenantId: TENANT_A },
      });
      expect(inDb).toHaveLength(1);
    });

    it('rejects an invalid payload with 422', async () => {
      await http()
        .post('/api/calendar/obligations')
        .send({ title: '', type: 'DAS', dueDate: 'not-a-date' })
        .expect(422);
    });
  });

  describe('PATCH /api/calendar/obligations/:id', () => {
    it('marks an obligation as completed', async () => {
      const created = await ctx.prisma.obligation.create({
        data: {
          tenantId: TENANT_A,
          title: 'DAS Abril',
          type: 'DAS',
          dueDate: new Date('2026-04-20T00:00:00Z'),
          status: 'pending',
        },
      });

      const response = await http()
        .patch(`/api/calendar/obligations/${created.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.overdue).toBe(false);
    });

    it('returns 404 when updating another tenant obligation', async () => {
      const other = await ctx.prisma.obligation.create({
        data: {
          tenantId: TENANT_B,
          title: 'Outra',
          type: 'DAS',
          dueDate: new Date('2026-04-20T00:00:00Z'),
          status: 'pending',
        },
      });

      await http()
        .patch(`/api/calendar/obligations/${other.id}`)
        .send({ status: 'completed' })
        .expect(404);
    });
  });
});
