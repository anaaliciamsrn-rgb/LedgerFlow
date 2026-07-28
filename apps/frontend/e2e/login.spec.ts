import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('renders the login screen', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: 'Plataforma Contábil' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Bem-vindo de volta' }),
    ).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  // O cliente exigiu sistema white label: nenhuma identidade visual da
  // empresa desenvolvedora. A versão anterior deste arquivo afirmava o
  // contrário — exigia o texto "LedgerFlow" na tela —, ou seja, protegia
  // justamente a violação do requisito.
  test('não expõe a marca da desenvolvedora (white label)', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('body')).not.toContainText('LedgerFlow', {
      ignoreCase: true,
    });
    await expect(page).not.toHaveTitle(/ledgerflow/i);
  });

  test('associates labels with their inputs (accessibility)', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.locator('label[for="email"]')).toHaveText('E-mail');
    await expect(page.locator('label[for="password"]')).toHaveText('Senha');
  });

  test('shows client-side validation errors on empty submit', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Informe seu e-mail')).toBeVisible();
    await expect(page.getByText('Informe sua senha')).toBeVisible();
  });

  test('validates the email format', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('nao-e-email');
    await page.locator('#password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail inválido')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/login');
    const password = page.locator('#password');
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  /**
   * O login deixou de ser encenação (antes era um `setTimeout` e um redirect),
   * então o caminho real precisa de teste: sem sessão não se entra, com
   * credencial errada não se entra, e com credencial certa se chega ao
   * sistema e se consegue sair.
   */
  test('protege rotas internas de quem não está autenticado', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: 'Bem-vindo de volta' }),
    ).toBeVisible();
  });

  test('recusa credenciais inválidas sem entrar', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@contabilidademodelo.com.br');
    await page.locator('#password').fill('senha-errada-de-proposito');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('entra com credenciais válidas e consegue sair', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@contabilidademodelo.com.br');
    await page.locator('#password').fill('trocar-esta-senha');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    // Depois de sair, a rota interna volta a ser bloqueada.
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
  });

  test('renders correctly on a mobile viewport without horizontal scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: 'Bem-vindo de volta' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(noHorizontalScroll).toBe(true);
  });
});
