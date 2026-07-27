import { test, expect } from '@playwright/test';

/**
 * Estes testes exercitam o que só existe **depois da hidratação** — a faixa
 * de atrasadas, a legenda de responsáveis e os painéis laterais não vêm no
 * HTML do servidor, então nenhuma checagem sobre o HTML bruto os alcançaria.
 *
 * Dependem do backend em `http://localhost:3333` com o seed aplicado
 * (`npm run db:seed` em `apps/backend`), que cria Ana Souza, Bruno Lima e
 * Carla Dias e deixa uma tarefa vencida de propósito.
 */
test.describe('Calendário — tarefas recorrentes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
    await expect(
      page.getByRole('heading', { name: 'Calendário contábil' }),
    ).toBeVisible();
  });

  test('mostra a faixa de atrasadas com data, empresa e responsável', async ({
    page,
  }) => {
    const faixa = page.getByRole('region', { name: 'Tarefas em atraso' });
    await expect(faixa).toBeVisible();
    await expect(faixa).toContainText('em atraso');
    // A tarefa vencida do seed traz responsável e empresa na mesma linha.
    await expect(faixa).toContainText('Envio de documentos ao cliente');
    await expect(faixa).toContainText('Carla Dias');
  });

  test('exibe a legenda de responsáveis e filtra por pessoa', async ({ page }) => {
    const legenda = page.getByRole('group', { name: 'Responsáveis' });
    await expect(legenda.getByRole('button', { name: 'Ana Souza' })).toBeVisible();
    await expect(legenda.getByRole('button', { name: 'Bruno Lima' })).toBeVisible();

    await legenda.getByRole('button', { name: 'Bruno Lima' }).click();
    await expect(
      legenda.getByRole('button', { name: 'Bruno Lima' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('avisa que o vencimento cai em feriado e antecipa a data', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Nova tarefa' }).click();

    const vencimento = page.locator('#dueDate');
    await expect(vencimento).toBeVisible();
    await vencimento.fill('2026-12-25');

    await expect(page.getByRole('status')).toContainText('Natal');

    await page
      .getByRole('button', { name: 'Antecipar para o dia útil anterior' })
      .click();

    // 25/12/2026 cai numa sexta-feira; o dia útil anterior é quinta, 24/12.
    await expect(vencimento).toHaveValue('2026-12-24');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('mostra o preview das ocorrências antes de salvar', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova tarefa' }).click();

    await page.locator('#recurrence').selectOption('monthly');
    await page.locator('#occurrences').fill('12');

    await expect(page.getByText(/Serão criadas 12 tarefas/)).toBeVisible();
  });

  test('abre o cadastro de responsáveis', async ({ page }) => {
    await page.getByRole('button', { name: 'Responsáveis' }).click();

    await expect(
      page.getByRole('heading', { name: 'Adicionar responsável' }),
    ).toBeVisible();
    await expect(page.getByLabel('Nome do colaborador')).toBeVisible();
    // A paleta oferece as oito cores nomeadas. `exact` é necessário: cada
    // colaborador já cadastrado também tem um botão "Cor Azul para <nome>".
    await expect(
      page.getByRole('button', { name: 'Azul', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Limão', exact: true }),
    ).toBeVisible();
  });

  test('agrupa as tarefas do mês por responsável', async ({ page }) => {
    // Cada bloco traz o nome e a contagem; a caixinha conclui sem abrir painel.
    await expect(
      page.getByRole('heading', { name: /Ana Souza/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: /^Concluir / }).first(),
    ).toBeVisible();
  });

  test('abre o painel de detalhe ao clicar numa tarefa da grade', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /Fechamento da folha de pagamento/ })
      .first()
      .click();

    await expect(page.getByText('Responsável', { exact: true })).toBeVisible();
    await expect(page.getByText('Repetição', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Marcar como concluída|Reabrir tarefa/ }),
    ).toBeVisible();
  });

  test('não rola horizontalmente em viewport móvel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Calendário contábil' }),
    ).toBeVisible();

    // A grade rola dentro do próprio contêiner; a página, nunca.
    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(noHorizontalScroll).toBe(true);
  });
});
