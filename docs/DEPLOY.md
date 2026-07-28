# Deploy — caminho 100% gratuito

Três peças, três serviços, custo zero e sem cartão de crédito:

| Peça | Serviço | Plano |
|---|---|---|
| Banco (PostgreSQL) | **Neon** | gratuito permanente — 0,5 GB |
| Backend (NestJS) | **Render** | gratuito permanente — 750 h/mês |
| Frontend (Next.js) | **Vercel** | gratuito permanente (Hobby) |

## O que não é gratuito (e costuma ser confundido)

- **Railway** encerrou o plano gratuito. Hoje dá um crédito inicial de US$ 5 e,
  quando acaba, o serviço para até cadastrar cartão.
- **Fly.io** também deixou de ter franquia gratuita para contas novas.
- **Supabase** é gratuito, mas o banco **pausa após 7 dias** sem uso e precisa
  ser religado à mão. Para um sistema que o cliente usa de vez em quando, isso
  atrapalha — daí a preferência pelo Neon, que apenas hiberna e acorda sozinho
  em menos de um segundo.

O plano Hobby do Vercel é para uso **não comercial**, conforme os termos deles.
Para demonstração e validação serve; se o escritório passar a pagar pelo
sistema, o caminho é o plano pago do Vercel ou o Cloudflare Pages, que permite
uso comercial no plano gratuito.

---

## 1. Banco no Neon

Em [neon.com](https://neon.com), crie uma conta e um projeto. Copie a *connection
string*, no formato:

```
postgresql://usuario:senha@ep-algo.aws.neon.tech/neondb?sslmode=require
```

O banco hiberna quando ninguém usa e acorda na primeira consulta. Não é preciso
configurar nada para isso.

## 2. Backend no Render

Em [render.com](https://render.com): **New → Web Service → conecte o GitHub →
LedgerFlow**.

| Campo | Valor |
|---|---|
| Root Directory | `apps/backend` |
| Runtime | Node |
| Build Command | `npm ci && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run start:prod` |
| Instance Type | **Free** |

O `migrate deploy` no arranque cria as tabelas na primeira subida e não faz nada
nas seguintes — dispensa rodar migration à mão a cada deploy.

**Environment Variables:**

```
NODE_ENV=production
AUTH_MODE=stub
DATABASE_URL=<a connection string do Neon>
BRASILAPI_BASE_URL=https://brasilapi.com.br/api
CORS_ORIGINS=https://placeholder.vercel.app
STUB_TENANT_ID=tnt_dev
STUB_USER_ID=usr_dev
STUB_ROLE=owner
```

**Não defina `PORT`** — o Render injeta a dele, e fixar um valor deixa o serviço
inacessível.

`CORS_ORIGINS` recebe um valor provisório porque o endereço do site só existe
depois do passo 3. Ele é obrigatório em produção: sem ele o servidor não sobe.

Anote o endereço gerado e confirme em `https://SEU-BACKEND.onrender.com/api/health`.

### A hibernação do Render, e o que fazer com ela

No plano gratuito o serviço **hiberna após 15 minutos** sem acesso e leva cerca
de **50 segundos** para acordar. Na prática: quem abrir o site depois de um
tempo parado espera quase um minuto na primeira tela.

Duas saídas:

**a) Manter acordado** (recomendado para demonstrar ao cliente)

Em [cron-job.org](https://cron-job.org) — gratuito — crie um agendamento que
chame `https://SEU-BACKEND.onrender.com/api/health` a cada 10 minutos.

A franquia gratuita é de 750 horas por mês e um mês tem 720 — um único serviço
sempre ligado cabe, com folga pequena. Não crie um segundo serviço no plano
gratuito, ou os dois ficam sem horas antes do fim do mês.

**b) Aceitar a espera**

Se ninguém vai olhar por dias, deixe hibernar. Nesse caso aumente o tempo
limite do frontend para o site não desistir antes do backend acordar: use
`NEXT_PUBLIC_API_TIMEOUT=60000` no passo 3.

### Dados de demonstração (opcional)

Para o sistema não abrir vazio, rode o seed uma vez da sua máquina apontando
para o banco de produção:

```bash
cd apps/backend
DATABASE_URL="<a URL do Neon>" npm run db:seed
```

## 3. Frontend no Vercel

Em [vercel.com](https://vercel.com): **Add New → Project → importe o LedgerFlow**.

- **Root Directory: `apps/frontend`** ← sem isto o build nem começa, porque o
  repositório guarda dois projetos.
- Framework Preset: Next.js (detectado sozinho).

**Environment Variables:**

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://SEU-BACKEND.onrender.com/api` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` (ou `60000`, ver acima) |

Repare no `/api` no fim da primeira: sem ele todas as chamadas dão 404.

Se `NEXT_PUBLIC_API_URL` faltar, o **build falha** — `lib/env.ts` valida na
importação. É proposital: melhor quebrar no build do que publicar um site que
não conversa com a API.

## 4. Fechar o círculo

Volte ao Render e corrija `CORS_ORIGINS` com o endereço real do Vercel:

```
CORS_ORIGINS=https://seu-app.vercel.app
```

Sem isso o navegador bloqueia as chamadas e as telas abrem vazias **sem
mensagem de erro visível** — o erro fica só no console (F12), com a expressão
*CORS policy*. Se for usar as URLs de pré-visualização do Vercel, acrescente-as
separadas por vírgula.

## 5. Conferir

Abra `https://seu-app.vercel.app/calendar`. Deve aparecer o calendário com as
tarefas, os responsáveis coloridos e a faixa de atrasadas.

---

## Armadilhas que derrubam este tipo de deploy

| Sintoma | Causa provável |
|---|---|
| Build falha logo no início | Faltou o **Root Directory** |
| Telas abrem vazias, sem erro | `CORS_ORIGINS` ainda com o valor provisório |
| Endereço não responde, mas o log diz que subiu | `PORT` foi definido à mão |
| Todas as chamadas dão 404 | Faltou `/api` no fim de `NEXT_PUBLIC_API_URL` |
| Primeira visita demora ~50 s | Hibernação do Render (ver §2) |

---

## O sistema fica aberto

Não há autenticação, por decisão do projeto. O escritório é identificado pelo
header `x-tenant-id`, que qualquer cliente HTTP pode escolher — na prática,
**quem souber o endereço lê a carteira de clientes de qualquer escritório**:
CNPJs, endereços e quadro societário.

O servidor sobe assim de propósito, mas registra o aviso no log a cada arranque.

Para fechar o acesso, em ordem de esforço:

1. **Deployment Protection** no Vercel (Settings → Deployment Protection) põe
   senha no site. Protege a tela, mas o backend continua acessível direto.
2. **Reativar a autenticação.** O código existe no histórico do git, com 12
   testes prontos — foi removido a pedido, não por não funcionar.

---

## Alternativa: tudo no Vercel

O backend **pode** rodar no Vercel como função serverless: como o banco é
externo, ele não guarda nada. Vantagem sobre o Render: acorda em 1 a 3 segundos
em vez de 50.

Custa duas coisas:

- Um adaptador novo, para o NestJS rodar como função — e o empacotamento do
  Prisma nesse formato é conhecidamente trabalhoso.
- O cache de consultas à Receita Federal e de feriados vive na memória do
  processo. Hibernando com frequência, cada auditoria refaz todas as consultas
  à BrasilAPI: fica lenta e consome o limite do fornecedor.

Por isso o caminho principal deste guia é o Render com ping. Se preferir o
Vercel, o adaptador precisa ser escrito e testado em deploy — não há como
validá-lo localmente.

---

## Desenvolvimento local

Precisa de um PostgreSQL — o banco em arquivo foi abandonado porque não
sobrevive a uma hospedagem. Um banco gratuito no Neon resolve, e é a via mais
rápida se você não tem Postgres instalado.

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
