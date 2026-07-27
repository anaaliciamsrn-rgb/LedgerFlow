'use client';

import { cn } from '@/lib/cn';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import { obligationTypeLabel } from '@/features/calendar/lib/obligation-types';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface MonthGridProps {
  /** Meia-noite UTC do primeiro dia do mês exibido (ver nota de fuso abaixo). */
  readonly month: Date;
  readonly obligations: readonly Obligation[];
  readonly onSelect: (obligation: Obligation) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/**
 * A grade e as obrigações precisam concordar sobre "qual dia é qual" sem
 * depender do fuso horário do navegador. Por isso tudo aqui usa métodos UTC
 * (`getUTCDate`, `getUTCDay`, `Date.UTC`) — nunca `getDate`/`getDay` locais.
 * `CalendarView` monta `month` como meia-noite UTC do dia 1 e gera `dueDate`
 * das obrigações também ancorado em UTC, então os dois lados sempre batem.
 */
export function MonthGrid({
  month,
  obligations,
  onSelect,
}: MonthGridProps): React.ReactNode {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

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
          <div key={`${label}-${index}`} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-20 rounded-md" />;
          }

          const items = byDay.get(day) ?? [];
          // O feriado é propriedade do DIA; o atraso, de cada tarefa.
          const holiday = items.find(
            (item) => item.holidayConflict !== null,
          )?.holidayConflict;

          return (
            <div
              key={day}
              className={cn(
                'min-h-20 rounded-md border p-1 text-left',
                holiday && 'border-amber-500/60 bg-amber-500/5',
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-medium">{day}</span>
                {holiday ? (
                  <span className="truncate text-[9px] text-amber-600 dark:text-amber-400">
                    {holiday}
                  </span>
                ) : null}
              </div>

              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      title={`${item.title} — ${obligationTypeLabel(item)} — ${item.collaborator.name}${
                        item.holidayConflict
                          ? ` (feriado: ${item.holidayConflict})`
                          : ''
                      }${item.overdue ? ' — em atraso' : ''}`}
                      className={cn(
                        'w-full truncate rounded px-1 py-0.5 text-left text-[10px] transition-opacity hover:opacity-80',
                        // O vermelho do atraso prevalece sobre a cor da pessoa:
                        // é o sinal mais urgente da tela.
                        item.overdue
                          ? 'bg-destructive/15 font-medium text-destructive'
                          : colorClasses(item.collaborator.color).chip,
                        item.status === 'completed' && 'line-through opacity-50',
                      )}
                    >
                      {item.overdue ? '⚠ ' : ''}
                      {item.title}
                    </button>
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
