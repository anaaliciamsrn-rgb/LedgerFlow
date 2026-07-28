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
| `JWT_SECRET` | chave com 32+ caracteres (ver abaixo) |
| `CORS_ORIGINS` | `https://seu-app.vercel.app` |
| `BRASILAPI_BASE_URL` | `https://brasilapi.com.br/api` |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | credenciais do primeiro acesso |
| `PORT` | o que a hospedagem indicar |

Gere a chave de assinatura assim, e guarde-a só no painel da hospedagem:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sem `SEED_USER_PASSWORD`, o seed cria o usuário com a senha de desenvolvimento
`trocar-esta-senha` — que está escrita neste repositório e, portanto, é pública.

Comandos:

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start:prod
```

**O processo se recusa a subir** se `NODE_ENV=production` vier com
`AUTH_MODE=stub`, sem `CORS_ORIGINS`, ou com `AUTH_MODE=jwt` sem `JWT_SECRET`
de 32+ caracteres. É proposital: em modo stub o tenant vem do header
`x-tenant-id`, ou seja, quem souber a URL lê a carteira de qualquer escritório.
Melhor não subir do que subir aberto.

### O cookie de sessão e a escolha de domínio

O token vive num cookie `httpOnly` — o JavaScript da página não o alcança, e um
XSS não o rouba. Isso traz uma consequência para o deploy:

- **Mesmo domínio (recomendado):** o frontend chama `/api/...` e o Vercel
  reencaminha para o backend por um *rewrite*. O cookie é first-party,
  `SameSite=Lax` basta e o CORS deixa de existir como problema.
- **Domínios diferentes:** `seu-app.vercel.app` chamando `seu-backend.onrender.com`
  faz do cookie um third-party. É preciso `CROSS_SITE_COOKIE=true` (que muda o
  cookie para `SameSite=None`) e os navegadores vêm restringindo esse tipo de
  cookie — o login pode simplesmente parar de funcionar sem aviso.

Por isso a recomendação é o primeiro arranjo. Para adotá-lo, acrescente ao
`next.config.ts` do frontend:

```ts
async rewrites() {
  return [
    { source: '/api/:path*', destination: `${process.env.BACKEND_URL}/api/:path*` },
  ];
}
```

e aponte `NEXT_PUBLIC_API_URL` para `/api` do próprio site.

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

1. **Migração para Postgres.** O `schema.prisma` ainda usa `provider = "sqlite"`
   e as migrations são SQL de SQLite. É o que falta para o backend sair do ar
   local.
2. **Busca insensível a maiúsculas.** O SQLite compara texto sem diferenciar
   caixa; o Postgres diferencia. Sem `mode: 'insensitive'` nos `contains` de
   `companies.service.ts` e `dashboard.service.ts`, procurar por "petrobras"
   deixa de encontrar "PETROBRAS".
3. **Limite de tentativas de login.** Não há rate limit: a senha fica exposta a
   força bruta. O bcrypt de custo 12 (~700ms por tentativa) atrasa o ataque,
   mas não o impede.
4. **Troca e recuperação de senha.** Hoje só o seed cria usuário; não há tela
   para trocar a própria senha nem para recuperá-la.
5. **Retenção de auditoria.** `AuditRun`/`AuditFinding` crescem sem expurgo.

Já resolvido: a autenticação real (`AUTH_MODE=jwt`) existe e é exercitada por
testes que sobem a aplicação nesse modo.

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
