# Tarefas Recorrentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar, acompanhar e concluir tarefas recorrentes do escritório diretamente no calendário, com responsáveis coloridos, alerta de feriado e faixa fixa de atrasadas.

**Architecture:** O backend NestJS ganha a entidade `Collaborator` (nome + cor, por tenant), passa a persistir a frequência de recorrência e expõe feriados do ano antes do cadastro. O frontend Next.js transforma a tela de calendário — hoje somente leitura — em ferramenta de trabalho: painel lateral de cadastro, painel de detalhe, faixa de atrasadas e lista agrupada por responsável.

**Tech Stack:** NestJS 11 · Prisma 6 · SQLite · Zod 3 · Next.js 15 (App Router) · React 19 · TanStack Query 5 · react-hook-form · Tailwind · vaul (Drawer) · Jest (backend) · Vitest + Testing Library (frontend)

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-27-tarefas-recorrentes-design.md`. Em caso de dúvida, ela manda.
- Branch: `feat/tarefas-recorrentes` (já criada a partir de `main`).
- Toda mensagem visível ao usuário em **português do Brasil**.
- Datas trafegam e são comparadas em **UTC** de ponta a ponta (`Date.UTC`, `getUTC*`, `toISOString().slice(0,10)`). Nunca usar `getDate()`/`getMonth()` locais.
- `overdue` e `holidayConflict` são **calculados**, nunca persistidos.
- Nenhum teste acessa a rede: a BrasilAPI é sempre substituída pelo `HTTP_FETCHER` fake de `apps/backend/test/test-utils.ts`.
- Teto de **24 ocorrências** por cadastro recorrente.
- Paleta fixa de 8 cores, exatamente estes tokens: `blue` `violet` `emerald` `amber` `rose` `cyan` `orange` `lime`.
- Tipos de tarefa, exatamente estes valores: `FOLHA` `DOCUMENTOS` `GUIAS` `CONFERENCIA` `OUTRO`.
- Frequências, exatamente estes valores: `none` `weekly` `biweekly` `monthly` `quarterly` `yearly`.
- Colaborador nunca é apagado — apenas `active: false`.
- Commits em português, no padrão Conventional Commits já usado no repositório (`feat(backend):`, `feat(frontend):`, `test(backend):`).
- Comandos do backend rodam de `apps/backend`; do frontend, de `apps/frontend`.

---

## Estrutura de arquivos

**Backend — criar:**

| Arquivo | Responsabilidade |
|---|---|
| `src/calendar/business-days.ts` | `previousBusinessDay` — função pura |
| `src/calendar/business-days.spec.ts` | teste da função acima |
| `src/calendar/collaborator.schema.ts` | Zod + DTO de colaborador |
| `src/calendar/collaborators.service.ts` | CRUD de colaboradores |
| `src/calendar/collaborators.controller.ts` | rotas de colaboradores |
| `test/collaborators.e2e-spec.ts` | e2e de colaboradores |

**Backend — modificar:**

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | modelo `Collaborator`; `Obligation` ganha `collaboratorId`, `customType`, `recurrence`; perde `assignee` |
| `prisma/migrations/.../migration.sql` | migration escrita à mão, com conversão dos dados |
| `prisma/seed.ts` | cria colaboradores e usa `collaboratorId` |
| `src/calendar/recurrence.ts` | cinco frequências |
| `src/calendar/recurrence.spec.ts` | casos das frequências novas |
| `src/calendar/calendar.schema.ts` | tipos, `customType`, `collaboratorId`, `overdueOnly`, `action` |
| `src/calendar/calendar.service.ts` | relações, `overdueOnly`, antecipação |
| `src/calendar/calendar.controller.ts` | rota `GET /calendar/holidays` |
| `src/calendar/calendar.module.ts` | registra os providers novos |
| `test/test-utils.ts` | limpa `Collaborator`; `collaboratorFactory` |
| `test/calendar.e2e-spec.ts` | migra de `assignee` para `collaboratorId` |

**Frontend — criar:**

| Arquivo | Responsabilidade |
|---|---|
| `features/calendar/lib/collaborator-colors.ts` | tokens → classes Tailwind |
| `features/calendar/lib/obligation-types.ts` | catálogo de tipos + rótulos + ícones |
| `features/calendar/lib/business-days.ts` | cópia de `previousBusinessDay` |
| `features/calendar/lib/business-days.test.ts` | teste da cópia |
| `features/calendar/lib/recurrence-preview.ts` | datas previstas para o preview |
| `features/calendar/services/collaborators.service.ts` | HTTP de colaboradores |
| `features/calendar/services/holidays.service.ts` | HTTP de feriados |
| `features/calendar/hooks/use-collaborators.ts` | leitura + mutação de colaboradores |
| `features/calendar/hooks/use-holidays.ts` | feriados do ano |
| `features/calendar/hooks/use-overdue-obligations.ts` | atrasadas de qualquer mês |
| `features/calendar/hooks/use-obligation-mutations.ts` | criar / atualizar tarefa |
| `features/calendar/hooks/use-month-anchor.ts` | âncora de mês em UTC |
| `features/calendar/components/collaborator-manager.tsx` | painel de responsáveis |
| `features/calendar/components/collaborator-legend.tsx` | legenda + filtro |
| `features/calendar/components/obligation-form.tsx` | painel de cadastro |
| `features/calendar/components/obligation-detail.tsx` | painel de detalhe |
| `features/calendar/components/overdue-banner.tsx` | faixa de atrasadas |
| `features/calendar/components/assignee-task-list.tsx` | lista por responsável |
| `features/calendar/schemas/obligation.schema.ts` | validação do formulário |
| `features/calendar/components/obligation-form.test.tsx` | teste do formulário |

**Frontend — modificar:**

| Arquivo | Mudança |
|---|---|
| `features/calendar/types/calendar.types.ts` | `Collaborator`, `Holiday`, campos novos em `Obligation` |
| `features/calendar/services/calendar.service.ts` | `create`, `update`, `listOverdue` |
| `features/calendar/hooks/use-obligations.ts` | filtro por `collaboratorId` |
| `features/calendar/components/month-grid.tsx` | cor por responsável, clique na tarefa |
| `features/calendar/components/calendar-view.tsx` | vira orquestrador |
| `services/mocks/calendar.mock.ts` | colaboradores e campos novos |
| `app/layout.tsx` | monta o `<Toaster />` |

---

### Task 1: Modelo de dados — `Collaborator` e conversão de `assignee`

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260727180000_tarefas_recorrentes/migration.sql`
- Modify: `apps/backend/prisma/seed.ts`
- Modify: `apps/backend/test/test-utils.ts`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: modelo Prisma `Collaborator { id, tenantId, name, color, active, createdAt }`; `Obligation` com `collaboratorId: string`, `customType: string | null`, `recurrence: string`, **sem** `assignee`. Helper de teste `collaboratorFactory(tenantId, overrides?)`.

- [ ] **Step 1: Declarar os modelos no schema**

Em `apps/backend/prisma/schema.prisma`, adicionar o modelo novo:

```prisma
/// Responsável pelas tarefas do escritório. Não é uma conta de acesso —
/// é um rótulo com cor, usado para organizar e colorir o calendário.
model Collaborator {
  id       String  @id @default(cuid())
  tenantId String
  name     String
  /// Token da paleta (blue|violet|emerald|amber|rose|cyan|orange|lime).
  /// Guardamos o token, nunca um hex: o tema claro/escuro resolve o valor.
  color    String
  /// Desativado some da escolha de tarefas novas, mas preserva o histórico.
  active   Boolean @default(true)

  createdAt DateTime @default(now())

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  obligations Obligation[]

  @@unique([tenantId, name])
  @@index([tenantId, active])
}
```

Substituir o modelo `Obligation` inteiro por:

```prisma
model Obligation {
  id             String  @id @default(cuid())
  tenantId       String
  companyId      String?
  collaboratorId String
  title          String
  /// FOLHA | DOCUMENTOS | GUIAS | CONFERENCIA | OUTRO
  type           String
  /// Preenchido só quando `type = OUTRO`; nulo nos demais.
  customType     String?
  dueDate        DateTime
  status         String  @default("pending") // pending | completed
  /// none | weekly | biweekly | monthly | quarterly | yearly
  recurrence     String  @default("none")
  /// Agrupa as ocorrências geradas do mesmo cadastro.
  recurrenceGroupId String?

  createdAt DateTime @default(now())

  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  company      Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)
  collaborator Collaborator @relation(fields: [collaboratorId], references: [id])

  @@index([tenantId, dueDate])
  @@index([tenantId, collaboratorId])
  @@index([tenantId, status, dueDate])
}
```

No modelo `Tenant`, acrescentar a relação inversa junto das outras:

```prisma
  collaborators Collaborator[]
```

- [ ] **Step 2: Gerar a migration vazia (sem aplicar)**

Run: `cd apps/backend && npx prisma migrate dev --create-only --name tarefas_recorrentes`
Expected: cria `prisma/migrations/<timestamp>_tarefas_recorrentes/migration.sql` com SQL destrutivo gerado pelo Prisma. **Não aplicar** — o conteúdo será substituído no passo seguinte.

- [ ] **Step 3: Substituir o SQL gerado pela conversão manual**

O SQL do Prisma apagaria as tarefas existentes. Sobrescrever o arquivo `migration.sql` inteiro com:

```sql
-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Collaborator_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Collaborator_tenantId_name_key" ON "Collaborator"("tenantId", "name");
CREATE INDEX "Collaborator_tenantId_active_idx" ON "Collaborator"("tenantId", "active");

-- Backfill: um colaborador por (tenant, responsável) já existente.
-- Tarefas sem responsável caem em "Sem responsável" para não perder o vínculo.
INSERT INTO "Collaborator" ("id", "tenantId", "name", "color", "active", "createdAt")
SELECT
    'clb_' || lower(hex(randomblob(8))),
    origem."tenantId",
    origem."nome",
    CASE (ROW_NUMBER() OVER (PARTITION BY origem."tenantId" ORDER BY origem."nome") - 1) % 8
        WHEN 0 THEN 'blue'
        WHEN 1 THEN 'violet'
        WHEN 2 THEN 'emerald'
        WHEN 3 THEN 'amber'
        WHEN 4 THEN 'rose'
        WHEN 5 THEN 'cyan'
        WHEN 6 THEN 'orange'
        ELSE 'lime'
    END,
    true,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        "tenantId",
        COALESCE(NULLIF("assignee", ''), 'Sem responsável') AS "nome"
    FROM "Obligation"
) AS origem;

-- RedefineTable: SQLite não altera coluna; recria e copia.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "collaboratorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customType" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Obligation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Obligation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Obligation_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Obligation" (
    "id", "tenantId", "companyId", "collaboratorId", "title", "type",
    "customType", "dueDate", "status", "recurrence", "recurrenceGroupId", "createdAt"
)
SELECT
    o."id",
    o."tenantId",
    o."companyId",
    c."id",
    o."title",
    CASE o."type"
        WHEN 'FOLHA' THEN 'FOLHA'
        WHEN 'DOCUMENTOS' THEN 'DOCUMENTOS'
        WHEN 'CONFERENCIA' THEN 'CONFERENCIA'
        WHEN 'DAS' THEN 'GUIAS'
        WHEN 'DCTF' THEN 'GUIAS'
        WHEN 'GFIP' THEN 'GUIAS'
        WHEN 'FGTS' THEN 'GUIAS'
        WHEN 'GUIAS' THEN 'GUIAS'
        ELSE 'OUTRO'
    END,
    CASE
        WHEN o."type" IN ('FOLHA', 'DOCUMENTOS', 'CONFERENCIA', 'DAS', 'DCTF', 'GFIP', 'FGTS', 'GUIAS')
        THEN NULL
        ELSE o."type"
    END,
    o."dueDate",
    o."status",
    CASE WHEN o."recurrenceGroupId" IS NULL THEN 'none' ELSE 'monthly' END,
    o."recurrenceGroupId",
    o."createdAt"
FROM "Obligation" o
JOIN "Collaborator" c
    ON c."tenantId" = o."tenantId"
   AND c."name" = COALESCE(NULLIF(o."assignee", ''), 'Sem responsável');

DROP TABLE "Obligation";
ALTER TABLE "new_Obligation" RENAME TO "Obligation";

CREATE INDEX "Obligation_tenantId_dueDate_idx" ON "Obligation"("tenantId", "dueDate");
CREATE INDEX "Obligation_tenantId_collaboratorId_idx" ON "Obligation"("tenantId", "collaboratorId");
CREATE INDEX "Obligation_tenantId_status_dueDate_idx" ON "Obligation"("tenantId", "status", "dueDate");

PRAGMA foreign_keys=ON;
```

- [ ] **Step 4: Aplicar a migration e regenerar o client**

Run: `cd apps/backend && npx prisma migrate dev && npx prisma generate`
Expected: migration aplicada sem erro; o Prisma Client passa a expor `prisma.collaborator`.

Se o SQLite reclamar de `ROW_NUMBER`, trocar o `CASE (ROW_NUMBER() ...)` por `'blue'` fixo — as cores viram editáveis na Task 8 de qualquer forma.

- [ ] **Step 5: Atualizar o seed**

Em `apps/backend/prisma/seed.ts`, substituir a constante `RESPONSAVEIS` e o bloco de obrigações. A constante vira:

```ts
const RESPONSAVEIS = [
  { name: 'Ana Souza', color: 'blue' },
  { name: 'Bruno Lima', color: 'violet' },
  { name: 'Carla Dias', color: 'emerald' },
] as const;
```

Antes do `prisma.obligation.deleteMany`, criar os colaboradores de forma idempotente:

```ts
  await prisma.obligation.deleteMany({ where: { tenantId: TENANT_ID } });

  // Colaboradores primeiro: a obrigação depende do id deles.
  const colaboradores = await Promise.all(
    RESPONSAVEIS.map((r) =>
      prisma.collaborator.upsert({
        where: { tenantId_name: { tenantId: TENANT_ID, name: r.name } },
        update: { color: r.color, active: true },
        create: { tenantId: TENANT_ID, name: r.name, color: r.color },
      }),
    ),
  );
```

E o `createMany` das obrigações troca `assignee: RESPONSAVEIS[n]` por `collaboratorId: colaboradores[n].id`, com os tipos migrados e a recorrência explícita:

```ts
  await prisma.obligation.createMany({
    data: [
      ...[0, 1, 2].map((offset) => ({
        tenantId: TENANT_ID,
        companyId: companies[0]?.id ?? null,
        title: 'Fechamento da folha de pagamento',
        type: 'FOLHA',
        dueDate: mes(offset, 5),
        status: offset === 0 ? 'completed' : 'pending',
        collaboratorId: colaboradores[0].id,
        recurrence: 'monthly',
        recurrenceGroupId: grupoFolha,
      })),
      ...[0, 1, 2].map((offset) => ({
        tenantId: TENANT_ID,
        companyId: companies[1]?.id ?? null,
        title: 'Emissão de guias DAS',
        type: 'GUIAS',
        dueDate: mes(offset, 20),
        status: 'pending',
        collaboratorId: colaboradores[1].id,
        recurrence: 'monthly',
        recurrenceGroupId: grupoGuias,
      })),
      {
        tenantId: TENANT_ID,
        companyId: companies[2]?.id ?? null,
        title: 'Envio de documentos ao cliente',
        type: 'DOCUMENTOS',
        dueDate: mes(-1, 10), // vencida — demonstra a faixa de atrasadas
        status: 'pending',
        collaboratorId: colaboradores[2].id,
      },
      {
        tenantId: TENANT_ID,
        companyId: companies[3]?.id ?? null,
        title: 'Conferência mensal',
        type: 'CONFERENCIA',
        dueDate: new Date(hoje.getFullYear() + 1, 0, 1), // 1º de janeiro = feriado
        status: 'pending',
        collaboratorId: colaboradores[0].id,
      },
    ],
  });
```

- [ ] **Step 6: Rodar o seed**

Run: `cd apps/backend && npm run db:seed`
Expected: `Seed concluído: tenant ... com N empresas e 8 obrigações.`

- [ ] **Step 7: Preparar os utilitários de teste**

Em `apps/backend/test/test-utils.ts`, dentro de `cleanDatabase`, incluir a nova tabela **depois** de `obligation` e **antes** de `tenant` (ordem de chave estrangeira):

```ts
  await prisma.obligation.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.activityLog.deleteMany();
```

E acrescentar ao fim do arquivo:

```ts
export function collaboratorFactory(
  tenantId: string,
  overrides: Partial<{ name: string; color: string; active: boolean }> = {},
) {
  return {
    tenantId,
    name: overrides.name ?? 'Ana Souza',
    color: overrides.color ?? 'blue',
    active: overrides.active ?? true,
  };
}
```

- [ ] **Step 8: Verificar que o projeto compila**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: erros **apenas** em `src/calendar/*` e `test/calendar.e2e-spec.ts`, apontando `assignee` inexistente. São as próximas tasks. Nenhum erro em outros módulos.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/prisma apps/backend/test/test-utils.ts
git commit -m "feat(backend): colaborador com cor propria e conversao do responsavel

Cria a tabela Collaborator (nome, cor, ativo) por tenant e converte o
campo de texto assignee das tarefas existentes em vinculo por id.
Obligation passa a guardar customType e a frequencia da recorrencia.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Cinco frequências de recorrência

**Files:**
- Modify: `apps/backend/src/calendar/recurrence.ts`
- Modify: `apps/backend/src/calendar/recurrence.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `type Frequency = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'` e `generateOccurrences(start: Date, frequency: Frequency, count: number): Date[]`, exportados de `src/calendar/recurrence.ts`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao `describe` existente em `apps/backend/src/calendar/recurrence.spec.ts`:

```ts
  it('gera ocorrências semanais somando 7 dias', () => {
    const result = generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'weekly', 3);

    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
    ]);
  });

  it('gera ocorrências quinzenais atravessando a virada do mês', () => {
    const result = generateOccurrences(new Date('2026-01-22T00:00:00Z'), 'biweekly', 3);

    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-22',
      '2026-02-05',
      '2026-02-19',
    ]);
  });

  it('gera ocorrências trimestrais respeitando o último dia do mês', () => {
    const result = generateOccurrences(new Date('2026-01-31T00:00:00Z'), 'quarterly', 3);

    // Abril tem 30 dias — a data não pode vazar para 1º de maio.
    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-31',
      '2026-04-30',
      '2026-07-31',
    ]);
  });

  it('gera ocorrências anuais convertendo 29/02 em ano comum', () => {
    const result = generateOccurrences(new Date('2028-02-29T00:00:00Z'), 'yearly', 2);

    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2028-02-29',
      '2029-02-28',
    ]);
  });

  it('limita o total a 24 ocorrências', () => {
    expect(generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'weekly', 99)).toHaveLength(24);
  });
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/backend && npx jest src/calendar/recurrence.spec.ts`
Expected: FAIL — os testes de `weekly`, `biweekly`, `quarterly` e `yearly` quebram porque `Frequency` só aceita `'none' | 'monthly'` (erro de tipo do ts-jest) e a implementação ignora as frequências novas.

- [ ] **Step 3: Implementar**

Substituir o conteúdo de `apps/backend/src/calendar/recurrence.ts` por:

```ts
export type Frequency =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

const MAX_OCCURRENCES = 24;

/** Frequências que avançam em dias — aritmética direta, sem borda de mês. */
const DAY_STEP: Readonly<Partial<Record<Frequency, number>>> = {
  weekly: 7,
  biweekly: 14,
};

/** Frequências que avançam em meses — precisam da regra de fim de mês. */
const MONTH_STEP: Readonly<Partial<Record<Frequency, number>>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Materializa as ocorrências de uma tarefa recorrente (decisão B1 da spec):
 * cada ocorrência é uma linha própria no banco, para poder ser concluída
 * individualmente. Trabalha em UTC de ponta a ponta para não sofrer com fuso.
 *
 * Nas frequências que somam meses, dia 31 em mês de 30 (ou 28/29) dias vira o
 * último dia do mês — sem isso, o comportamento nativo do `Date` vazaria para o
 * mês seguinte (ex.: 31/01 + 1 mês em `Date` nativo vira 03/03, não 28/02).
 */
export function generateOccurrences(
  start: Date,
  frequency: Frequency,
  count: number,
): Date[] {
  if (frequency === 'none') {
    return [start];
  }

  const total = Math.min(MAX_OCCURRENCES, Math.max(1, count));
  const days = DAY_STEP[frequency];

  if (days !== undefined) {
    return Array.from(
      { length: total },
      (_, index) => new Date(start.getTime() + index * days * 86_400_000),
    );
  }

  const months = MONTH_STEP[frequency] ?? 1;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  return Array.from({ length: total }, (_, index) => {
    const target = month + index * months;
    // Dia 0 do mês seguinte = último dia do mês alvo.
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return new Date(
      Date.UTC(
        year,
        target,
        Math.min(day, lastDay),
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
        start.getUTCMilliseconds(),
      ),
    );
  });
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `cd apps/backend && npx jest src/calendar/recurrence.spec.ts`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/calendar/recurrence.ts apps/backend/src/calendar/recurrence.spec.ts
git commit -m "feat(backend): recorrencia semanal, quinzenal, trimestral e anual

As frequencias em dias somam milissegundos; as em meses reaproveitam a
regra de fim de mes ja testada, agora com passo de 1, 3 ou 12 meses.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Dia útil anterior a um feriado

**Files:**
- Create: `apps/backend/src/calendar/business-days.ts`
- Create: `apps/backend/src/calendar/business-days.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `previousBusinessDay(date: Date, holidays: ReadonlySet<string>): Date`, exportado de `src/calendar/business-days.ts`. `holidays` contém chaves `YYYY-MM-DD`. A função **sempre** recua ao menos um dia — é chamada apenas quando a data cai em feriado.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/backend/src/calendar/business-days.spec.ts`:

```ts
import { previousBusinessDay } from './business-days';

const dia = (date: Date): string => date.toISOString().slice(0, 10);

describe('previousBusinessDay', () => {
  it('recua um dia quando o anterior é dia útil', () => {
    // Tiradentes de 2026 cai numa terça-feira.
    const holidays = new Set(['2026-04-21']);
    expect(dia(previousBusinessDay(new Date('2026-04-21T00:00:00Z'), holidays))).toBe('2026-04-20');
  });

  it('pula o fim de semana quando o feriado cai na segunda', () => {
    // Finados de 2026 cai numa segunda-feira.
    const holidays = new Set(['2026-11-02']);
    expect(dia(previousBusinessDay(new Date('2026-11-02T00:00:00Z'), holidays))).toBe('2026-10-30');
  });

  it('pula feriados emendados', () => {
    // 24/12 (quinta) marcado como feriado força o recuo até 23/12.
    const holidays = new Set(['2026-12-25', '2026-12-24']);
    expect(dia(previousBusinessDay(new Date('2026-12-25T00:00:00Z'), holidays))).toBe('2026-12-23');
  });

  it('atravessa a virada do ano', () => {
    const holidays = new Set(['2026-01-01']);
    expect(dia(previousBusinessDay(new Date('2026-01-01T00:00:00Z'), holidays))).toBe('2025-12-31');
  });

  it('preserva o horário original da data', () => {
    const result = previousBusinessDay(new Date('2026-04-21T12:00:00Z'), new Set(['2026-04-21']));
    expect(result.toISOString()).toBe('2026-04-20T12:00:00.000Z');
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/backend && npx jest src/calendar/business-days.spec.ts`
Expected: FAIL — `Cannot find module './business-days'`.

- [ ] **Step 3: Implementar**

Criar `apps/backend/src/calendar/business-days.ts`:

```ts
const SATURDAY = 6;
const SUNDAY = 0;

/**
 * Máximo de recuos antes de desistir. Um feriado que emende com o fim de
 * semana consome no máximo 4 dias; 10 é folga suficiente e garante que a
 * função nunca gire sem fim se a lista de feriados vier corrompida.
 */
const MAX_STEPS = 10;

/**
 * Primeiro dia útil **anterior** a `date`, pulando sábados, domingos e
 * feriados. Recua sempre ao menos um dia: é chamada apenas quando a data já
 * cai em feriado, e "antecipar" para o próprio dia não faria sentido.
 *
 * Trabalha em UTC (`getUTCDay`, `setUTCDate`) pelo mesmo motivo do resto do
 * módulo: a chave de feriado é `YYYY-MM-DD` em UTC.
 */
export function previousBusinessDay(
  date: Date,
  holidays: ReadonlySet<string>,
): Date {
  const result = new Date(date.getTime());

  for (let step = 0; step < MAX_STEPS; step += 1) {
    result.setUTCDate(result.getUTCDate() - 1);
    const weekday = result.getUTCDay();
    const isWeekend = weekday === SATURDAY || weekday === SUNDAY;
    if (!isWeekend && !holidays.has(result.toISOString().slice(0, 10))) {
      return result;
    }
  }

  return result;
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `cd apps/backend && npx jest src/calendar/business-days.spec.ts`
Expected: PASS — 5 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/calendar/business-days.ts apps/backend/src/calendar/business-days.spec.ts
git commit -m "feat(backend): calculo do dia util anterior a um feriado

Funcao pura que recua pulando fim de semana e feriados, com teto de
iteracoes para nunca girar sem fim.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Cadastro de colaboradores (API)

**Files:**
- Create: `apps/backend/src/calendar/collaborator.schema.ts`
- Create: `apps/backend/src/calendar/collaborators.service.ts`
- Create: `apps/backend/src/calendar/collaborators.controller.ts`
- Modify: `apps/backend/src/calendar/calendar.module.ts`
- Create: `apps/backend/test/collaborators.e2e-spec.ts`

**Interfaces:**
- Consumes: modelo `Collaborator` da Task 1; `collaboratorFactory` de `test/test-utils.ts`.
- Produces:
  - `collaboratorColorSchema` (`z.enum` com os 8 tokens) e `type CollaboratorColor`
  - `COLLABORATOR_COLORS: readonly CollaboratorColor[]`
  - `interface CollaboratorDto { id, name, color, active, createdAt }`
  - `toCollaboratorDto(row: Collaborator): CollaboratorDto`
  - `CollaboratorsService` com `list(tenantId)`, `create(tenantId, actorId, input)`, `update(tenantId, actorId, id, input)`
  - Rotas `GET|POST /calendar/collaborators` e `PATCH /calendar/collaborators/:id`

- [ ] **Step 1: Escrever o e2e que falha**

Criar `apps/backend/test/collaborators.e2e-spec.ts`:

```ts
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
        collaboratorFactory(TENANT_A, { name: 'Bruno Lima', color: 'violet', active: false }),
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
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/backend && npm run test:e2e -- collaborators`
Expected: FAIL — todas as rotas devolvem 404, porque o controller ainda não existe.

- [ ] **Step 3: Escrever o schema**

Criar `apps/backend/src/calendar/collaborator.schema.ts`:

```ts
import { z } from 'zod';
import type { Collaborator } from '@prisma/client';

/**
 * Paleta fixa. Guardamos o **token**, nunca um hex: assim o tema claro/escuro
 * continua governando a aparência e o dado não carrega decisão visual.
 * A tradução para classes acontece no frontend
 * (`features/calendar/lib/collaborator-colors.ts`).
 */
export const collaboratorColorSchema = z.enum([
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'orange',
  'lime',
]);
export type CollaboratorColor = z.infer<typeof collaboratorColorSchema>;

export const COLLABORATOR_COLORS: readonly CollaboratorColor[] =
  collaboratorColorSchema.options;

export const createCollaboratorSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(60, 'Nome muito longo'),
  color: collaboratorColorSchema,
});
export type CreateCollaboratorInput = z.infer<typeof createCollaboratorSchema>;

export const updateCollaboratorSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').max(60).optional(),
    color: collaboratorColorSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict();
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;

export interface CollaboratorDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly active: boolean;
  readonly createdAt: string;
}

export function toCollaboratorDto(row: Collaborator): CollaboratorDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}
```

- [ ] **Step 4: Escrever o service**

Criar `apps/backend/src/calendar/collaborators.service.ts`:

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  toCollaboratorDto,
  type CollaboratorDto,
  type CreateCollaboratorInput,
  type UpdateCollaboratorInput,
} from './collaborator.schema';

/** Código do Prisma para violação de índice único. */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class CollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /** Ativos primeiro, depois alfabético — a UI mostra os inativos no fim. */
  async list(tenantId: string): Promise<CollaboratorDto[]> {
    const rows = await this.prisma.collaborator.findMany({
      where: { tenantId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toCollaboratorDto);
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    try {
      const created = await this.prisma.collaborator.create({
        data: { tenantId, name: input.name, color: input.color },
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'collaborator.created',
        entityType: 'collaborator',
        entityId: created.id,
      });
      return toCollaboratorDto(created);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    await this.ensureOwned(tenantId, id);
    try {
      const updated = await this.prisma.collaborator.update({
        where: { id },
        data: input,
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'collaborator.updated',
        entityType: 'collaborator',
        entityId: id,
      });
      return toCollaboratorDto(updated);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  /**
   * Confere que o id pertence ao tenant antes de qualquer escrita — sem isso,
   * um id de outro escritório seria atualizado sem reclamar.
   */
  private async ensureOwned(tenantId: string, id: string): Promise<void> {
    const found = await this.prisma.collaborator.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Responsável não encontrado');
    }
  }

  private translateUniqueViolation(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return new ConflictException('Já existe um responsável com esse nome');
    }
    return error;
  }
}
```

- [ ] **Step 5: Escrever o controller**

Criar `apps/backend/src/calendar/collaborators.controller.ts`:

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CollaboratorsService } from './collaborators.service';
import {
  createCollaboratorSchema,
  updateCollaboratorSchema,
  type CollaboratorDto,
  type CreateCollaboratorInput,
  type UpdateCollaboratorInput,
} from './collaborator.schema';

@Controller('calendar/collaborators')
@UseGuards(TenantContextGuard)
export class CollaboratorsController {
  constructor(private readonly collaborators: CollaboratorsService) {}

  @Get()
  list(@TenantId() tenantId: string): Promise<CollaboratorDto[]> {
    return this.collaborators.list(tenantId);
  }

  @Post()
  create(
    @CurrentUser() auth: AuthContext,
    @Body(new ZodValidationPipe(createCollaboratorSchema))
    body: CreateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    return this.collaborators.create(auth.tenantId, auth.userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCollaboratorSchema))
    body: UpdateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    return this.collaborators.update(auth.tenantId, auth.userId, id, body);
  }
}
```

- [ ] **Step 6: Registrar no módulo**

Em `apps/backend/src/calendar/calendar.module.ts`, acrescentar o controller e o service às listas existentes:

```ts
  controllers: [CalendarController, CollaboratorsController],
  providers: [CalendarService, CollaboratorsService],
```

com os `import` correspondentes no topo. **Atenção à ordem de rotas:** `CollaboratorsController` usa o prefixo `calendar/collaborators`, distinto de `calendar/obligations`, então não há colisão com o `:id` do `CalendarController`.

- [ ] **Step 7: Rodar para ver passar**

Run: `cd apps/backend && npm run test:e2e -- collaborators`
Expected: PASS — 7 testes.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/calendar apps/backend/test/collaborators.e2e-spec.ts
git commit -m "feat(backend): cadastro de responsaveis com cor da paleta

Lista, cria e altera colaboradores por tenant. Nome repetido devolve 409,
id de outro escritorio devolve 404, e a exclusao e substituida por
desativacao para preservar o historico das tarefas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Feriados do ano expostos antes do cadastro

**Files:**
- Modify: `apps/backend/src/calendar/calendar.schema.ts`
- Modify: `apps/backend/src/calendar/calendar.service.ts`
- Modify: `apps/backend/src/calendar/calendar.controller.ts`
- Modify: `apps/backend/test/calendar.e2e-spec.ts`

**Interfaces:**
- Consumes: `HolidaysService.listByYear(year): Promise<Map<string, string>>`, já existente em `src/brasil-api/holidays.service.ts`.
- Produces:
  - `interface HolidayDto { readonly date: string; readonly name: string }` em `calendar.schema.ts`
  - `holidaysQuerySchema` (`{ year: number }`, faixa 2000–2100)
  - `CalendarService.listHolidays(year: number): Promise<HolidayDto[]>`
  - Rota `GET /calendar/holidays?year=YYYY`

O formulário precisa avisar sobre o feriado **enquanto** o usuário escolhe a data. Buscar o ano inteiro uma vez e resolver localmente evita uma requisição por tecla digitada.

- [ ] **Step 1: Escrever o e2e que falha**

Acrescentar a `apps/backend/test/calendar.e2e-spec.ts` um `describe` novo no fim do arquivo, antes do `});` que fecha o `describe('Calendar (e2e)')`:

```ts
  describe('GET /api/calendar/holidays', () => {
    it('devolve os feriados do ano ordenados por data', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [
          { date: '2026-12-25', name: 'Natal' },
          { date: '2026-04-21', name: 'Tiradentes' },
        ],
      };

      const response = await http()
        .get('/api/calendar/holidays')
        .query({ year: 2026 })
        .expect(200);

      expect(response.body.data).toEqual([
        { date: '2026-04-21', name: 'Tiradentes' },
        { date: '2026-12-25', name: 'Natal' },
      ]);
    });

    it('devolve lista vazia quando a BrasilAPI falha, sem derrubar a rota', async () => {
      brasilApiMock.fail = true;

      const response = await http()
        .get('/api/calendar/holidays')
        .query({ year: 2031 })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('rejeita ano inválido com 422', async () => {
      await http().get('/api/calendar/holidays').query({ year: 'abc' }).expect(422);
    });
  });
```

**Nota:** o `HolidaysService` guarda cache permanente por ano no processo. Como os testes compartilham a mesma aplicação, cada teste usa um ano diferente (`2026`, `2031`) para não colher o cache do vizinho.

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/backend && npm run test:e2e -- calendar`
Expected: FAIL — `GET /api/calendar/holidays` responde 404.

- [ ] **Step 3: Adicionar o schema**

Em `apps/backend/src/calendar/calendar.schema.ts`, acrescentar ao fim:

```ts
export const holidaysQuerySchema = z.object({
  year: z.coerce
    .number({ invalid_type_error: 'Ano inválido' })
    .int('Ano inválido')
    .min(2000, 'Ano fora do intervalo suportado')
    .max(2100, 'Ano fora do intervalo suportado'),
});
export type HolidaysQuery = z.infer<typeof holidaysQuerySchema>;

export interface HolidayDto {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly name: string;
}
```

- [ ] **Step 4: Adicionar o método ao service**

Em `apps/backend/src/calendar/calendar.service.ts`, acrescentar `HolidayDto` aos imports vindos de `./calendar.schema` e inserir o método logo após `list`:

```ts
  /**
   * Feriados do ano para o formulário avisar antes de salvar.
   * `HolidaysService` já cacheia por ano e devolve mapa vazio se a BrasilAPI
   * cair — nesse caso a rota responde `[]` e o formulário simplesmente não
   * mostra aviso.
   */
  async listHolidays(year: number): Promise<HolidayDto[]> {
    const holidays = await this.holidays.listByYear(year);
    return [...holidays.entries()]
      .map(([date, name]) => ({ date, name }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
```

- [ ] **Step 5: Adicionar a rota**

Em `apps/backend/src/calendar/calendar.controller.ts`, incluir `holidaysQuerySchema`, `HolidaysQuery` e `HolidayDto` nos imports de `./calendar.schema` e acrescentar o método **antes** de `list`:

```ts
  @Get('holidays')
  listHolidays(
    @Query(new ZodValidationPipe(holidaysQuerySchema)) query: HolidaysQuery,
  ): Promise<HolidayDto[]> {
    return this.calendar.listHolidays(query.year);
  }
```

- [ ] **Step 6: Rodar para ver passar**

Run: `cd apps/backend && npm run test:e2e -- calendar -t "holidays"`
Expected: PASS — 3 testes. Os demais testes do arquivo continuam falhando: ainda usam `assignee`, que a Task 6 substitui.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/calendar apps/backend/test/calendar.e2e-spec.ts
git commit -m "feat(backend): expoe os feriados do ano para o formulario

Rota GET /calendar/holidays le do cache do HolidaysService e devolve
lista vazia quando a BrasilAPI cai, sem derrubar o calendario.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Tarefas com responsável, tipo, atrasadas e antecipação

**Files:**
- Modify: `apps/backend/src/calendar/calendar.schema.ts`
- Modify: `apps/backend/src/calendar/calendar.service.ts`
- Modify: `apps/backend/test/calendar.e2e-spec.ts`

**Interfaces:**
- Consumes: `generateOccurrences` (Task 2), `previousBusinessDay` (Task 3), `collaboratorColorSchema` (Task 4), `Collaborator` (Task 1).
- Produces:
  - `obligationTypeSchema` (`z.enum(['FOLHA','DOCUMENTOS','GUIAS','CONFERENCIA','OUTRO'])`), `type ObligationType`
  - `recurrenceSchema` com as seis opções, `type Recurrence`
  - `ObligationDto` com `collaborator: { id, name, color }`, `company: { id, name } | null`, `customType`, `recurrence`
  - `toObligationDto(row: ObligationWithRelations, now, holidays): ObligationDto`
  - `ListObligationsQuery` com `collaboratorId?` e `overdueOnly?`
  - `UpdateObligationInput` com `action?: 'anticipate'`

- [ ] **Step 1: Escrever os testes que falham**

Substituir todo o `apps/backend/test/calendar.e2e-spec.ts` — os testes atuais usam `assignee`, que deixou de existir. Manter o `describe('GET /api/calendar/holidays')` da Task 5 no fim. O arquivo novo:

```ts
import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  seedTenants,
  collaboratorFactory,
  brasilApiMock,
  TestContext,
  TENANT_A,
  TENANT_B,
} from './test-utils';

describe('Calendar (e2e)', () => {
  let ctx: TestContext;
  let ana: { id: string };
  let bruno: { id: string };
  let externo: { id: string };

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

    ana = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_A, { name: 'Ana Souza', color: 'blue' }),
    });
    bruno = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_A, { name: 'Bruno Lima', color: 'violet' }),
    });
    externo = await ctx.prisma.collaborator.create({
      data: collaboratorFactory(TENANT_B, { name: 'De outro escritório', color: 'lime' }),
    });
  });

  const http = () => request(ctx.app.getHttpServer());

  const tarefa = (overrides: Record<string, unknown> = {}) => ({
    tenantId: TENANT_A,
    title: 'Tarefa',
    type: 'GUIAS',
    dueDate: new Date('2026-02-15T00:00:00Z'),
    status: 'pending',
    collaboratorId: ana.id,
    ...overrides,
  });

  describe('GET /api/calendar/obligations', () => {
    it('lista o intervalo ordenado por vencimento, com o responsável embutido', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          tarefa({ title: 'Guias Janeiro', dueDate: new Date('2026-01-20T00:00:00Z') }),
          tarefa({ title: 'Folha Fevereiro', type: 'FOLHA', dueDate: new Date('2026-02-15T00:00:00Z') }),
          tarefa({ title: 'Fora do intervalo', dueDate: new Date('2026-05-20T00:00:00Z') }),
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-01-01', to: '2026-03-01' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Guias Janeiro');
      expect(response.body.data[0].overdue).toBe(true);
      expect(response.body.data[0].collaborator).toMatchObject({
        id: ana.id,
        name: 'Ana Souza',
        color: 'blue',
      });
    });

    it('devolve a empresa vinculada, quando houver', async () => {
      const empresa = await ctx.prisma.company.create({
        data: {
          tenantId: TENANT_A,
          name: 'Padaria do João LTDA',
          tradeName: 'Padaria do João',
          cnpj: '11222333000181',
          status: 'active',
          email: 'contato@padaria.com.br',
          phone: '1133334444',
          city: 'São Paulo',
          state: 'SP',
          healthScore: 90,
        },
      });
      await ctx.prisma.obligation.create({
        data: tarefa({ companyId: empresa.id }),
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-02-01', to: '2026-02-28' })
        .expect(200);

      expect(response.body.data[0].company).toMatchObject({
        id: empresa.id,
        name: 'Padaria do João LTDA',
      });
    });

    it('filtra por responsável', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          tarefa({ title: 'Da Ana' }),
          tarefa({ title: 'Do Bruno', collaboratorId: bruno.id }),
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ collaboratorId: bruno.id })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Do Bruno');
    });

    it('nunca lista obrigações de outro tenant', async () => {
      await ctx.prisma.obligation.create({
        data: tarefa({ tenantId: TENANT_B, collaboratorId: externo.id, title: 'Segredo' }),
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ from: '2026-01-01', to: '2026-03-01' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('overdueOnly', () => {
    it('devolve as pendentes vencidas ignorando from/to', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          tarefa({ title: 'Vencida antiga', dueDate: new Date('2020-03-10T00:00:00Z') }),
          tarefa({ title: 'Vencida recente', dueDate: new Date('2021-03-10T00:00:00Z') }),
          tarefa({ title: 'Vencida mas concluída', dueDate: new Date('2020-04-10T00:00:00Z'), status: 'completed' }),
          tarefa({ title: 'Futura', dueDate: new Date('2090-01-10T00:00:00Z') }),
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations')
        .query({ overdueOnly: 'true', from: '2026-01-01', to: '2026-01-31' })
        .expect(200);

      expect(response.body.data.map((o: { title: string }) => o.title)).toEqual([
        'Vencida antiga',
        'Vencida recente',
      ]);
    });
  });

  describe('POST /api/calendar/obligations', () => {
    it('cria uma tarefa avulsa', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Emissão de guias',
          type: 'GUIAS',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(201);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'Emissão de guias',
        type: 'GUIAS',
        customType: null,
        status: 'pending',
        recurrence: 'none',
        recurrenceGroupId: null,
        holidayConflict: null,
      });
    });

    it('materializa 3 ocorrências mensais no mesmo grupo', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Fechamento da folha',
          type: 'FOLHA',
          dueDate: '2026-03-05',
          collaboratorId: ana.id,
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      expect(response.body.data).toHaveLength(3);
      const grupos = new Set(
        response.body.data.map((o: { recurrenceGroupId: string }) => o.recurrenceGroupId),
      );
      expect(grupos.size).toBe(1);
      expect(response.body.data[0].recurrence).toBe('monthly');
    });

    it('exige descrição quando o tipo é OUTRO', async () => {
      await http()
        .post('/api/calendar/obligations')
        .send({ title: 'X', type: 'OUTRO', dueDate: '2026-03-07', collaboratorId: ana.id })
        .expect(422);
    });

    it('aceita OUTRO com descrição e rejeita descrição em tipo conhecido', async () => {
      const ok = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Baixa de protocolo',
          type: 'OUTRO',
          customType: 'Baixa de protocolo na junta',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(201);
      expect(ok.body.data[0].customType).toBe('Baixa de protocolo na junta');

      await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Folha',
          type: 'FOLHA',
          customType: 'não deveria existir',
          dueDate: '2026-03-07',
          collaboratorId: ana.id,
        })
        .expect(422);
    });

    it('devolve 404 quando o responsável é de outro escritório', async () => {
      await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Tentativa',
          type: 'FOLHA',
          dueDate: '2026-03-07',
          collaboratorId: externo.id,
        })
        .expect(404);
    });

    it('sinaliza vencimento que cai em feriado nacional', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [{ date: '2027-04-21', name: 'Tiradentes' }],
      };

      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Envio de guias',
          type: 'GUIAS',
          dueDate: '2027-04-21',
          collaboratorId: bruno.id,
        })
        .expect(201);

      expect(response.body.data[0].holidayConflict).toBe('Tiradentes');
    });
  });

  describe('PATCH /api/calendar/obligations/:id', () => {
    it('marca como concluída sem afetar as irmãs do mesmo grupo', async () => {
      const criadas = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Conferência mensal',
          type: 'CONFERENCIA',
          dueDate: '2026-03-10',
          collaboratorId: ana.id,
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      const alvo = criadas.body.data[1] as { id: string; recurrenceGroupId: string };

      const response = await http()
        .patch(`/api/calendar/obligations/${alvo.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.data.status).toBe('completed');

      const pendentes = await ctx.prisma.obligation.count({
        where: { recurrenceGroupId: alvo.recurrenceGroupId, status: 'pending' },
      });
      expect(pendentes).toBe(2);
    });

    it('antecipa para o dia útil anterior ao feriado', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [{ date: '2029-11-02', name: 'Finados' }],
      };

      // Finados de 2029 cai numa sexta-feira; o dia útil anterior é quinta.
      const criada = await ctx.prisma.obligation.create({
        data: tarefa({ dueDate: new Date('2029-11-02T00:00:00Z') }),
      });

      const response = await http()
        .patch(`/api/calendar/obligations/${criada.id}`)
        .send({ action: 'anticipate' })
        .expect(200);

      expect(response.body.data.dueDate.slice(0, 10)).toBe('2029-11-01');
      expect(response.body.data.holidayConflict).toBeNull();
    });

    it('devolve 404 ao alterar tarefa de outro escritório', async () => {
      const outra = await ctx.prisma.obligation.create({
        data: tarefa({ tenantId: TENANT_B, collaboratorId: externo.id }),
      });

      await http()
        .patch(`/api/calendar/obligations/${outra.id}`)
        .send({ status: 'completed' })
        .expect(404);
    });
  });

  describe('GET /api/calendar/holidays', () => {
    it('devolve os feriados do ano ordenados por data', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [
          { date: '2026-12-25', name: 'Natal' },
          { date: '2026-04-21', name: 'Tiradentes' },
        ],
      };

      const response = await http()
        .get('/api/calendar/holidays')
        .query({ year: 2026 })
        .expect(200);

      expect(response.body.data).toEqual([
        { date: '2026-04-21', name: 'Tiradentes' },
        { date: '2026-12-25', name: 'Natal' },
      ]);
    });

    it('devolve lista vazia quando a BrasilAPI falha, sem derrubar a rota', async () => {
      brasilApiMock.fail = true;

      const response = await http()
        .get('/api/calendar/holidays')
        .query({ year: 2031 })
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('rejeita ano inválido com 422', async () => {
      await http().get('/api/calendar/holidays').query({ year: 'abc' }).expect(422);
    });
  });
});
```

**Nota sobre 02/11/2029:** cai numa sexta-feira, então o dia útil anterior é quinta, 01/11 — sem envolver fim de semana. Datas no futuro distante evitam colisão com o cache de feriados dos outros testes.

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/backend && npm run test:e2e -- calendar`
Expected: FAIL — erros de compilação em `calendar.service.ts` (`assignee` inexistente) e falhas nas rotas novas.

- [ ] **Step 3: Reescrever o schema**

Substituir o conteúdo de `apps/backend/src/calendar/calendar.schema.ts` por:

```ts
import { z } from 'zod';
import type { Collaborator, Obligation } from '@prisma/client';

export const obligationStatusSchema = z.enum(['pending', 'completed']);

/** Catálogo do brief. `OUTRO` abre o campo livre `customType`. */
export const obligationTypeSchema = z.enum([
  'FOLHA',
  'DOCUMENTOS',
  'GUIAS',
  'CONFERENCIA',
  'OUTRO',
]);
export type ObligationType = z.infer<typeof obligationTypeSchema>;

export const recurrenceSchema = z.enum([
  'none',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);
export type Recurrence = z.infer<typeof recurrenceSchema>;

/**
 * `customType` só existe para `OUTRO`. Aceitar nos dois casos deixaria a
 * listagem com dois rótulos concorrentes para a mesma tarefa.
 */
export const createObligationSchema = z
  .object({
    title: z.string().trim().min(1, 'Título é obrigatório').max(120),
    type: obligationTypeSchema,
    customType: z.string().trim().min(1).max(60).optional(),
    dueDate: z.coerce.date({ invalid_type_error: 'Data de vencimento inválida' }),
    companyId: z.string().optional(),
    collaboratorId: z.string().min(1, 'Responsável é obrigatório'),
    recurrence: recurrenceSchema.default('none'),
    occurrences: z.coerce.number().int().min(1).max(24).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'OUTRO' && !value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'Descreva a tarefa quando o tipo for "Outro"',
      });
    }
    if (value.type !== 'OUTRO' && value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'A descrição livre só vale para o tipo "Outro"',
      });
    }
  });
export type CreateObligationInput = z.infer<typeof createObligationSchema>;

export const updateObligationSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    dueDate: z.coerce.date().optional(),
    status: obligationStatusSchema.optional(),
    /** Move o vencimento para o dia útil anterior. Calculado no servidor. */
    action: z.literal('anticipate').optional(),
  })
  .strict();
export type UpdateObligationInput = z.infer<typeof updateObligationSchema>;

/** `'true'` explícito — `z.coerce.boolean()` transformaria `'false'` em `true`. */
const booleanFlag = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const listObligationsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: obligationStatusSchema.optional(),
  collaboratorId: z.string().optional(),
  /** Ignora `from`/`to` e devolve todas as pendentes vencidas. */
  overdueOnly: booleanFlag,
});
export type ListObligationsQuery = z.infer<typeof listObligationsQuerySchema>;

export const holidaysQuerySchema = z.object({
  year: z.coerce
    .number({ invalid_type_error: 'Ano inválido' })
    .int('Ano inválido')
    .min(2000, 'Ano fora do intervalo suportado')
    .max(2100, 'Ano fora do intervalo suportado'),
});
export type HolidaysQuery = z.infer<typeof holidaysQuerySchema>;

export interface HolidayDto {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly name: string;
}

/** Forma que o service consulta: obrigação com responsável e empresa. */
export type ObligationWithRelations = Obligation & {
  collaborator: Collaborator;
  company: { id: string; name: string } | null;
};

export interface ObligationDto {
  readonly id: string;
  readonly title: string;
  readonly type: ObligationType;
  /** Preenchido só quando `type === 'OUTRO'`. */
  readonly customType: string | null;
  readonly dueDate: string;
  readonly status: string;
  readonly recurrence: Recurrence;
  readonly recurrenceGroupId: string | null;
  readonly collaborator: {
    readonly id: string;
    readonly name: string;
    readonly color: string;
  };
  readonly company: { readonly id: string; readonly name: string } | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. Nunca persistido. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}

export function toObligationDto(
  obligation: ObligationWithRelations,
  now: Date = new Date(),
  holidays: ReadonlyMap<string, string> = new Map(),
): ObligationDto {
  // `dueDate` é gravado/lido sempre em UTC (meia-noite), então a fatia
  // YYYY-MM-DD do ISO string bate com a chave do mapa de feriados
  // (também YYYY-MM-DD) sem depender do fuso local do processo.
  const isoDay = obligation.dueDate.toISOString().slice(0, 10);
  return {
    id: obligation.id,
    title: obligation.title,
    type: obligation.type as ObligationType,
    customType: obligation.customType,
    dueDate: obligation.dueDate.toISOString(),
    status: obligation.status,
    recurrence: obligation.recurrence as Recurrence,
    recurrenceGroupId: obligation.recurrenceGroupId,
    collaborator: {
      id: obligation.collaborator.id,
      name: obligation.collaborator.name,
      color: obligation.collaborator.color,
    },
    company: obligation.company,
    overdue: obligation.status === 'pending' && obligation.dueDate < now,
    holidayConflict: holidays.get(isoDay) ?? null,
    createdAt: obligation.createdAt.toISOString(),
  };
}
```

- [ ] **Step 4: Reescrever o service**

Substituir o conteúdo de `apps/backend/src/calendar/calendar.service.ts` por:

```ts
import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { HolidaysService } from '../brasil-api/holidays.service';
import { generateOccurrences } from './recurrence';
import { previousBusinessDay } from './business-days';
import {
  toObligationDto,
  type CreateObligationInput,
  type HolidayDto,
  type ListObligationsQuery,
  type ObligationDto,
  type ObligationWithRelations,
  type UpdateObligationInput,
} from './calendar.schema';

const createRecurrenceGroupId = (): string => `rec_${randomUUID()}`;

/** A faixa de atrasadas é um alerta, não uma listagem completa. */
const OVERDUE_LIMIT = 100;

/** Traz responsável e empresa junto — o DTO precisa dos dois. */
const WITH_RELATIONS = {
  collaborator: true,
  company: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly holidays: HolidaysService,
  ) {}

  async list(
    tenantId: string,
    query: ListObligationsQuery,
  ): Promise<ObligationDto[]> {
    const now = new Date();

    // `overdueOnly` é um modo próprio: ignora o intervalo do mês exibido,
    // porque a faixa do topo mostra atraso de qualquer mês.
    const where: Prisma.ObligationWhereInput = query.overdueOnly
      ? { tenantId, status: 'pending', dueDate: { lt: now } }
      : this.buildRangeWhere(tenantId, query);

    const rows = await this.prisma.obligation.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: WITH_RELATIONS,
      ...(query.overdueOnly ? { take: OVERDUE_LIMIT } : {}),
    });

    const holidays = await this.holidaysForYearsOf(rows);
    return rows.map((row) => toObligationDto(row, now, holidays));
  }

  private buildRangeWhere(
    tenantId: string,
    query: ListObligationsQuery,
  ): Prisma.ObligationWhereInput {
    const where: Prisma.ObligationWhereInput = { tenantId };
    if (query.from || query.to) {
      where.dueDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.collaboratorId) {
      where.collaboratorId = query.collaboratorId;
    }
    return where;
  }

  /**
   * Feriados do ano para o formulário avisar antes de salvar.
   * `HolidaysService` já cacheia por ano e devolve mapa vazio se a BrasilAPI
   * cair — nesse caso a rota responde `[]` e o formulário simplesmente não
   * mostra aviso.
   */
  async listHolidays(year: number): Promise<HolidayDto[]> {
    const holidays = await this.holidays.listByYear(year);
    return [...holidays.entries()]
      .map(([date, name]) => ({ date, name }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Materializa as ocorrências da recorrência (decisão B1 da spec). */
  async create(
    tenantId: string,
    actorId: string,
    input: CreateObligationInput,
  ): Promise<ObligationDto[]> {
    await this.ensureCollaborator(tenantId, input.collaboratorId);

    const dates = generateOccurrences(
      input.dueDate,
      input.recurrence,
      input.occurrences,
    );
    const recurrenceGroupId =
      input.recurrence === 'none' ? null : createRecurrenceGroupId();

    await this.prisma.obligation.createMany({
      data: dates.map((dueDate) => ({
        tenantId,
        title: input.title,
        type: input.type,
        customType: input.customType ?? null,
        dueDate,
        companyId: input.companyId ?? null,
        collaboratorId: input.collaboratorId,
        recurrence: input.recurrence,
        recurrenceGroupId,
      })),
    });

    const created = await this.prisma.obligation.findMany({
      where: recurrenceGroupId
        ? { tenantId, recurrenceGroupId }
        : { tenantId, title: input.title, dueDate: dates[0] },
      orderBy: { dueDate: 'asc' },
      include: WITH_RELATIONS,
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: 'obligation.created',
      entityType: 'obligation',
      entityId: created[0]?.id ?? '',
      metadata: { occurrences: created.length, recurrence: input.recurrence },
    });

    const holidays = await this.holidaysForYearsOf(created);
    const now = new Date();
    return created.map((row) => toObligationDto(row, now, holidays));
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateObligationInput,
  ): Promise<ObligationDto> {
    const current = await this.ensureOwned(tenantId, id);
    const { action, ...fields } = input;

    const data: Prisma.ObligationUpdateInput = { ...fields };
    if (action === 'anticipate') {
      data.dueDate = await this.anticipate(current.dueDate);
    }

    const obligation = await this.prisma.obligation.update({
      where: { id },
      data,
      include: WITH_RELATIONS,
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: action === 'anticipate' ? 'obligation.anticipated' : 'obligation.updated',
      entityType: 'obligation',
      entityId: id,
    });

    const holidays = await this.holidaysForYearsOf([obligation]);
    return toObligationDto(obligation, new Date(), holidays);
  }

  /**
   * Carrega o ano do vencimento **e o anterior**: antecipar 1º de janeiro
   * cai em 31 de dezembro do ano passado, cujos feriados precisam ser
   * conhecidos para não parar em cima de um.
   */
  private async anticipate(dueDate: Date): Promise<Date> {
    const year = dueDate.getUTCFullYear();
    const dates = new Set<string>();
    for (const alvo of [year, year - 1]) {
      for (const date of (await this.holidays.listByYear(alvo)).keys()) {
        dates.add(date);
      }
    }
    return previousBusinessDay(dueDate, dates);
  }

  /**
   * Busca os feriados uma vez por ano presente no resultado — o cache do
   * `HolidaysService` cuida de não repetir a chamada para o mesmo ano.
   * Se a BrasilAPI cair, `HolidaysService` devolve mapa vazio e
   * `holidayConflict` fica `null` em tudo; o calendário nunca lança por isso.
   */
  private async holidaysForYearsOf(
    rows: ReadonlyArray<{ dueDate: Date }>,
  ): Promise<Map<string, string>> {
    const years = [...new Set(rows.map((row) => row.dueDate.getUTCFullYear()))];
    const holidays = new Map<string, string>();
    for (const year of years) {
      for (const [date, name] of await this.holidays.listByYear(year)) {
        holidays.set(date, name);
      }
    }
    return holidays;
  }

  /** Id de outro escritório nunca pode virar vínculo. */
  private async ensureCollaborator(
    tenantId: string,
    collaboratorId: string,
  ): Promise<void> {
    const found = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorId, tenantId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Responsável não encontrado');
    }
  }

  private async ensureOwned(
    tenantId: string,
    id: string,
  ): Promise<ObligationWithRelations> {
    const obligation = await this.prisma.obligation.findFirst({
      where: { id, tenantId },
      include: WITH_RELATIONS,
    });
    if (!obligation) {
      throw new NotFoundException('Obrigação não encontrada');
    }
    return obligation;
  }
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `cd apps/backend && npm run test:e2e -- calendar`
Expected: PASS — 15 testes.

- [ ] **Step 6: Rodar a suíte inteira**

Run: `cd apps/backend && npx jest && npm run test:e2e`
Expected: PASS em tudo. Se `contract.e2e-spec.ts` acusar o formato do `ObligationDto`, atualizar as expectativas para os campos novos (`collaborator`, `company`, `customType`, `recurrence`) e remover `assignee`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/calendar apps/backend/test
git commit -m "feat(backend): tarefas com responsavel, tipo do brief e antecipacao

A obrigacao passa a referenciar o colaborador por id e devolve empresa e
responsavel embutidos. Tipo vira catalogo com OUTRO livre, overdueOnly
lista atrasos de qualquer mes e a acao anticipate move o vencimento para
o dia util anterior.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Fundação do frontend — tipos, paleta, serviços e mocks

**Files:**
- Modify: `apps/frontend/features/calendar/types/calendar.types.ts`
- Create: `apps/frontend/features/calendar/lib/collaborator-colors.ts`
- Create: `apps/frontend/features/calendar/lib/obligation-types.ts`
- Create: `apps/frontend/features/calendar/lib/business-days.ts`
- Create: `apps/frontend/features/calendar/lib/business-days.test.ts`
- Create: `apps/frontend/features/calendar/services/collaborators.service.ts`
- Create: `apps/frontend/features/calendar/services/holidays.service.ts`
- Modify: `apps/frontend/features/calendar/services/calendar.service.ts`
- Modify: `apps/frontend/services/mocks/calendar.mock.ts`

**Interfaces:**
- Consumes: DTOs do backend (Tasks 4–6).
- Produces:
  - Tipos `Collaborator`, `CollaboratorColor`, `Holiday`, `ObligationType`, `Recurrence`, `Obligation` (com `collaborator`, `company`, `customType`, `recurrence`), `CreateObligationInput`, `UpdateObligationInput`
  - `COLLABORATOR_COLORS: readonly CollaboratorColor[]`, `colorClasses(color): { chip, dot, border }`, `nextFreeColor(used): CollaboratorColor`
  - `OBLIGATION_TYPES: readonly { value, label, icon }[]`, `obligationLabel(obligation): string`
  - `previousBusinessDay(date, holidays)` (cópia do backend)
  - `collaboratorsService.list/create/update`, `holidaysService.listByYear`
  - `calendarService.list/listOverdue/create/update`

- [ ] **Step 1: Reescrever os tipos**

Substituir `apps/frontend/features/calendar/types/calendar.types.ts` por:

```ts
export type ObligationStatus = 'pending' | 'completed';

export type ObligationType =
  | 'FOLHA'
  | 'DOCUMENTOS'
  | 'GUIAS'
  | 'CONFERENCIA'
  | 'OUTRO';

export type Recurrence =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type CollaboratorColor =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange'
  | 'lime';

export interface Collaborator {
  readonly id: string;
  readonly name: string;
  readonly color: CollaboratorColor;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface Holiday {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly name: string;
}

export interface Obligation {
  readonly id: string;
  readonly title: string;
  readonly type: ObligationType;
  /** Preenchido só quando `type === 'OUTRO'`. */
  readonly customType: string | null;
  readonly dueDate: string;
  readonly status: ObligationStatus;
  readonly recurrence: Recurrence;
  readonly recurrenceGroupId: string | null;
  readonly collaborator: {
    readonly id: string;
    readonly name: string;
    readonly color: CollaboratorColor;
  };
  readonly company: { readonly id: string; readonly name: string } | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}

export interface CreateObligationInput {
  readonly title: string;
  readonly type: ObligationType;
  readonly customType?: string;
  readonly dueDate: string;
  readonly companyId?: string;
  readonly collaboratorId: string;
  readonly recurrence: Recurrence;
  readonly occurrences: number;
}

export interface UpdateObligationInput {
  readonly title?: string;
  readonly dueDate?: string;
  readonly status?: ObligationStatus;
  readonly action?: 'anticipate';
}

export interface CreateCollaboratorInput {
  readonly name: string;
  readonly color: CollaboratorColor;
}

export interface UpdateCollaboratorInput {
  readonly name?: string;
  readonly color?: CollaboratorColor;
  readonly active?: boolean;
}
```

- [ ] **Step 2: Criar a paleta**

Criar `apps/frontend/features/calendar/lib/collaborator-colors.ts`:

```ts
import type { CollaboratorColor } from '@/features/calendar/types/calendar.types';

/**
 * Ordem da paleta. É a mesma sequência usada pela migration ao converter os
 * responsáveis antigos, e a mesma que `nextFreeColor` percorre.
 */
export const COLLABORATOR_COLORS: readonly CollaboratorColor[] = [
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'orange',
  'lime',
];

interface ColorClasses {
  /** Fundo + texto da tarefa dentro da grade. */
  readonly chip: string;
  /** Bolinha da legenda e dos blocos por responsável. */
  readonly dot: string;
}

/**
 * Classes escritas por extenso, nunca interpoladas (`bg-${color}-500`): o
 * Tailwind varre o código como texto e descartaria a classe montada em tempo
 * de execução.
 */
const CLASSES: Readonly<Record<CollaboratorColor, ColorClasses>> = {
  blue: { chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  violet: { chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  emerald: { chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  amber: { chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  rose: { chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  cyan: { chip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  orange: { chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  lime: { chip: 'bg-lime-500/15 text-lime-700 dark:text-lime-300', dot: 'bg-lime-500' },
};

export function colorClasses(color: CollaboratorColor): ColorClasses {
  return CLASSES[color] ?? CLASSES.blue;
}

/** Primeira cor ainda não usada; volta ao início da paleta se as 8 acabarem. */
export function nextFreeColor(
  used: readonly CollaboratorColor[],
): CollaboratorColor {
  return (
    COLLABORATOR_COLORS.find((color) => !used.includes(color)) ??
    COLLABORATOR_COLORS[used.length % COLLABORATOR_COLORS.length]
  );
}

export const COLOR_LABELS: Readonly<Record<CollaboratorColor, string>> = {
  blue: 'Azul',
  violet: 'Roxo',
  emerald: 'Verde',
  amber: 'Âmbar',
  rose: 'Rosa',
  cyan: 'Ciano',
  orange: 'Laranja',
  lime: 'Limão',
};
```

- [ ] **Step 3: Criar o catálogo de tipos**

Criar `apps/frontend/features/calendar/lib/obligation-types.ts`:

```ts
import {
  CircleDot,
  ClipboardCheck,
  FileUp,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Obligation, ObligationType } from '@/features/calendar/types/calendar.types';

interface ObligationTypeOption {
  readonly value: ObligationType;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** As quatro rotinas do brief, mais a saída livre. */
export const OBLIGATION_TYPES: readonly ObligationTypeOption[] = [
  { value: 'FOLHA', label: 'Fechamento de folha', icon: Users },
  { value: 'DOCUMENTOS', label: 'Envio de documentos', icon: FileUp },
  { value: 'GUIAS', label: 'Emissão de guias', icon: Receipt },
  { value: 'CONFERENCIA', label: 'Conferência mensal', icon: ClipboardCheck },
  { value: 'OUTRO', label: 'Outro', icon: CircleDot },
];

export function typeOption(type: ObligationType): ObligationTypeOption {
  return OBLIGATION_TYPES.find((option) => option.value === type) ?? OBLIGATION_TYPES[4];
}

/** Rótulo do tipo: a descrição livre substitui "Outro" quando existe. */
export function obligationTypeLabel(
  obligation: Pick<Obligation, 'type' | 'customType'>,
): string {
  if (obligation.type === 'OUTRO' && obligation.customType) {
    return obligation.customType;
  }
  return typeOption(obligation.type).label;
}

export const RECURRENCE_LABELS = {
  none: 'Não repete',
  weekly: 'Toda semana',
  biweekly: 'A cada 15 dias',
  monthly: 'Todo mês',
  quarterly: 'A cada 3 meses',
  yearly: 'Todo ano',
} as const;
```

- [ ] **Step 4: Escrever o teste do dia útil (frontend)**

Criar `apps/frontend/features/calendar/lib/business-days.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { previousBusinessDay } from './business-days';

const dia = (date: Date): string => date.toISOString().slice(0, 10);

describe('previousBusinessDay', () => {
  it('recua um dia quando o anterior é dia útil', () => {
    expect(dia(previousBusinessDay(new Date('2026-04-21T00:00:00Z'), new Set(['2026-04-21'])))).toBe(
      '2026-04-20',
    );
  });

  it('pula o fim de semana quando o feriado cai na segunda', () => {
    expect(dia(previousBusinessDay(new Date('2026-11-02T00:00:00Z'), new Set(['2026-11-02'])))).toBe(
      '2026-10-30',
    );
  });

  it('pula feriados emendados', () => {
    const holidays = new Set(['2026-12-25', '2026-12-24']);
    expect(dia(previousBusinessDay(new Date('2026-12-25T00:00:00Z'), holidays))).toBe('2026-12-23');
  });

  it('atravessa a virada do ano', () => {
    expect(dia(previousBusinessDay(new Date('2026-01-01T00:00:00Z'), new Set(['2026-01-01'])))).toBe(
      '2025-12-31',
    );
  });
});
```

- [ ] **Step 5: Rodar para ver falhar**

Run: `cd apps/frontend && npx vitest run features/calendar/lib/business-days.test.ts`
Expected: FAIL — módulo `./business-days` não encontrado.

- [ ] **Step 6: Criar a cópia da função**

Criar `apps/frontend/features/calendar/lib/business-days.ts` com **exatamente** a mesma lógica do backend — o preview do formulário precisa mostrar a data antes de qualquer requisição:

```ts
const SATURDAY = 6;
const SUNDAY = 0;
const MAX_STEPS = 10;

/**
 * Cópia de `apps/backend/src/calendar/business-days.ts`. O cálculo roda dos
 * dois lados: aqui para o preview do formulário, lá para a ação `anticipate`.
 * São doze linhas — compartilhar exigiria um pacote comum que este monorepo
 * não tem. Os dois lados têm o mesmo teste, com os mesmos casos.
 */
export function previousBusinessDay(
  date: Date,
  holidays: ReadonlySet<string>,
): Date {
  const result = new Date(date.getTime());

  for (let step = 0; step < MAX_STEPS; step += 1) {
    result.setUTCDate(result.getUTCDate() - 1);
    const weekday = result.getUTCDay();
    const isWeekend = weekday === SATURDAY || weekday === SUNDAY;
    if (!isWeekend && !holidays.has(result.toISOString().slice(0, 10))) {
      return result;
    }
  }

  return result;
}
```

- [ ] **Step 7: Rodar para ver passar**

Run: `cd apps/frontend && npx vitest run features/calendar/lib/business-days.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 8: Criar o serviço de colaboradores**

Criar `apps/frontend/features/calendar/services/collaborators.service.ts`:

```ts
import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_COLLABORATORS } from '@/services/mocks/calendar.mock';
import type {
  Collaborator,
  CreateCollaboratorInput,
  UpdateCollaboratorInput,
} from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

export const collaboratorsService = {
  async list(signal?: AbortSignal): Promise<readonly Collaborator[]> {
    if (config.useMocks) {
      return MOCK_COLLABORATORS;
    }
    const response = await httpClient.get<ApiResponse<readonly Collaborator[]>>(
      '/calendar/collaborators',
      { signal },
    );
    return response.data;
  },

  async create(input: CreateCollaboratorInput): Promise<Collaborator> {
    const response = await httpClient.post<ApiResponse<Collaborator>>(
      '/calendar/collaborators',
      input,
    );
    return response.data;
  },

  async update(id: string, input: UpdateCollaboratorInput): Promise<Collaborator> {
    const response = await httpClient.patch<ApiResponse<Collaborator>>(
      `/calendar/collaborators/${id}`,
      input,
    );
    return response.data;
  },
} as const;
```

- [ ] **Step 9: Criar o serviço de feriados**

Criar `apps/frontend/features/calendar/services/holidays.service.ts`:

```ts
import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { buildMockHolidays } from '@/services/mocks/calendar.mock';
import type { Holiday } from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

export const holidaysService = {
  async listByYear(year: number, signal?: AbortSignal): Promise<readonly Holiday[]> {
    if (config.useMocks) {
      return buildMockHolidays(year);
    }
    const response = await httpClient.get<ApiResponse<readonly Holiday[]>>(
      `/calendar/holidays?year=${year}`,
      { signal },
    );
    return response.data;
  },
} as const;
```

- [ ] **Step 10: Estender o serviço do calendário**

Substituir `apps/frontend/features/calendar/services/calendar.service.ts` por:

```ts
import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { buildMockObligations } from '@/services/mocks/calendar.mock';
import type {
  CreateObligationInput,
  Obligation,
  UpdateObligationInput,
} from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

interface ListParams {
  readonly from: string;
  readonly to: string;
  readonly collaboratorId?: string;
}

/** Compara apenas a parte de data (YYYY-MM-DD) do ISO string, em UTC. */
function isWithinRange(dueDate: string, from: string, to: string): boolean {
  const day = dueDate.slice(0, 10);
  return day >= from && day <= to;
}

export const calendarService = {
  async list(params: ListParams, signal?: AbortSignal): Promise<readonly Obligation[]> {
    if (config.useMocks) {
      const obligations = buildMockObligations().filter((item) =>
        isWithinRange(item.dueDate, params.from, params.to),
      );
      return params.collaboratorId
        ? obligations.filter((item) => item.collaborator.id === params.collaboratorId)
        : obligations;
    }

    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.collaboratorId) {
      search.set('collaboratorId', params.collaboratorId);
    }
    const response = await httpClient.get<ApiResponse<readonly Obligation[]>>(
      `/calendar/obligations?${search.toString()}`,
      { signal },
    );
    return response.data;
  },

  /** Pendentes vencidas de qualquer mês — alimenta a faixa fixa do topo. */
  async listOverdue(signal?: AbortSignal): Promise<readonly Obligation[]> {
    if (config.useMocks) {
      return buildMockObligations().filter((item) => item.overdue);
    }
    const response = await httpClient.get<ApiResponse<readonly Obligation[]>>(
      '/calendar/obligations?overdueOnly=true',
      { signal },
    );
    return response.data;
  },

  async create(input: CreateObligationInput): Promise<readonly Obligation[]> {
    const response = await httpClient.post<ApiResponse<readonly Obligation[]>>(
      '/calendar/obligations',
      input,
    );
    return response.data;
  },

  async update(id: string, input: UpdateObligationInput): Promise<Obligation> {
    const response = await httpClient.patch<ApiResponse<Obligation>>(
      `/calendar/obligations/${id}`,
      input,
    );
    return response.data;
  },
} as const;
```

- [ ] **Step 11: Atualizar os mocks**

Em `apps/frontend/services/mocks/calendar.mock.ts`: remover o comentário obsoleto do topo (*"O backend ainda não expõe assignee…"* — expõe desde a entrega anterior), exportar `MOCK_COLLABORATORS` e `buildMockHolidays`, e ajustar `buildMockObligations` para devolver o formato novo.

```ts
export const MOCK_COLLABORATORS: readonly Collaborator[] = [
  { id: 'clb_ana', name: 'Ana Souza', color: 'blue', active: true, createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'clb_bruno', name: 'Bruno Lima', color: 'violet', active: true, createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'clb_carla', name: 'Carla Dias', color: 'emerald', active: true, createdAt: '2026-01-02T00:00:00.000Z' },
];

export function buildMockHolidays(year: number): readonly Holiday[] {
  return NATIONAL_HOLIDAYS.map((holiday) => ({
    date: new Date(Date.UTC(year, holiday.month - 1, holiday.day)).toISOString().slice(0, 10),
    name: holiday.name,
  }));
}
```

Importar `Collaborator` e `Holiday` de `@/features/calendar/types/calendar.types` no topo do arquivo. Em `buildMockObligations`, cada objeto devolvido troca `assignee: 'Ana Souza'` por um bloco `collaborator` e ganha os campos novos. O padrão, aplicado a cada uma das obrigações do mock:

```ts
  {
    id: 'obl_1',
    title: 'Fechamento da folha de pagamento',
    type: 'FOLHA',
    customType: null,
    dueDate: due(5),
    status: 'pending',
    recurrence: 'monthly',
    recurrenceGroupId: 'rec_folha',
    collaborator: {
      id: MOCK_COLLABORATORS[0].id,
      name: MOCK_COLLABORATORS[0].name,
      color: MOCK_COLLABORATORS[0].color,
    },
    company: { id: 'cmp_1', name: 'Padaria do João LTDA' },
    overdue: false,
    holidayConflict: null,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
```

Regras para as demais: os `type` passam a ser `'GUIAS'`, `'DOCUMENTOS'` e `'CONFERENCIA'`; quem não é recorrente leva `recurrence: 'none'` e `recurrenceGroupId: null`; ao menos uma leva `overdue: true` (para a faixa do topo aparecer) e ao menos uma leva `holidayConflict` preenchido (para a célula âmbar aparecer); `company: null` é aceitável nas demais. A função `due(...)` que já gera datas relativas ao mês corrente permanece como está — o calendário nunca deve abrir vazio na demonstração.

- [ ] **Step 12: Verificar tipos e lint**

Run: `cd apps/frontend && npm run type-check`
Expected: erros **apenas** em `features/calendar/components/*` e `features/calendar/hooks/use-obligations.ts`, que ainda leem `assignee`. As próximas tasks os corrigem.

- [ ] **Step 13: Commit**

```bash
git add apps/frontend/features/calendar apps/frontend/services/mocks/calendar.mock.ts
git commit -m "feat(frontend): tipos, paleta e servicos das tarefas recorrentes

Paleta de 8 cores com classes escritas por extenso (o Tailwind nao veria
classes interpoladas), catalogo dos tipos do brief, copia testada do
calculo de dia util e servicos de colaboradores, feriados e tarefas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Hooks de dados e painel de responsáveis

**Files:**
- Create: `apps/frontend/features/calendar/hooks/use-collaborators.ts`
- Create: `apps/frontend/features/calendar/hooks/use-holidays.ts`
- Create: `apps/frontend/features/calendar/hooks/use-overdue-obligations.ts`
- Create: `apps/frontend/features/calendar/hooks/use-obligation-mutations.ts`
- Modify: `apps/frontend/features/calendar/hooks/use-obligations.ts`
- Create: `apps/frontend/features/calendar/components/collaborator-manager.tsx`
- Create: `apps/frontend/features/calendar/components/collaborator-legend.tsx`
- Modify: `apps/frontend/app/layout.tsx`

**Interfaces:**
- Consumes: serviços e tipos da Task 7.
- Produces:
  - `useCollaborators()`, `useSaveCollaborator()` (com `create` e `update`)
  - `useHolidays(year)` → `ReadonlySet<string>` e `Map<string,string>`
  - `useOverdueObligations()`
  - `useCreateObligation()`, `useUpdateObligation()`
  - `useObligations(from, to, collaboratorId?)`
  - `<CollaboratorManager open onOpenChange />`
  - `<CollaboratorLegend collaborators selectedId onSelect />`

- [ ] **Step 1: Escrever os hooks de leitura**

Criar `apps/frontend/features/calendar/hooks/use-collaborators.ts`:

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorsService } from '@/features/calendar/services/collaborators.service';
import type {
  CreateCollaboratorInput,
  UpdateCollaboratorInput,
} from '@/features/calendar/types/calendar.types';

export const COLLABORATORS_KEY = ['calendar', 'collaborators'] as const;

export function useCollaborators() {
  return useQuery({
    queryKey: COLLABORATORS_KEY,
    queryFn: ({ signal }) => collaboratorsService.list(signal),
    // A lista muda raramente e é lida por quase todo componente da tela.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveCollaborator() {
  const queryClient = useQueryClient();

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COLLABORATORS_KEY });
    // A cor do responsável aparece dentro de cada tarefa: recolorir precisa
    // repintar o calendário também.
    await queryClient.invalidateQueries({ queryKey: ['calendar', 'obligations'] });
  };

  const create = useMutation({
    mutationFn: (input: CreateCollaboratorInput) => collaboratorsService.create(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCollaboratorInput }) =>
      collaboratorsService.update(id, input),
    onSuccess: invalidate,
  });

  return { create, update };
}
```

Criar `apps/frontend/features/calendar/hooks/use-holidays.ts`:

```ts
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { holidaysService } from '@/features/calendar/services/holidays.service';

/**
 * Feriados do ano inteiro, buscados uma vez. O formulário resolve o aviso
 * localmente — sem isso seria uma requisição a cada tecla digitada na data.
 */
export function useHolidays(year: number) {
  const query = useQuery({
    queryKey: ['calendar', 'holidays', year],
    queryFn: ({ signal }) => holidaysService.listByYear(year, signal),
    // A lista de um ano não muda; o backend também cacheia.
    staleTime: Infinity,
  });

  const byDate = useMemo(
    () => new Map((query.data ?? []).map((holiday) => [holiday.date, holiday.name])),
    [query.data],
  );

  const dates = useMemo(() => new Set(byDate.keys()), [byDate]);

  return { ...query, byDate, dates };
}
```

Criar `apps/frontend/features/calendar/hooks/use-overdue-obligations.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';

/** Atrasadas de qualquer mês — independe do mês exibido na grade. */
export function useOverdueObligations() {
  return useQuery({
    queryKey: ['calendar', 'obligations', 'overdue'],
    queryFn: ({ signal }) => calendarService.listOverdue(signal),
  });
}
```

- [ ] **Step 2: Escrever os hooks de escrita**

Criar `apps/frontend/features/calendar/hooks/use-obligation-mutations.ts`:

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';
import type {
  CreateObligationInput,
  UpdateObligationInput,
} from '@/features/calendar/types/calendar.types';

/** Invalida a grade do mês e a faixa de atrasadas de uma vez. */
function useInvalidateObligations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['calendar', 'obligations'] });
}

export function useCreateObligation() {
  const invalidate = useInvalidateObligations();
  return useMutation({
    mutationFn: (input: CreateObligationInput) => calendarService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateObligation() {
  const invalidate = useInvalidateObligations();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateObligationInput }) =>
      calendarService.update(id, input),
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 3: Ajustar o hook de listagem**

Substituir `apps/frontend/features/calendar/hooks/use-obligations.ts` por:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';

export function useObligations(from: string, to: string, collaboratorId?: string) {
  return useQuery({
    queryKey: ['calendar', 'obligations', from, to, collaboratorId ?? ''],
    queryFn: ({ signal }) => calendarService.list({ from, to, collaboratorId }, signal),
  });
}
```

- [ ] **Step 4: Montar o Toaster**

`sonner` está instalado e `components/ui/sonner.tsx` existe, mas o `<Toaster />` nunca foi montado — sem isso, nenhum `toast()` aparece. Em `apps/frontend/app/layout.tsx`, importar `import { Toaster } from '@/components/ui/sonner';` e renderizá-lo dentro do `<body>`, logo depois do `{children}` (ou dentro do provider mais externo, se houver um).

- [ ] **Step 5: Criar a legenda**

Criar `apps/frontend/features/calendar/components/collaborator-legend.tsx`:

```tsx
'use client';

import { cn } from '@/lib/cn';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import type { Collaborator } from '@/features/calendar/types/calendar.types';

interface CollaboratorLegendProps {
  readonly collaborators: readonly Collaborator[];
  /** Vazio = todos. */
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}

/**
 * Legenda e filtro no mesmo controle: a bolinha ensina a cor de cada pessoa e
 * o clique restringe a grade àquela pessoa. Clicar de novo volta para "todos".
 */
export function CollaboratorLegend({
  collaborators,
  selectedId,
  onSelect,
}: CollaboratorLegendProps): React.ReactNode {
  const ativos = collaborators.filter((person) => person.active);
  if (ativos.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Responsáveis">
      <button
        type="button"
        onClick={() => onSelect('')}
        aria-pressed={selectedId === ''}
        className={cn(
          'rounded-full border px-3 py-1 text-xs transition-colors',
          selectedId === '' ? 'border-primary bg-primary/10' : 'border-input',
        )}
      >
        Todos
      </button>

      {ativos.map((person) => (
        <button
          key={person.id}
          type="button"
          onClick={() => onSelect(selectedId === person.id ? '' : person.id)}
          aria-pressed={selectedId === person.id}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
            selectedId === person.id ? 'border-primary bg-primary/10' : 'border-input',
          )}
        >
          <span
            className={cn('size-2 rounded-full', colorClasses(person.color).dot)}
            aria-hidden
          />
          {person.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Criar o painel de responsáveis**

Criar `apps/frontend/features/calendar/components/collaborator-manager.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  COLLABORATOR_COLORS,
  COLOR_LABELS,
  colorClasses,
  nextFreeColor,
} from '@/features/calendar/lib/collaborator-colors';
import {
  useCollaborators,
  useSaveCollaborator,
} from '@/features/calendar/hooks/use-collaborators';
import { ApiError } from '@/types/api.types';
import type { CollaboratorColor } from '@/features/calendar/types/calendar.types';

interface CollaboratorManagerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CollaboratorManager({
  open,
  onOpenChange,
}: CollaboratorManagerProps): React.ReactNode {
  const { data: collaborators, isLoading } = useCollaborators();
  const { create, update } = useSaveCollaborator();

  const [name, setName] = useState('');
  const [color, setColor] = useState<CollaboratorColor>('blue');
  const [error, setError] = useState<string | null>(null);

  const usadas = (collaborators ?? []).map((person) => person.color);

  async function handleCreate(): Promise<void> {
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), color });
      setName('');
      setColor(nextFreeColor([...usadas, color]));
      toast.success('Responsável adicionado');
    } catch (caught) {
      // 409 volta como erro de campo, não como toast: o problema é o nome.
      setError(
        caught instanceof ApiError && caught.status === 409
          ? caught.message
          : 'Não foi possível salvar o responsável.',
      );
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Responsáveis</DrawerTitle>
          <DrawerDescription>
            Quem cuida das tarefas do escritório. Cada pessoa tem uma cor no calendário.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 px-4 pb-6">
          <section className="space-y-3 rounded-md border p-3">
            <h3 className="text-sm font-medium">Adicionar responsável</h3>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do colaborador"
              aria-label="Nome do colaborador"
            />

            <fieldset>
              <legend className="mb-2 text-xs text-muted-foreground">Cor</legend>
              <div className="flex flex-wrap gap-2">
                {COLLABORATOR_COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={COLOR_LABELS[option]}
                    aria-pressed={color === option}
                    className={cn(
                      'size-7 rounded-full ring-offset-2 transition-all',
                      colorClasses(option).dot,
                      color === option && 'ring-2 ring-foreground',
                    )}
                  />
                ))}
              </div>
            </fieldset>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              onClick={handleCreate}
              disabled={name.trim().length === 0 || create.isPending}
            >
              Adicionar
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Cadastrados</h3>
            {isLoading ? (
              <Loading />
            ) : (
              <ul className="space-y-1">
                {(collaborators ?? []).map((person) => (
                  <li
                    key={person.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md border p-2',
                      !person.active && 'opacity-50',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <span
                        className={cn('size-3 shrink-0 rounded-full', colorClasses(person.color).dot)}
                        aria-hidden
                      />
                      {/* Renomear no lugar: salva ao sair do campo, sem botão extra. */}
                      <input
                        defaultValue={person.name}
                        aria-label={`Nome de ${person.name}`}
                        onBlur={(event) => {
                          const novo = event.target.value.trim();
                          if (novo && novo !== person.name) {
                            update.mutate({ id: person.id, input: { name: novo } });
                          } else {
                            event.target.value = person.name;
                          }
                        }}
                        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-input focus:border-input focus:outline-none"
                      />
                      {!person.active ? (
                        <span className="shrink-0 text-xs text-muted-foreground">(inativo)</span>
                      ) : null}
                    </span>

                    <span className="flex items-center gap-1">
                      {COLLABORATOR_COLORS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-label={`Cor ${COLOR_LABELS[option]} para ${person.name}`}
                          onClick={() =>
                            update.mutate({ id: person.id, input: { color: option } })
                          }
                          className={cn(
                            'size-4 rounded-full',
                            colorClasses(option).dot,
                            person.color === option && 'ring-2 ring-foreground ring-offset-1',
                          )}
                        />
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() =>
                          update.mutate({
                            id: person.id,
                            input: { active: !person.active },
                          })
                        }
                      >
                        {person.active ? 'Desativar' : 'Reativar'}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

Se o `Button` do projeto não aceitar `size="sm"`, usar `className="ml-2 h-8 px-2 text-xs"` no lugar.

- [ ] **Step 7: Verificar tipos**

Run: `cd apps/frontend && npm run type-check`
Expected: erros restantes apenas em `month-grid.tsx` e `calendar-view.tsx`, que ainda leem `assignee`.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/features/calendar apps/frontend/app/layout.tsx
git commit -m "feat(frontend): painel de responsaveis com cor e hooks de dados

Adiciona, renomeia, recolore e desativa colaboradores; nome repetido
aparece como erro no campo, nao como toast. Monta o Toaster no layout,
que estava instalado mas nunca renderizado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Formulário de cadastro com aviso de feriado

**Files:**
- Create: `apps/frontend/features/calendar/lib/recurrence-preview.ts`
- Create: `apps/frontend/features/calendar/schemas/obligation.schema.ts`
- Create: `apps/frontend/features/calendar/components/obligation-form.tsx`
- Create: `apps/frontend/features/calendar/components/obligation-form.test.tsx`

**Interfaces:**
- Consumes: `useCollaborators`, `useCreateObligation`, `useHolidays` (Task 8); `previousBusinessDay`, `OBLIGATION_TYPES`, `RECURRENCE_LABELS` (Task 7); `useCompanies` de `@/features/companies/hooks/use-companies`.
- Produces:
  - `previewOccurrences(startISO, recurrence, occurrences): string[]` (datas `YYYY-MM-DD`)
  - `obligationFormSchema` e `type ObligationFormValues`
  - `<ObligationForm open onOpenChange />`

- [ ] **Step 1: Criar o preview de recorrência**

Criar `apps/frontend/features/calendar/lib/recurrence-preview.ts`. Espelha `generateOccurrences` do backend para o usuário ver o que vai criar **antes** de salvar:

```ts
import type { Recurrence } from '@/features/calendar/types/calendar.types';

const MAX_OCCURRENCES = 24;
const DAY_STEP: Readonly<Partial<Record<Recurrence, number>>> = {
  weekly: 7,
  biweekly: 14,
};
const MONTH_STEP: Readonly<Partial<Record<Recurrence, number>>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Datas que o cadastro vai gerar, em `YYYY-MM-DD`. Mesma regra do backend
 * (`src/calendar/recurrence.ts`), inclusive o ajuste de fim de mês — o preview
 * mentiria se divergisse do que é gravado.
 */
export function previewOccurrences(
  startISODay: string,
  recurrence: Recurrence,
  occurrences: number,
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISODay)) {
    return [];
  }

  const [year, month, day] = startISODay.split('-').map(Number);
  if (recurrence === 'none') {
    return [startISODay];
  }

  const total = Math.min(MAX_OCCURRENCES, Math.max(1, occurrences));
  const days = DAY_STEP[recurrence];
  const start = Date.UTC(year, month - 1, day);

  if (days !== undefined) {
    return Array.from({ length: total }, (_, index) =>
      new Date(start + index * days * 86_400_000).toISOString().slice(0, 10),
    );
  }

  const months = MONTH_STEP[recurrence] ?? 1;
  return Array.from({ length: total }, (_, index) => {
    const target = month - 1 + index * months;
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, target, Math.min(day, lastDay)))
      .toISOString()
      .slice(0, 10);
  });
}
```

- [ ] **Step 2: Criar o schema do formulário**

Criar `apps/frontend/features/calendar/schemas/obligation.schema.ts`:

```ts
import { z } from 'zod';

export const obligationFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe um título').max(120, 'Título muito longo'),
    type: z.enum(['FOLHA', 'DOCUMENTOS', 'GUIAS', 'CONFERENCIA', 'OUTRO']),
    customType: z.string().trim().max(60, 'Descrição muito longa').optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data de vencimento'),
    companyId: z.string().optional(),
    collaboratorId: z.string().min(1, 'Escolha um responsável'),
    recurrence: z.enum(['none', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
    occurrences: z.coerce.number().int().min(1).max(24),
  })
  .superRefine((value, ctx) => {
    // Espelha a regra do backend: "Outro" sem descrição não identifica a tarefa.
    if (value.type === 'OUTRO' && !value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'Descreva a tarefa quando o tipo for "Outro"',
      });
    }
  });

export type ObligationFormValues = z.infer<typeof obligationFormSchema>;
```

- [ ] **Step 3: Escrever o teste que falha**

Criar `apps/frontend/features/calendar/components/obligation-form.test.tsx`. Testa as duas regras próprias do formulário — a validação de "Outro" e o aviso de feriado — sem depender de rede:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ObligationForm } from './obligation-form';

vi.mock('@/features/calendar/hooks/use-collaborators', () => ({
  useCollaborators: () => ({
    data: [{ id: 'clb_ana', name: 'Ana Souza', color: 'blue', active: true, createdAt: '' }],
    isLoading: false,
  }),
}));

vi.mock('@/features/companies/hooks/use-companies', () => ({
  useCompanies: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/features/calendar/hooks/use-holidays', () => ({
  useHolidays: () => ({
    byDate: new Map([['2026-12-25', 'Natal']]),
    dates: new Set(['2026-12-25']),
    isLoading: false,
  }),
}));

const createMutate = vi.fn();
vi.mock('@/features/calendar/hooks/use-obligation-mutations', () => ({
  useCreateObligation: () => ({ mutateAsync: createMutate, isPending: false }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ObligationForm open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ObligationForm', () => {
  it('avisa quando o vencimento cai em feriado nacional', async () => {
    renderForm();

    const data = screen.getByLabelText('Vencimento');
    await userEvent.clear(data);
    await userEvent.type(data, '2026-12-25');

    expect(await screen.findByText(/Natal/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Antecipar para o dia útil anterior/ }),
    ).toBeInTheDocument();
  });

  it('antecipa a data para o dia útil anterior ao clicar no botão', async () => {
    renderForm();

    const data = screen.getByLabelText('Vencimento');
    await userEvent.clear(data);
    await userEvent.type(data, '2026-12-25');

    await userEvent.click(
      await screen.findByRole('button', { name: /Antecipar para o dia útil anterior/ }),
    );

    // 25/12/2026 cai numa sexta-feira; o dia útil anterior é quinta, 24/12.
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-12-24');
  });

  it('exige a descrição quando o tipo é "Outro"', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Título'), 'Baixa de protocolo');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'OUTRO');
    await userEvent.type(screen.getByLabelText('Vencimento'), '2026-08-10');
    await userEvent.selectOptions(screen.getByLabelText('Responsável'), 'clb_ana');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));

    expect(
      await screen.findByText('Descreva a tarefa quando o tipo for "Outro"'),
    ).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Rodar para ver falhar**

Run: `cd apps/frontend && npx vitest run features/calendar/components/obligation-form.test.tsx`
Expected: FAIL — módulo `./obligation-form` não encontrado.

- [ ] **Step 5: Implementar o formulário**

Criar `apps/frontend/features/calendar/components/obligation-form.tsx`. Usa `<select>` nativo (como o filtro já existente em `calendar-view.tsx`) em vez do `Select` do Radix: o teste acima depende de `selectOptions`, e o controle nativo já funciona bem em telas pequenas.

```tsx
'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollaborators } from '@/features/calendar/hooks/use-collaborators';
import { useCreateObligation } from '@/features/calendar/hooks/use-obligation-mutations';
import { useHolidays } from '@/features/calendar/hooks/use-holidays';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { OBLIGATION_TYPES, RECURRENCE_LABELS } from '@/features/calendar/lib/obligation-types';
import { previousBusinessDay } from '@/features/calendar/lib/business-days';
import { previewOccurrences } from '@/features/calendar/lib/recurrence-preview';
import {
  obligationFormSchema,
  type ObligationFormValues,
} from '@/features/calendar/schemas/obligation.schema';

interface ObligationFormProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

const formatDay = (isoDay: string): string =>
  DATE_FORMATTER.format(new Date(`${isoDay}T00:00:00Z`));

const today = (): string => new Date().toISOString().slice(0, 10);

export function ObligationForm({ open, onOpenChange }: ObligationFormProps): React.ReactNode {
  const { data: collaborators } = useCollaborators();
  const { data: companies } = useCompanies({ page: 1, pageSize: 100 });
  const create = useCreateObligation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ObligationFormValues>({
    resolver: zodResolver(obligationFormSchema),
    defaultValues: {
      title: '',
      type: 'FOLHA',
      customType: '',
      dueDate: today(),
      companyId: '',
      collaboratorId: '',
      recurrence: 'monthly',
      occurrences: 12,
    },
  });

  const type = watch('type');
  const dueDate = watch('dueDate');
  const recurrence = watch('recurrence');
  const occurrences = Number(watch('occurrences')) || 1;

  const year = Number(dueDate?.slice(0, 4)) || new Date().getUTCFullYear();
  const { byDate, dates } = useHolidays(year);
  const holidayName = dueDate ? (byDate.get(dueDate) ?? null) : null;

  const preview = useMemo(
    () => previewOccurrences(dueDate ?? '', recurrence, occurrences),
    [dueDate, recurrence, occurrences],
  );

  function handleAnticipate(): void {
    if (!dueDate) return;
    const moved = previousBusinessDay(new Date(`${dueDate}T00:00:00Z`), dates);
    setValue('dueDate', moved.toISOString().slice(0, 10), { shouldValidate: true });
  }

  async function onSubmit(values: ObligationFormValues): Promise<void> {
    const created = await create.mutateAsync({
      title: values.title,
      type: values.type,
      // O backend rejeita descrição livre em tipo conhecido.
      customType: values.type === 'OUTRO' ? values.customType : undefined,
      dueDate: values.dueDate,
      companyId: values.companyId || undefined,
      collaboratorId: values.collaboratorId,
      recurrence: values.recurrence,
      occurrences: values.recurrence === 'none' ? 1 : values.occurrences,
    });

    toast.success(
      created.length === 1
        ? 'Tarefa criada'
        : `${created.length} tarefas criadas no calendário`,
    );
    reset();
    onOpenChange(false);
  }

  const ativos = (collaborators ?? []).filter((person) => person.active);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Nova tarefa</DrawerTitle>
          <DrawerDescription>
            Rotinas do escritório, com repetição automática nos próximos períodos.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6">
          <Field label="Título" error={errors.title?.message}>
            <Input id="title" {...register('title')} placeholder="Ex.: Fechamento da folha" />
          </Field>

          <Field label="Tipo" error={errors.type?.message}>
            <select id="type" {...register('type')} className={SELECT_CLASS}>
              {OBLIGATION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {type === 'OUTRO' ? (
            <Field label="Descrição" error={errors.customType?.message}>
              <Input
                id="customType"
                {...register('customType')}
                placeholder="Ex.: Baixa de protocolo na junta"
              />
            </Field>
          ) : null}

          <Field label="Empresa" error={errors.companyId?.message} hint="Opcional">
            <select id="companyId" {...register('companyId')} className={SELECT_CLASS}>
              <option value="">Sem empresa vinculada</option>
              {(companies?.data ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Responsável" error={errors.collaboratorId?.message}>
            <select id="collaboratorId" {...register('collaboratorId')} className={SELECT_CLASS}>
              <option value="">Escolha um responsável</option>
              {ativos.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Vencimento" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...register('dueDate')} />
          </Field>

          {holidayName ? (
            <div
              role="status"
              className="space-y-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm"
            >
              <p className="flex items-center gap-2">
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                {formatDay(dueDate)} é {holidayName} — essa tarefa vence em feriado nacional.
              </p>
              <Button type="button" variant="outline" onClick={handleAnticipate}>
                Antecipar para o dia útil anterior
              </Button>
            </div>
          ) : null}

          <Field label="Repetir" error={errors.recurrence?.message}>
            <select id="recurrence" {...register('recurrence')} className={SELECT_CLASS}>
              {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          {recurrence !== 'none' ? (
            <Field label="Quantas vezes" error={errors.occurrences?.message}>
              <Input id="occurrences" type="number" min={1} max={24} {...register('occurrences')} />
            </Field>
          ) : null}

          {preview.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Serão criadas {preview.length} tarefas:{' '}
              {preview.slice(0, 3).map(formatDay).join(', ')}
              {preview.length > 3 ? ` … ${formatDay(preview[preview.length - 1])}` : ''}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              Salvar tarefa
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

function Field({
  label,
  error,
  hint,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly children: React.ReactElement<{ id?: string }>;
}): React.ReactNode {
  const id = children.props.id;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {hint ? <span className="ml-2 text-xs text-muted-foreground">{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Rodar para ver passar**

Run: `cd apps/frontend && npx vitest run features/calendar/components/obligation-form.test.tsx`
Expected: PASS — 3 testes.

Se o `userEvent.type` num `<input type="date">` não fixar o valor no jsdom, trocar por
`fireEvent.change(data, { target: { value: '2026-12-25' } })` (importando `fireEvent` de `@testing-library/react`) — o comportamento do componente é o mesmo.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/features/calendar
git commit -m "feat(frontend): cadastro de tarefa com aviso de feriado e preview

Formulario com os 4 tipos do brief mais 'Outro' livre, empresa opcional,
responsavel e cinco frequencias. Data em feriado abre aviso com botao de
antecipar, e o preview mostra as datas antes de salvar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Grade colorida por responsável e clicável

**Files:**
- Modify: `apps/frontend/features/calendar/components/month-grid.tsx`

**Interfaces:**
- Consumes: `colorClasses` e `obligationTypeLabel` (Task 7).
- Produces: `<MonthGrid month obligations onSelect />`, onde `onSelect: (obligation: Obligation) => void` é chamado ao clicar numa tarefa.

- [ ] **Step 1: Reescrever o componente**

Substituir `apps/frontend/features/calendar/components/month-grid.tsx` por:

```tsx
'use client';

import { cn } from '@/lib/cn';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import { obligationTypeLabel } from '@/features/calendar/lib/obligation-types';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface MonthGridProps {
  /** Meia-noite UTC do primeiro dia do mês exibido (ver nota de fuso abaixo). */
  readonly month: Date;
  readonly obligations: readonly Obligation[];
  readonly onSelect: (obligation: Obligation) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/**
 * A grade e as obrigações precisam concordar sobre "qual dia é qual" sem
 * depender do fuso horário do navegador. Por isso tudo aqui usa métodos UTC
 * (`getUTCDate`, `getUTCDay`, `Date.UTC`) — nunca `getDate`/`getDay` locais.
 * `CalendarView` monta `month` como meia-noite UTC do dia 1 e gera `dueDate`
 * das obrigações também ancorado em UTC, então os dois lados sempre batem.
 */
export function MonthGrid({ month, obligations, onSelect }: MonthGridProps): React.ReactNode {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const byDay = new Map<number, Obligation[]>();
  for (const obligation of obligations) {
    const day = new Date(obligation.dueDate).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), obligation]);
  }

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((label, index) => (
          <div key={`${label}-${index}`} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-20 rounded-md" />;
          }

          const items = byDay.get(day) ?? [];
          // O feriado é propriedade do DIA; o atraso, de cada tarefa.
          const holiday = items.find((item) => item.holidayConflict !== null)?.holidayConflict;

          return (
            <div
              key={day}
              className={cn(
                'min-h-20 rounded-md border p-1 text-left',
                holiday && 'border-amber-500/60 bg-amber-500/5',
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-medium">{day}</span>
                {holiday ? (
                  <span className="truncate text-[9px] text-amber-600 dark:text-amber-400">
                    {holiday}
                  </span>
                ) : null}
              </div>

              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      title={`${item.title} — ${obligationTypeLabel(item)} — ${item.collaborator.name}${
                        item.holidayConflict ? ` (feriado: ${item.holidayConflict})` : ''
                      }${item.overdue ? ' — em atraso' : ''}`}
                      className={cn(
                        'w-full truncate rounded px-1 py-0.5 text-left text-[10px] transition-opacity hover:opacity-80',
                        // O vermelho do atraso prevalece sobre a cor da pessoa:
                        // é o sinal mais urgente da tela.
                        item.overdue
                          ? 'bg-destructive/15 font-medium text-destructive'
                          : colorClasses(item.collaborator.color).chip,
                        item.status === 'completed' && 'line-through opacity-50',
                      )}
                    >
                      {item.overdue ? '⚠ ' : ''}
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

A cor nunca é o único portador de informação: o atraso traz também o sinal `⚠` e o texto no `title`, e o nome do responsável aparece na lista da Task 13.

- [ ] **Step 2: Verificar tipos**

Run: `cd apps/frontend && npm run type-check`
Expected: o único erro restante é em `calendar-view.tsx`, que ainda não passa `onSelect` e ainda lê `assignee`. A Task 14 fecha isso.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/features/calendar/components/month-grid.tsx
git commit -m "feat(frontend): grade pintada pela cor do responsavel

Cada tarefa vira botao clicavel com a cor de quem responde por ela; o
vermelho do atraso prevalece sobre a cor da pessoa e o feriado passa a
mostrar o nome dentro da celula do dia.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Painel de detalhe da tarefa

**Files:**
- Create: `apps/frontend/features/calendar/components/obligation-detail.tsx`

**Interfaces:**
- Consumes: `useUpdateObligation` (Task 8), `useHolidays` (Task 8), `obligationTypeLabel`, `RECURRENCE_LABELS`, `colorClasses` (Task 7), `ROUTES` de `@/constants/routes`.
- Produces: `<ObligationDetail obligation onClose />`, com `obligation: Obligation | null` (nulo = fechado).

- [ ] **Step 1: Criar o componente**

Criar `apps/frontend/features/calendar/components/obligation-detail.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUpdateObligation } from '@/features/calendar/hooks/use-obligation-mutations';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import {
  obligationTypeLabel,
  RECURRENCE_LABELS,
} from '@/features/calendar/lib/obligation-types';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface ObligationDetailProps {
  /** `null` mantém o painel fechado. */
  readonly obligation: Obligation | null;
  readonly onClose: () => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export function ObligationDetail({
  obligation,
  onClose,
}: ObligationDetailProps): React.ReactNode {
  const update = useUpdateObligation();

  if (!obligation) {
    return null;
  }

  const isoDay = obligation.dueDate.slice(0, 10);

  async function run(
    input: Parameters<typeof update.mutateAsync>[0]['input'],
    message: string,
  ): Promise<void> {
    if (!obligation) return;
    try {
      await update.mutateAsync({ id: obligation.id, input });
      toast.success(message);
      onClose();
    } catch {
      toast.error('Não foi possível salvar a alteração.');
    }
  }

  return (
    <Drawer open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{obligation.title}</DrawerTitle>
          <DrawerDescription>{obligationTypeLabel(obligation)}</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="flex flex-wrap gap-2">
            {obligation.overdue ? <Badge variant="destructive">Em atraso</Badge> : null}
            {obligation.status === 'completed' ? (
              <Badge variant="success">Concluída</Badge>
            ) : null}
            {obligation.holidayConflict ? (
              <Badge variant="warning">Feriado: {obligation.holidayConflict}</Badge>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Responsável
              </dt>
              <dd className="flex items-center gap-2 text-sm">
                <span
                  className={cn('size-3 rounded-full', colorClasses(obligation.collaborator.color).dot)}
                  aria-hidden
                />
                {obligation.collaborator.name}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</dt>
              <dd className="text-sm">
                {obligation.company ? (
                  <Link
                    href={`/companies/${obligation.company.id}`}
                    className="underline underline-offset-4"
                  >
                    {obligation.company.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Vencimento</dt>
              <dd className="text-sm">{DATE_FORMATTER.format(new Date(obligation.dueDate))}</dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Repetição</dt>
              <dd className="text-sm">{RECURRENCE_LABELS[obligation.recurrence]}</dd>
            </div>
          </dl>

          {obligation.holidayConflict ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                O vencimento cai em {obligation.holidayConflict}. Antecipar move a data para o
                dia útil anterior.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {obligation.status === 'pending' ? (
              <Button
                onClick={() => run({ status: 'completed' }, 'Tarefa concluída')}
                disabled={update.isPending}
              >
                Marcar como concluída
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => run({ status: 'pending' }, 'Tarefa reaberta')}
                disabled={update.isPending}
              >
                Reabrir tarefa
              </Button>
            )}

            {obligation.holidayConflict ? (
              <Button
                variant="outline"
                onClick={() => run({ action: 'anticipate' }, 'Vencimento antecipado')}
                disabled={update.isPending}
              >
                Antecipar
              </Button>
            ) : null}
          </div>

          <div className="space-y-1 border-t pt-4">
            <label htmlFor="detail-due-date" className="text-sm font-medium">
              Alterar data
            </label>
            <input
              id="detail-due-date"
              type="date"
              defaultValue={isoDay}
              onChange={(event) => {
                if (event.target.value) {
                  void run({ dueDate: event.target.value }, 'Data alterada');
                }
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

Conferir se `@/constants/routes` já expõe a rota de detalhe da empresa; se sim, usar essa constante em vez da string `/companies/${id}`.

- [ ] **Step 2: Verificar tipos**

Run: `cd apps/frontend && npm run type-check`
Expected: mesmo erro pendente de `calendar-view.tsx` da task anterior; nenhum erro novo.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/features/calendar/components/obligation-detail.tsx
git commit -m "feat(frontend): painel de detalhe com concluir e antecipar

Clicar na tarefa abre empresa, responsavel, prazo e repeticao, com os
botoes de concluir, reabrir, antecipar (so quando cai em feriado) e
alterar a data.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Faixa fixa de atrasadas

**Files:**
- Create: `apps/frontend/features/calendar/components/overdue-banner.tsx`

**Interfaces:**
- Consumes: `useOverdueObligations` (Task 8), `colorClasses`, `obligationTypeLabel` (Task 7).
- Produces: `<OverdueBanner onSelect />`, com `onSelect: (obligation: Obligation) => void`.

Uma tarefa que venceu em junho não aparece na grade de julho. A faixa resolve isso: mostra o atraso de **qualquer** mês, independente do que está na tela.

- [ ] **Step 1: Criar o componente**

Criar `apps/frontend/features/calendar/components/overdue-banner.tsx`:

```tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import { obligationTypeLabel } from '@/features/calendar/lib/obligation-types';
import { useOverdueObligations } from '@/features/calendar/hooks/use-overdue-obligations';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface OverdueBannerProps {
  readonly onSelect: (obligation: Obligation) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

export function OverdueBanner({ onSelect }: OverdueBannerProps): React.ReactNode {
  const { data } = useOverdueObligations();
  const atrasadas = data ?? [];

  // Sem atraso, a faixa não ocupa espaço nenhum na tela.
  if (atrasadas.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Tarefas em atraso"
      className="rounded-md border border-destructive/50 bg-destructive/5 p-3"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="size-4" aria-hidden />
        {atrasadas.length === 1
          ? '1 tarefa em atraso'
          : `${atrasadas.length} tarefas em atraso`}
      </h2>

      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {atrasadas.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-1 py-1 text-left text-xs hover:bg-destructive/10"
            >
              <span className="font-medium tabular-nums text-destructive">
                {DATE_FORMATTER.format(new Date(item.dueDate))}
              </span>
              <span className="font-medium">{item.title}</span>
              <span className="text-muted-foreground">{obligationTypeLabel(item)}</span>
              {item.company ? (
                <span className="text-muted-foreground">· {item.company.name}</span>
              ) : null}
              <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn('size-2 rounded-full', colorClasses(item.collaborator.color).dot)}
                  aria-hidden
                />
                {item.collaborator.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: o único erro restante é o de `calendar-view.tsx` (ainda não usa os componentes novos); nenhum erro dentro de `overdue-banner.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/features/calendar/components/overdue-banner.tsx
git commit -m "feat(frontend): faixa fixa com os atrasos de qualquer mes

Tarefa vencida em junho deixava de aparecer ao navegar para julho. A
faixa lista todas as pendentes vencidas com data, empresa e responsavel,
e some quando nao ha atraso.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Lista agrupada por responsável

**Files:**
- Create: `apps/frontend/features/calendar/components/assignee-task-list.tsx`

**Interfaces:**
- Consumes: `useUpdateObligation` (Task 8), `colorClasses`, `obligationTypeLabel` (Task 7).
- Produces: `<AssigneeTaskList obligations onSelect />`.

- [ ] **Step 1: Criar o componente**

Criar `apps/frontend/features/calendar/components/assignee-task-list.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import { obligationTypeLabel } from '@/features/calendar/lib/obligation-types';
import { useUpdateObligation } from '@/features/calendar/hooks/use-obligation-mutations';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface AssigneeTaskListProps {
  /** Tarefas do mês exibido — a faixa de atrasadas cuida dos outros meses. */
  readonly obligations: readonly Obligation[];
  readonly onSelect: (obligation: Obligation) => void;
}

interface Grupo {
  readonly id: string;
  readonly name: string;
  readonly color: Obligation['collaborator']['color'];
  readonly items: readonly Obligation[];
  readonly atrasadas: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

export function AssigneeTaskList({
  obligations,
  onSelect,
}: AssigneeTaskListProps): React.ReactNode {
  const update = useUpdateObligation();

  const grupos = useMemo<readonly Grupo[]>(() => {
    const porPessoa = new Map<string, Obligation[]>();
    for (const item of obligations) {
      const atual = porPessoa.get(item.collaborator.id) ?? [];
      atual.push(item);
      porPessoa.set(item.collaborator.id, atual);
    }

    return [...porPessoa.values()]
      .map((items) => ({
        id: items[0].collaborator.id,
        name: items[0].collaborator.name,
        color: items[0].collaborator.color,
        items: [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        atrasadas: items.filter((item) => item.overdue).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [obligations]);

  if (grupos.length === 0) {
    return null;
  }

  async function toggle(item: Obligation): Promise<void> {
    try {
      await update.mutateAsync({
        id: item.id,
        input: { status: item.status === 'completed' ? 'pending' : 'completed' },
      });
    } catch {
      toast.error('Não foi possível atualizar a tarefa.');
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {grupos.map((grupo) => (
        <Card key={grupo.id} className="p-3">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className={cn('size-3 rounded-full', colorClasses(grupo.color).dot)} aria-hidden />
            {grupo.name}
            <span className="font-normal text-muted-foreground">
              {grupo.items.length === 1 ? '1 tarefa' : `${grupo.items.length} tarefas`}
              {grupo.atrasadas > 0 ? ` · ${grupo.atrasadas} atrasadas` : ''}
            </span>
          </h3>

          <ul className="mt-2 space-y-1">
            {grupo.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={item.status === 'completed'}
                  onChange={() => void toggle(item)}
                  aria-label={`Concluir ${item.title}`}
                  className="size-4 shrink-0 rounded border-input"
                />
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 text-left hover:underline',
                    item.status === 'completed' && 'line-through opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      item.overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {DATE_FORMATTER.format(new Date(item.dueDate))}
                  </span>
                  <span className="truncate">
                    {item.title}
                    {item.company ? ` — ${item.company.name}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {obligationTypeLabel(item)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
```

A caixinha dá baixa direto, sem abrir painel — é o que permite concluir várias tarefas em série. O clique no texto abre o detalhe.

- [ ] **Step 2: Verificar tipos e lint**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: o único erro restante é o de `calendar-view.tsx`; nenhum erro dentro de `assignee-task-list.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/features/calendar/components/assignee-task-list.tsx
git commit -m "feat(frontend): lista do mes agrupada por responsavel

Um bloco por pessoa, na cor dela, com contagem de tarefas e de atrasos.
A caixinha conclui direto, para dar baixa em serie sem abrir painel.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Montagem da tela e verificação final

**Files:**
- Create: `apps/frontend/features/calendar/hooks/use-month-anchor.ts`
- Modify: `apps/frontend/features/calendar/components/calendar-view.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 7–13.
- Produces: `useMonthAnchor()` → `{ month, from, to, label, goPrevious, goNext, goToToday }`; `CalendarView` como orquestrador.

`CalendarView` hoje concentra estado, cálculo de datas, filtro e layout. Com quatro componentes novos passaria de 300 linhas. O cálculo de âncora sai para um hook e o componente só compõe.

- [ ] **Step 1: Extrair a âncora de mês**

Criar `apps/frontend/features/calendar/hooks/use-month-anchor.ts`:

```ts
'use client';

import { useMemo, useState } from 'react';

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** YYYY-MM-DD em UTC — nunca sofre o deslocamento que `toISOString` teria sobre uma data local. */
function isoDayUTC(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/**
 * Mês exibido pela grade. "Agora" é congelado na primeira renderização: a
 * navegação move um offset a partir de um ponto fixo, não do relógio corrente.
 * Ano e mês são mantidos como inteiros em UTC — qualquer conversão local
 * faria a grade "vazar" um dia.
 */
export function useMonthAnchor() {
  const [now] = useState(() => new Date());
  const [offset, setOffset] = useState(0);

  return useMemo(() => {
    const totalMonths = now.getUTCFullYear() * 12 + now.getUTCMonth() + offset;
    const year = Math.floor(totalMonths / 12);
    const monthIndex = ((totalMonths % 12) + 12) % 12;
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const month = new Date(Date.UTC(year, monthIndex, 1));

    return {
      month,
      from: isoDayUTC(year, monthIndex, 1),
      to: isoDayUTC(year, monthIndex, daysInMonth),
      label: MONTH_LABEL_FORMATTER.format(month),
      isCurrentMonth: offset === 0,
      goPrevious: () => setOffset((value) => value - 1),
      goNext: () => setOffset((value) => value + 1),
      goToToday: () => setOffset(0),
    };
  }, [now, offset]);
}
```

- [ ] **Step 2: Reescrever a tela**

Substituir `apps/frontend/features/calendar/components/calendar-view.tsx` por:

```tsx
'use client';

import { useState } from 'react';
import { CalendarDays, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthGrid } from '@/features/calendar/components/month-grid';
import { OverdueBanner } from '@/features/calendar/components/overdue-banner';
import { CollaboratorLegend } from '@/features/calendar/components/collaborator-legend';
import { CollaboratorManager } from '@/features/calendar/components/collaborator-manager';
import { ObligationForm } from '@/features/calendar/components/obligation-form';
import { ObligationDetail } from '@/features/calendar/components/obligation-detail';
import { AssigneeTaskList } from '@/features/calendar/components/assignee-task-list';
import { useMonthAnchor } from '@/features/calendar/hooks/use-month-anchor';
import { useObligations } from '@/features/calendar/hooks/use-obligations';
import { useCollaborators } from '@/features/calendar/hooks/use-collaborators';
import type { Obligation } from '@/features/calendar/types/calendar.types';

export function CalendarView(): React.ReactNode {
  const anchor = useMonthAnchor();
  const [collaboratorId, setCollaboratorId] = useState('');
  const [isFormOpen, setFormOpen] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);
  const [selected, setSelected] = useState<Obligation | null>(null);

  const { data: collaborators } = useCollaborators();
  const { data, isLoading, isError } = useObligations(
    anchor.from,
    anchor.to,
    collaboratorId || undefined,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário contábil"
        description="Tarefas recorrentes do escritório, prazos e feriados."
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden />
          Nova tarefa
        </Button>
        <Button variant="outline" onClick={() => setManagerOpen(true)}>
          <Users className="mr-2 size-4" aria-hidden />
          Responsáveis
        </Button>
      </div>

      <OverdueBanner onSelect={setSelected} />

      <CollaboratorLegend
        collaborators={collaborators ?? []}
        selectedId={collaboratorId}
        onSelect={setCollaboratorId}
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={anchor.goPrevious}>
          Anterior
        </Button>
        <span className="min-w-40 text-center text-sm font-medium capitalize">
          {anchor.label}
        </span>
        <Button variant="outline" onClick={anchor.goNext}>
          Próximo
        </Button>
        {!anchor.isCurrentMonth ? (
          <Button variant="outline" onClick={anchor.goToToday}>
            Hoje
          </Button>
        ) : null}
      </div>

      {isError ? (
        <EmptyState
          icon={CalendarDays}
          title="Erro ao carregar o calendário"
          description="Tente novamente em instantes."
        />
      ) : isLoading || !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma tarefa neste mês"
          description='Clique em "Nova tarefa" para cadastrar uma rotina do escritório.'
        />
      ) : (
        <>
          <Card className="overflow-x-auto p-3">
            <div className="min-w-[560px]">
              <MonthGrid month={anchor.month} obligations={data} onSelect={setSelected} />
            </div>
          </Card>

          <AssigneeTaskList obligations={data} onSelect={setSelected} />
        </>
      )}

      <ObligationForm open={isFormOpen} onOpenChange={setFormOpen} />
      <CollaboratorManager open={isManagerOpen} onOpenChange={setManagerOpen} />
      <ObligationDetail obligation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: PASS, sem erros.

- [ ] **Step 4: Rodar a suíte do frontend**

Run: `cd apps/frontend && npm test`
Expected: PASS — inclui os testes antigos (`pagination`, `use-debounce`, `company-status-badge`) e os novos (`business-days`, `obligation-form`).

- [ ] **Step 5: Rodar a suíte do backend**

Run: `cd apps/backend && npx jest && npm run test:e2e`
Expected: PASS em tudo.

- [ ] **Step 6: Verificar na tela real**

Run: `cd apps/backend && npm run start:dev` (num terminal) e `cd apps/frontend && npm run dev` (noutro). Abrir `http://localhost:3000/calendar`.

Conferir, com `NEXT_PUBLIC_USE_MOCKS=false`:

1. A faixa vermelha aparece no topo com a tarefa vencida do seed ("Envio de documentos ao cliente").
2. A legenda mostra Ana, Bruno e Carla com cores distintas; clicar num nome filtra a grade.
3. "Responsáveis" abre o painel; adicionar um nome novo com cor persiste após recarregar a página (**é o requisito explícito de não desaparecer ao fechar o site**).
4. "Nova tarefa" com vencimento em 25/12 mostra o aviso de Natal e o botão de antecipar muda a data para 24/12.
5. Cadastrar com "Todo mês" e 12 vezes cria 12 marcações; o preview mostrou as datas antes de salvar.
6. Clicar numa tarefa abre o painel; concluir risca a tarefa na grade e some da faixa de atrasadas.
7. A lista de baixo agrupa por pessoa; a caixinha conclui sem abrir painel.
8. Em viewport móvel (DevTools, 390px): a faixa, a legenda, os painéis e a lista se ajustam; só a grade rola na horizontal, dentro do próprio contêiner — a página não rola de lado.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/features/calendar
git commit -m "feat(frontend): calendario vira ferramenta de cadastro e acompanhamento

CalendarView passa a orquestrar faixa de atrasadas, legenda de
responsaveis, grade colorida, lista por pessoa e os tres paineis. O
calculo de ancora de mes sai para use-month-anchor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Cobertura da spec

| Requisito da spec | Task |
|---|---|
| §4.1 `Collaborator` | 1 |
| §4.2 Paleta de 8 cores | 1 (backfill), 4 (validação), 7 (classes) |
| §4.3 `Obligation` com `collaboratorId`, `recurrence`; conversão de `assignee` | 1 |
| §4.4 Catálogo de tipos + `OUTRO` | 6 (backend), 7 (rótulos), 9 (formulário) |
| §5.1 Cinco frequências | 2 |
| §5.2 `GET /calendar/holidays` | 5 |
| §5.3 `previousBusinessDay` nos dois lados | 3 (backend), 7 (frontend) |
| §5.4 Endpoints de colaborador, `overdueOnly`, `anticipate` | 4, 6 |
| §6.1 `CalendarView` como orquestrador + `use-month-anchor` | 14 |
| §6.2 `ObligationForm` com aviso de feriado e preview | 9 |
| §6.3 `ObligationDetail` | 11 |
| §6.4 `CollaboratorManager` | 8 |
| §6.5 `MonthGrid` colorido, atraso prevalecendo | 10 |
| §6.6 `OverdueBanner` e `AssigneeTaskList` | 12, 13 |
| §6.7 Mocks atualizados | 7 |
| §7 Testes unitários e e2e | 2, 3, 4, 5, 6, 7, 9 |

