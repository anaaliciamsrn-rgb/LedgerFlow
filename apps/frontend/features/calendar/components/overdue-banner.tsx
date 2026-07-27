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

/**
 * Uma tarefa vencida em junho não aparece na grade de julho. Esta faixa
 * mostra o atraso de **qualquer** mês, independente do que está na tela.
 */
export function OverdueBanner({ onSelect }: OverdueBannerProps): React.ReactNode {
  const { data } = useOverdueObligations();
  const total = data?.total ?? 0;
  const atrasadas = data?.items ?? [];

  // Sem atraso, a faixa não ocupa espaço nenhum na tela.
  if (total === 0) {
    return null;
  }

  return (
    <section
      aria-label="Tarefas em atraso"
      className="rounded-md border border-destructive/50 bg-destructive/5 p-3"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="size-4" aria-hidden />
        {total === 1 ? '1 tarefa em atraso' : `${total} tarefas em atraso`}
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
              <span className="text-muted-foreground">
                {obligationTypeLabel(item)}
              </span>
              {item.company ? (
                <span className="text-muted-foreground">· {item.company.name}</span>
              ) : null}
              <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    colorClasses(item.collaborator.color).dot,
                  )}
                  aria-hidden
                />
                {item.collaborator.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {total > atrasadas.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Mostrando as {atrasadas.length} mais antigas de {total}.
        </p>
      ) : null}
    </section>
  );
}
