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
    it('creates an obligation and returns it as an array', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'GFIP Março',
          type: 'GFIP',
          dueDate: '2026-03-07',
          assignee: 'Ana Souza',
        })
        .expect(201);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'GFIP Março',
        type: 'GFIP',
        status: 'pending',
        assignee: 'Ana Souza',
        recurrenceGroupId: null,
        holidayConflict: null,
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

  describe('recorrência, responsável e feriados', () => {
    it('materializa 3 ocorrências mensais com o mesmo grupo', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Fechamento da folha',
          type: 'FOLHA',
          dueDate: '2026-03-05',
          assignee: 'Ana Souza',
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      expect(response.body.data).toHaveLength(3);
      const grupos = new Set(
        response.body.data.map((o: { recurrenceGroupId: string }) => o.recurrenceGroupId),
      );
      expect(grupos.size).toBe(1);
      expect(response.body.data[0].assignee).toBe('Ana Souza');
    });

    it('sinaliza vencimento que cai em feriado nacional', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [{ date: '2026-04-21', name: 'Tiradentes' }],
      };

      await http()
        .post('/api/calendar/obligations')
        .send({ title: 'Envio de guias', type: 'DAS', dueDate: '2026-04-21', assignee: 'Bruno Lima' })
        .expect(201);

      const list = await http()
        .get('/api/calendar/obligations?from=2026-04-01&to=2026-04-30')
        .expect(200);

      expect(list.body.data[0].holidayConflict).toBe('Tiradentes');
    });

    it('devolve holidayConflict nulo em todas as tarefas quando a BrasilAPI falha', async () => {
      brasilApiMock.fail = true;

      await ctx.prisma.obligation.create({
        data: {
          tenantId: TENANT_A,
          title: 'Conferência mensal',
          type: 'CONFERENCIA',
          dueDate: new Date('2026-06-10T00:00:00Z'),
          status: 'pending',
          assignee: 'Carla Dias',
        },
      });

      const response = await http()
        .get('/api/calendar/obligations?from=2026-06-01&to=2026-06-30')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].holidayConflict).toBeNull();
    });

    it('filtra por responsável', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          {
            tenantId: TENANT_A,
            title: 'A',
            type: 'X',
            dueDate: new Date('2026-05-10'),
            assignee: 'Ana Souza',
          },
          {
            tenantId: TENANT_A,
            title: 'B',
            type: 'X',
            dueDate: new Date('2026-05-11'),
            assignee: 'Bruno Lima',
          },
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations?assignee=Ana%20Souza')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].assignee).toBe('Ana Souza');
    });

    it('nunca lista ou materializa ocorrências de outro tenant', async () => {
      // Recorrência criada pelo tenant autenticado (TENANT_A via stub).
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Fechamento da folha (A)',
          type: 'FOLHA',
          dueDate: '2026-07-05',
          assignee: 'Ana Souza',
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      const recurrenceGroupId = response.body.data[0].recurrenceGroupId as string;
      expect(response.body.data).toHaveLength(3);

      // As linhas materializadas pertencem só ao TENANT_A, nunca ao TENANT_B.
      const otherTenantCount = await ctx.prisma.obligation.count({
        where: { tenantId: TENANT_B, recurrenceGroupId },
      });
      expect(otherTenantCount).toBe(0);

      // Uma obrigação avulsa do TENANT_B no mesmo intervalo não pode vazar
      // para a listagem do TENANT_A.
      await ctx.prisma.obligation.create({
        data: {
          tenantId: TENANT_B,
          title: 'Segredo do outro escritório',
          type: 'FOLHA',
          dueDate: new Date('2026-07-05T00:00:00Z'),
          assignee: 'Alguém',
        },
      });

      const list = await http()
        .get('/api/calendar/obligations?from=2026-07-01&to=2026-09-30')
        .expect(200);

      expect(list.body.data).toHaveLength(3);
      expect(
        list.body.data.every((o: { recurrenceGroupId: string | null }) => o.recurrenceGroupId === recurrenceGroupId),
      ).toBe(true);
      expect(
        list.body.data.some((o: { title: string }) => o.title === 'Segredo do outro escritório'),
      ).toBe(false);
    });
  });
});
