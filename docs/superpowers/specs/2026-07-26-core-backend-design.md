# Core do Backend (LedgerFlow) — Design

Data: 2026-07-26
Branch: `feat/backend-core`

## Contexto e papel

Divisão de time em 3 frentes. Esta spec cobre a frente **Core do Backend**
(lógica de negócio). Depende da frente **Infra/DB/Auth** (Prisma, tenants, JWT,
RLS) e serve a frente **Frontend** (Next.js já existente em `apps/frontend`).

Decisões travadas com o responsável:

- Stack: **NestJS + Prisma**, servindo em `:3333` com prefixo global `/api`.
- Dependência de Infra/Auth: **assumir contrato + stub de auth/tenant** (não
  bloquear esperando a base).
- Entrega: **fatia vertical primeiro** (Companies + BrasilAPI + Activity + testes)
  como padrão de referência, depois replicar.

## Contratos herdados do frontend (imutáveis)

- Envelope simples: `{ data, message? }`.
- Envelope paginado: `{ data[], pagination: { page, pageSize, total, totalPages } }`.
- Erro: `{ code, message, status, details? }` com `code` ∈ `VALIDATION_ERROR |
  NOT_FOUND | UNAUTHORIZED | FORBIDDEN | SERVER_ERROR | ...`.
- `Company`: `{ id, name, tradeName, cnpj, status: active|inactive|pending,
  email, phone, city, state, healthScore: 0..100, createdAt }`.
- `QueryParams`: `{ page?, pageSize?, search?, sort? }`.
- Domínios (via query-keys): companies, dashboard (overview, health-score),
  audit (list, detail), calendar (obligations), activity (feed), import (jobs, job).

## A. Estrutura

Novo `apps/backend` (NestJS). Monorepo passa a ter `apps/frontend` + `apps/backend`.

## B. Contrato de Auth/Tenant (stub)

- `AuthContext = { userId, tenantId, role }`.
- `TenantContextGuard` popula o contexto; decorators `@CurrentUser()` / `@TenantId()`.
- `AUTH_MODE=stub|jwt`. Em `stub`, contexto vem de headers (`x-tenant-id`,
  `x-user-id`, `x-role`); em `jwt`, valida o cookie real da infra. Troca de 1 linha.
- **Tenant-scoping em profundidade:** todo query filtra por `tenantId` na
  aplicação, além da RLS do banco.

## C. Convenções transversais

- `ResponseInterceptor` → `{ data, message? }` / `{ data[], pagination }`.
- `HttpExceptionFilter` → `{ code, message, status, details? }` com os codes do front.
- Validação com `nestjs-zod` (espelha os schemas Zod do front; gera `details`).
- `PrismaService` singleton, `ConfigModule` tipado, `/health`.

## D. Modelo de dados adicionado pelo Core

Core define/coordena: `Company`, `AuditRun` + `AuditFinding`, `ActivityLog`,
`Obligation`, `ImportJob` + `ImportRowError`. Infra define: `Tenant`, `User`,
`Membership`, `RefreshToken` (representados como stub para o Core rodar).

## E. Slice 1 — fatia vertical de referência

- **CompaniesModule**: `GET /companies` (paginação + busca), `GET /companies/:id`,
  `POST /companies`, `PATCH /companies/:id`, `DELETE /companies/:id`.
- **BrasilApiModule**: no create, enriquece por CNPJ (razão social, endereço,
  situação). Timeout + retry + fallback; cache **in-memory** no Slice 1 (Redis só
  no Import).
- **ActivityModule**: `ActivityService` registra eventos (`company.created`…),
  chamado pelos demais módulos.
- **Testes**: unit (service com Prisma + HTTP mockados) + e2e (supertest + Postgres
  de teste + guard stub). Cobre caminho feliz, validação, not-found e cross-tenant.

## F. Replicação (mesmo molde, um módulo por vez)

- **AuditModule**: checagens por empresa → `AuditRun`/`AuditFinding`, recalcula
  `healthScore`. Endpoints list/detail.
- **DashboardModule**: agregações `groupBy` (status, health, obrigações, atividade).
  Endpoints overview/health-score.
- **CalendarModule**: geração/consulta de `Obligation` por período.
- **ImportModule**: CSV → valida linhas (Zod) → cria empresas (enriquece via
  BrasilAPI) → `ImportJob` com erros por linha. Assíncrono com **BullMQ + Redis**.

## G. Testes

Jest. Unit para services (mocks). E2e com supertest + Postgres real (serviço no
docker-compose de teste) + `StubAuthGuard`. Helpers de seed por tenant. Cada
módulo entra com unit + e2e (feliz + erros + cross-tenant negado).

## H. Sequência de execução

1. Scaffold `apps/backend` + transversais (B, C) + `/health`.
2. Prisma: modelos do Core (D) + migration + seed.
3. Slice 1 completo (E) com testes — **entregável imediato**.
4. Replicar F: Audit → Dashboard → Calendar → Import.

## Fora de escopo

Emissão de JWT, cookies, RLS SQL, roles no Postgres (frente Infra). O Core apenas
consome o `AuthContext` e reforça o tenant-scoping na aplicação.
