# Entrega ao Cliente — Plano de Implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para rastreamento.

**Goal:** Entregar as 4 funcionalidades do brief do cliente (onboarding por CNPJ, auditoria da carteira, análise da carteira, calendário contábil) em um sistema white label, rápido e responsivo.

**Architecture:** Monorepo existente — NestJS + Prisma (SQLite) em `apps/backend`, Next.js App Router em `apps/frontend`. A fundação (schema + serviços da BrasilAPI) entra primeiro e sozinha; as quatro funcionalidades seguem em branches paralelas que não se tocam.

**Tech Stack:** NestJS 11, Prisma 6, SQLite, Zod, Jest + Supertest, Next.js 15, React Query, Tailwind, Recharts, Vitest, Playwright.

## Global Constraints

- **Banco:** SQLite. Nunca introduzir Docker, Postgres, Redis ou BullMQ neste plano.
- **Auth:** `AUTH_MODE=stub` permanece. Login segue demo. Nunca implementar JWT/cookies aqui.
- **Envelope de resposta:** `{ data, message? }` ou `{ data[], pagination }`. Erro: `{ code, message, status, details? }`. Já garantido por `ResponseInterceptor` e `HttpExceptionFilter` — não alterar.
- **Tenant-scoping:** toda query filtra por `tenantId`. Todo e2e novo inclui um teste de que dados do `TENANT_B` não vazam.
- **BrasilAPI em testes:** sempre mockada via `HTTP_FETCHER` / `brasilApiMock` de `test/test-utils.ts`. Nenhum teste toca a rede.
- **Concorrência da BrasilAPI:** máximo de **5** requisições simultâneas em qualquer operação em lote.
- **Idioma:** mensagens de erro, títulos e labels em português. Nomes de código em inglês, seguindo o padrão do repositório.
- **Commits:** mensagem no padrão Conventional Commits, em português no corpo.

---

## Estratégia de Branches

```
main
 └── feat/modelo-dados-cliente        Fase 0 — Tasks 1-6   → MERGE EM MAIN ANTES DE TUDO
      ├── feat/onboarding-empresas    Fase 1 — Tasks 7-11
      ├── feat/auditoria-carteira     Fase 2 — Tasks 12-14
      ├── feat/dashboard-carteira     Fase 3 — Tasks 15-16
      ├── feat/calendario-contabil    Fase 4 — Tasks 17-19
      └── feat/acabamento-cliente     Fase 5 — Task 20
```

**Regra dura:** a Fase 0 toca `prisma/schema.prisma`, que todas as outras consomem. Ela precisa estar mergeada em `main` antes de qualquer branch da Fase 1-5 ser criada. Depois disso, as fases 1-4 rodam em paralelo sem conflito — cada uma toca módulos distintos.

**Divisão sugerida para 3 pessoas:** uma pessoa faz a Fase 0 sozinha (~2h) enquanto as outras duas leem a spec e preparam ambiente. Depois: Pessoa A → Fases 1 e 5; Pessoa B → Fase 2; Pessoa C → Fases 3 e 4.

---

## Estrutura de Arquivos

**Criar:**
| Arquivo | Responsabilidade |
|---|---|
| `apps/backend/src/common/cnpj.ts` | Validação de CNPJ (dígito verificador) |
| `apps/backend/src/common/cnpj.spec.ts` | Testes do validador |
| `apps/backend/src/common/concurrency.ts` | `mapWithConcurrency` — utilitário de lote |
| `apps/backend/src/common/concurrency.spec.ts` | Testes do utilitário |
| `apps/backend/src/brasil-api/holidays.service.ts` | Feriados nacionais por ano, com cache |
| `apps/backend/src/brasil-api/holidays.service.spec.ts` | Testes de feriados |
| `apps/backend/src/companies/partner.schema.ts` | DTO do quadro societário |
| `apps/backend/src/calendar/recurrence.ts` | Gerador de ocorrências recorrentes |
| `apps/backend/src/calendar/recurrence.spec.ts` | Testes do gerador |
| `apps/frontend/features/companies/components/cnpj-lookup-form.tsx` | Busca por CNPJ + preview |
| `apps/frontend/features/companies/components/partners-table.tsx` | Tabela do quadro societário |
| `apps/frontend/features/audit/**` | Módulo de auditoria no front |
| `apps/frontend/features/portfolio/**` | Módulo do dashboard no front |
| `apps/frontend/features/calendar/**` | Módulo do calendário no front |

**Modificar:**
| Arquivo | Mudança |
|---|---|
| `apps/backend/prisma/schema.prisma` | Campos novos em `Company`/`Obligation`/`Tenant`, modelo `Partner`, `AuditFinding.result` |
| `apps/backend/prisma/seed.ts` | CNPJs reais + campos novos + responsáveis + tarefas |
| `apps/backend/src/brasil-api/brasil-api.types.ts` | Extrair CNAE, porte, QSA, endereço, data de abertura |
| `apps/backend/src/brasil-api/brasil-api.service.ts` | `lookupMany` com concorrência |
| `apps/backend/src/companies/company.schema.ts` | Campos novos no Zod e no DTO |
| `apps/backend/src/companies/companies.service.ts` | Persistir dados oficiais + QSA; filtros novos |
| `apps/backend/src/audit/audit-engine.ts` | Reescrita — 6 regras do brief |
| `apps/backend/src/audit/audit.service.ts` | Auditoria da carteira com BrasilAPI ao vivo |
| `apps/backend/src/audit/audit.types.ts` | `passed` → `result` |
| `apps/backend/src/dashboard/dashboard.service.ts` | Agregações por estado/porte/CNAE/situação/idade |
| `apps/backend/src/calendar/calendar.schema.ts` | Recorrência, responsável, feriado |
| `apps/backend/src/calendar/calendar.service.ts` | Materialização das ocorrências |
| `apps/frontend/constants/navigation.ts` | Reordenar: 4 do cliente primeiro |

---

# FASE 0 — Fundação

**Branch:** `feat/modelo-dados-cliente` (parte de `main`)

```bash
git checkout main && git pull && git checkout -b feat/modelo-dados-cliente
```

---

### Task 1: Validador de CNPJ

O motor de auditoria atual só confere se o CNPJ tem 14 dígitos — `00000000000000` passa. O brief pede detecção de "CNPJs inválidos", que significa validar os dois dígitos verificadores pelo algoritmo módulo 11.

**Files:**
- Create: `apps/backend/src/common/cnpj.ts`
- Test: `apps/backend/src/common/cnpj.spec.ts`

**Interfaces:**
- Produces: `isValidCnpj(value: string): boolean` — aceita com ou sem máscara.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// apps/backend/src/common/cnpj.spec.ts
import { isValidCnpj } from './cnpj';

describe('isValidCnpj', () => {
  it('aceita CNPJs reais válidos', () => {
    expect(isValidCnpj('33000167000101')).toBe(true); // Petrobras
    expect(isValidCnpj('00000000000191')).toBe(true); // Banco do Brasil
    expect(isValidCnpj('47960950000121')).toBe(true); // Magazine Luiza
  });

  it('aceita CNPJ com máscara', () => {
    expect(isValidCnpj('33.000.167/0001-01')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(isValidCnpj('12345678000190')).toBe(false);
  });

  it('rejeita todos os dígitos iguais', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('rejeita comprimento inválido', () => {
    expect(isValidCnpj('123')).toBe(false);
    expect(isValidCnpj('')).toBe(false);
    expect(isValidCnpj('330001670001011')).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/backend && npx jest src/common/cnpj.spec.ts`
Expected: FAIL — `Cannot find module './cnpj'`

- [ ] **Step 3: Implementar**

```typescript
// apps/backend/src/common/cnpj.ts

/**
 * Valida CNPJ pelos dois dígitos verificadores (módulo 11).
 * Aceita com ou sem máscara. Rejeita sequências de dígito repetido,
 * que passam no cálculo mas não são CNPJs reais.
 */
export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 14) {
    return false;
  }
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const checkDigit = (length: number): number => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * weight--;
      if (weight < 2) {
        weight = 9;
      }
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    checkDigit(12) === Number(digits[12]) &&
    checkDigit(13) === Number(digits[13])
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/backend && npx jest src/common/cnpj.spec.ts`
Expected: PASS — 5 testes

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/common/cnpj.ts apps/backend/src/common/cnpj.spec.ts
git commit -m "feat(backend): validacao de CNPJ por digito verificador"
```

---

### Task 2: Utilitário de concorrência limitada

A decisão A2 (auditoria reconsulta a BrasilAPI) exige limitar requisições simultâneas a 5. Sem isso, auditar 50 empresas dispara 50 chamadas de uma vez e a BrasilAPI aplica rate limit no meio da demo.

**Files:**
- Create: `apps/backend/src/common/concurrency.ts`
- Test: `apps/backend/src/common/concurrency.spec.ts`

**Interfaces:**
- Produces: `mapWithConcurrency<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]>` — preserva a ordem de entrada.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// apps/backend/src/common/concurrency.spec.ts
import { mapWithConcurrency } from './concurrency';

describe('mapWithConcurrency', () => {
  it('preserva a ordem dos resultados', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(result).toEqual([10, 20, 30, 40]);
  });

  it('nunca ultrapassa o limite de execuções simultâneas', async () => {
    let running = 0;
    let peak = 0;

    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 5, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return null;
    });

    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });

  it('devolve lista vazia para entrada vazia', async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npx jest src/common/concurrency.spec.ts`
Expected: FAIL — `Cannot find module './concurrency'`

- [ ] **Step 3: Implementar**

```typescript
// apps/backend/src/common/concurrency.ts

/**
 * Executa `worker` sobre `items` com no máximo `limit` execuções simultâneas.
 * Os resultados saem na mesma ordem da entrada, independente da ordem de
 * conclusão. Usado para não estourar o rate limit da BrasilAPI.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runner = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  };

  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, () => runner()));

  return results;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/backend && npx jest src/common/concurrency.spec.ts`
Expected: PASS — 3 testes

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/common/concurrency.ts apps/backend/src/common/concurrency.spec.ts
git commit -m "feat(backend): utilitario de concorrencia limitada"
```

---

### Task 3: Schema do banco — campos do brief

Adiciona os campos que o cliente pediu e que hoje não existem: CNAE, porte, situação cadastral, endereço completo, data de abertura, quadro societário, responsável e recorrência das tarefas, e as cores do white label.

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: migration gerada pelo Prisma

**Interfaces:**
- Produces: modelos `Company` (13 campos novos), `Partner` (novo), `Obligation` (2 campos novos), `Tenant` (3 campos novos), `AuditFinding.result: String` substituindo `passed: Boolean`.

- [ ] **Step 1: Editar `Company` no schema**

Substituir o bloco `model Company` por:

```prisma
model Company {
  id          String   @id @default(cuid())
  tenantId    String
  name        String   // razão social
  tradeName   String   // nome fantasia
  cnpj        String

  // `status` = status INTERNO do escritório (controle do usuário).
  // NÃO confundir com `situacaoCadastral`, que é a situação OFICIAL na
  // Receita Federal. Foi essa confusão que fez a versão anterior descartar
  // o dado que o cliente pediu.
  status String @default("pending") // active | inactive | pending

  situacaoCadastral String    @default("") // ATIVA | SUSPENSA | INAPTA | BAIXADA | NULA
  cnaeCodigo        String    @default("")
  cnaeDescricao     String    @default("")
  porte             String    @default("") // MEI | ME | EPP | DEMAIS
  naturezaJuridica  String?
  dataAbertura      DateTime?

  email       String
  phone       String
  logradouro  String  @default("")
  numero      String  @default("")
  complemento String?
  bairro      String  @default("")
  cep         String  @default("")
  city        String
  state       String

  healthScore Int      @default(100) // score da auditoria
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  partners    Partner[]
  auditRuns   AuditRun[]
  obligations Obligation[]

  @@unique([tenantId, cnpj])
  @@index([tenantId])
  @@index([tenantId, state])
  @@index([tenantId, porte])
  @@index([tenantId, situacaoCadastral])
  @@index([tenantId, cnaeCodigo])
}
```

- [ ] **Step 2: Adicionar o modelo `Partner`**

```prisma
/// Quadro societário (QSA) vindo da BrasilAPI.
model Partner {
  id           String  @id @default(cuid())
  companyId    String
  nome         String
  qualificacao String
  faixaEtaria  String?

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
}
```

- [ ] **Step 3: Editar `Obligation`, `Tenant` e `AuditFinding`**

Em `model Obligation`, adicionar antes de `createdAt`:

```prisma
  assignee          String  @default("")
  recurrenceGroupId String?
```

e adicionar ao final do bloco, junto dos índices existentes:

```prisma
  @@index([tenantId, assignee])
```

Em `model Tenant`, adicionar antes de `createdAt`:

```prisma
  logoUrl      String?
  primaryColor String @default("221 83% 53%")
  accentColor  String @default("214 100% 97%")
```

Em `model AuditFinding`, substituir `passed Boolean` por:

```prisma
  result String // passed | failed | skipped
```

- [ ] **Step 4: Gerar a migration**

Run: `cd apps/backend && npx prisma migrate dev --name campos_brief_cliente`
Expected: migration criada em `prisma/migrations/`, cliente Prisma regenerado.

Se o Prisma reclamar de dados existentes incompatíveis, rode `npx prisma migrate reset --force` — o banco local é descartável e o seed recria tudo.

- [ ] **Step 5: Confirmar que o build ainda compila**

Run: `cd apps/backend && npm run build`
Expected: erros de tipo em `audit.types.ts` e `audit-engine.ts` por causa de `passed` → `result`. **Isso é esperado** — a Task 12 corrige. Anote os erros e siga.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(backend): campos do brief no schema (CNAE, porte, QSA, situacao, endereco)"
```

---

### Task 4: BrasilAPI — extrair todos os campos do brief

Hoje `toCnpjInfo` extrai 8 campos e descarta o resto. O cliente pediu CNAE, porte, quadro societário e endereço completo — todos vêm na mesma resposta da BrasilAPI, de graça.

**Files:**
- Modify: `apps/backend/src/brasil-api/brasil-api.types.ts`
- Test: `apps/backend/src/brasil-api/brasil-api.service.spec.ts`

**Interfaces:**
- Produces: `CnpjInfo` com os campos `cnaeCodigo`, `cnaeDescricao`, `porte`, `naturezaJuridica`, `dataAbertura`, `logradouro`, `numero`, `complemento`, `bairro`, `cep`, `socios: PartnerInfo[]`.
- Produces: `PartnerInfo = { nome: string; qualificacao: string; faixaEtaria: string | null }`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final do `describe` existente em `apps/backend/src/brasil-api/brasil-api.service.spec.ts`:

```typescript
  it('extrai CNAE, porte, endereço completo e quadro societário', async () => {
    brasilApiMock.respondWith = {
      status: 200,
      body: {
        cnpj: '33000167000101',
        razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
        nome_fantasia: 'PETROBRAS',
        descricao_situacao_cadastral: 'ATIVA',
        cnae_fiscal: 1921700,
        cnae_fiscal_descricao: 'Fabricação de produtos do refino de petróleo',
        porte: 'DEMAIS',
        natureza_juridica: 'Sociedade Anônima Aberta',
        data_inicio_atividade: '1953-10-03',
        logradouro: 'REPUBLICA DO CHILE',
        numero: '65',
        complemento: 'ANDAR 1 A 23',
        bairro: 'CENTRO',
        cep: '20031912',
        municipio: 'RIO DE JANEIRO',
        uf: 'RJ',
        qsa: [
          { nome_socio: 'FULANO DE TAL', qualificacao_socio: 'Diretor', faixa_etaria: '51 a 60 anos' },
        ],
      },
    };

    const info = await service.lookupCnpj('33000167000101');

    expect(info).toMatchObject({
      cnaeCodigo: '1921700',
      cnaeDescricao: 'Fabricação de produtos do refino de petróleo',
      porte: 'DEMAIS',
      naturezaJuridica: 'Sociedade Anônima Aberta',
      logradouro: 'REPUBLICA DO CHILE',
      numero: '65',
      bairro: 'CENTRO',
      cep: '20031912',
    });
    expect(info?.dataAbertura).toBe('1953-10-03');
    expect(info?.socios).toEqual([
      { nome: 'FULANO DE TAL', qualificacao: 'Diretor', faixaEtaria: '51 a 60 anos' },
    ]);
  });

  it('devolve defaults vazios quando a BrasilAPI omite campos opcionais', async () => {
    brasilApiMock.respondWith = {
      status: 200,
      body: { cnpj: '33000167000101', razao_social: 'EMPRESA X' },
    };

    const info = await service.lookupCnpj('33000167000101');

    expect(info).toMatchObject({ cnaeCodigo: '', porte: '', cep: '' });
    expect(info?.naturezaJuridica).toBeNull();
    expect(info?.dataAbertura).toBeNull();
    expect(info?.socios).toEqual([]);
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npx jest src/brasil-api`
Expected: FAIL — os dois testes novos falham; propriedades `cnaeCodigo`, `socios` etc. são `undefined`.

- [ ] **Step 3: Reescrever `brasil-api.types.ts`**

```typescript
// apps/backend/src/brasil-api/brasil-api.types.ts

export interface PartnerInfo {
  readonly nome: string;
  readonly qualificacao: string;
  readonly faixaEtaria: string | null;
}

/** Dados normalizados do CNPJ retornados pela BrasilAPI. */
export interface CnpjInfo {
  readonly cnpj: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly situacao: string; // ATIVA | SUSPENSA | INAPTA | BAIXADA | NULA
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null; // ISO date (YYYY-MM-DD)
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly municipio: string;
  readonly uf: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly socios: readonly PartnerInfo[];
}

interface RawPartner {
  readonly nome_socio?: string;
  readonly qualificacao_socio?: string;
  readonly faixa_etaria?: string;
}

/** Resposta crua da BrasilAPI (campos usados). */
export interface BrasilApiCnpjResponse {
  readonly cnpj?: string;
  readonly razao_social?: string;
  readonly nome_fantasia?: string;
  readonly descricao_situacao_cadastral?: string;
  readonly cnae_fiscal?: number | string;
  readonly cnae_fiscal_descricao?: string;
  readonly porte?: string;
  readonly natureza_juridica?: string;
  readonly data_inicio_atividade?: string;
  readonly logradouro?: string;
  readonly numero?: string;
  readonly complemento?: string;
  readonly bairro?: string;
  readonly cep?: string | number;
  readonly municipio?: string;
  readonly uf?: string;
  readonly email?: string;
  readonly ddd_telefone_1?: string;
  readonly qsa?: readonly RawPartner[];
}

export function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function toPartners(qsa: readonly RawPartner[] | undefined): PartnerInfo[] {
  return (qsa ?? []).map((item) => ({
    nome: item.nome_socio ?? '',
    qualificacao: item.qualificacao_socio ?? '',
    faixaEtaria: item.faixa_etaria ?? null,
  }));
}

export function toCnpjInfo(
  cnpj: string,
  raw: BrasilApiCnpjResponse,
): CnpjInfo {
  return {
    cnpj,
    razaoSocial: raw.razao_social ?? '',
    nomeFantasia: raw.nome_fantasia ?? '',
    situacao: raw.descricao_situacao_cadastral ?? '',
    cnaeCodigo: raw.cnae_fiscal === undefined ? '' : String(raw.cnae_fiscal),
    cnaeDescricao: raw.cnae_fiscal_descricao ?? '',
    porte: raw.porte ?? '',
    naturezaJuridica: raw.natureza_juridica ?? null,
    dataAbertura: raw.data_inicio_atividade ?? null,
    logradouro: raw.logradouro ?? '',
    numero: raw.numero ?? '',
    complemento: raw.complemento ?? null,
    bairro: raw.bairro ?? '',
    cep: raw.cep === undefined ? '' : String(raw.cep).replace(/\D/g, ''),
    municipio: raw.municipio ?? '',
    uf: raw.uf ?? '',
    email: raw.email ?? null,
    telefone: raw.ddd_telefone_1 ?? null,
    socios: toPartners(raw.qsa),
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/backend && npx jest src/brasil-api`
Expected: PASS — todos os testes, incluindo os 4 originais.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/brasil-api/brasil-api.types.ts apps/backend/src/brasil-api/brasil-api.service.spec.ts
git commit -m "feat(backend): extrai CNAE, porte, QSA e endereco completo da BrasilAPI"
```

---

### Task 5: `lookupMany` com concorrência limitada

A auditoria da carteira (decisão A2) precisa consultar N CNPJs. Este método é a mitigação obrigatória da spec §2.1.

**Files:**
- Modify: `apps/backend/src/brasil-api/brasil-api.service.ts`
- Test: `apps/backend/src/brasil-api/brasil-api.service.spec.ts`

**Interfaces:**
- Consumes: `mapWithConcurrency` da Task 2.
- Produces: `BrasilApiService.lookupMany(cnpjs: readonly string[]): Promise<Map<string, CnpjInfo | null>>` — chave é o CNPJ normalizado (só dígitos).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao `describe` de `brasil-api.service.spec.ts`:

```typescript
  it('consulta vários CNPJs e indexa o resultado por CNPJ normalizado', async () => {
    brasilApiMock.respondWith = {
      status: 200,
      body: { cnpj: '33000167000101', razao_social: 'EMPRESA A' },
    };

    const result = await service.lookupMany(['33.000.167/0001-01', '00000000000191']);

    expect(result.size).toBe(2);
    expect(result.get('33000167000101')?.razaoSocial).toBe('EMPRESA A');
    expect(result.has('00000000000191')).toBe(true);
  });

  it('devolve null para o CNPJ cuja consulta falhou, sem lançar', async () => {
    brasilApiMock.fail = true;

    const result = await service.lookupMany(['33000167000101']);

    expect(result.get('33000167000101')).toBeNull();
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npx jest src/brasil-api`
Expected: FAIL — `service.lookupMany is not a function`

- [ ] **Step 3: Implementar**

Em `brasil-api.service.ts`, adicionar o import no topo:

```typescript
import { mapWithConcurrency } from '../common/concurrency';
```

Adicionar a constante junto das existentes:

```typescript
const LOOKUP_CONCURRENCY = 5;
```

E adicionar o método logo após `lookupCnpj`:

```typescript
  /**
   * Consulta vários CNPJs com concorrência limitada (spec §2.1).
   * Reusa o cache de `lookupCnpj`, então CNPJs repetidos custam uma chamada só.
   * Nunca lança: CNPJ que falhou vira `null` no mapa.
   */
  async lookupMany(
    cnpjs: readonly string[],
  ): Promise<Map<string, CnpjInfo | null>> {
    const keys = [...new Set(cnpjs.map(normalizeCnpj))];

    const values = await mapWithConcurrency(
      keys,
      LOOKUP_CONCURRENCY,
      (key) => this.lookupCnpj(key),
    );

    return new Map(keys.map((key, index) => [key, values[index]]));
  }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/backend && npx jest src/brasil-api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/brasil-api/brasil-api.service.ts apps/backend/src/brasil-api/brasil-api.service.spec.ts
git commit -m "feat(backend): lookupMany da BrasilAPI com concorrencia 5"
```

---

### Task 6: Serviço de feriados nacionais

O brief pede alerta quando um vencimento cai em feriado nacional. A BrasilAPI expõe `/feriados/v1/{ano}`.

**Files:**
- Create: `apps/backend/src/brasil-api/holidays.service.ts`
- Create: `apps/backend/src/brasil-api/holidays.service.spec.ts`
- Modify: `apps/backend/src/brasil-api/brasil-api.module.ts`

**Interfaces:**
- Produces: `HolidaysService.listByYear(year: number): Promise<Map<string, string>>` — chave `YYYY-MM-DD`, valor = nome do feriado.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// apps/backend/src/brasil-api/holidays.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HolidaysService } from './holidays.service';
import { HTTP_FETCHER } from './http-fetcher';

describe('HolidaysService', () => {
  let service: HolidaysService;
  let calls: number;
  let shouldFail: boolean;

  beforeEach(async () => {
    calls = 0;
    shouldFail = false;

    const fetcher = async () => {
      calls++;
      if (shouldFail) {
        throw new Error('rede indisponível');
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          { date: '2026-01-01', name: 'Confraternização mundial' },
          { date: '2026-04-21', name: 'Tiradentes' },
        ],
      };
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [HolidaysService, { provide: HTTP_FETCHER, useValue: fetcher }],
    }).compile();

    service = moduleRef.get(HolidaysService);
  });

  it('indexa os feriados por data ISO', async () => {
    const holidays = await service.listByYear(2026);

    expect(holidays.get('2026-01-01')).toBe('Confraternização mundial');
    expect(holidays.get('2026-04-21')).toBe('Tiradentes');
    expect(holidays.has('2026-03-15')).toBe(false);
  });

  it('busca uma vez por ano e reusa o cache', async () => {
    await service.listByYear(2026);
    await service.listByYear(2026);

    expect(calls).toBe(1);
  });

  it('devolve mapa vazio quando a BrasilAPI falha, sem lançar', async () => {
    shouldFail = true;

    const holidays = await service.listByYear(2026);

    expect(holidays.size).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npx jest src/brasil-api/holidays`
Expected: FAIL — `Cannot find module './holidays.service'`

- [ ] **Step 3: Implementar**

```typescript
// apps/backend/src/brasil-api/holidays.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';

interface RawHoliday {
  readonly date?: string;
  readonly name?: string;
}

const TIMEOUT_MS = 5000;

/**
 * Feriados nacionais por ano (BrasilAPI /feriados/v1/{ano}).
 * Cache permanente em memória — a lista de um ano não muda.
 * Falha de rede devolve mapa vazio: o calendário funciona sem os alertas.
 */
@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);
  private readonly cache = new Map<number, Map<string, string>>();

  constructor(
    @Inject(HTTP_FETCHER) private readonly fetcher: Fetcher,
    private readonly config: ConfigService,
  ) {}

  async listByYear(year: number): Promise<Map<string, string>> {
    const cached = this.cache.get(year);
    if (cached) {
      return cached;
    }

    const holidays = await this.fetchYear(year);
    if (holidays.size > 0) {
      this.cache.set(year, holidays);
    }
    return holidays;
  }

  private async fetchYear(year: number): Promise<Map<string, string>> {
    const base = this.config.get<string>('BRASILAPI_BASE_URL');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this.fetcher(`${base}/feriados/v1/${year}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`BrasilAPI status ${response.status}`);
      }
      const raw = (await response.json()) as readonly RawHoliday[];
      return new Map(
        raw
          .filter((item): item is Required<RawHoliday> =>
            Boolean(item.date && item.name),
          )
          .map((item) => [item.date, item.name]),
      );
    } catch (error) {
      this.logger.warn(`Feriados de ${year} indisponíveis: ${String(error)}`);
      return new Map();
    } finally {
      clearTimeout(timer);
    }
  }
}
```

- [ ] **Step 4: Registrar no módulo**

Em `apps/backend/src/brasil-api/brasil-api.module.ts`, importar `HolidaysService` e adicioná-lo tanto em `providers` quanto em `exports`, ao lado de `BrasilApiService`.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd apps/backend && npx jest src/brasil-api`
Expected: PASS — 3 testes novos + os anteriores

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/brasil-api/
git commit -m "feat(backend): servico de feriados nacionais com cache"
```

---

### Task 7: Seed com dados que demonstram as 4 funcionalidades

O seed atual usa CNPJs fictícios inválidos e não tem os campos novos. Para a demo funcionar, o seed precisa produzir **divergências propositais** que a auditoria vai encontrar.

**Files:**
- Modify: `apps/backend/prisma/seed.ts`

**Interfaces:**
- Produces: tenant `tnt_dev` com 5 empresas (1 com CNPJ inválido, 1 com situação irregular, 1 duplicada por razão social, 1 sem e-mail), 3 responsáveis e 6 tarefas — 2 delas recorrentes.

- [ ] **Step 1: Substituir a constante `COMPANIES`**

```typescript
const RESPONSAVEIS = ['Ana Souza', 'Bruno Lima', 'Carla Dias'] as const;

const COMPANIES = [
  {
    // CNPJ real e válido, tudo em ordem — a empresa "saudável" da demo.
    name: 'PETROLEO BRASILEIRO S A PETROBRAS',
    tradeName: 'PETROBRAS',
    cnpj: '33000167000101',
    status: 'active',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '1921700',
    cnaeDescricao: 'Fabricação de produtos do refino de petróleo',
    porte: 'DEMAIS',
    naturezaJuridica: 'Sociedade Anônima Aberta',
    dataAbertura: new Date('1953-10-03'),
    email: 'contato@petrobras.com.br',
    phone: '2132242000',
    logradouro: 'REPUBLICA DO CHILE',
    numero: '65',
    bairro: 'CENTRO',
    cep: '20031912',
    city: 'Rio de Janeiro',
    state: 'RJ',
    healthScore: 100,
  },
  {
    name: 'MAGAZINE LUIZA S/A',
    tradeName: 'MAGALU',
    cnpj: '47960950000121',
    status: 'active',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '4753900',
    cnaeDescricao: 'Comércio varejista especializado de eletrodomésticos',
    porte: 'DEMAIS',
    naturezaJuridica: 'Sociedade Anônima Aberta',
    dataAbertura: new Date('1992-11-25'),
    email: 'ri@magazineluiza.com.br',
    phone: '1633046800',
    logradouro: 'VOLUNTARIOS DA FRANCA',
    numero: '1465',
    bairro: 'CENTRO',
    cep: '14400490',
    city: 'Franca',
    state: 'SP',
    healthScore: 100,
  },
  {
    // CNPJ com dígito verificador errado — dispara `cnpj_invalido`.
    name: 'Padaria Pão Quente LTDA',
    tradeName: 'Pão Quente',
    cnpj: '12345678000190',
    status: 'active',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '4721102',
    cnaeDescricao: 'Padaria e confeitaria com predominância de revenda',
    porte: 'ME',
    naturezaJuridica: 'Sociedade Empresária Limitada',
    dataAbertura: new Date('2019-03-12'),
    email: 'contato@paoquente.com.br',
    phone: '1133334444',
    logradouro: 'RUA DAS FLORES',
    numero: '120',
    bairro: 'CENTRO',
    cep: '01001000',
    city: 'São Paulo',
    state: 'SP',
    healthScore: 60,
  },
  {
    // Situação BAIXADA e sem e-mail — dispara `situacao_irregular` e `dados_ausentes`.
    name: 'Transportes Rápido EIRELI',
    tradeName: 'Rápido Log',
    cnpj: '71673990000177',
    status: 'inactive',
    situacaoCadastral: 'BAIXADA',
    cnaeCodigo: '4930202',
    cnaeDescricao: 'Transporte rodoviário de carga',
    porte: 'EPP',
    naturezaJuridica: 'Empresa Individual de Responsabilidade Limitada',
    dataAbertura: new Date('2014-07-01'),
    email: '',
    phone: '',
    logradouro: 'AVENIDA BRASIL',
    numero: '9000',
    bairro: 'DISTRITO INDUSTRIAL',
    cep: '14090000',
    city: 'Ribeirão Preto',
    state: 'SP',
    healthScore: 30,
  },
  {
    // Mesma razão social da anterior, CNPJ diferente — dispara `empresa_duplicada`.
    name: 'Transportes Rápido EIRELI',
    tradeName: 'Rápido Log Filial',
    cnpj: '07526557000100',
    status: 'pending',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '4930202',
    cnaeDescricao: 'Transporte rodoviário de carga',
    porte: 'ME',
    naturezaJuridica: 'Empresa Individual de Responsabilidade Limitada',
    dataAbertura: new Date('2023-02-20'),
    email: 'filial@rapidolog.com.br',
    phone: '1955556666',
    logradouro: 'AVENIDA BRASIL',
    numero: '9010',
    bairro: 'DISTRITO INDUSTRIAL',
    cep: '14090000',
    city: 'Ribeirão Preto',
    state: 'SP',
    healthScore: 70,
  },
];
```

- [ ] **Step 2: Adicionar a criação de tarefas ao final de `main()`**

Antes do `console.log` final, inserir:

```typescript
  const companies = await prisma.company.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.obligation.deleteMany({ where: { tenantId: TENANT_ID } });

  const hoje = new Date();
  const mes = (offset: number, dia: number): Date =>
    new Date(hoje.getFullYear(), hoje.getMonth() + offset, dia);

  // Duas tarefas recorrentes (3 ocorrências cada) + duas avulsas.
  // A ocorrência de 1º de janeiro cai em feriado nacional de propósito.
  const grupoFolha = 'rec_folha';
  const grupoGuias = 'rec_guias';

  await prisma.obligation.createMany({
    data: [
      ...[0, 1, 2].map((offset) => ({
        tenantId: TENANT_ID,
        companyId: companies[0]?.id ?? null,
        title: 'Fechamento da folha de pagamento',
        type: 'FOLHA',
        dueDate: mes(offset, 5),
        status: offset === 0 ? 'completed' : 'pending',
        assignee: RESPONSAVEIS[0],
        recurrenceGroupId: grupoFolha,
      })),
      ...[0, 1, 2].map((offset) => ({
        tenantId: TENANT_ID,
        companyId: companies[1]?.id ?? null,
        title: 'Emissão de guias DAS',
        type: 'DAS',
        dueDate: mes(offset, 20),
        status: 'pending',
        assignee: RESPONSAVEIS[1],
        recurrenceGroupId: grupoGuias,
      })),
      {
        tenantId: TENANT_ID,
        companyId: companies[2]?.id ?? null,
        title: 'Envio de documentos ao cliente',
        type: 'DOCUMENTOS',
        dueDate: mes(-1, 10), // vencida — demonstra o selo de atraso
        status: 'pending',
        assignee: RESPONSAVEIS[2],
      },
      {
        tenantId: TENANT_ID,
        companyId: companies[3]?.id ?? null,
        title: 'Conferência mensal',
        type: 'CONFERENCIA',
        dueDate: new Date(hoje.getFullYear() + 1, 0, 1), // 1º de janeiro = feriado
        status: 'pending',
        assignee: RESPONSAVEIS[0],
      },
    ],
  });
```

- [ ] **Step 3: Rodar o seed**

Run: `cd apps/backend && npx prisma migrate reset --force`
Expected: banco recriado, seed executado, mensagem `Seed concluído: tenant tnt_dev com 5 empresas.`

- [ ] **Step 4: Conferir os dados**

Run: `cd apps/backend && npx prisma studio`
Expected: 5 empresas com CNAE/porte/situação preenchidos, 8 obrigações, 2 grupos de recorrência. Fechar o Studio depois.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/seed.ts
git commit -m "feat(backend): seed com divergencias propositais para a demo"
```

---

### Task 8: Fechar a Fase 0 e mergear

- [ ] **Step 1: Rodar a suíte inteira**

Run: `cd apps/backend && npm test`
Expected: PASS nos testes unitários. `audit-engine.spec.ts` pode falhar por causa da mudança `passed` → `result` — **isso é esperado e será corrigido na Task 12.**

Se `audit-engine.spec.ts` falhar, marque-o temporariamente com `describe.skip` e deixe um comentário `// TODO(Task 12): reescrito na Fase 2`.

- [ ] **Step 2: Confirmar que o build passa**

Run: `cd apps/backend && npm run build`
Expected: PASS. Se houver erro em `audit.types.ts` por `f.passed`, troque a linha por `result: f.result as FindingResult` — a Task 12 refina.

- [ ] **Step 3: Abrir o PR e mergear**

```bash
git push -u origin feat/modelo-dados-cliente
```

Abrir PR para `main`, aguardar a CI, mergear. **Avisar o time: as demais branches só podem começar agora.**

---

# FASE 1 — Onboarding de empresas

**Branch:** `feat/onboarding-empresas` (parte de `main` **após** o merge da Fase 0)

```bash
git checkout main && git pull && git checkout -b feat/onboarding-empresas
```

---

### Task 9: Contrato da empresa com os campos do brief

**Files:**
- Modify: `apps/backend/src/companies/company.schema.ts`
- Create: `apps/backend/src/companies/partner.schema.ts`
- Test: `apps/backend/test/companies.e2e-spec.ts`

**Interfaces:**
- Produces: `CompanyDto` com `situacaoCadastral`, `cnaeCodigo`, `cnaeDescricao`, `porte`, `naturezaJuridica`, `dataAbertura`, `logradouro`, `numero`, `complemento`, `bairro`, `cep`, `partners`.
- Produces: `PartnerDto = { id: string; nome: string; qualificacao: string; faixaEtaria: string | null }`.
- Produces: `listCompaniesQuerySchema` com os filtros `state`, `porte`, `situacao`, `cnae`.

- [ ] **Step 1: Criar o schema do sócio**

```typescript
// apps/backend/src/companies/partner.schema.ts
import type { Partner } from '@prisma/client';

export interface PartnerDto {
  readonly id: string;
  readonly nome: string;
  readonly qualificacao: string;
  readonly faixaEtaria: string | null;
}

export function toPartnerDto(partner: Partner): PartnerDto {
  return {
    id: partner.id,
    nome: partner.nome,
    qualificacao: partner.qualificacao,
    faixaEtaria: partner.faixaEtaria,
  };
}
```

- [ ] **Step 2: Escrever o teste e2e que falha**

Adicionar em `apps/backend/test/companies.e2e-spec.ts`, dentro do `describe('POST /api/companies')` existente:

```typescript
    it('persiste os campos oficiais e o quadro societário vindos da BrasilAPI', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: {
          cnpj: '33000167000101',
          razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
          nome_fantasia: 'PETROBRAS',
          descricao_situacao_cadastral: 'ATIVA',
          cnae_fiscal: 1921700,
          cnae_fiscal_descricao: 'Refino de petróleo',
          porte: 'DEMAIS',
          data_inicio_atividade: '1953-10-03',
          logradouro: 'REPUBLICA DO CHILE',
          numero: '65',
          bairro: 'CENTRO',
          cep: '20031912',
          municipio: 'RIO DE JANEIRO',
          uf: 'RJ',
          qsa: [{ nome_socio: 'FULANO', qualificacao_socio: 'Diretor' }],
        },
      };

      const response = await http()
        .post('/api/companies')
        .send({
          name: 'PETROLEO BRASILEIRO S A PETROBRAS',
          tradeName: 'PETROBRAS',
          cnpj: '33000167000101',
          email: 'contato@petrobras.com.br',
          phone: '2132242000',
          city: 'Rio de Janeiro',
          state: 'RJ',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        situacaoCadastral: 'ATIVA',
        cnaeCodigo: '1921700',
        cnaeDescricao: 'Refino de petróleo',
        porte: 'DEMAIS',
        logradouro: 'REPUBLICA DO CHILE',
        cep: '20031912',
      });
      expect(response.body.data.partners).toHaveLength(1);
      expect(response.body.data.partners[0]).toMatchObject({
        nome: 'FULANO',
        qualificacao: 'Diretor',
      });
    });

    it('filtra a listagem por porte e situação cadastral', async () => {
      await ctx.prisma.company.createMany({
        data: [
          { ...companyFactory(TENANT_A, { cnpj: '33000167000101' }), porte: 'ME', situacaoCadastral: 'ATIVA' },
          { ...companyFactory(TENANT_A, { cnpj: '47960950000121' }), porte: 'EPP', situacaoCadastral: 'BAIXADA' },
        ],
      });

      const response = await http().get('/api/companies?porte=ME').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].porte).toBe('ME');
    });
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/backend && npm run test:e2e -- companies`
Expected: FAIL — `situacaoCadastral` é `undefined` no DTO.

- [ ] **Step 4: Estender `company.schema.ts`**

Substituir `createCompanySchema`, `listCompaniesQuerySchema`, `CompanyDto` e `toCompanyDto` por:

```typescript
import { z } from 'zod';
import type { Company as PrismaCompany, Partner } from '@prisma/client';
import { toPartnerDto, type PartnerDto } from './partner.schema';

export const companyStatusSchema = z.enum(['active', 'inactive', 'pending']);
export type CompanyStatus = z.infer<typeof companyStatusSchema>;

/** Espelha o createCompanySchema do frontend. */
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Razão social é obrigatória'),
  tradeName: z.string().min(1, 'Nome fantasia é obrigatório'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos (somente números)'),
  status: companyStatusSchema.default('pending'),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  phone: z.string().default(''),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 letras'),
  logradouro: z.string().default(''),
  numero: z.string().default(''),
  complemento: z.string().nullable().default(null),
  bairro: z.string().default(''),
  cep: z.string().default(''),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional().default(''),
  state: z.string().length(2).optional(),
  porte: z.string().optional(),
  situacao: z.string().optional(),
  cnae: z.string().optional(),
});
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;

export type CompanyWithPartners = PrismaCompany & { partners?: Partner[] };

/** Shape exposto ao frontend (sem campos internos como tenantId/updatedAt). */
export interface CompanyDto {
  readonly id: string;
  readonly name: string;
  readonly tradeName: string;
  readonly cnpj: string;
  readonly status: CompanyStatus;
  readonly situacaoCadastral: string;
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null;
  readonly email: string;
  readonly phone: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly city: string;
  readonly state: string;
  readonly healthScore: number;
  readonly createdAt: string;
  readonly partners: readonly PartnerDto[];
}

export function toCompanyDto(company: CompanyWithPartners): CompanyDto {
  return {
    id: company.id,
    name: company.name,
    tradeName: company.tradeName,
    cnpj: company.cnpj,
    status: company.status as CompanyStatus,
    situacaoCadastral: company.situacaoCadastral,
    cnaeCodigo: company.cnaeCodigo,
    cnaeDescricao: company.cnaeDescricao,
    porte: company.porte,
    naturezaJuridica: company.naturezaJuridica,
    dataAbertura: company.dataAbertura?.toISOString() ?? null,
    email: company.email,
    phone: company.phone,
    logradouro: company.logradouro,
    numero: company.numero,
    complemento: company.complemento,
    bairro: company.bairro,
    cep: company.cep,
    city: company.city,
    state: company.state,
    healthScore: company.healthScore,
    createdAt: company.createdAt.toISOString(),
    partners: (company.partners ?? []).map(toPartnerDto),
  };
}
```

- [ ] **Step 5: Rodar e confirmar que ainda falha no serviço**

Run: `cd apps/backend && npm run test:e2e -- companies`
Expected: FAIL — o DTO agora tem os campos, mas vêm vazios porque o serviço não os persiste. Segue na Task 10.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/companies/company.schema.ts apps/backend/src/companies/partner.schema.ts apps/backend/test/companies.e2e-spec.ts
git commit -m "feat(backend): contrato de empresa com campos do brief"
```

---

### Task 10: Persistir dados oficiais e quadro societário

**Files:**
- Modify: `apps/backend/src/companies/companies.service.ts`

**Interfaces:**
- Consumes: `CnpjInfo` estendido (Task 4), `CompanyWithPartners` e `listCompaniesQuerySchema` (Task 9).
- Produces: `CompaniesService.create` grava todos os campos oficiais + `Partner[]`; `list` aplica os 4 filtros novos; `getById` inclui `partners`.

- [ ] **Step 1: Substituir `deriveFromSituacao` pelo mapeamento completo**

Trocar a função `deriveFromSituacao` (linhas 27-36) por:

```typescript
import { isValidCnpj } from '../common/cnpj';

/**
 * Traduz a resposta oficial da BrasilAPI para colunas da tabela.
 * `status` (interno) é derivado da situação cadastral apenas na criação;
 * o usuário pode sobrescrever depois via PATCH.
 */
function fromCnpjInfo(info: CnpjInfo): Partial<Prisma.CompanyUncheckedCreateInput> {
  return {
    status: info.situacao.trim().toUpperCase() === 'ATIVA' ? 'active' : 'inactive',
    situacaoCadastral: info.situacao,
    cnaeCodigo: info.cnaeCodigo,
    cnaeDescricao: info.cnaeDescricao,
    porte: info.porte,
    naturezaJuridica: info.naturezaJuridica,
    dataAbertura: info.dataAbertura ? new Date(info.dataAbertura) : null,
    logradouro: info.logradouro,
    numero: info.numero,
    complemento: info.complemento,
    bairro: info.bairro,
    cep: info.cep,
  };
}
```

- [ ] **Step 2: Reescrever `create`**

```typescript
  async create(
    tenantId: string,
    actorId: string,
    input: CreateCompanyInput,
  ): Promise<CompanyDto> {
    const data: Prisma.CompanyUncheckedCreateInput = { ...input, tenantId };
    let socios: readonly { nome: string; qualificacao: string; faixaEtaria: string | null }[] = [];
    let enrichedFrom: string | undefined;

    // Enriquecimento resiliente: falha/timeout da BrasilAPI não bloqueia
    // o cadastro — os campos oficiais simplesmente ficam vazios.
    const info = await this.brasilApi.lookupCnpj(input.cnpj);
    if (info) {
      Object.assign(data, fromCnpjInfo(info));
      socios = info.socios;
      enrichedFrom = info.situacao;
    }

    try {
      const company = await this.prisma.company.create({
        data: {
          ...data,
          partners: socios.length
            ? { create: socios.map((s) => ({ nome: s.nome, qualificacao: s.qualificacao, faixaEtaria: s.faixaEtaria })) }
            : undefined,
        },
        include: { partners: true },
      });

      await this.activity.record({
        tenantId,
        actorId,
        action: 'company.created',
        entityType: 'company',
        entityId: company.id,
        metadata: enrichedFrom
          ? { enrichedFrom: 'brasilapi', situacao: enrichedFrom }
          : undefined,
      });
      return toCompanyDto(company);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
      throw error;
    }
  }
```

- [ ] **Step 3: Adicionar os filtros em `list`**

Dentro de `list`, logo após o bloco `if (search) { ... }`, inserir:

```typescript
    if (query.state) {
      where.state = query.state;
    }
    if (query.porte) {
      where.porte = query.porte;
    }
    if (query.situacao) {
      where.situacaoCadastral = query.situacao;
    }
    if (query.cnae) {
      where.cnaeCodigo = query.cnae;
    }
```

- [ ] **Step 4: Incluir `partners` em `getById`**

Trocar o corpo de `ensureOwned` para incluir a relação:

```typescript
  private async ensureOwned(
    tenantId: string,
    id: string,
  ): Promise<CompanyWithPartners> {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
      include: { partners: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }
```

Ajustar o import de tipo no topo: trocar `type Company as PrismaCompany` por nada e importar `CompanyWithPartners` de `./company.schema`.

- [ ] **Step 5: Rodar os testes e2e**

Run: `cd apps/backend && npm run test:e2e -- companies`
Expected: PASS — incluindo os 2 testes novos da Task 9 e os 18 originais.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/companies/companies.service.ts
git commit -m "feat(backend): persiste dados oficiais e quadro societario no onboarding"
```

---

### Task 11: Frontend — tipos e serviço de empresas

**Files:**
- Modify: `apps/frontend/features/companies/types/company.types.ts`
- Modify: `apps/frontend/features/companies/services/companies.service.ts`
- Modify: `apps/frontend/services/mocks/companies.mock.ts`

**Interfaces:**
- Produces: tipo `Company` espelhando `CompanyDto` (Task 9); `Partner`; `CnpjLookup`.
- Produces: `companiesService.lookupCnpj(cnpj: string): Promise<CnpjLookup | null>`.

- [ ] **Step 1: Estender os tipos**

```typescript
// apps/frontend/features/companies/types/company.types.ts
export interface Partner {
  readonly id: string;
  readonly nome: string;
  readonly qualificacao: string;
  readonly faixaEtaria: string | null;
}

export interface Company {
  readonly id: string;
  readonly name: string;
  readonly tradeName: string;
  readonly cnpj: string;
  readonly status: 'active' | 'inactive' | 'pending';
  readonly situacaoCadastral: string;
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null;
  readonly email: string;
  readonly phone: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly city: string;
  readonly state: string;
  readonly healthScore: number;
  readonly createdAt: string;
  readonly partners: readonly Partner[];
}

export type CreateCompanyInput = Omit<
  Company,
  'id' | 'healthScore' | 'createdAt' | 'partners' | 'situacaoCadastral' |
  'cnaeCodigo' | 'cnaeDescricao' | 'porte' | 'naturezaJuridica' | 'dataAbertura'
>;

/** Resposta de GET /companies/lookup/:cnpj — dados oficiais antes de salvar. */
export interface CnpjLookup {
  readonly cnpj: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly situacao: string;
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly municipio: string;
  readonly uf: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly socios: readonly { nome: string; qualificacao: string; faixaEtaria: string | null }[];
}

export interface CompanyFilters {
  readonly state?: string;
  readonly porte?: string;
  readonly situacao?: string;
  readonly cnae?: string;
}
```

- [ ] **Step 2: Adicionar `lookupCnpj` e os filtros ao serviço**

Em `companies.service.ts`, estender `buildQueryString` para incluir os filtros e adicionar o método:

```typescript
  async lookupCnpj(cnpj: string, signal?: AbortSignal): Promise<CnpjLookup | null> {
    if (config.useMocks) {
      return null;
    }
    const response = await httpClient.get<ApiResponse<CnpjLookup | null>>(
      `/companies/lookup/${cnpj}`,
      { signal },
    );
    return response.data;
  },
```

Em `buildQueryString`, após o bloco de `params.search`, adicionar:

```typescript
  for (const key of ['state', 'porte', 'situacao', 'cnae'] as const) {
    const value = (params as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length > 0) {
      search.set(key, value);
    }
  }
```

- [ ] **Step 3: Atualizar o mock**

Em `services/mocks/companies.mock.ts`, adicionar os campos novos a cada entrada de `MOCK_COMPANIES` (`situacaoCadastral: 'ATIVA'`, `cnaeCodigo: '4721102'`, `cnaeDescricao: 'Padaria'`, `porte: 'ME'`, `naturezaJuridica: null`, `dataAbertura: '2019-03-12'`, `logradouro: 'Rua Exemplo'`, `numero: '100'`, `complemento: null`, `bairro: 'Centro'`, `cep: '01001000'`, `partners: []`).

- [ ] **Step 4: Verificar tipos**

Run: `cd apps/frontend && npm run type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/features/companies apps/frontend/services/mocks/companies.mock.ts
git commit -m "feat(frontend): tipos e servico de empresas com campos do brief"
```

---

### Task 12: Frontend — busca por CNPJ com preview

O fluxo que o cliente pediu: o usuário informa o CNPJ, o sistema preenche os dados, o usuário confere e salva.

**Files:**
- Create: `apps/frontend/features/companies/components/cnpj-lookup-form.tsx`
- Create: `apps/frontend/features/companies/components/partners-table.tsx`
- Modify: `apps/frontend/features/companies/components/companies-view.tsx`

**Interfaces:**
- Consumes: `companiesService.lookupCnpj`, `CnpjLookup`, `Partner` (Task 11).
- Produces: `<CnpjLookupForm onSaved={() => void} />`, `<PartnersTable partners={readonly Partner[]} />`.

- [ ] **Step 1: Criar a tabela de sócios**

```tsx
// apps/frontend/features/companies/components/partners-table.tsx
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Partner } from '@/features/companies/types/company.types';

interface PartnersTableProps {
  readonly partners: readonly Partner[];
}

export function PartnersTable({ partners }: PartnersTableProps): React.ReactNode {
  if (partners.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sem quadro societário"
        description="A Receita Federal não retornou sócios para este CNPJ."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Qualificação</TableHead>
          <TableHead className="hidden sm:table-cell">Faixa etária</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {partners.map((partner) => (
          <TableRow key={partner.id}>
            <TableCell className="font-medium">{partner.nome}</TableCell>
            <TableCell>{partner.qualificacao}</TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {partner.faixaEtaria ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Criar o formulário de busca com preview**

```tsx
// apps/frontend/features/companies/components/cnpj-lookup-form.tsx
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { companiesService } from '@/features/companies/services/companies.service';
import type { CnpjLookup } from '@/features/companies/types/company.types';

interface CnpjLookupFormProps {
  readonly onSaved: () => void;
}

export function CnpjLookupForm({ onSaved }: CnpjLookupFormProps): React.ReactNode {
  const [cnpj, setCnpj] = useState('');
  const [preview, setPreview] = useState<CnpjLookup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await companiesService.lookupCnpj(cnpj.replace(/\D/g, ''));
      if (result === null) {
        setError('CNPJ não encontrado na Receita Federal.');
        return;
      }
      setPreview(result);
    } catch {
      setError('Não foi possível consultar o CNPJ. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(): Promise<void> {
    if (!preview) return;
    setIsLoading(true);
    try {
      await companiesService.create({
        name: preview.razaoSocial,
        tradeName: preview.nomeFantasia || preview.razaoSocial,
        cnpj: preview.cnpj,
        status: 'pending',
        email: preview.email ?? '',
        phone: preview.telefone ?? '',
        logradouro: preview.logradouro,
        numero: preview.numero,
        complemento: preview.complemento,
        bairro: preview.bairro,
        cep: preview.cep,
        city: preview.municipio,
        state: preview.uf,
      });
      setPreview(null);
      setCnpj('');
      onSaved();
    } catch {
      setError('Não foi possível salvar a empresa.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={cnpj}
          onChange={(event) => setCnpj(event.target.value)}
          placeholder="Informe o CNPJ"
          aria-label="CNPJ"
          className="sm:max-w-xs"
        />
        <Button onClick={handleLookup} disabled={isLoading || cnpj.replace(/\D/g, '').length !== 14}>
          <Search className="mr-2 size-4" aria-hidden />
          Consultar
        </Button>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {preview ? (
        <Card className="space-y-3 p-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Razão social" value={preview.razaoSocial} />
            <Field label="Nome fantasia" value={preview.nomeFantasia || '—'} />
            <Field label="Situação cadastral" value={preview.situacao} />
            <Field label="Porte" value={preview.porte || '—'} />
            <Field label="CNAE" value={`${preview.cnaeCodigo} — ${preview.cnaeDescricao}`} />
            <Field label="Abertura" value={preview.dataAbertura ?? '—'} />
            <Field
              label="Endereço"
              value={`${preview.logradouro}, ${preview.numero} — ${preview.bairro}, ${preview.municipio}/${preview.uf}`}
            />
            <Field label="Sócios" value={String(preview.socios.length)} />
          </dl>
          <Button onClick={handleSave} disabled={isLoading}>Salvar empresa</Button>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Ligar o formulário à tela de empresas**

Em `companies-view.tsx`, importar `CnpjLookupForm` e `useQueryClient` do `@tanstack/react-query`, e inserir o formulário logo abaixo do `PageHeader`:

```tsx
const queryClient = useQueryClient();

// ...dentro do JSX, após <PageHeader />:
<Card className="p-4">
  <h2 className="mb-3 text-sm font-semibold">Cadastrar empresa por CNPJ</h2>
  <CnpjLookupForm onSaved={() => void queryClient.invalidateQueries({ queryKey: ['companies'] })} />
</Card>
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 5: Verificar no navegador em viewport móvel**

Run: `cd apps/frontend && npm run dev`
Abrir `http://localhost:3000/companies`, DevTools → dispositivo iPhone SE (375px). O formulário deve empilhar em coluna e nada deve rolar horizontalmente.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/features/companies
git commit -m "feat(frontend): onboarding de empresa por CNPJ com preview"
```

- [ ] **Step 7: Abrir PR e mergear**

```bash
git push -u origin feat/onboarding-empresas
```

---

# FASE 2 — Auditoria da carteira

**Branch:** `feat/auditoria-carteira` (parte de `main` após a Fase 0)

```bash
git checkout main && git pull && git checkout -b feat/auditoria-carteira
```

---

### Task 13: Motor de auditoria — as 6 regras do brief

Reescrita completa. O motor atual avalia uma empresa isolada com 5 regras genéricas; o brief pede 6 verificações específicas, duas delas exigindo contexto externo (dados oficiais e as demais empresas da carteira).

**Files:**
- Modify: `apps/backend/src/audit/audit-engine.ts`
- Modify: `apps/backend/src/audit/audit-engine.spec.ts`

**Interfaces:**
- Consumes: `isValidCnpj` (Task 1), `CnpjInfo` (Task 4).
- Produces: `FindingResult = 'passed' | 'failed' | 'skipped'`.
- Produces: `AuditContext = { official: CnpjInfo | null; duplicateOf: readonly string[] }`.
- Produces: `runAudit(company: AuditableCompany, context: AuditContext): AuditResult`.
- Produces: `AuditableCompany = { cnpj, name, situacaoCadastral, email, phone, cnaeCodigo, porte, logradouro, numero, bairro, cep, city, state }`.
- Produces: `normalizeName(value: string): string` — usada pelo serviço para detectar duplicatas.

- [ ] **Step 1: Reescrever o teste**

```typescript
// apps/backend/src/audit/audit-engine.spec.ts
import { runAudit, normalizeName, type AuditableCompany, type AuditContext } from './audit-engine';
import type { CnpjInfo } from '../brasil-api/brasil-api.types';

const company: AuditableCompany = {
  cnpj: '33000167000101',
  name: 'PETROLEO BRASILEIRO S A PETROBRAS',
  situacaoCadastral: 'ATIVA',
  email: 'contato@petrobras.com.br',
  phone: '2132242000',
  cnaeCodigo: '1921700',
  porte: 'DEMAIS',
  logradouro: 'REPUBLICA DO CHILE',
  numero: '65',
  bairro: 'CENTRO',
  cep: '20031912',
  city: 'Rio de Janeiro',
  state: 'RJ',
};

const official: CnpjInfo = {
  cnpj: '33000167000101',
  razaoSocial: 'PETROLEO BRASILEIRO S A PETROBRAS',
  nomeFantasia: 'PETROBRAS',
  situacao: 'ATIVA',
  cnaeCodigo: '1921700',
  cnaeDescricao: 'Refino',
  porte: 'DEMAIS',
  naturezaJuridica: null,
  dataAbertura: '1953-10-03',
  logradouro: 'REPUBLICA DO CHILE',
  numero: '65',
  complemento: null,
  bairro: 'CENTRO',
  cep: '20031912',
  municipio: 'RIO DE JANEIRO',
  uf: 'RJ',
  email: null,
  telefone: null,
  socios: [],
};

const clean: AuditContext = { official, duplicateOf: [] };

function find(result: ReturnType<typeof runAudit>, code: string) {
  const finding = result.findings.find((f) => f.code === code);
  if (!finding) throw new Error(`Regra ausente: ${code}`);
  return finding;
}

describe('runAudit', () => {
  it('empresa em ordem passa em todas as regras com score 100', () => {
    const result = runAudit(company, clean);

    expect(result.score).toBe(100);
    expect(result.status).toBe('healthy');
    expect(result.findings).toHaveLength(6);
    expect(result.findings.every((f) => f.result === 'passed')).toBe(true);
  });

  it('detecta CNPJ com dígito verificador inválido', () => {
    const result = runAudit({ ...company, cnpj: '12345678000190' }, clean);

    expect(find(result, 'cnpj_invalido').result).toBe('failed');
    expect(result.status).toBe('critical');
  });

  it('detecta empresa duplicada', () => {
    const result = runAudit(company, { official, duplicateOf: ['cmp_outra'] });

    expect(find(result, 'empresa_duplicada').result).toBe('failed');
  });

  it('detecta razão social divergente da Receita', () => {
    const result = runAudit({ ...company, name: 'NOME ERRADO LTDA' }, clean);

    expect(find(result, 'razao_social_divergente').result).toBe('failed');
  });

  it('ignora diferença de acento e caixa na razão social', () => {
    const result = runAudit(
      { ...company, name: 'petroleo brasileiro s a petrobrás' },
      clean,
    );

    expect(find(result, 'razao_social_divergente').result).toBe('passed');
  });

  it('detecta endereço desatualizado', () => {
    const result = runAudit({ ...company, cep: '99999999' }, clean);

    expect(find(result, 'endereco_desatualizado').result).toBe('failed');
  });

  it('detecta situação cadastral irregular', () => {
    const result = runAudit(
      { ...company, situacaoCadastral: 'BAIXADA' },
      { official: { ...official, situacao: 'BAIXADA' }, duplicateOf: [] },
    );

    expect(find(result, 'situacao_irregular').result).toBe('failed');
  });

  it('detecta dados ausentes', () => {
    const result = runAudit({ ...company, email: '', porte: '' }, clean);

    expect(find(result, 'dados_ausentes').result).toBe('failed');
  });

  it('marca como skipped as regras que dependem da BrasilAPI quando ela falha', () => {
    const result = runAudit(company, { official: null, duplicateOf: [] });

    expect(find(result, 'razao_social_divergente').result).toBe('skipped');
    expect(find(result, 'endereco_desatualizado').result).toBe('skipped');
    // Regras locais continuam valendo.
    expect(find(result, 'cnpj_invalido').result).toBe('passed');
    // Skipped não penaliza o score.
    expect(result.score).toBe(100);
  });
});

describe('normalizeName', () => {
  it('remove acento, caixa e espaço extra', () => {
    expect(normalizeName('  Petrobrás   S/A  ')).toBe(normalizeName('PETROBRAS S/A'));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npx jest src/audit/audit-engine.spec.ts`
Expected: FAIL — `runAudit` recebe 1 argumento, `result` não existe nos findings.

- [ ] **Step 3: Reescrever o motor**

```typescript
// apps/backend/src/audit/audit-engine.ts
import { isValidCnpj } from '../common/cnpj';
import type { CnpjInfo } from '../brasil-api/brasil-api.types';

export type Severity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'healthy' | 'attention' | 'critical';
export type FindingResult = 'passed' | 'failed' | 'skipped';

export interface AuditFindingResult {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly result: FindingResult;
  readonly detail: string | null;
}

export interface AuditResult {
  readonly score: number;
  readonly status: AuditStatus;
  readonly findings: readonly AuditFindingResult[];
}

export interface AuditableCompany {
  readonly cnpj: string;
  readonly name: string;
  readonly situacaoCadastral: string;
  readonly email: string;
  readonly phone: string;
  readonly cnaeCodigo: string;
  readonly porte: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly bairro: string;
  readonly cep: string;
  readonly city: string;
  readonly state: string;
}

export interface AuditContext {
  /** Dados oficiais da BrasilAPI. `null` = consulta falhou (regras viram skipped). */
  readonly official: CnpjInfo | null;
  /** IDs de outras empresas do tenant com mesmo CNPJ ou razão social. */
  readonly duplicateOf: readonly string[];
}

/** Normaliza para comparar nomes ignorando acento, caixa e espaço extra. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    // Faixa Unicode dos acentos combinantes. Escrever como escape (e não
    // como caractere literal) evita corrupção ao copiar/colar o arquivo.
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface Rule {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly penalty: number;
  /** `null` = não foi possível verificar (BrasilAPI indisponível). */
  readonly evaluate: (
    company: AuditableCompany,
    context: AuditContext,
  ) => { ok: boolean; detail: string | null } | null;
}

const RULES: readonly Rule[] = [
  {
    code: 'cnpj_invalido',
    severity: 'critical',
    message: 'CNPJ válido',
    penalty: 30,
    evaluate: (c) =>
      isValidCnpj(c.cnpj)
        ? { ok: true, detail: null }
        : { ok: false, detail: `CNPJ ${c.cnpj} não passa na validação do dígito verificador` },
  },
  {
    code: 'empresa_duplicada',
    severity: 'critical',
    message: 'Empresa sem duplicata na carteira',
    penalty: 25,
    evaluate: (_c, ctx) =>
      ctx.duplicateOf.length === 0
        ? { ok: true, detail: null }
        : { ok: false, detail: `Duplicada de ${ctx.duplicateOf.length} outro(s) cadastro(s)` },
  },
  {
    code: 'razao_social_divergente',
    severity: 'warning',
    message: 'Razão social igual à da Receita Federal',
    penalty: 15,
    evaluate: (c, ctx) => {
      if (!ctx.official) return null;
      const igual = normalizeName(c.name) === normalizeName(ctx.official.razaoSocial);
      return igual
        ? { ok: true, detail: null }
        : { ok: false, detail: `Receita informa "${ctx.official.razaoSocial}"` };
    },
  },
  {
    code: 'endereco_desatualizado',
    severity: 'warning',
    message: 'Endereço igual ao da Receita Federal',
    penalty: 15,
    evaluate: (c, ctx) => {
      if (!ctx.official) return null;
      const o = ctx.official;
      const divergencias: string[] = [];
      if (normalizeName(c.logradouro) !== normalizeName(o.logradouro)) divergencias.push('logradouro');
      if (c.numero.trim() !== o.numero.trim()) divergencias.push('número');
      if (normalizeName(c.bairro) !== normalizeName(o.bairro)) divergencias.push('bairro');
      if (c.cep.replace(/\D/g, '') !== o.cep.replace(/\D/g, '')) divergencias.push('CEP');
      if (normalizeName(c.state) !== normalizeName(o.uf)) divergencias.push('UF');
      return divergencias.length === 0
        ? { ok: true, detail: null }
        : { ok: false, detail: `Divergente em: ${divergencias.join(', ')}` };
    },
  },
  {
    code: 'situacao_irregular',
    severity: 'critical',
    message: 'Situação cadastral regular (ATIVA)',
    penalty: 25,
    evaluate: (c) =>
      c.situacaoCadastral.trim().toUpperCase() === 'ATIVA'
        ? { ok: true, detail: null }
        : { ok: false, detail: `Situação: ${c.situacaoCadastral || 'não informada'}` };
  },
  {
    code: 'dados_ausentes',
    severity: 'warning',
    message: 'Cadastro completo',
    penalty: 10,
    evaluate: (c) => {
      const faltando: string[] = [];
      if (!c.email.trim()) faltando.push('e-mail');
      if (!c.phone.trim()) faltando.push('telefone');
      if (!c.cnaeCodigo.trim()) faltando.push('CNAE');
      if (!c.porte.trim()) faltando.push('porte');
      return faltando.length === 0
        ? { ok: true, detail: null }
        : { ok: false, detail: `Faltando: ${faltando.join(', ')}` };
    },
  },
];

function toStatus(score: number): AuditStatus {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'attention';
  return 'critical';
}

/**
 * Avalia as 6 verificações do brief.
 * Regras que dependem da BrasilAPI viram `skipped` quando ela está
 * indisponível — nunca derrubam a auditoria nem penalizam o score.
 */
export function runAudit(
  company: AuditableCompany,
  context: AuditContext,
): AuditResult {
  let penalties = 0;

  const findings: AuditFindingResult[] = RULES.map((rule) => {
    const outcome = rule.evaluate(company, context);

    if (outcome === null) {
      return { code: rule.code, severity: rule.severity, message: rule.message, result: 'skipped', detail: 'Não verificado: Receita Federal indisponível' };
    }
    if (!outcome.ok) {
      penalties += rule.penalty;
    }
    return {
      code: rule.code,
      severity: rule.severity,
      message: rule.message,
      result: outcome.ok ? 'passed' : 'failed',
      detail: outcome.detail,
    };
  });

  const score = Math.max(0, Math.min(100, 100 - penalties));
  return { score, status: toStatus(score), findings };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/backend && npx jest src/audit/audit-engine.spec.ts`
Expected: PASS — 10 testes

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/audit/audit-engine.ts apps/backend/src/audit/audit-engine.spec.ts
git commit -m "feat(backend): motor de auditoria com as 6 regras do brief"
```

---

### Task 14: Auditoria da carteira inteira

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (campo `detail` em `AuditFinding`)
- Modify: `apps/backend/src/audit/audit.types.ts`
- Modify: `apps/backend/src/audit/audit.service.ts`
- Modify: `apps/backend/src/audit/audit.controller.ts`
- Modify: `apps/backend/src/audit/audit.module.ts`
- Test: `apps/backend/test/audit.e2e-spec.ts`

**Interfaces:**
- Consumes: `runAudit`, `normalizeName`, `AuditContext` (Task 13); `BrasilApiService.lookupMany` (Task 5).
- Produces: `POST /api/audit/run` → `{ data: { total, healthy, attention, critical, runs: AuditRunSummaryDto[] } }`.
- Produces: `AuditFindingDto` com `result: FindingResult` e `detail: string | null`.

- [ ] **Step 1: Adicionar `detail` ao schema e migrar**

Em `model AuditFinding`, adicionar após `message`:

```prisma
  detail String?
```

Run: `cd apps/backend && npx prisma migrate dev --name audit_finding_detail`

- [ ] **Step 2: Escrever o teste e2e que falha**

Adicionar a `apps/backend/test/audit.e2e-spec.ts`:

```typescript
  describe('POST /api/audit/run', () => {
    it('audita a carteira inteira e resume por status', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: {
          cnpj: '33000167000101',
          razao_social: 'EMPRESA CERTA LTDA',
          descricao_situacao_cadastral: 'ATIVA',
          logradouro: 'RUA A', numero: '1', bairro: 'CENTRO', cep: '01001000',
          municipio: 'SAO PAULO', uf: 'SP',
        },
      };

      await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_A, { cnpj: '33000167000101', name: 'EMPRESA CERTA LTDA' }),
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          porte: 'ME',
          logradouro: 'RUA A', numero: '1', bairro: 'CENTRO', cep: '01001000',
          city: 'SAO PAULO', state: 'SP',
        },
      });

      const response = await http().post('/api/audit/run').expect(201);

      expect(response.body.data.total).toBe(1);
      expect(response.body.data.runs).toHaveLength(1);
      expect(response.body.data.runs[0].score).toBe(100);
    });

    it('não audita empresas de outro tenant', async () => {
      await ctx.prisma.company.create({
        data: companyFactory(TENANT_B, { cnpj: '47960950000121' }),
      });

      const response = await http().post('/api/audit/run').expect(201);

      expect(response.body.data.total).toBe(0);
    });

    it('marca regras da BrasilAPI como skipped quando ela está fora', async () => {
      brasilApiMock.fail = true;
      await ctx.prisma.company.create({
        data: {
          ...companyFactory(TENANT_A, { cnpj: '33000167000101' }),
          situacaoCadastral: 'ATIVA',
          cnaeCodigo: '4721102',
          porte: 'ME',
        },
      });

      const response = await http().post('/api/audit/run').expect(201);
      const detail = await http().get(`/api/audit/${response.body.data.runs[0].id}`).expect(200);

      const skipped = detail.body.data.findings.filter((f: { result: string }) => f.result === 'skipped');
      expect(skipped).toHaveLength(2);
    });
  });
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd apps/backend && npm run test:e2e -- audit`
Expected: FAIL — 404 em `POST /api/audit/run`

- [ ] **Step 4: Atualizar `audit.types.ts`**

Trocar a interface e o mapeamento dos findings:

```typescript
import type { AuditStatus, FindingResult, Severity } from './audit-engine';

export interface AuditFindingDto {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly result: FindingResult;
  readonly detail: string | null;
}

export interface PortfolioAuditDto {
  readonly total: number;
  readonly healthy: number;
  readonly attention: number;
  readonly critical: number;
  readonly runs: readonly AuditRunSummaryDto[];
}
```

Em `toDetailDto`, trocar o `map` dos findings por:

```typescript
    findings: run.findings.map((f) => ({
      code: f.code,
      severity: f.severity as Severity,
      message: f.message,
      result: f.result as FindingResult,
      detail: f.detail,
    })),
```

- [ ] **Step 5: Implementar `runForPortfolio`**

Em `audit.service.ts`, adicionar os imports e o método:

```typescript
import { mapWithConcurrency } from '../common/concurrency';
import { BrasilApiService } from '../brasil-api/brasil-api.service';
import { runAudit, normalizeName, type AuditContext } from './audit-engine';
import type { PortfolioAuditDto } from './audit.types';
```

Adicionar `private readonly brasilApi: BrasilApiService` ao construtor, e o método:

```typescript
  /**
   * Audita a carteira inteira (decisão A2 da spec): reconsulta a BrasilAPI
   * com concorrência limitada e detecta duplicatas comparando as empresas
   * entre si — o que só é possível com a carteira toda em mãos.
   */
  async runForPortfolio(
    tenantId: string,
    actorId: string,
  ): Promise<PortfolioAuditDto> {
    const companies = await this.prisma.company.findMany({ where: { tenantId } });

    if (companies.length === 0) {
      return { total: 0, healthy: 0, attention: 0, critical: 0, runs: [] };
    }

    const official = await this.brasilApi.lookupMany(companies.map((c) => c.cnpj));

    // Índice de duplicatas: mesmo CNPJ ou mesma razão social normalizada.
    const byKey = new Map<string, string[]>();
    for (const company of companies) {
      for (const key of [`cnpj:${company.cnpj}`, `name:${normalizeName(company.name)}`]) {
        byKey.set(key, [...(byKey.get(key) ?? []), company.id]);
      }
    }

    const runs = await mapWithConcurrency(companies, 5, async (company) => {
      const duplicateOf = [
        ...new Set(
          [`cnpj:${company.cnpj}`, `name:${normalizeName(company.name)}`]
            .flatMap((key) => byKey.get(key) ?? [])
            .filter((id) => id !== company.id),
        ),
      ];

      const context: AuditContext = {
        official: official.get(company.cnpj) ?? null,
        duplicateOf,
      };

      return this.persistRun(tenantId, company.id, runAudit(company, context));
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: 'audit.portfolio_completed',
      entityType: 'tenant',
      entityId: tenantId,
      metadata: { total: runs.length },
    });

    return {
      total: runs.length,
      healthy: runs.filter((r) => r.status === 'healthy').length,
      attention: runs.filter((r) => r.status === 'attention').length,
      critical: runs.filter((r) => r.status === 'critical').length,
      runs,
    };
  }

  /** Grava o resultado e atualiza o score da empresa. */
  private async persistRun(
    tenantId: string,
    companyId: string,
    result: ReturnType<typeof runAudit>,
  ): Promise<AuditRunSummaryDto> {
    const run = await this.prisma.auditRun.create({
      data: {
        tenantId,
        companyId,
        score: result.score,
        status: result.status,
        findings: {
          create: result.findings.map((f) => ({
            code: f.code,
            severity: f.severity,
            message: f.message,
            result: f.result,
            detail: f.detail,
          })),
        },
      },
      include: { _count: { select: { findings: true } } },
    });

    await this.prisma.company.update({
      where: { id: companyId },
      data: { healthScore: result.score },
    });

    return toSummaryDto(run);
  }
```

Reescrever `runForCompany` para reusar `persistRun`, buscando o contexto de uma empresa só:

```typescript
  async runForCompany(
    tenantId: string,
    actorId: string,
    companyId: string,
  ): Promise<AuditRunDetailDto> {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, tenantId } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const duplicates = await this.prisma.company.findMany({
      where: { tenantId, id: { not: companyId }, OR: [{ cnpj: company.cnpj }, { name: company.name }] },
      select: { id: true },
    });

    const context: AuditContext = {
      official: await this.brasilApi.lookupCnpj(company.cnpj),
      duplicateOf: duplicates.map((d) => d.id),
    };

    const summary = await this.persistRun(tenantId, companyId, runAudit(company, context));

    await this.activity.record({
      tenantId, actorId, action: 'audit.completed',
      entityType: 'company', entityId: companyId,
      metadata: { score: summary.score, status: summary.status },
    });

    return this.getById(tenantId, summary.id);
  }
```

- [ ] **Step 6: Expor o endpoint**

Em `audit.controller.ts`, adicionar:

```typescript
  @Post('run')
  runPortfolio(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthContext,
  ): Promise<PortfolioAuditDto> {
    return this.service.runForPortfolio(tenantId, user.userId);
  }
```

Em `audit.module.ts`, adicionar `BrasilApiModule` aos `imports`.

- [ ] **Step 7: Rodar os testes**

Run: `cd apps/backend && npm run test:e2e -- audit && npx jest src/audit`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/audit apps/backend/prisma apps/backend/test/audit.e2e-spec.ts
git commit -m "feat(backend): auditoria da carteira com dados oficiais ao vivo"
```

---

### Task 15: Frontend — tela de auditoria

**Files:**
- Create: `apps/frontend/features/audit/types/audit.types.ts`
- Create: `apps/frontend/features/audit/services/audit.service.ts`
- Create: `apps/frontend/features/audit/hooks/use-audit.ts`
- Create: `apps/frontend/features/audit/components/audit-view.tsx`
- Create: `apps/frontend/features/audit/components/finding-badge.tsx`
- Modify: `apps/frontend/app/(dashboard)/audit/page.tsx`

**Interfaces:**
- Consumes: `POST /audit/run`, `GET /audit`, `GET /audit/:id` (Task 14).
- Produces: `<AuditView />`.

- [ ] **Step 1: Tipos e serviço**

```typescript
// apps/frontend/features/audit/types/audit.types.ts
export type FindingResult = 'passed' | 'failed' | 'skipped';
export type AuditStatus = 'healthy' | 'attention' | 'critical';

export interface AuditFinding {
  readonly code: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
  readonly result: FindingResult;
  readonly detail: string | null;
}

export interface AuditRunSummary {
  readonly id: string;
  readonly companyId: string;
  readonly score: number;
  readonly status: AuditStatus;
  readonly findingsCount: number;
  readonly createdAt: string;
}

export interface AuditRunDetail extends AuditRunSummary {
  readonly findings: readonly AuditFinding[];
}

export interface PortfolioAudit {
  readonly total: number;
  readonly healthy: number;
  readonly attention: number;
  readonly critical: number;
  readonly runs: readonly AuditRunSummary[];
}
```

```typescript
// apps/frontend/features/audit/services/audit.service.ts
import { httpClient } from '@/lib/http-client';
import type { ApiResponse } from '@/types/api.types';
import type { AuditRunDetail, PortfolioAudit } from '@/features/audit/types/audit.types';

export const auditService = {
  async runPortfolio(): Promise<PortfolioAudit> {
    const response = await httpClient.post<ApiResponse<PortfolioAudit>>('/audit/run');
    return response.data;
  },

  async getById(id: string, signal?: AbortSignal): Promise<AuditRunDetail> {
    const response = await httpClient.get<ApiResponse<AuditRunDetail>>(`/audit/${id}`, { signal });
    return response.data;
  },
} as const;
```

- [ ] **Step 2: Hook**

```typescript
// apps/frontend/features/audit/hooks/use-audit.ts
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { auditService } from '@/features/audit/services/audit.service';

export function useRunPortfolioAudit() {
  return useMutation({ mutationFn: () => auditService.runPortfolio() });
}

export function useAuditDetail(id: string | null) {
  return useQuery({
    queryKey: ['audit', 'detail', id],
    queryFn: ({ signal }) => auditService.getById(id as string, signal),
    enabled: id !== null,
  });
}
```

- [ ] **Step 3: Selo de resultado**

```tsx
// apps/frontend/features/audit/components/finding-badge.tsx
import { Badge } from '@/components/ui/badge';
import type { FindingResult } from '@/features/audit/types/audit.types';

const LABELS: Record<FindingResult, string> = {
  passed: 'OK',
  failed: 'Divergência',
  skipped: 'Não verificado',
};

// `success` e `secondary` já existem em components/ui/badge.tsx.
const VARIANTS: Record<FindingResult, 'success' | 'destructive' | 'secondary'> = {
  passed: 'success',
  failed: 'destructive',
  skipped: 'secondary',
};

export function FindingBadge({ result }: { readonly result: FindingResult }): React.ReactNode {
  return <Badge variant={VARIANTS[result]}>{LABELS[result]}</Badge>;
}
```

- [ ] **Step 4: Tela**

```tsx
// apps/frontend/features/audit/components/audit-view.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { FindingBadge } from '@/features/audit/components/finding-badge';
import { useRunPortfolioAudit, useAuditDetail } from '@/features/audit/hooks/use-audit';

export function AuditView(): React.ReactNode {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { mutate, data, isPending, isError } = useRunPortfolioAudit();
  const detail = useAuditDetail(selectedRunId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Verifica CNPJ, duplicidade, razão social, endereço, situação cadastral e dados ausentes."
      />

      <Button onClick={() => mutate()} disabled={isPending}>
        {isPending ? 'Auditando carteira...' : 'Auditar carteira'}
      </Button>

      {isError ? (
        <EmptyState icon={ShieldCheck} title="Falha na auditoria" description="Tente novamente em instantes." />
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* StatCard usa `title`, não `label` — ver components/ui/stat-card.tsx */}
            <StatCard title="Empresas auditadas" value={String(data.total)} />
            <StatCard title="Sem divergência" value={String(data.healthy)} />
            <StatCard title="Atenção" value={String(data.attention)} />
            <StatCard title="Críticas" value={String(data.critical)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="divide-y p-0">
              {data.runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRunId(run.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
                >
                  <span className="text-sm">{run.companyId}</span>
                  <span className="text-sm font-semibold">{run.score}/100</span>
                </button>
              ))}
            </Card>

            <Card className="space-y-4 p-4">
              {detail.data ? (
                <>
                  <ul className="space-y-3">
                    {detail.data.findings.map((finding) => (
                      <li key={finding.code} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">{finding.message}</p>
                          {finding.detail ? (
                            <p className="text-xs text-muted-foreground">{finding.detail}</p>
                          ) : null}
                        </div>
                        <FindingBadge result={finding.result} />
                      </li>
                    ))}
                  </ul>
                  {/* O brief pede que o usuário decida o que corrigir — o
                      sistema nunca corrige sozinho. Este link leva ao cadastro. */}
                  <Link
                    href={`/companies/${detail.data.companyId}`}
                    className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Corrigir cadastro desta empresa
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione uma empresa para ver as divergências.
                </p>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Ligar a rota**

```tsx
// apps/frontend/app/(dashboard)/audit/page.tsx
import { AuditView } from '@/features/audit/components/audit-view';

export default function AuditPage(): React.ReactNode {
  return <AuditView />;
}
```

- [ ] **Step 6: Verificar**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: PASS

Depois: `npm run dev`, abrir `/audit` em 375px de largura, confirmar que os cards empilham e não há rolagem horizontal.

- [ ] **Step 7: Commit e PR**

```bash
git add apps/frontend/features/audit apps/frontend/app
git commit -m "feat(frontend): tela de auditoria da carteira"
git push -u origin feat/auditoria-carteira
```

---

# FASE 3 — Análise da carteira

**Branch:** `feat/dashboard-carteira` (parte de `main` após a Fase 0)

---

### Task 16: Agregações da carteira

**Files:**
- Modify: `apps/backend/src/dashboard/dashboard.service.ts`
- Modify: `apps/backend/src/dashboard/dashboard.controller.ts`
- Test: `apps/backend/test/dashboard.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /api/dashboard/portfolio` aceitando `state`, `porte`, `situacao`, `cnae`, `search`.
- Produces: `PortfolioDto = { totals: { companies, irregulares }, byState: Bucket[], byPorte: Bucket[], byCnae: CnaeBucket[], bySituacao: Bucket[], byAge: Bucket[] }` com `Bucket = { label: string; count: number }` e `CnaeBucket = { label: string; descricao: string; count: number }`.

- [ ] **Step 1: Escrever o teste e2e que falha**

```typescript
  describe('GET /api/dashboard/portfolio', () => {
    it('agrega por estado, porte, situação e idade', async () => {
      await ctx.prisma.company.createMany({
        data: [
          { ...companyFactory(TENANT_A, { cnpj: '33000167000101' }), state: 'SP', porte: 'ME', situacaoCadastral: 'ATIVA', cnaeCodigo: '4721102', cnaeDescricao: 'Padaria', dataAbertura: new Date('2024-01-01') },
          { ...companyFactory(TENANT_A, { cnpj: '47960950000121' }), state: 'SP', porte: 'EPP', situacaoCadastral: 'BAIXADA', cnaeCodigo: '4721102', cnaeDescricao: 'Padaria', dataAbertura: new Date('2000-01-01') },
          { ...companyFactory(TENANT_A, { cnpj: '00000000000191' }), state: 'RJ', porte: 'ME', situacaoCadastral: 'ATIVA', cnaeCodigo: '4930202', cnaeDescricao: 'Transporte', dataAbertura: new Date('2015-01-01') },
        ],
      });

      const response = await http().get('/api/dashboard/portfolio').expect(200);

      expect(response.body.data.totals.companies).toBe(3);
      expect(response.body.data.totals.irregulares).toBe(1);
      expect(response.body.data.byState).toEqual(
        expect.arrayContaining([{ label: 'SP', count: 2 }, { label: 'RJ', count: 1 }]),
      );
      expect(response.body.data.byPorte).toEqual(
        expect.arrayContaining([{ label: 'ME', count: 2 }]),
      );
      expect(response.body.data.byCnae[0]).toMatchObject({ label: '4721102', descricao: 'Padaria', count: 2 });
      expect(response.body.data.byAge.reduce((s: number, b: { count: number }) => s + b.count, 0)).toBe(3);
    });

    it('aplica o filtro de estado em todas as agregações', async () => {
      await ctx.prisma.company.createMany({
        data: [
          { ...companyFactory(TENANT_A, { cnpj: '33000167000101' }), state: 'SP', porte: 'ME', situacaoCadastral: 'ATIVA' },
          { ...companyFactory(TENANT_A, { cnpj: '47960950000121' }), state: 'RJ', porte: 'EPP', situacaoCadastral: 'ATIVA' },
        ],
      });

      const response = await http().get('/api/dashboard/portfolio?state=SP').expect(200);

      expect(response.body.data.totals.companies).toBe(1);
      expect(response.body.data.byState).toEqual([{ label: 'SP', count: 1 }]);
    });

    it('não conta empresas de outro tenant', async () => {
      await ctx.prisma.company.create({ data: companyFactory(TENANT_B, { cnpj: '33000167000101' }) });

      const response = await http().get('/api/dashboard/portfolio').expect(200);

      expect(response.body.data.totals.companies).toBe(0);
    });
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npm run test:e2e -- dashboard`
Expected: FAIL — 404

- [ ] **Step 3: Implementar o serviço**

Adicionar a `dashboard.service.ts`:

```typescript
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const portfolioQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  state: z.string().length(2).optional(),
  porte: z.string().optional(),
  situacao: z.string().optional(),
  cnae: z.string().optional(),
});
export type PortfolioQuery = z.infer<typeof portfolioQuerySchema>;

export interface Bucket {
  readonly label: string;
  readonly count: number;
}

export interface CnaeBucket extends Bucket {
  readonly descricao: string;
}

export interface PortfolioDto {
  readonly totals: { readonly companies: number; readonly irregulares: number };
  readonly byState: readonly Bucket[];
  readonly byPorte: readonly Bucket[];
  readonly byCnae: readonly CnaeBucket[];
  readonly bySituacao: readonly Bucket[];
  readonly byAge: readonly Bucket[];
}

const AGE_BUCKETS = [
  { label: 'Menos de 1 ano', maxYears: 1 },
  { label: '1 a 5 anos', maxYears: 5 },
  { label: '5 a 10 anos', maxYears: 10 },
  { label: 'Mais de 10 anos', maxYears: Infinity },
] as const;

function yearsSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}
```

E o método na classe:

```typescript
  /**
   * Todas as agregações da carteira em uma resposta. Os cortes acontecem
   * no banco (groupBy), nunca no browser — requisito de desempenho da spec.
   */
  async getPortfolio(
    tenantId: string,
    query: PortfolioQuery,
  ): Promise<PortfolioDto> {
    const where: Prisma.CompanyWhereInput = { tenantId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { tradeName: { contains: query.search } },
        { cnpj: { contains: query.search } },
      ];
    }
    if (query.state) where.state = query.state;
    if (query.porte) where.porte = query.porte;
    if (query.situacao) where.situacaoCadastral = query.situacao;
    if (query.cnae) where.cnaeCodigo = query.cnae;

    const [total, irregulares, states, portes, situacoes, cnaes, aberturas] =
      await Promise.all([
        this.prisma.company.count({ where }),
        this.prisma.company.count({
          where: { ...where, NOT: { situacaoCadastral: 'ATIVA' } },
        }),
        this.prisma.company.groupBy({ by: ['state'], where, _count: true }),
        this.prisma.company.groupBy({ by: ['porte'], where, _count: true }),
        this.prisma.company.groupBy({ by: ['situacaoCadastral'], where, _count: true }),
        this.prisma.company.groupBy({
          by: ['cnaeCodigo', 'cnaeDescricao'],
          where,
          _count: true,
        }),
        this.prisma.company.findMany({ where, select: { dataAbertura: true } }),
      ]);

    const now = new Date();
    const ageCounts = new Map<string, number>(
      AGE_BUCKETS.map((bucket) => [bucket.label, 0]),
    );
    for (const row of aberturas) {
      if (!row.dataAbertura) continue;
      const years = yearsSince(row.dataAbertura, now);
      const bucket = AGE_BUCKETS.find((b) => years < b.maxYears) ?? AGE_BUCKETS[3];
      ageCounts.set(bucket.label, (ageCounts.get(bucket.label) ?? 0) + 1);
    }

    // Genérico sobre a chave do groupBy — evita `never` e mantém o tipo
    // inferido corretamente para cada uma das três agregações.
    const toBuckets = <K extends string>(
      rows: readonly (Record<K, string> & { _count: number })[],
      key: K,
    ): Bucket[] =>
      rows
        .map((row) => ({ label: row[key], count: row._count }))
        .filter((bucket) => bucket.label.length > 0)
        .sort((a, b) => b.count - a.count);

    return {
      totals: { companies: total, irregulares },
      byState: toBuckets(states, 'state'),
      byPorte: toBuckets(portes, 'porte'),
      bySituacao: toBuckets(situacoes, 'situacaoCadastral'),
      byCnae: cnaes
        .map((row) => ({
          label: row.cnaeCodigo,
          descricao: row.cnaeDescricao,
          count: row._count,
        }))
        .filter((bucket) => bucket.label.length > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byAge: AGE_BUCKETS.map((bucket) => ({
        label: bucket.label,
        count: ageCounts.get(bucket.label) ?? 0,
      })),
    };
  }
```

- [ ] **Step 4: Expor o endpoint**

Em `dashboard.controller.ts`:

```typescript
  @Get('portfolio')
  getPortfolio(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(portfolioQuerySchema)) query: PortfolioQuery,
  ): Promise<PortfolioDto> {
    return this.service.getPortfolio(tenantId, query);
  }
```

- [ ] **Step 5: Rodar os testes**

Run: `cd apps/backend && npm run test:e2e -- dashboard`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/dashboard apps/backend/test/dashboard.e2e-spec.ts
git commit -m "feat(backend): agregacoes da carteira por estado, porte, CNAE e idade"
```

---

### Task 17: Frontend — dashboard com gráficos e filtros

**Files:**
- Create: `apps/frontend/features/portfolio/types/portfolio.types.ts`
- Create: `apps/frontend/features/portfolio/services/portfolio.service.ts`
- Create: `apps/frontend/features/portfolio/hooks/use-portfolio.ts`
- Create: `apps/frontend/features/portfolio/components/portfolio-view.tsx`
- Create: `apps/frontend/features/portfolio/components/bucket-chart.tsx`
- Modify: `apps/frontend/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /dashboard/portfolio` (Task 16).
- Produces: `<PortfolioView />`, `<BucketChart title={string} data={readonly Bucket[]} />`.

- [ ] **Step 1: Tipos, serviço e hook**

```typescript
// apps/frontend/features/portfolio/types/portfolio.types.ts
export interface Bucket {
  readonly label: string;
  readonly count: number;
}

export interface CnaeBucket extends Bucket {
  readonly descricao: string;
}

export interface Portfolio {
  readonly totals: { readonly companies: number; readonly irregulares: number };
  readonly byState: readonly Bucket[];
  readonly byPorte: readonly Bucket[];
  readonly byCnae: readonly CnaeBucket[];
  readonly bySituacao: readonly Bucket[];
  readonly byAge: readonly Bucket[];
}

export interface PortfolioFilters {
  readonly search?: string;
  readonly state?: string;
  readonly porte?: string;
  readonly situacao?: string;
}
```

```typescript
// apps/frontend/features/portfolio/services/portfolio.service.ts
import { httpClient } from '@/lib/http-client';
import type { ApiResponse } from '@/types/api.types';
import type { Portfolio, PortfolioFilters } from '@/features/portfolio/types/portfolio.types';

function toQuery(filters: PortfolioFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const portfolioService = {
  async get(filters: PortfolioFilters, signal?: AbortSignal): Promise<Portfolio> {
    const response = await httpClient.get<ApiResponse<Portfolio>>(
      `/dashboard/portfolio${toQuery(filters)}`,
      { signal },
    );
    return response.data;
  },
} as const;
```

```typescript
// apps/frontend/features/portfolio/hooks/use-portfolio.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '@/features/portfolio/services/portfolio.service';
import type { PortfolioFilters } from '@/features/portfolio/types/portfolio.types';

export function usePortfolio(filters: PortfolioFilters) {
  return useQuery({
    queryKey: ['portfolio', filters],
    queryFn: ({ signal }) => portfolioService.get(filters, signal),
  });
}
```

- [ ] **Step 2: Componente de gráfico reutilizável**

```tsx
// apps/frontend/features/portfolio/components/bucket-chart.tsx
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

interface BucketChartProps {
  readonly title: string;
  readonly data: readonly Bucket[];
}

export function BucketChart({ title, data }: BucketChartProps): React.ReactNode {
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados para o filtro atual.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...data]} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip cursor={{ fillOpacity: 0.1 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Tela**

```tsx
// apps/frontend/features/portfolio/components/portfolio-view.tsx
'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { BucketChart } from '@/features/portfolio/components/bucket-chart';
import { usePortfolio } from '@/features/portfolio/hooks/use-portfolio';
import { useDebounce } from '@/hooks/use-debounce';

export function PortfolioView(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = usePortfolio({
    search: debouncedSearch,
    state: state || undefined,
  });

  if (isError) {
    return <EmptyState icon={BarChart3} title="Erro ao carregar a carteira" description="Tente novamente em instantes." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Análise da carteira" description="Composição das empresas do escritório." />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <SearchBar value={search} onValueChange={setSearch} placeholder="Buscar empresa..." />
        </div>
        <select
          value={state}
          onChange={(event) => setState(event.target.value)}
          aria-label="Filtrar por estado"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os estados</option>
          {(data?.byState ?? []).map((bucket) => (
            <option key={bucket.label} value={bucket.label}>{bucket.label}</option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Empresas na carteira" value={String(data.totals.companies)} />
            <StatCard title="Situação irregular" value={String(data.totals.irregulares)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BucketChart title="Empresas por estado" data={data.byState} />
            <BucketChart title="Distribuição por porte" data={data.byPorte} />
            <BucketChart title="Situação cadastral" data={data.bySituacao} />
            <BucketChart title="Tempo de abertura" data={data.byAge} />
            <div className="lg:col-span-2">
              <BucketChart
                title="Distribuição por CNAE (top 10)"
                data={data.byCnae.map((b) => ({ label: b.descricao || b.label, count: b.count }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ligar a rota**

```tsx
// apps/frontend/app/(dashboard)/dashboard/page.tsx
import { PortfolioView } from '@/features/portfolio/components/portfolio-view';

export default function DashboardPage(): React.ReactNode {
  return <PortfolioView />;
}
```

- [ ] **Step 5: Verificar**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: PASS

Depois `npm run dev`, abrir `/dashboard` a 375px: os 5 gráficos devem virar uma coluna só, cada um legível, sem rolagem horizontal na página.

- [ ] **Step 6: Commit e PR**

```bash
git add apps/frontend/features/portfolio apps/frontend/app
git commit -m "feat(frontend): dashboard de analise da carteira"
git push -u origin feat/dashboard-carteira
```

---

# FASE 4 — Calendário contábil

**Branch:** `feat/calendario-contabil` (parte de `main` após a Fase 0)

---

### Task 18: Gerador de ocorrências recorrentes

**Files:**
- Create: `apps/backend/src/calendar/recurrence.ts`
- Create: `apps/backend/src/calendar/recurrence.spec.ts`

**Interfaces:**
- Produces: `generateOccurrences(start: Date, frequency: 'none' | 'monthly', count: number): Date[]`.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// apps/backend/src/calendar/recurrence.spec.ts
import { generateOccurrences } from './recurrence';

describe('generateOccurrences', () => {
  it('devolve uma única data quando não há recorrência', () => {
    const result = generateOccurrences(new Date('2026-03-05T00:00:00Z'), 'none', 12);
    expect(result).toHaveLength(1);
  });

  it('gera N ocorrências mensais mantendo o dia', () => {
    const result = generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'monthly', 3);

    expect(result).toHaveLength(3);
    expect(result[0].toISOString().slice(0, 10)).toBe('2026-01-05');
    expect(result[1].toISOString().slice(0, 10)).toBe('2026-02-05');
    expect(result[2].toISOString().slice(0, 10)).toBe('2026-03-05');
  });

  it('ajusta para o último dia do mês quando o dia não existe', () => {
    const result = generateOccurrences(new Date('2026-01-31T00:00:00Z'), 'monthly', 2);

    // Fevereiro de 2026 tem 28 dias — não pode vazar para 3 de março.
    expect(result[1].toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('nunca gera menos de uma ocorrência', () => {
    expect(generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'monthly', 0)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npx jest src/calendar/recurrence.spec.ts`
Expected: FAIL — `Cannot find module './recurrence'`

- [ ] **Step 3: Implementar**

```typescript
// apps/backend/src/calendar/recurrence.ts

export type Frequency = 'none' | 'monthly';

const MAX_OCCURRENCES = 24;

/**
 * Materializa as ocorrências de uma tarefa recorrente (decisão B1 da spec).
 * Trabalha em UTC para não sofrer com fuso.
 *
 * Dia 31 em mês de 30 dias vira o último dia do mês — sem isso, o
 * comportamento nativo do Date vazaria para o mês seguinte.
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
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  return Array.from({ length: total }, (_, index) => {
    const lastDay = new Date(Date.UTC(year, month + index + 1, 0)).getUTCDate();
    return new Date(
      Date.UTC(
        year,
        month + index,
        Math.min(day, lastDay),
        start.getUTCHours(),
        start.getUTCMinutes(),
      ),
    );
  });
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/backend && npx jest src/calendar/recurrence.spec.ts`
Expected: PASS — 4 testes

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/calendar/recurrence.ts apps/backend/src/calendar/recurrence.spec.ts
git commit -m "feat(backend): gerador de ocorrencias recorrentes"
```

---

### Task 19: Calendário com responsável e feriados

**Files:**
- Modify: `apps/backend/src/calendar/calendar.schema.ts`
- Modify: `apps/backend/src/calendar/calendar.service.ts`
- Modify: `apps/backend/src/calendar/calendar.module.ts`
- Test: `apps/backend/test/calendar.e2e-spec.ts`

**Interfaces:**
- Consumes: `generateOccurrences` (Task 18), `HolidaysService.listByYear` (Task 6).
- Produces: `ObligationDto` com `assignee: string`, `holidayConflict: string | null`, `recurrenceGroupId: string | null`.
- Produces: `POST /calendar/obligations` aceitando `assignee`, `recurrence: 'none' | 'monthly'`, `occurrences: number`; devolve `ObligationDto[]`.
- Produces: `GET /calendar/obligations` aceitando `assignee`.

- [ ] **Step 1: Escrever o teste e2e que falha**

```typescript
  describe('recorrência, responsável e feriados', () => {
    it('materializa 3 ocorrências mensais com o mesmo grupo', async () => {
      const response = await http()
        .post('/api/calendar/obligations')
        .send({
          title: 'Fechamento da folha',
          type: 'FOLHA',
          dueDate: '2026-03-05',
          assignee: 'Ana Souza',
          recurrence: 'monthly',
          occurrences: 3,
        })
        .expect(201);

      expect(response.body.data).toHaveLength(3);
      const grupos = new Set(response.body.data.map((o: { recurrenceGroupId: string }) => o.recurrenceGroupId));
      expect(grupos.size).toBe(1);
      expect(response.body.data[0].assignee).toBe('Ana Souza');
    });

    it('sinaliza vencimento que cai em feriado nacional', async () => {
      brasilApiMock.respondWith = {
        status: 200,
        body: [{ date: '2026-04-21', name: 'Tiradentes' }],
      };

      await http()
        .post('/api/calendar/obligations')
        .send({ title: 'Envio de guias', type: 'DAS', dueDate: '2026-04-21', assignee: 'Bruno Lima' })
        .expect(201);

      const list = await http()
        .get('/api/calendar/obligations?from=2026-04-01&to=2026-04-30')
        .expect(200);

      expect(list.body.data[0].holidayConflict).toBe('Tiradentes');
    });

    it('filtra por responsável', async () => {
      await ctx.prisma.obligation.createMany({
        data: [
          { tenantId: TENANT_A, title: 'A', type: 'X', dueDate: new Date('2026-05-10'), assignee: 'Ana Souza' },
          { tenantId: TENANT_A, title: 'B', type: 'X', dueDate: new Date('2026-05-11'), assignee: 'Bruno Lima' },
        ],
      });

      const response = await http()
        .get('/api/calendar/obligations?assignee=Ana%20Souza')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].assignee).toBe('Ana Souza');
    });
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/backend && npm run test:e2e -- calendar`
Expected: FAIL — `assignee` não aceito, `holidayConflict` undefined.

- [ ] **Step 3: Estender o schema**

Em `calendar.schema.ts`, substituir `createObligationSchema`, `listObligationsQuerySchema`, `ObligationDto` e `toObligationDto`:

```typescript
export const recurrenceSchema = z.enum(['none', 'monthly']);

export const createObligationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  dueDate: z.coerce.date({ invalid_type_error: 'Data de vencimento inválida' }),
  companyId: z.string().optional(),
  assignee: z.string().min(1, 'Responsável é obrigatório'),
  recurrence: recurrenceSchema.default('none'),
  occurrences: z.coerce.number().int().min(1).max(24).default(1),
});
export type CreateObligationInput = z.infer<typeof createObligationSchema>;

export const listObligationsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: obligationStatusSchema.optional(),
  assignee: z.string().optional(),
});
export type ListObligationsQuery = z.infer<typeof listObligationsQuerySchema>;

export interface ObligationDto {
  readonly id: string;
  readonly companyId: string | null;
  readonly title: string;
  readonly type: string;
  readonly dueDate: string;
  readonly status: string;
  readonly assignee: string;
  readonly recurrenceGroupId: string | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}

export function toObligationDto(
  obligation: Obligation,
  now: Date = new Date(),
  holidays: ReadonlyMap<string, string> = new Map(),
): ObligationDto {
  const isoDay = obligation.dueDate.toISOString().slice(0, 10);
  return {
    id: obligation.id,
    companyId: obligation.companyId,
    title: obligation.title,
    type: obligation.type,
    dueDate: obligation.dueDate.toISOString(),
    status: obligation.status,
    assignee: obligation.assignee,
    recurrenceGroupId: obligation.recurrenceGroupId,
    overdue: obligation.status === 'pending' && obligation.dueDate < now,
    holidayConflict: holidays.get(isoDay) ?? null,
    createdAt: obligation.createdAt.toISOString(),
  };
}
```

- [ ] **Step 4: Atualizar o serviço**

Em `calendar.service.ts`, injetar `HolidaysService` no construtor e substituir `list` e `create`:

```typescript
  async list(
    tenantId: string,
    query: ListObligationsQuery,
  ): Promise<ObligationDto[]> {
    const where: Prisma.ObligationWhereInput = { tenantId };
    if (query.from || query.to) {
      where.dueDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.status) where.status = query.status;
    if (query.assignee) where.assignee = query.assignee;

    const rows = await this.prisma.obligation.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    // Um fetch por ano presente no resultado (cache do HolidaysService
    // garante que o segundo mês do mesmo ano não custa rede).
    const years = [...new Set(rows.map((row) => row.dueDate.getUTCFullYear()))];
    const holidays = new Map<string, string>();
    for (const year of years) {
      for (const [date, name] of await this.holidays.listByYear(year)) {
        holidays.set(date, name);
      }
    }

    const now = new Date();
    return rows.map((row) => toObligationDto(row, now, holidays));
  }

  /** Materializa as ocorrências da recorrência (decisão B1 da spec). */
  async create(
    tenantId: string,
    actorId: string,
    input: CreateObligationInput,
  ): Promise<ObligationDto[]> {
    const dates = generateOccurrences(input.dueDate, input.recurrence, input.occurrences);
    const recurrenceGroupId = input.recurrence === 'none' ? null : createId();

    await this.prisma.obligation.createMany({
      data: dates.map((dueDate) => ({
        tenantId,
        title: input.title,
        type: input.type,
        dueDate,
        companyId: input.companyId ?? null,
        assignee: input.assignee,
        recurrenceGroupId,
      })),
    });

    const created = await this.prisma.obligation.findMany({
      where: recurrenceGroupId
        ? { tenantId, recurrenceGroupId }
        : { tenantId, title: input.title, dueDate: dates[0] },
      orderBy: { dueDate: 'asc' },
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: 'obligation.created',
      entityType: 'obligation',
      entityId: created[0]?.id ?? '',
      metadata: { occurrences: created.length, recurrence: input.recurrence },
    });

    const now = new Date();
    return created.map((row) => toObligationDto(row, now));
  }
```

Adicionar no topo do arquivo:

```typescript
import { randomUUID } from 'node:crypto';
import { generateOccurrences } from './recurrence';
import { HolidaysService } from '../brasil-api/holidays.service';

const createId = (): string => `rec_${randomUUID()}`;
```

Em `calendar.module.ts`, adicionar `BrasilApiModule` aos `imports`.

- [ ] **Step 5: Rodar os testes**

Run: `cd apps/backend && npm run test:e2e -- calendar && npx jest src/calendar`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/calendar apps/backend/test/calendar.e2e-spec.ts
git commit -m "feat(backend): calendario com recorrencia, responsavel e feriados"
```

---

### Task 20: Frontend — tela de calendário

**Files:**
- Create: `apps/frontend/features/calendar/types/calendar.types.ts`
- Create: `apps/frontend/features/calendar/services/calendar.service.ts`
- Create: `apps/frontend/features/calendar/hooks/use-obligations.ts`
- Create: `apps/frontend/features/calendar/components/calendar-view.tsx`
- Create: `apps/frontend/features/calendar/components/month-grid.tsx`
- Modify: `apps/frontend/app/(dashboard)/calendar/page.tsx`

**Interfaces:**
- Consumes: `GET /calendar/obligations` (Task 19).
- Produces: `<CalendarView />`, `<MonthGrid month={Date} obligations={readonly Obligation[]} />`.

- [ ] **Step 1: Tipos, serviço e hook**

```typescript
// apps/frontend/features/calendar/types/calendar.types.ts
export interface Obligation {
  readonly id: string;
  readonly companyId: string | null;
  readonly title: string;
  readonly type: string;
  readonly dueDate: string;
  readonly status: 'pending' | 'completed';
  readonly assignee: string;
  readonly recurrenceGroupId: string | null;
  readonly overdue: boolean;
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}
```

```typescript
// apps/frontend/features/calendar/services/calendar.service.ts
import { httpClient } from '@/lib/http-client';
import type { ApiResponse } from '@/types/api.types';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface ListParams {
  readonly from: string;
  readonly to: string;
  readonly assignee?: string;
}

export const calendarService = {
  async list(params: ListParams, signal?: AbortSignal): Promise<readonly Obligation[]> {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.assignee) {
      search.set('assignee', params.assignee);
    }
    const response = await httpClient.get<ApiResponse<readonly Obligation[]>>(
      `/calendar/obligations?${search.toString()}`,
      { signal },
    );
    return response.data;
  },
} as const;
```

```typescript
// apps/frontend/features/calendar/hooks/use-obligations.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';

export function useObligations(from: string, to: string, assignee?: string) {
  return useQuery({
    queryKey: ['calendar', 'obligations', from, to, assignee ?? ''],
    queryFn: ({ signal }) => calendarService.list({ from, to, assignee }, signal),
  });
}
```

- [ ] **Step 2: Grade do mês**

```tsx
// apps/frontend/features/calendar/components/month-grid.tsx
'use client';

import { cn } from '@/lib/cn';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface MonthGridProps {
  readonly month: Date;
  readonly obligations: readonly Obligation[];
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

export function MonthGrid({ month, obligations }: MonthGridProps): React.ReactNode {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

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
          <div key={`${label}-${index}`} className="py-1">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-16 rounded-md" />;
          }
          const items = byDay.get(day) ?? [];
          const isHoliday = items.some((item) => item.holidayConflict !== null);

          return (
            <div
              key={day}
              className={cn(
                'min-h-16 rounded-md border p-1 text-left',
                isHoliday && 'border-amber-500/60 bg-amber-500/5',
              )}
            >
              <span className="text-xs font-medium">{day}</span>
              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    title={`${item.title} — ${item.assignee}${item.holidayConflict ? ` (feriado: ${item.holidayConflict})` : ''}`}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-[10px]',
                      item.overdue ? 'bg-destructive/15 text-destructive' : 'bg-primary/10',
                    )}
                  >
                    {item.title}
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

- [ ] **Step 3: Tela**

```tsx
// apps/frontend/features/calendar/components/calendar-view.tsx
'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthGrid } from '@/features/calendar/components/month-grid';
import { useObligations } from '@/features/calendar/hooks/use-obligations';

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CalendarView(): React.ReactNode {
  const [offset, setOffset] = useState(0);
  const [assignee, setAssignee] = useState('');

  const month = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }, [offset]);

  const from = isoDay(new Date(month.getFullYear(), month.getMonth(), 1));
  const to = isoDay(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  const { data, isLoading, isError } = useObligations(from, to, assignee || undefined);

  const responsaveis = useMemo(
    () => [...new Set((data ?? []).map((item) => item.assignee))].filter(Boolean),
    [data],
  );

  const atrasadas = (data ?? []).filter((item) => item.overdue).length;
  const emFeriado = (data ?? []).filter((item) => item.holidayConflict !== null).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário contábil" description="Tarefas recorrentes, prazos e feriados." />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setOffset((value) => value - 1)}>Anterior</Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" onClick={() => setOffset((value) => value + 1)}>Próximo</Button>
        </div>

        <select
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          aria-label="Filtrar por responsável"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {atrasadas > 0 ? <Badge variant="destructive">{atrasadas} em atraso</Badge> : null}
        {emFeriado > 0 ? <Badge variant="secondary">{emFeriado} em feriado nacional</Badge> : null}
      </div>

      {isError ? (
        <EmptyState icon={CalendarDays} title="Erro ao carregar o calendário" description="Tente novamente em instantes." />
      ) : isLoading || !data ? (
        <Loading />
      ) : (
        <Card className="overflow-x-auto p-3">
          <div className="min-w-[560px]">
            <MonthGrid month={month} obligations={data} />
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ligar a rota**

```tsx
// apps/frontend/app/(dashboard)/calendar/page.tsx
import { CalendarView } from '@/features/calendar/components/calendar-view';

export default function CalendarPage(): React.ReactNode {
  return <CalendarView />;
}
```

- [ ] **Step 5: Verificar**

Run: `cd apps/frontend && npm run type-check && npm run lint`
Expected: PASS

A grade do mês tem largura mínima de 560px dentro de um contêiner com `overflow-x-auto` — a grade rola sozinha no celular sem que a **página** role horizontalmente. Confirmar isso a 375px.

- [ ] **Step 6: Commit e PR**

```bash
git add apps/frontend/features/calendar apps/frontend/app
git commit -m "feat(frontend): calendario contabil com feriados e responsavel"
git push -u origin feat/calendario-contabil
```

---

# FASE 5 — White label e acabamento

**Branch:** `feat/acabamento-cliente` (parte de `main` após as fases 1-4)

---

### Task 21: White label, menu e verificação final

**Files:**
- Modify: `apps/frontend/constants/navigation.ts`
- Modify: `apps/frontend/services/mocks/tenant.mock.ts`
- Modify: `apps/backend/src/companies/companies.controller.ts` (nada a mudar se já expõe lookup — apenas conferir)

**Interfaces:**
- Consumes: `Tenant.primaryColor` / `accentColor` / `logoUrl` (Task 3); `buildTenantCssVariables` (já existe em `styles/themes.ts`).

- [ ] **Step 1: Reordenar o menu**

Em `constants/navigation.ts`, substituir `NAV_SECTIONS` por uma primeira seção com as 4 funcionalidades do cliente e mover todo o restante para uma seção final rotulada "Em breve":

```typescript
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Carteira',
    items: [
      { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'Empresas', href: ROUTES.companies.root, icon: Building2 },
      { label: 'Auditoria', href: ROUTES.audit, icon: ShieldCheck },
      { label: 'Calendário', href: ROUTES.calendar, icon: CalendarDays },
    ],
  },
  {
    title: 'Em breve',
    items: [
      { label: 'Clientes', href: ROUTES.clients, icon: Users },
      { label: 'Financeiro', href: ROUTES.finance, icon: Wallet },
      { label: 'Recebimentos', href: ROUTES.receivables, icon: BarChart3 },
      { label: 'Fiscal', href: ROUTES.fiscal, icon: Landmark },
      { label: 'Documentos', href: ROUTES.documents, icon: FileText },
      { label: 'Atividades', href: ROUTES.activity, icon: Activity },
      { label: 'Importação', href: ROUTES.import, icon: Upload },
      { label: 'Integrações', href: ROUTES.integrations, icon: Plug },
      { label: 'Fluxos n8n', href: ROUTES.workflows, icon: Workflow },
      { label: 'IA', href: ROUTES.ai, icon: Sparkles },
      { label: 'Relatórios', href: ROUTES.reports, icon: BarChart3 },
      { label: 'Configurações', href: ROUTES.settings, icon: Settings },
    ],
  },
];
```

- [ ] **Step 2: Confirmar que não há marca da desenvolvedora**

Run: `cd apps/frontend && grep -ri "ledgerflow" --include="*.tsx" --include="*.ts" app components features constants ; echo "fim da busca"`

Expected: nenhuma ocorrência em **texto visível ao usuário**. Ocorrências em nome de pacote ou comentário são aceitáveis. Se houver no título da aba (`app/layout.tsx`) ou no logo do topbar, trocar pelo `tenant.name` vindo da sessão.

- [ ] **Step 3: Confirmar o tema por tenant**

Em `services/mocks/tenant.mock.ts`, trocar `primaryColor` para um valor claramente diferente (ex.: `'150 60% 35%'`), rodar `npm run dev` e confirmar que botões e destaques mudam de cor. Depois reverter para o valor original.

Isso prova que o white label funciona ponta a ponta.

- [ ] **Step 4: Rodar a suíte completa dos dois apps**

```bash
cd apps/backend && npm run build && npm test && npm run test:e2e
cd ../frontend && npm run type-check && npm run lint && npm test && npm run build
```

Expected: PASS em tudo. Qualquer falha aqui é bloqueante para a entrega.

- [ ] **Step 5: Auditoria de desempenho**

Run: `cd apps/frontend && npm run build && npm start` e, em outro terminal, `npx lighthouse http://localhost:3000/dashboard --only-categories=performance,accessibility --view`

Expected: Performance ≥ 80, Acessibilidade ≥ 90. Se o desempenho ficar abaixo, o suspeito mais provável é gráfico renderizando sem dados agregados — conferir se o `/dashboard/portfolio` está sendo usado em vez de listar empresas no cliente.

- [ ] **Step 6: Verificação móvel das 4 telas**

Com `npm run dev` rodando, abrir em 375px: `/dashboard`, `/companies`, `/audit`, `/calendar`. Em nenhuma delas a **página** pode rolar horizontalmente (a grade do calendário rola dentro do próprio contêiner — isso é esperado).

- [ ] **Step 7: Commit e PR final**

```bash
git add apps/frontend/constants/navigation.ts apps/frontend/services/mocks/tenant.mock.ts
git commit -m "feat(frontend): menu priorizando as 4 funcionalidades e white label verificado"
git push -u origin feat/acabamento-cliente
```

---

## Checklist final antes da entrega

- [ ] As 4 funcionalidades abrem e funcionam com o seed.
- [ ] Onboarding: consultar um CNPJ real preenche razão social, nome fantasia, endereço, situação, CNAE, porte e quadro societário.
- [ ] Auditoria: "Auditar carteira" encontra o CNPJ inválido, a duplicata e a situação BAIXADA plantados no seed.
- [ ] Dashboard: 5 gráficos com dados, filtro por estado funcionando.
- [ ] Calendário: tarefa recorrente aparece em 3 meses, atraso em vermelho, feriado destacado.
- [ ] Nenhuma marca da desenvolvedora visível.
- [ ] `npm run build` passa nos dois apps.
- [ ] As 4 telas não rolam horizontalmente a 375px.
