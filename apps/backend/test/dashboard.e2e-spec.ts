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

  describe('GET /api/dashboard/portfolio', () => {
    // Cada teste limpa as empresas do TENANT_A criadas no beforeEach e
    // recria seu próprio conjunto — assim os totais/buckets esperados não
    // dependem dos dados (com defaults vazios) usados pelos outros describes.

    it('agrega por estado, porte, situação e CNAE com dados conhecidos', async () => {
      await ctx.prisma.company.deleteMany({ where: { tenantId: TENANT_A } });
      await ctx.prisma.company.createMany({
        data: [
          {
            ...companyFactory(TENANT_A, { cnpj: '55555555000155' }),
            state: 'SP',
            porte: 'ME',
            situacaoCadastral: 'ATIVA',
            cnaeCodigo: '4721102',
            cnaeDescricao: 'Padaria',
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '66666666000166' }),
            state: 'SP',
            porte: 'EPP',
            situacaoCadastral: 'BAIXADA',
            cnaeCodigo: '4721102',
            cnaeDescricao: 'Padaria',
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '77777777000177' }),
            state: 'RJ',
            porte: 'ME',
            situacaoCadastral: 'ATIVA',
            cnaeCodigo: '4930202',
            cnaeDescricao: 'Transporte',
          },
        ],
      });

      const response = await http().get('/api/dashboard/portfolio').expect(200);
      const data = response.body.data;

      expect(data.totals.companies).toBe(3);
      // Irregulares = situacaoCadastral !== 'ATIVA': só a BAIXADA.
      expect(data.totals.irregulares).toBe(1);

      expect(data.byState).toEqual(
        expect.arrayContaining([
          { label: 'SP', count: 2 },
          { label: 'RJ', count: 1 },
        ]),
      );

      // byPorte tem ordem fixa e zero-fill: as 4 categorias sempre aparecem.
      expect(data.byPorte).toEqual([
        { label: 'MEI', count: 0 },
        { label: 'ME', count: 2 },
        { label: 'EPP', count: 1 },
        { label: 'DEMAIS', count: 0 },
      ]);

      // bySituacao idem: ordem fixa e zero-fill.
      expect(data.bySituacao).toEqual([
        { label: 'ATIVA', count: 2 },
        { label: 'SUSPENSA', count: 0 },
        { label: 'INAPTA', count: 0 },
        { label: 'BAIXADA', count: 1 },
      ]);

      expect(data.byCnae[0]).toMatchObject({
        label: '4721102',
        descricao: 'Padaria',
        count: 2,
      });
      expect(data.byCnae[1]).toMatchObject({
        label: '4930202',
        descricao: 'Transporte',
        count: 1,
      });
    });

    it('aplica o filtro de estado em todas as agregações', async () => {
      await ctx.prisma.company.deleteMany({ where: { tenantId: TENANT_A } });
      await ctx.prisma.company.createMany({
        data: [
          {
            ...companyFactory(TENANT_A, { cnpj: '55555555000155' }),
            state: 'SP',
            porte: 'ME',
            situacaoCadastral: 'ATIVA',
            cnaeCodigo: '4721102',
            cnaeDescricao: 'Padaria',
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '66666666000166' }),
            state: 'RJ',
            porte: 'EPP',
            situacaoCadastral: 'ATIVA',
            cnaeCodigo: '4930202',
            cnaeDescricao: 'Transporte',
          },
        ],
      });

      const response = await http()
        .get('/api/dashboard/portfolio?state=SP')
        .expect(200);
      const data = response.body.data;

      expect(data.totals.companies).toBe(1);
      expect(data.totals.irregulares).toBe(0);
      expect(data.byState).toEqual([{ label: 'SP', count: 1 }]);
      expect(data.byPorte).toEqual([
        { label: 'MEI', count: 0 },
        { label: 'ME', count: 1 },
        { label: 'EPP', count: 0 },
        { label: 'DEMAIS', count: 0 },
      ]);
      expect(data.bySituacao).toEqual([
        { label: 'ATIVA', count: 1 },
        { label: 'SUSPENSA', count: 0 },
        { label: 'INAPTA', count: 0 },
        { label: 'BAIXADA', count: 0 },
      ]);
      expect(data.byCnae).toEqual([
        { label: '4721102', descricao: 'Padaria', count: 1 },
      ]);
    });

    it('calcula as faixas de idade corretamente', async () => {
      await ctx.prisma.company.deleteMany({ where: { tenantId: TENANT_A } });

      const daysAgo = (days: number): Date =>
        new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      await ctx.prisma.company.createMany({
        data: [
          {
            ...companyFactory(TENANT_A, { cnpj: '11111111000111' }),
            dataAbertura: daysAgo(100), // Menos de 1 ano
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '22222222000122' }),
            dataAbertura: daysAgo(3 * 365), // 1 a 5 anos
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '33333333000133' }),
            dataAbertura: daysAgo(7 * 365), // 5 a 10 anos
          },
          {
            ...companyFactory(TENANT_A, { cnpj: '44444444000144' }),
            dataAbertura: daysAgo(12 * 365), // Mais de 10 anos
          },
        ],
      });

      const response = await http().get('/api/dashboard/portfolio').expect(200);
      const data = response.body.data;

      expect(data.byAge).toEqual([
        { label: 'Menos de 1 ano', count: 1 },
        { label: '1 a 5 anos', count: 1 },
        { label: '5 a 10 anos', count: 1 },
        { label: 'Mais de 10 anos', count: 1 },
      ]);
      expect(
        data.byAge.reduce((sum: number, b: { count: number }) => sum + b.count, 0),
      ).toBe(4);
    });

    it('não conta empresas de outro tenant em nenhuma agregação', async () => {
      await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_B, { cnpj: '88888888000188' }),
          state: 'MG',
          porte: 'ME',
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          cnaeDescricao: 'Padaria',
          dataAbertura: new Date(),
        },
      });

      const response = await http().get('/api/dashboard/portfolio').expect(200);
      const data = response.body.data;

      // Só as 3 do beforeEach (TENANT_A) — a de TENANT_B não deve aparecer.
      expect(data.totals.companies).toBe(3);
      expect(data.byState.some((b: { label: string }) => b.label === 'MG')).toBe(
        false,
      );
      expect(
        data.byCnae.some((b: { label: string }) => b.label === '4721102'),
      ).toBe(false);
    });
  });
});
