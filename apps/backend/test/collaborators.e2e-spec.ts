import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  collaboratorFactory,
  TestContext,
  TENANT_A,
  TENANT_B,
} from './test-utils';

describe('Collaborators (e2e)', () => {
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
  });

  const http = () => request(ctx.app.getHttpServer());

  it('cria um colaborador com nome e cor', async () => {
    const response = await http()
      .post('/api/calendar/collaborators')
      .send({ name: 'Ana Souza', color: 'blue' })
      .expect(201);

    expect(response.body.data).toMatchObject({
      name: 'Ana Souza',
      color: 'blue',
      active: true,
    });
  });

  it('rejeita cor fora da paleta com 422', async () => {
    await http()
      .post('/api/calendar/collaborators')
      .send({ name: 'Ana Souza', color: 'fuchsia' })
      .expect(422);
  });

  it('rejeita nome repetido no mesmo escritório com 409', async () => {
    await ctx.prisma.collaborator.create({ data: collaboratorFactory(TENANT_A) });

    await http()
      .post('/api/calendar/collaborators')
      .send({ name: 'Ana Souza', color: 'rose' })
      .expect(409);
  });

  it('aceita o mesmo nome em outro escritório', async () => {
    await ctx.prisma.collaborator.create({ data: collaboratorFactory(TENANT_B) });

    await http()
      .post('/api/calendar/collaborators')
      .send({ name: 'Ana Souza', color: 'rose' })
      .expect(201);
  });

  it('lista apenas os colaboradores do próprio escritório, ativos primeiro', async () => {
    await ctx.prisma.collaborator.createMany({
      data: [
        collaboratorFactory(TENANT_A, {
          name: 'Bruno Lima',
          color: 'violet',
          active: false,
        }),
        collaboratorFactory(TENANT_A, { name: 'Ana Souza', color: 'blue' }),
        collaboratorFactory(TENANT_B, { name: 'Fulano', color: 'lime' }),
      ],
    });

    const response = await http().get('/api/calendar/collaborators').expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({ name: 'Ana Souza', active: true });
    expect(response.body.data[1]).toMatchObject({ name: 'Bruno Lima', active: false });
  });

  it('renomeia, recolore e desativa', async () => {
    const criado = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_A),
    });

    const response = await http()
      .patch(`/api/calendar/collaborators/${criado.id}`)
      .send({ name: 'Ana Silva', color: 'amber', active: false })
      .expect(200);

    expect(response.body.data).toMatchObject({
      name: 'Ana Silva',
      color: 'amber',
      active: false,
    });
  });

  it('devolve 404 ao alterar colaborador de outro escritório', async () => {
    const outro = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_B),
    });

    await http()
      .patch(`/api/calendar/collaborators/${outro.id}`)
      .send({ color: 'rose' })
      .expect(404);
  });
});
