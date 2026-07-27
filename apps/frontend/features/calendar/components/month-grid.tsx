'use client';

import { cn } from '@/lib/cn';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface MonthGridProps {
  /** Meio-dia UTC do primeiro dia do mês exibido (ver nota de fuso horário abaixo). */
  readonly month: Date;
  readonly obligations: readonly Obligation[];
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/**
 * A grade e as obrigações precisam concordar sobre "qual dia é qual" sem
 * depender do fuso horário do navegador. Por isso tudo aqui usa métodos UTC
 * (`getUTCDate`, `getUTCDay`, `Date.UTC`) — nunca `getDate`/`getDay` locais.
 * `CalendarView` monta `month` como meia-noite UTC do dia 1 e gera `dueDate`
 * das obrigações também ancorado em UTC, então os dois lados sempre batem.
 */
export function MonthGrid({ month, obligations }: MonthGridProps): React.ReactNode {
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
            return <div key={`empty-${index}`} className="min-h-16 rounded-md" />;
          }

          const items = byDay.get(day) ?? [];
          const isHoliday = items.some((item) => item.holidayConflict !== null);
          const hasOverdue = items.some((item) => item.overdue);

          return (
            <div
              key={day}
              className={cn(
                'min-h-16 rounded-md border p-1 text-left',
                isHoliday && 'border-amber-500/60 bg-amber-500/5',
                hasOverdue && 'border-destructive/60 bg-destructive/5',
              )}
            >
              <span className="text-xs font-medium">{day}</span>
              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    title={`${item.title} — ${item.assignee}${item.holidayConflict ? ` (feriado: ${item.holidayConflict})` : ''}${item.overdue ? ' — em atraso' : ''}`}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-[10px]',
                      item.overdue ? 'bg-destructive/15 text-destructive' : 'bg-primary/10',
                    )}
                  >
                    {item.title}
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
