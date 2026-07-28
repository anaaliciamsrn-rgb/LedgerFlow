import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Estes testes exercitam o que só existe **depois da hidratação** — a faixa
 * de atrasadas, a legenda de responsáveis e os painéis laterais não vêm no
 * HTML do servidor, então nenhuma checagem sobre o HTML bruto os alcançaria.
 *
 * Dependem do backend em `http://localhost:3333` com o seed aplicado
 * (`npm run db:seed` em `apps/backend`), que cria Ana Souza, Bruno Lima e
 * Carla Dias.
 */
const API = 'http://localhost:3333/api';

const CREDENCIAIS = {
  email: process.env.E2E_USER_EMAIL ?? 'admin@contabilidademodelo.com.br',
  password: process.env.E2E_USER_PASSWORD ?? 'trocar-esta-senha',
};

interface Criada {
  readonly id: string;
}

/**
 * Autentica usando `page.request`, e não o fixture `request` isolado: assim o
 * cookie de sessão entra no contexto do navegador. Como cookie ignora porta,
 * o mesmo `lf_session` serve ao middleware do Next (porta do site) e às
 * chamadas à API (porta do backend).
 */
async function entrar(page: import('@playwright/test').Page): Promise<void> {
  const resposta = await page.request.post(`${API}/auth/login`, {
    data: CREDENCIAIS,
  });
  if (!resposta.ok()) {
    throw new Error(
      `login falhou (HTTP ${resposta.status()}). Rode o seed do backend: ` +
        `npm run db:seed em apps/backend.`,
    );
  }
}

async function primeiroResponsavel(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API}/calendar/collaborators`);
  const { data } = (await response.json()) as {
    data: ReadonlyArray<{ id: string }>;
  };
  const primeiro = data[0];
  if (!primeiro) {
    throw new Error('Nenhum responsável cadastrado — rode `npm run db:seed`.');
  }
  return primeiro.id;
}

test.describe('Calendário — tarefas recorrentes', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page);
    await page.goto('/calendar');
    await expect(
      page.getByRole('heading', { name: 'Calendário contábil' }),
    ).toBeVisible();
  });

  /**
   * O teste cria a própria tarefa vencida em vez de contar com a do seed:
   * qualquer pessoa que use o sistema pode concluí-la, e o teste passaria a
   * falhar por um motivo que não é defeito nenhum. No fim, conclui a tarefa
   * para não deixar atraso pendurado na tela.
   */
  test('mostra a faixa de atrasadas com data e responsável', async ({ page }) => {
    // `page.request` e não o fixture `request`: só o contexto da página tem o
    // cookie de sessão, e sem ele a API responde 401.
    const collaboratorId = await primeiroResponsavel(page.request);
    const criacao = await page.request.post(`${API}/calendar/obligations`, {
      data: {
        title: 'Tarefa vencida (fixture de teste)',
        type: 'DOCUMENTOS',
        dueDate: '2020-03-10',
        collaboratorId,
      },
    });
    expect(criacao.ok()).toBe(true);
    const { data } = (await criacao.json()) as { data: readonly Criada[] };
    const id = data[0]!.id;

    try {
      await page.reload();

      const faixa = page.getByRole('region', { name: 'Tarefas em atraso' });
      await expect(faixa).toBeVisible();
      await expect(faixa).toContainText('em atraso');
      await expect(faixa).toContainText('Tarefa vencida (fixture de teste)');
      await expect(faixa).toContainText('10/03');
    } finally {
      // Concluída sai da faixa; roda mesmo se a asserção acima falhar.
      // A limpeza é verificada: falha silenciosa aqui deixaria a tarefa
      // pendurada na faixa e o próximo teste herdaria o lixo.
      const limpeza = await page.request.patch(
        `${API}/calendar/obligations/${id}`,
        { data: { status: 'completed' } },
      );
      expect(
        limpeza.ok(),
        `limpeza da tarefa ${id} falhou: HTTP ${limpeza.status()} ${await limpeza.text()}`,
      ).toBe(true);
    }
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
      page.getByRole('heading', { name: /\d+ tarefas?/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: /^Concluir / }).first(),
    ).toBeVisible();
  });

  test('abre o painel de detalhe ao clicar numa tarefa da grade', async ({
    page,
  }) => {
    // Clica na primeira tarefa que existir no mês, seja ela qual for: prender
    // o teste a um título do seed o faria falhar assim que alguém o alterasse.
    const primeiraDaLista = page
      .getByRole('checkbox', { name: /^Concluir / })
      .first();
    await expect(primeiraDaLista).toBeVisible();
    const titulo = (await primeiraDaLista.getAttribute('aria-label'))!.replace(
      /^Concluir /,
      '',
    );

    await page.getByRole('button', { name: titulo, exact: false }).first().click();

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
