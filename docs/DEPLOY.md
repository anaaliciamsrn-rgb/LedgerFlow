# Deploy

O sistema tem três peças, e cada uma vive num lugar:

| Peça | Onde | Custo |
|---|---|---|
| Banco de dados (PostgreSQL) | Neon | gratuito |
| Backend (NestJS) | Railway | gratuito |
| Frontend (Next.js) | Vercel | gratuito |

## Antes de começar

Tenha em mãos:

- Conta no GitHub com o repositório publicado
- A URL de conexão do PostgreSQL, no formato
  `postgresql://usuario:senha@host/banco?sslmode=require`

---

## 1. Backend no Railway

Em [railway.app](https://railway.app), entre com o GitHub:

**New Project → Deploy from GitHub repo → LedgerFlow**

Depois, no serviço criado:

**Settings → Source**
- Root Directory: `apps/backend`

**Settings → Build**
- Build Command: `npm ci && npx prisma generate && npm run build`

**Settings → Deploy**
- Start Command: `npx prisma migrate deploy && npm run start:prod`

O `migrate deploy` no arranque cria as tabelas na primeira subida e não faz
nada nas seguintes. É o que dispensa rodar migration à mão a cada deploy.

**Variables** — cole tudo de uma vez pelo botão *Raw Editor*:

```
NODE_ENV=production
AUTH_MODE=stub
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
BRASILAPI_BASE_URL=https://brasilapi.com.br/api
CORS_ORIGINS=https://placeholder.vercel.app
STUB_TENANT_ID=tnt_dev
STUB_USER_ID=usr_dev
STUB_ROLE=owner
```

Duas observações:

- **Não defina `PORT`.** O Railway injeta a porta dele; fixar um valor faz o
  serviço ficar inacessível.
- `CORS_ORIGINS` recebe um valor provisório porque o endereço do site só existe
  depois do passo 2. Ele é **obrigatório** em produção — sem ele o servidor não
  sobe.

**Settings → Networking → Generate Domain.** Anote o endereço; algo como
`https://ledgerflow-production.up.railway.app`.

Confira se subiu:

```
https://SEU-BACKEND.up.railway.app/api/health
```

Deve responder `{"data":{"status":"ok",...}}`.

### Dados de demonstração (opcional)

Para o sistema não abrir vazio, rode o seed uma vez a partir da sua máquina,
apontando para o banco de produção:

```bash
cd apps/backend
DATABASE_URL="<a URL do Postgres>" npm run db:seed
```

---

## 2. Frontend no Vercel

Em [vercel.com](https://vercel.com): **Add New → Project → importe o LedgerFlow**.

- **Root Directory: `apps/frontend`** ← sem isto o build nem começa, porque o
  repositório guarda dois projetos.
- Framework Preset: Next.js (o Vercel detecta sozinho).

**Environment Variables:**

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://SEU-BACKEND.up.railway.app/api` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` |

Repare no `/api` no fim da primeira: sem ele todas as chamadas dão 404.

Se `NEXT_PUBLIC_API_URL` faltar, o **build falha** — `lib/env.ts` valida na
importação. É proposital: melhor quebrar no build do que publicar um site que
não conversa com a API.

---

## 3. Fechar o círculo

Volte ao Railway e corrija `CORS_ORIGINS` com o endereço real do Vercel:

```
CORS_ORIGINS=https://seu-app.vercel.app
```

Sem isso o navegador bloqueia as chamadas e as telas abrem vazias, **sem
mensagem de erro visível** — o erro fica só no console do navegador. Se for
usar as URLs de pré-visualização do Vercel, acrescente-as separadas por
vírgula.

O Railway republica sozinho ao salvar a variável.

---

## 4. Conferir

Abra `https://seu-app.vercel.app/calendar`. Deve aparecer o calendário com as
tarefas, os responsáveis coloridos e a faixa de atrasadas.

Se abrir vazio, o suspeito número um é o `CORS_ORIGINS`. Abra o console do
navegador (F12): mensagem contendo *CORS policy* confirma.

---

## O sistema fica aberto

Não há autenticação, por decisão do projeto. O escritório é identificado pelo
header `x-tenant-id`, que qualquer cliente HTTP pode escolher — na prática,
**quem souber o endereço lê a carteira de clientes de qualquer escritório**:
CNPJs, endereços e quadro societário.

O servidor sobe assim de propósito, mas registra o aviso no log a cada
arranque, para que a escolha não fique esquecida.

Para fechar o acesso, em ordem de esforço:

1. **Deployment Protection** no Vercel (Settings → Deployment Protection) põe
   senha no site. Protege a tela, mas o backend continua acessível direto.
2. **Reativar a autenticação.** O código existe no histórico do git, com 12
   testes prontos — foi removido a pedido, não por não funcionar.

---

## Por que não tudo no Vercel

O backend **pode** rodar no Vercel: como o banco é externo, ele não guarda
nada. Mas o Vercel hiberna o processo entre acessos, e isso custa duas coisas:

- Espera de 1 a 3 segundos na primeira visita depois de um período parado.
- O cache de consultas à Receita Federal e de feriados vive na memória do
  processo. Hibernando, ele se perde: cada auditoria refaz todas as consultas
  à BrasilAPI, ficando lenta e consumindo o limite do fornecedor.

Num serviço que mantém o processo de pé, a segunda auditoria é instantânea.

O Render **não** é recomendado: no plano gratuito ele hiberna após 15 minutos e
leva cerca de 50 segundos para acordar. O cliente abriria o site e esperaria
quase um minuto.

---

## Desenvolvimento local

Precisa de um PostgreSQL — o banco em arquivo foi abandonado porque não
sobrevive a uma hospedagem. Um banco gerenciado gratuito resolve, e é a via
mais rápida se você não tem Postgres instalado.

Use **bancos separados** para desenvolver e para testar: a suíte apaga as
tabelas entre os testes.

```bash
# Backend — configure apps/backend/.env com o DATABASE_URL antes
cd apps/backend
npm ci && npx prisma migrate deploy && npm run db:seed
npm run start:dev

# Frontend, noutro terminal
cd apps/frontend
npm ci && npm run dev
```

Os testes e2e leem o `DATABASE_URL` do ambiente e falham com instrução clara se
ele não apontar para um Postgres:

```bash
cd apps/backend
DATABASE_URL="<banco de TESTE>" npm run test:e2e
```

Para rodar o E2E de tela sem depender da BrasilAPI real:

```bash
cd apps/backend && node test/fake-brasilapi.mjs 4444 &
BRASILAPI_BASE_URL=http://localhost:4444/api npm run start:prod
cd apps/frontend && npm run e2e
```

---

## O que ainda falta

Em ordem de urgência, para um uso mais sério:

1. **Limite de requisições.** Não há rate limit; a API está exposta a abuso.
2. **Retenção de auditoria.** `AuditRun` e `AuditFinding` crescem sem expurgo.
3. **Seletor de empresas no cadastro de tarefa** corta em 100 empresas, em
   silêncio.
4. **Excluir tarefa** não existe — só concluir.
