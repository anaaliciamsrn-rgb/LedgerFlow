# LedgerFlow — Tarefas recorrentes do escritório

Data: 2026-07-27
Branch: `feat/tarefas-recorrentes` (a partir de `main`)

## 1. Pedido do cliente

> Ferramenta para cadastrar e acompanhar tarefas recorrentes do escritório, como
> fechamento da folha de pagamento, envio de documentos, emissão de guias e
> conferências mensais por empresa. O sistema deverá exibir as tarefas em um
> calendário, sinalizar atrasos, organizá-las por responsável e alertar quando um
> vencimento coincidir com um feriado nacional.

## 2. Estado atual

O módulo de calendário existe desde `af31de8` e cobre parte do pedido.

**Backend (`apps/backend/src/calendar/`) — funcional:**

- `Obligation` com `assignee` (string livre), `recurrenceGroupId`, `companyId`
- `generateOccurrences` materializa ocorrências — **apenas mensais**
- `toObligationDto` calcula `overdue` e `holidayConflict` (cruzando com
  `HolidaysService`, que consulta a BrasilAPI com cache permanente por ano e
  degrada para mapa vazio se a rede falhar)
- `GET /calendar/obligations` (`from`, `to`, `status`, `assignee`),
  `POST /calendar/obligations`, `PATCH /calendar/obligations/:id`

**Frontend (`apps/frontend/features/calendar/`) — somente leitura:**

- `CalendarView` + `MonthGrid`: grade mensal em UTC, borda vermelha para atraso,
  borda âmbar para feriado, `<select>` de responsável, contadores no topo

**Lacunas frente ao pedido:**

| Pedido | Lacuna |
|---|---|
| "cadastrar" | Nenhuma UI chama o `POST` que já existe |
| "acompanhar" | Nenhuma UI chama o `PATCH`; não há como concluir uma tarefa |
| "como folha, documentos, guias, conferências" | `type` é string livre (`"DAS"`, `"FOLHA"`), sem catálogo |
| "por empresa" | `companyId` existe no banco e é invisível na tela |
| "organizá-las por responsável" | Existe filtro, não organização; responsável é texto solto sem cadastro |
| "sinalizar atrasos" | Atraso só aparece dentro do mês em que a tarefa venceu |
| "alertar em feriado" | Alerta só existe depois de salvo; o cadastro não avisa |
| recorrência | Só mensal |

## 3. Decisões travadas

| Tema | Decisão | Motivo |
|---|---|---|
| Cadastro por empresa | **Uma tarefa por vez, com uma empresa opcional** | Decisão do usuário. Reaproveita o `POST` atual; sem geração em lote |
| Acompanhamento | **Painel lateral ao clicar + lista abaixo do calendário** | Decisão do usuário. Painel para detalhe, lista para dar baixa em série |
| Responsável | **Entidade `Collaborator` própria, com cor; a tarefa referencia por id** | Decisão do usuário (opção A). Renomear ou recolorir reflete no histórico inteiro |
| Feriado | **Avisa e oferece "antecipar para o dia útil anterior"** | Decisão do usuário. Nenhuma data se move sozinha |
| Tipo de tarefa | **4 tipos fixos + `OUTRO` com texto livre** | Decisão do usuário. Cobre o brief sem engessar |
| Recorrência | **Semanal, quinzenal, mensal, trimestral, anual** | Decisão do usuário |
| Atrasadas | **Faixa fixa no topo, independente do mês exibido** | Decisão do usuário. Nada some de vista |
| Banco | Mantém **SQLite** | Continuidade com a entrega anterior |
| Exclusão de colaborador | **Desativação, nunca `DELETE`** | Tarefas antigas preservam o histórico |

## 4. Modelo de dados

### 4.1 `Collaborator` (novo)

```prisma
model Collaborator {
  id       String  @id @default(cuid())
  tenantId String
  name     String
  /// Token da paleta (§4.2), não um hex — o tema claro/escuro resolve o valor.
  color    String
  active   Boolean @default(true)

  createdAt DateTime @default(now())

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  obligations Obligation[]

  @@unique([tenantId, name])
  @@index([tenantId, active])
}
```

`@@unique([tenantId, name])` impede dois "Ana Souza" no mesmo escritório — a
lista de responsáveis ficaria ambígua. A violação vira `409 Conflict` com
mensagem em português.

### 4.2 Paleta de cores

Oito tokens fixos. O backend valida a lista por `z.enum` em `calendar.schema.ts`;
o frontend traduz cada token em classes Tailwind em
`features/calendar/lib/collaborator-colors.ts`. A lista de nomes aparece nos dois
lados — é a mesma duplicação já aceita para `ObligationStatus`, e um valor fora
da lista é rejeitado pelo backend antes de chegar ao banco. Os tokens:

`blue` · `violet` · `emerald` · `amber` · `rose` · `cyan` · `orange` · `lime`

Cada token mapeia para um par de classes Tailwind (fundo/borda) que funciona em
tema claro e escuro. O backend guarda **o token**, nunca um hex — assim o tema
continua governando a aparência e o dado não carrega decisão visual.

Ao cadastrar um colaborador, a UI sugere a primeira cor ainda não usada; nada
impede repetir se as oito acabarem.

### 4.3 `Obligation` — mudanças

```prisma
collaboratorId String
recurrence     String @default("none")  // none|weekly|biweekly|monthly|quarterly|yearly

collaborator Collaborator @relation(fields: [collaboratorId], references: [id])

@@index([tenantId, collaboratorId])
@@index([tenantId, status, dueDate])   // faixa de atrasadas
```

O campo `assignee: String` **sai**. A migration:

1. cria `Collaborator`;
2. insere um colaborador por `assignee` distinto já existente, por tenant,
   atribuindo cores da paleta em ordem;
3. preenche `collaboratorId` cruzando `(tenantId, assignee)`;
4. remove `assignee`.

`recurrence` passa a ser persistido (hoje só existe no input) — o painel de
detalhe precisa dizer "repete todo mês", e a faixa de atrasadas precisa disso
para explicar de onde a tarefa veio.

`holidayConflict` e `overdue` continuam **calculados**, nunca persistidos.

### 4.4 Tipos de tarefa

Catálogo fixo em `calendar.schema.ts`, espelhado no frontend:

| Valor | Rótulo | Ícone |
|---|---|---|
| `FOLHA` | Fechamento de folha | `Users` |
| `DOCUMENTOS` | Envio de documentos | `FileUp` |
| `GUIAS` | Emissão de guias | `Receipt` |
| `CONFERENCIA` | Conferência mensal | `ClipboardCheck` |
| `OUTRO` | Outro | `CircleDot` |

`type: 'OUTRO'` exige `customType` (1–60 caracteres); os demais o rejeitam.
Regra expressa por `superRefine` no Zod, com mensagem em português.

O seed migra os tipos atuais: `FOLHA` permanece, `DAS` → `GUIAS`,
`DOCUMENTOS` permanece, `CONFERENCIA` permanece.

## 5. Backend

### 5.1 `recurrence.ts` — cinco frequências

`generateOccurrences(start, frequency, count)` passa a aceitar
`none | weekly | biweekly | monthly | quarterly | yearly`, sempre em UTC,
limite de 24 ocorrências.

- `weekly` / `biweekly`: soma 7 / 14 dias — aritmética simples, sem armadilha
- `monthly` / `quarterly` / `yearly`: soma meses (1/3/12) preservando a regra de
  fim de mês **já implementada e testada** — dia 31 em mês de 30 dias vira o
  último dia do mês, nunca vaza para o mês seguinte. 29/02 em ano comum vira
  28/02 pelo mesmo caminho

### 5.2 `holidays` — consulta antes de salvar

O formulário precisa avisar sobre o feriado **enquanto** o usuário escolhe a
data. Endpoint novo:

```
GET /calendar/holidays?year=2026  →  [{ date: "2026-12-25", name: "Natal" }]
```

Lê do `HolidaysService` (cache permanente por ano). Se a BrasilAPI cair, devolve
lista vazia: o formulário simplesmente não mostra aviso, e nada quebra.

O frontend busca o ano inteiro uma vez e resolve o aviso localmente — sem
requisição a cada tecla digitada na data.

### 5.3 Dia útil anterior

Função pura `previousBusinessDay(date, holidays)` em `calendar/business-days.ts`:
recua um dia por vez enquanto a data for sábado, domingo ou feriado. Limite de
10 iterações para nunca girar sem fim (um feriado que emende com o fim de
semana consome no máximo 4).

O cálculo roda **no backend**, exposto pelo `PATCH` como
`{ "action": "anticipate" }`, e também no frontend para o preview do formulário —
mesma lógica, uma cópia em cada lado. São 12 linhas; compartilhar exigiria um
pacote comum que este monorepo não tem, e o teste unitário roda dos dois lados
com os mesmos casos.

### 5.4 Endpoints

```
GET    /calendar/collaborators                 lista (ativos + inativos)
POST   /calendar/collaborators                 { name, color }
PATCH  /calendar/collaborators/:id             { name?, color?, active? }

GET    /calendar/holidays?year=YYYY            feriados do ano
GET    /calendar/obligations                   + overdueOnly=true (ignora from/to)
POST   /calendar/obligations                   + collaboratorId, customType, recurrence
PATCH  /calendar/obligations/:id               + action: 'anticipate'
```

`overdueOnly=true` devolve **todas** as pendentes com `dueDate < hoje`,
independente de `from`/`to` — é a fonte da faixa do topo. Ordenação por
`dueDate` ascendente, teto de 100 linhas (a faixa não é uma listagem completa;
com mais de 100 atrasadas o escritório tem outro problema).

`collaboratorId` é validado contra o tenant antes de gravar: id de outro
escritório devolve `404`, nunca cria vínculo cruzado.

Toda ação continua registrada no `ActivityService`, como já acontece.

## 6. Frontend

Tudo dentro de `apps/frontend/features/calendar/`, seguindo a estrutura
`components/ hooks/ services/ types/` já usada nas outras features.

### 6.1 `CalendarView` — composição

```
PageHeader  ·  [Nova tarefa]  [Responsáveis]
OverdueBanner          ← faixa vermelha, sempre visível
CollaboratorLegend     ← bolinhas coloridas + filtro por pessoa
< Julho 2026 >
MonthGrid              ← grade colorida por responsável
AssigneeTaskList       ← blocos por pessoa, com caixinha de concluir
```

`CalendarView` hoje concentra estado, filtro, datas e layout. Com quatro
componentes novos ele vira um orquestrador: o cálculo de âncora de mês sai para
`hooks/use-month-anchor.ts` e o componente só compõe. Sem isso o arquivo passa
de 300 linhas e fica difícil de manter.

### 6.2 `ObligationForm` (painel lateral)

Campos na ordem: Título · Tipo · *(Descrição, só se `OUTRO`)* · Empresa
(opcional) · Responsável · Vencimento · Repetir · Quantas vezes.

Validação com `zod` + `react-hook-form`, no padrão de
`features/companies/schemas/`.

**Aviso de feriado:** ao mudar a data, cruza com os feriados do ano já em cache.
Coincidindo, mostra uma faixa âmbar — *"25/12 é Natal"* — e o botão
**"Antecipar para o dia útil anterior"**, que reescreve o campo de data.

**Preview de recorrência:** abaixo do campo "Quantas vezes", uma linha em texto
menor mostra as três primeiras datas geradas e a última
(*"05/08, 05/09, 05/10 … 05/07/2027"*). Sem isso o usuário só descobre o que
criou depois de salvar 24 linhas.

Ao salvar: toast confirmando a quantidade criada e invalidação das queries do
calendário.

### 6.3 `ObligationDetail` (painel lateral)

Abre ao clicar na tarefa. Mostra título, tipo, empresa (link para a página da
empresa), responsável, vencimento, recorrência e o aviso de feriado quando
houver. Ações: **Marcar como concluída** · **Antecipar** (só em feriado) ·
**Alterar data**.

Concluir uma ocorrência não afeta as irmãs do mesmo `recurrenceGroupId` — cada
uma se resolve sozinha, como já é hoje.

### 6.4 `CollaboratorManager` (painel lateral)

Lista os colaboradores com nome, bolinha de cor e estado. Formulário de
**Adicionar responsável** (nome + escolha de cor entre as oito). Cada linha
permite renomear, trocar a cor e ativar/desativar. Inativos aparecem esmaecidos
no fim da lista e não entram na escolha de tarefas novas.

Nome duplicado devolve `409`; a UI mostra o erro no campo, não em toast.

### 6.5 `MonthGrid` — cores por responsável

Dois níveis distintos, para não competirem:

- **A célula do dia** sinaliza o feriado — fundo âmbar com o nome do feriado no
  canto, como já é hoje.
- **Cada tarefa dentro da célula** recebe as classes do token de cor do
  responsável. Se estiver atrasada, o vermelho **prevalece** sobre a cor da
  pessoa: o atraso é o sinal mais urgente da tela. Concluída fica riscada e com
  opacidade reduzida.

Cor nunca é o único portador de informação: atraso também traz ícone e texto no
`title`, e o nome do responsável aparece na lista de baixo. Requisito de
acessibilidade, coerente com o `a11y.context` já existente no projeto.

### 6.6 `OverdueBanner` e `AssigneeTaskList`

`OverdueBanner` consome `overdueOnly=true`, some quando não há atraso, e cada
linha abre o `ObligationDetail`.

`AssigneeTaskList` agrupa as tarefas **do mês exibido** por responsável, na cor
da pessoa, com contagem (`5 tarefas · 2 atrasadas`). A caixinha conclui direto,
com atualização otimista e reversão em caso de erro.

### 6.7 Mocks

`services/mocks/calendar.mock.ts` ganha colaboradores com cor e os campos novos,
para a tela continuar demonstrável com `NEXT_PUBLIC_USE_MOCKS=true`. O comentário
obsoleto ("o backend ainda não expõe assignee…") sai — o backend expõe desde a
entrega anterior.

## 7. Testes

**Unitários (backend):**

- `generateOccurrences` nas cinco frequências, incluindo dia 31 em mês de 30
  dias, 29/02 em ano comum, quinzenal atravessando a virada do mês, e o teto de
  24 ocorrências
- `previousBusinessDay`: feriado em terça → segunda; feriado em segunda →
  sexta anterior; feriado emendando o fim de semana
- `toObligationDto`: `overdue` só para `pending`; `holidayConflict` batendo a
  chave UTC

**Unitários (frontend):** `previousBusinessDay` com os mesmos casos; validação do
`ObligationForm` (`OUTRO` sem descrição rejeitado).

**E2E (backend):** criar tarefa recorrente e conferir a quantidade de linhas;
concluir uma ocorrência sem afetar as irmãs; `overdueOnly` ignorando `from`/`to`;
nome de colaborador duplicado devolvendo `409`; `collaboratorId` de outro tenant
devolvendo `404`; isolamento `TENANT_A`/`TENANT_B`.

A BrasilAPI é **sempre** mockada via `HTTP_FETCHER`. Nenhum teste acessa a rede.

## 8. Ordem de execução

1. Schema, migration com conversão de `assignee` → `Collaborator`, seed
2. `recurrence.ts` (cinco frequências) e `business-days.ts` — funções puras, com
   teste antes da implementação
3. Endpoints de colaboradores, feriados e `overdueOnly`
4. `CollaboratorManager` e legenda colorida
5. `ObligationForm` com aviso de feriado e preview
6. `ObligationDetail`, `OverdueBanner`, `AssigneeTaskList`
7. Verificação em viewport móvel

A fundação (1–3) precisa estar de pé antes de qualquer tela; dentro do
frontend, os itens 4–6 são independentes entre si.

## 9. Fora de escopo

Criação de tarefas em lote para várias empresas; notificação por e-mail;
anexo de arquivos; comentários; permissão por usuário (o colaborador é um rótulo
com cor, não uma conta de acesso); feriados estaduais e municipais; exclusão
definitiva de colaborador; e as demais telas do sistema, que seguem intocadas.
