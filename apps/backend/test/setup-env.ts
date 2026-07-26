// Roda antes de cada worker de teste importar a aplicação.
// Define o banco de teste ANTES do ConfigModule/Prisma lerem process.env.
// (dotenv/@nestjs/config não sobrescrevem variáveis já definidas.)
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'stub';
process.env.STUB_TENANT_ID = 'tnt_test';
process.env.STUB_USER_ID = 'usr_test';
process.env.STUB_ROLE = 'owner';
