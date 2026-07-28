import { execSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Aplica o schema no banco de teste antes da suíte e2e.
 *
 * Exige um PostgreSQL alcançável em `DATABASE_URL`. Na CI é um container de
 * verdade; localmente, um Postgres instalado ou um banco gerenciado gratuito
 * (Neon, Supabase) — ver docs/DEPLOY.md.
 *
 * A mensagem abaixo existe porque o erro cru do Prisma ("P1001") não diz o que
 * fazer, e essa era a primeira pedra no caminho de quem clona o projeto.
 */
export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;

  if (!url?.startsWith('postgres')) {
    throw new Error(
      'Os testes e2e precisam de um PostgreSQL. Defina DATABASE_URL apontando ' +
        'para um banco de teste, por exemplo:\n' +
        '  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ledgerflow_test"\n' +
        'Ver docs/DEPLOY.md para as opções sem instalar nada.',
    );
  }

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
