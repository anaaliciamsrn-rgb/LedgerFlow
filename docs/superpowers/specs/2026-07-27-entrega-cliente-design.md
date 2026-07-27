# LedgerFlow — Entrega ao cliente (4 funcionalidades)

Data: 2026-07-27
Prazo: 1 dia
Escopo: **apenas** o especificado no brief do cliente.

## 1. Contexto e problema

O brief do cliente pede quatro funcionalidades, sistema white label, visual
agradável, rápido e responsivo. O que existe hoje em `main` diverge do brief em
pontos estruturais — não por estar incompleto, mas por modelar outra coisa:

| Cliente pediu | Estado em `main` |
|---|---|
| CNAE, porte, quadro societário, endereço completo, data de abertura | Não existem no modelo `Company` |
| Situação cadastral (ATIVA/SUSPENSA/INAPTA/BAIXADA) | BrasilAPI devolve e o código descarta, colapsando em `active`/`inactive` |
| Auditoria: CNPJ inválido | Regra confere apenas 14 dígitos; não valida dígito verificador |
| Auditoria: duplicadas, razão social divergente, endereço desatualizado | Não implementadas — o motor avalia uma empresa isolada |
| Dashboard: estado, porte, CNAE, tempo de abertura | Dashboard agrega `status` e `healthScore` (métrica não pedida) |
| Calendário: recorrência, responsável, feriados | Obrigações avulsas, sem responsável, sem feriado |

A arquitetura (NestJS + Prisma + Next.js, design system, testes, CI) é sólida e
será reaproveitada. O trabalho é de **modelo de dados e regras de negócio**.

## 2. Decisões travadas

| Tema | Decisão | Motivo |
|---|---|---|
| Banco | Mantém **SQLite** | Zero setup, migrations já existem, risco nulo no dia da entrega |
| Autenticação | Tela de login permanece **demo** (aceita qualquer credencial) | Cliente não pediu auth; tempo vai para as 4 funcionalidades |
| Infra (Docker, Redis, RLS, JWT, BullMQ) | **Fora de escopo** | Não consta no brief |
| Telas não pedidas (11 placeholders, Importação, Activity Log) | Mantidas como "em breve", **reordenadas** para o rodapé do menu | Decisão do usuário; reordenar reduz o ruído na apresentação |
| Responsável pelas tarefas | **Lista fixa de nomes** vinda do seed | Entrega filtro/agrupamento sem construir CRUD de usuários |
| Auditoria vs. dados oficiais | **A2 — reconsulta a BrasilAPI ao auditar** | Decisão do usuário. Dados sempre atuais |
| Recorrência do calendário | **B1 — ocorrências materializadas no banco** | Consulta simples; concluir uma ocorrência isolada é trivial |

### 2.1 Mitigação obrigatória da decisão A2

Reconsultar a BrasilAPI por empresa é lento e sujeito a rate limit. A
implementação de A2 **deve** incluir, sem exceção:

- Concorrência limitada a **5** requisições simultâneas.
- Reuso do cache in-memory já existente em `BrasilApiService` (TTL 24h).
- Timeout de 5s por requisição e 1 retry — já implementados.
- **Degradação suave:** falha de rede marca as regras dependentes da BrasilAPI
  como `skipped` (não verificado), nunca derruba a auditoria inteira.

Sem isso, auditar uma carteira de 50 empresas trava a apresentação.

## 3. Modelo de dados

### 3.1 `Company` — campos novos

```
situacaoCadastral  String    // ATIVA | SUSPENSA | INAPTA | BAIXADA | NULA
cnaeCodigo         String
cnaeDescricao      String
porte              String    // MEI | ME | EPP | DEMAIS
naturezaJuridica   String?
dataAbertura       DateTime?
logradouro         String
numero             String
complemento        String?
bairro             String
cep                String
```

`city` e `state` permanecem (município/UF). `status` (`active|inactive|pending`)
permanece como **status interno do escritório** e é semanticamente distinto de
`situacaoCadastral` (situação oficial na Receita). A distinção é documentada no
schema para não voltar a ser confundida.

`healthScore` permanece como **score de auditoria** — sai da posição de métrica
principal do dashboard, mas continua alimentado pelo motor de auditoria.

Índices novos (filtros do dashboard): `[tenantId, state]`, `[tenantId, porte]`,
`[tenantId, situacaoCadastral]`, `[tenantId, cnaeCodigo]`.

### 3.2 `Partner` — quadro societário (novo)

```
id, companyId, nome, qualificacao, faixaEtaria?
@@index([companyId])
```

Populado pelo array `qsa` da BrasilAPI no onboarding.

### 3.3 `Obligation` — campos novos (B1)

```
assignee          String    // nome do responsável (lista fixa do seed)
recurrenceGroupId String?   // agrupa ocorrências geradas da mesma regra
```

Criar tarefa com `recurrence: 'monthly'` e `occurrences: N` grava N linhas
compartilhando o `recurrenceGroupId`. Cada linha conclui-se independentemente.

`holidayConflict` **não é persistido** — é calculado no DTO cruzando `dueDate`
com a lista de feriados do ano.

## 4. Componentes

### 4.1 `BrasilApiService` — extensões

- `toCnpjInfo` passa a extrair: `cnae_fiscal`, `cnae_fiscal_descricao`, `porte`,
  `qsa[]`, `logradouro`, `numero`, `complemento`, `bairro`, `cep`,
  `natureza_juridica`, `data_inicio_atividade`, `descricao_situacao_cadastral`.
- Novo `lookupMany(cnpjs[]): Map<string, CnpjInfo | null>` com concorrência 5.
- Novo `HolidaysService.listByYear(year)`: `GET /feriados/v1/{ano}`, cache em
  memória por ano, falha → lista vazia (calendário funciona sem os alertas).

### 4.2 Motor de auditoria — reescrita

Assinatura muda de `runAudit(company)` para
`runAudit(company, context)`, com
`context = { official: CnpjInfo | null, duplicateOf: string[] }`.

Seis regras, uma por item do brief:

| Código | Severidade | Verifica |
|---|---|---|
| `cnpj_invalido` | critical | Dígitos verificadores (algoritmo módulo 11), não só o formato |
| `empresa_duplicada` | critical | Mesmo CNPJ ou razão social normalizada no tenant |
| `razao_social_divergente` | warning | `company.name` ≠ `official.razaoSocial` |
| `endereco_desatualizado` | warning | Logradouro/número/bairro/CEP/município/UF ≠ oficial |
| `situacao_irregular` | critical | `situacaoCadastral` ≠ `ATIVA` |
| `dados_ausentes` | warning | E-mail, telefone, CNAE ou porte vazios |

Cada `AuditFinding` passa a ter três estados: `passed`, `failed`, `skipped`
(BrasilAPI indisponível). O campo `passed: Boolean` vira `result: String` na
tabela — migration necessária.

Endpoint novo: `POST /audit/run` audita a carteira inteira (concorrência 5).
As divergências são **apresentadas para o usuário decidir**, conforme o brief —
não há correção automática. Ação `PATCH /companies/:id` já cobre a correção.

### 4.3 Dashboard — reescrita das agregações

`GET /dashboard/portfolio` devolve, em uma única resposta:

```
byState[]      { uf, count }
byPorte[]      { porte, count }
byCnae[]       { codigo, descricao, count }   // top 10 + "outros"
bySituacao[]   { situacao, count }
byAge[]        { faixa, count }               // <1, 1-5, 5-10, 10+ anos
totals         { companies, irregulares, comPendencias }
```

Aceita os mesmos filtros da listagem (`state`, `porte`, `situacao`, `cnae`,
`search`), aplicados no `WHERE` — a agregação acontece no banco, nunca no
browser.

### 4.4 Calendário

- `POST /calendar/obligations` aceita `recurrence` e `occurrences`, materializa
  as ocorrências (B1).
- `GET /calendar/obligations` aceita `from`, `to`, `status`, `assignee`.
- DTO ganha `holidayConflict: string | null` e mantém `overdue`.

### 4.5 Frontend — as 4 telas

Todas mobile-first, usando o design system existente.

1. **Empresas** — busca por CNPJ com preview dos dados oficiais antes de salvar;
   listagem com filtros; detalhe com todos os campos + tabela do quadro societário.
2. **Auditoria** — botão "Auditar carteira", resultado agrupado por severidade,
   drill-down por empresa, link direto para corrigir cada divergência.
3. **Dashboard** — cinco gráficos (Recharts, já instalado) + barra de filtros +
   busca. Dados vêm agregados do servidor.
4. **Calendário** — grade mensal, selo de atraso, selo de feriado, filtro por
   responsável.

### 4.6 White label

O mecanismo já existe e está ligado: `buildTenantCssVariables` injeta
`--primary`/`--accent` e o `TenantProvider` aplica no DOM. Falta apenas a fonte
de dados: adicionar `primaryColor`, `accentColor` e `logoUrl` ao modelo `Tenant`
e expor via sessão. Nenhuma marca da desenvolvedora no produto.

## 5. Desempenho e responsividade

Requisito explícito do cliente. O que já existe: App Router, Turbopack, React
Query com prefetch e hidratação, Lighthouse configurado.

O que esta entrega acrescenta:

- Agregações no banco (`groupBy`), nunca no cliente.
- Índices para todos os campos filtráveis (§3.1).
- Paginação obrigatória em toda listagem — já implementada.
- Auditoria em massa com concorrência limitada, para não bloquear o event loop.
- As 4 telas verificadas em viewport móvel antes do merge.

## 6. Testes

Segue o padrão já estabelecido no repositório:

- **Unit**: motor de auditoria (as 6 regras, incluindo `skipped`), validação de
  CNPJ, geração de ocorrências recorrentes, cálculo de faixa etária.
- **E2E**: um por módulo, cobrindo caminho feliz, validação, não-encontrado e
  isolamento entre tenants — usando `TENANT_A`/`TENANT_B` já existentes.
- BrasilAPI **sempre** mockada via `HTTP_FETCHER` (`test-utils.ts`), inclusive
  nos testes de auditoria em massa. Nenhum teste toca a rede.

## 7. Estratégia de branches

O ponto de colisão é `prisma/schema.prisma` — todas as frentes dependem dos
campos novos. Por isso a fundação vai primeiro e sozinha:

```
main
 └── feat/modelo-dados-cliente     ← PRIMEIRO, merge rápido em main
      ├── feat/onboarding-empresas
      ├── feat/auditoria-carteira
      ├── feat/dashboard-carteira
      └── feat/calendario-contabil
```

1. `feat/modelo-dados-cliente` — schema, migration, seed, extensão do
   `BrasilApiService`, `HolidaysService`, white label no `Tenant`. **Merge em
   `main` antes de qualquer outra branch começar.**
2. As quatro branches de funcionalidade partem da `main` já atualizada e podem
   correr em paralelo sem conflito — cada uma toca módulos distintos.
3. Cada branch entra em `main` via PR assim que a CI passar. Sem branch de
   longa duração: com 1 dia de prazo, merge frequente é o que evita conflito.

## 8. Ordem de execução e corte

Ordem: **Fundação → Empresas → Auditoria → Dashboard → Calendário.**

Auditoria e Dashboard consomem os campos novos que a fundação e o Onboarding
introduzem, por isso vêm depois.

Se o tempo apertar, o **Calendário** é o corte de menor dano — é a funcionalidade
mais independente das outras três. Cortar Auditoria ou Dashboard quebraria a
narrativa da demo, já que ambas exibem o resultado do trabalho de Onboarding.

## 9. Fora de escopo (explícito)

Docker, PostgreSQL, Redis, BullMQ, RLS, policies, roles, JWT, refresh token,
cookies, `User`/`Membership`, importação de CSV, Activity Log como tela,
correção automática de divergências, e as 11 telas placeholder — que permanecem
marcadas como "em breve".
