import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Recria o schema no banco de teste (SQLite) uma vez antes da suíte e2e.
export default function globalSetup(): void {
  const testDbUrl = 'file:./test.db';
  const testDbPath = join(__dirname, '..', 'prisma', 'test.db');

  if (existsSync(testDbPath)) {
    rmSync(testDbPath);
  }

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  });
}
