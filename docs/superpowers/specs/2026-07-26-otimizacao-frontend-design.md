# Otimização do frontend LedgerFlow — Diagnóstico e plano

Data: 2026-07-26

## Problema relatado

"O site está muito pesado." Sintomas sentidos: carregamento inicial lento e
navegação lenta entre telas.

## Diagnóstico (com evidência)

O bundle de produção foi medido com `npm run build`:

| Métrica                        | Valor    | Referência saudável |
| ------------------------------ | -------- | ------------------- |
| JS compartilhado (toda página) | 103 kB   | < 130 kB ✅         |
| Maioria das telas (placeholder)| ~103 kB  | Excelente           |
| `/companies` (tela mais densa) | 144 kB   | Ótimo               |
| `/login`                       | 137 kB   | Ótimo               |

**Conclusão:** o site é leve em produção. Não existe problema de peso de bundle.

A lentidão percebida vem do modo de desenvolvimento (`npm run dev`), que compila
cada rota **sob demanda na primeira visita**. Isso faz a primeira abertura e a
primeira ida a cada tela parecerem lentas; a segunda visita é instantânea. Em
produção (`build` + `start`) tudo já vem pré-compilado.

Pontos já corretos no código: React Query Devtools carrega só em dev; a camada de
dados usa prefetch no servidor + hydration.

## Escopo aprovado (Tier 1 + Tier 2)

1. **Turbopack no dev** — `next dev --turbopack`. Reduz o tempo de compilação e o
   HMR, atacando a dor real (velocidade do dev).
2. **Corrigir aviso de workspace root** — há dois `package-lock.json` (raiz do
   repo e `apps/frontend`). Definir `outputFileTracingRoot` apontando para o
   diretório do frontend silencia o aviso e escopa o rastreamento de arquivos.
   Opção segura e reversível, sem risco de quebrar resolução de dependências.
3. **`optimizePackageImports`** — garante tree-shaking dos pacotes de UI
   (lucide-react, Radix, sonner, vaul).

Fora de escopo (YAGNI enquanto as páginas são placeholders): tornar rotas
estáticas. Hoje tudo é dinâmico por causa do `cookies()` no layout raiz — reavaliar
quando houver conteúdo real.

## Hábito recomendado

Medir performance sempre em `build` + `start`, nunca no `dev`.
