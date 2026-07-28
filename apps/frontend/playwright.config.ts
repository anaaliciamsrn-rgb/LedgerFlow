import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  /**
   * Um worker só. `fullyParallel: false` serializa apenas dentro de cada
   * arquivo — os arquivos continuariam em paralelo, e todos compartilham o
   * mesmo backend e o mesmo banco. Rodando junto, o teste de login e o de
   * calendário passavam sozinhos e falhavam em conjunto.
   */
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
