# Deploy

O sistema tem duas partes e **elas não vão para o mesmo lugar**.

| Parte | Onde | Por quê |
|---|---|---|
| Frontend (Next.js) | Vercel | É o caso de uso nativo da plataforma |
| Backend (NestJS) + banco | Render, Railway ou Fly | Precisa de processo de longa duração e disco de banco |

## Por que o backend não roda no Vercel

O Vercel executa funções serverless: sistema de arquivos efêmero e somente
leitura, processo que morre entre requisições. O backend hoje usa **SQLite em
arquivo** (`file:./dev.db`) — o banco não sobreviveria a uma requisição, nem
seria compartilhado entre instâncias.

Não é ajuste de configuração; é incompatibilidade. O backend precisa de um
serviço que mantenha processo vivo e de um Postgres gerenciado.

---

## 1. Banco de dados

Crie um Postgres gerenciado. Render e Railway provisionam junto com o serviço;
Neon e Supabase têm camada gratuita e funcionam com qualquer hospedagem.

Guarde a URL de conexão. Ela costuma ter esta forma:

```
postgresql://usuario:senha@host:5432/banco?sslmode=require
```

> **Ainda não migrado.** O `schema.prisma` está com `provider = "sqlite"` e as
> migrations existentes são SQL de SQLite — elas **não** rodam no Postgres. A
> troca exige gerar uma migration inicial nova e ajustar a busca por texto
> (ver §5). Enquanto isso não for feito, o backend só sobe com SQLite.

## 2. Backend

Variáveis obrigatórias:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | a URL do Postgres |
| `AUTH_MODE` | `jwt` |
| `CORS_ORIGINS` | `https://seu-app.vercel.app` |
| `BRASILAPI_BASE_URL` | `https://brasilapi.com.br/api` |
| `PORT` | o que a hospedagem indicar |

Comandos:

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start:prod
```

**O processo se recusa a subir** se `NODE_ENV=production` vier com
`AUTH_MODE=stub` ou sem `CORS_ORIGINS`. É proposital: em modo stub o tenant vem
do header `x-tenant-id`, ou seja, quem souber a URL lê a carteira de qualquer
escritório. Melhor não subir do que subir aberto.

> **`AUTH_MODE=jwt` ainda não está implementado** — hoje lança
> `UnauthorizedException`. Ou seja: **não há como publicar o backend em
> produção com segurança até que a autenticação real exista.** Ver §5.

## 3. Frontend no Vercel

Na criação do projeto:

- **Root Directory:** `apps/frontend` — o repositório é monorepo; sem isso o
  build nem começa.
- **Framework Preset:** Next.js (detectado sozinho).

Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://seu-backend.onrender.com/api` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` |

`NEXT_PUBLIC_API_URL` ausente **quebra o build**, não a execução:
`lib/env.ts` valida na importação. É proposital.

Depois do primeiro deploy, volte ao backend e ponha o domínio real do Vercel em
`CORS_ORIGINS` — inclusive os domínios de preview, se for usá-los.

## 4. Ordem

1. Criar o Postgres e anotar a URL
2. Publicar o backend (anotar o domínio)
3. Publicar o frontend apontando para esse domínio
4. Voltar ao backend e preencher `CORS_ORIGINS` com o domínio do Vercel
5. Rodar o seed uma vez, se quiser dados de demonstração

## 5. O que falta antes de um deploy de produção

Em ordem de urgência:

1. **Autenticação real.** `AUTH_MODE=jwt` não está implementado. Sem isso não
   existe produção segura — só ambiente interno com acesso restrito.
2. **Migração para Postgres.** Trocar o `provider`, gerar migration inicial
   nova e migrar os dados existentes, se houver.
3. **Busca insensível a maiúsculas.** O SQLite compara texto sem diferenciar
   caixa; o Postgres diferencia. Sem `mode: 'insensitive'` nos `contains` de
   `companies.service.ts` e `dashboard.service.ts`, procurar por "petrobras"
   deixa de encontrar "PETROBRAS".
4. **Limite de requisições.** Não há rate limit; a API fica exposta a abuso.
5. **Retenção de auditoria.** `AuditRun`/`AuditFinding` crescem sem expurgo.

## Desenvolvimento local

```bash
# Backend
cd apps/backend
npm ci && npx prisma migrate deploy && npm run db:seed
npm run start:dev

# Frontend (outro terminal)
cd apps/frontend
npm ci && npm run dev
```

Para rodar o E2E sem depender da BrasilAPI real:

```bash
cd apps/backend && node test/fake-brasilapi.mjs 4444 &
BRASILAPI_BASE_URL=http://localhost:4444/api npm run start:prod
cd apps/frontend && npm run e2e
```
