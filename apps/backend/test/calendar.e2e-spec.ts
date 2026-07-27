import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  collaboratorFactory,
  brasilApiMock,
  TestContext,
  TENANT_A,
  TENANT_B,
} from './test-utils';

describe('Calendar (e2e)', () => {
  let ctx: TestContext;
  let ana: { id: string };
  let bruno: { id: string };
  let externo: { id: string };

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

    ana = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_A, { name: 'Ana Souza', color: 'blue' }),
    });
    bruno = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_A, { name: 'Bruno Lima', color: 'violet' }),
    });
    externo = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_B, {
        name: 'De outro escritório',
        color: 'lime',
      }),
    });
  });

  const http = () => request(ctx.app.getHttpServer());

  const tarefa = (overrides: Record<string, unknown> = {}) => ({
    tenantId: TENANT_A,
    title: 'Tarefa',
    type: 'GUIAS',
    dueDate: new Date('2026-02-15T00:00:00Z'),
    status: 'pending',
    collaboratorId: ana.id,
    ...overrides,
  });

  describe('GET /api/calendar/obligations', () => {
    it('lista o intervalo ordenado por vencimento, com o responsável embutido', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          tarefa({
            title: 'Guias Janeiro',
            dueDate: new Date('2026-01-20T00:00:00Z'),
          }),
          tarefa({
            title: 'Folha Fevereiro',
            type: 'FOLHA',
            dueDate: new Date('2026-02-15T00:00:00Z'),
          }),
          tarefa({
            title: 'Fora do intervalo',
            dueDate: new Date('2026-05-20T00:00:00Z'),
          }),
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-01-01', to: '2026-03-01' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Guias Janeiro');
      expect(response.body.data[0].overdue).toBe(true);
      expect(response.body.data[0].collaborator).toMatchObject({
        id: ana.id,
        name: 'Ana Souza',
        color: 'blue',
      });
    });

    it('devolve a empresa vinculada, quando houver', async () => {
      const empresa = await ctx.prisma.company.create({
        data: {
          tenantId: TENANT_A,
          name: 'Padaria do João LTDA',
          tradeName: 'Padaria do João',
          cnpj: '11222333000181',
          status: 'active',
          email: 'contato@padaria.com.br',
          phone: '1133334444',
          city: 'São Paulo',
          state: 'SP',
          healthScore: 90,
        },
      });
      await ctx.prisma.obligation.create({
        data: tarefa({ companyId: empresa.id }),
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-02-01', to: '2026-02-28' })
        .expect(200);

      expect(response.body.data[0].company).toMatchObject({
        id: empresa.id,
        name: 'Padaria do João LTDA',
      });
    });

    it('filtra por responsável', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          tarefa({ title: 'Da Ana' }),
          tarefa({ title: 'Do Bruno', collaboratorId: bruno.id }),
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ collaboratorId: bruno.id })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Do Bruno');
    });

    it('nunca lista obrigações de outro tenant', async () => {
      await ctx.prisma.obligation.create({
        data: tarefa({
          tenantId: TENANT_B,
          collaboratorId: externo.id,
          title: 'Segredo',
        }),
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-01-01', to: '2026-03-01' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('overdueOnly', () => {
    it('devolve as pendentes vencidas ignorando from/to', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          tarefa({
            title: 'Vencida antiga',
            dueDate: new Date('2020-03-10T00:00:00Z'),
          }),
          tarefa({
            title: 'Vencida recente',
            dueDate: new Date('2021-03-10T00:00:00Z'),
          }),
          tarefa({
            title: 'Vencida mas concluída',
            dueDate: new Date('2020-04-10T00:00:00Z'),
            status: 'completed',
          }),
          tarefa({
            title: 'Futura',
            dueDate: new Date('2090-01-10T00:00:00Z'),
          }),
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ overdueOnly: 'true', from: '2026-01-01', to: '2026-01-31' })
        .expect(200);

      expect(response.body.data.map((o: { title: string }) => o.title)).toEqual([
        'Vencida antiga',
        'Vencida recente',
      ]);
    });
  });

  describe('POST /api/calendar/obligations', () => {
    it('cria uma tarefa avulsa', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Emissão de guias',
          type: 'GUIAS',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(201);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'Emissão de guias',
        type: 'GUIAS',
        customType: null,
        status: 'pending',
        recurrence: 'none',
        recurrenceGroupId: null,
        holidayConflict: null,
      });
    });

    it('materializa 3 ocorrências mensais no mesmo grupo', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Fechamento da folha',
          type: 'FOLHA',
          dueDate: '2026-03-05',
          collaboratorId: ana.id,
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      expect(response.body.data).toHaveLength(3);
      const grupos = new Set(
        response.body.data.map(
          (o: { recurrenceGroupId: string }) => o.recurrenceGroupId,
        ),
      );
      expect(grupos.size).toBe(1);
      expect(response.body.data[0].recurrence).toBe('monthly');
    });

    it('exige descrição quando o tipo é OUTRO', async () => {
      await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'X',
          type: 'OUTRO',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(422);
    });

    it('aceita OUTRO com descrição e rejeita descrição em tipo conhecido', async () => {
      const ok = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Baixa de protocolo',
          type: 'OUTRO',
          customType: 'Baixa de protocolo na junta',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(201);
      expect(ok.body.data[0].customType).toBe('Baixa de protocolo na junta');

      await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Folha',
          type: 'FOLHA',
          customType: 'não deveria existir',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(422);
    });

    it('devolve 404 quando o responsável é de outro escritório', async () => {
      await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Tentativa',
          type: 'FOLHA',
          dueDate: '2026-03-07',
          collaboratorId: externo.id,
        })
        .expect(404);
    });

    it('sinaliza vencimento que cai em feriado nacional', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [{ date: '2027-04-21', name: 'Tiradentes' }],
      };

      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Envio de guias',
          type: 'GUIAS',
          dueDate: '2027-04-21',
          collaboratorId: bruno.id,
        })
        .expect(201);

      expect(response.body.data[0].holidayConflict).toBe('Tiradentes');
    });
  });

  describe('PATCH /api/calendar/obligations/:id', () => {
    it('marca como concluída sem afetar as irmãs do mesmo grupo', async () => {
      const criadas = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Conferência mensal',
          type: 'CONFERENCIA',
          dueDate: '2026-03-10',
          collaboratorId: ana.id,
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      const alvo = criadas.body.data[1] as {
        id: string;
        recurrenceGroupId: string;
      };

      const response = await http()
        .patch(`/api/calendar/obligations/${alvo.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.data.status).toBe('completed');

      const pendentes = await ctx.prisma.obligation.count({
        where: { recurrenceGroupId: alvo.recurrenceGroupId, status: 'pending' },
      });
      expect(pendentes).toBe(2);
    });

    it('antecipa para o dia útil anterior ao feriado', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [{ date: '2029-11-02', name: 'Finados' }],
      };

      // Finados de 2029 cai numa sexta-feira; o dia útil anterior é quinta.
      const criada = await ctx.prisma.obligation.create({
        data: tarefa({ dueDate: new Date('2029-11-02T00:00:00Z') }),
      });

      const response = await http()
        .patch(`/api/calendar/obligations/${criada.id}`)
        .send({ action: 'anticipate' })
        .expect(200);

      expect(response.body.data.dueDate.slice(0, 10)).toBe('2029-11-01');
      expect(response.body.data.holidayConflict).toBeNull();
    });

    it('devolve 404 ao alterar tarefa de outro escritório', async () => {
      const outra = await ctx.prisma.obligation.create({
        data: tarefa({ tenantId: TENANT_B, collaboratorId: externo.id }),
      });

      await http()
        .patch(`/api/calendar/obligations/${outra.id}`)
        .send({ status: 'completed' })
        .expect(404);
    });
  });

  describe('GET /api/calendar/holidays', () => {
    it('devolve os feriados do ano ordenados por data', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [
          { date: '2026-12-25', name: 'Natal' },
          { date: '2026-04-21', name: 'Tiradentes' },
        ],
      };

      const response = await http()
        .get('/api/calendar/holidays')
        .query({ year: 2026 })
        .expect(200);

      expect(response.body.data).toEqual([
        { date: '2026-04-21', name: 'Tiradentes' },
        { date: '2026-12-25', name: 'Natal' },
      ]);
    });

    it('devolve lista vazia quando a BrasilAPI falha, sem derrubar a rota', async () => {
      brasilApiMock.fail = true;

      const response = await http()
        .get('/api/calendar/holidays')
        .query({ year: 2031 })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('rejeita ano inválido com 422', async () => {
      await http()
        .get('/api/calendar/holidays')
        .query({ year: 'abc' })
        .expect(422);
    });
  });
});
