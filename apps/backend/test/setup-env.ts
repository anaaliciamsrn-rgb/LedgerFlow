// Roda antes de cada worker de teste importar a aplicação.
// Define o ambiente ANTES do ConfigModule/Prisma lerem process.env.
// (dotenv/@nestjs/config não sobrescrevem variáveis já definidas.)
//
// `DATABASE_URL` NÃO é definida aqui: os testes usam o Postgres apontado pelo
// ambiente. Definir um padrão faria a suíte escrever num banco por engano —
// possivelmente o de desenvolvimento.

process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'stub';
process.env.STUB_TENANT_ID = 'tnt_test';
process.env.STUB_USER_ID = 'usr_test';
process.env.STUB_ROLE = 'owner';
