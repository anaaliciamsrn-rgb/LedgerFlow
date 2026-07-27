'use client';

import { useMemo } from 'react';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import { obligationTypeLabel } from '@/features/calendar/lib/obligation-types';
import { useUpdateObligation } from '@/features/calendar/hooks/use-obligation-mutations';
import type { Obligation } from '@/features/calendar/types/calendar.types';

interface AssigneeTaskListProps {
  /** Tarefas do mês exibido — a faixa de atrasadas cuida dos outros meses. */
  readonly obligations: readonly Obligation[];
  readonly onSelect: (obligation: Obligation) => void;
}

interface Grupo {
  readonly id: string;
  readonly name: string;
  readonly color: Obligation['collaborator']['color'];
  readonly items: readonly Obligation[];
  readonly atrasadas: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

export function AssigneeTaskList({
  obligations,
  onSelect,
}: AssigneeTaskListProps): React.ReactNode {
  const update = useUpdateObligation();

  const grupos = useMemo<readonly Grupo[]>(() => {
    const porPessoa = new Map<string, Obligation[]>();
    for (const item of obligations) {
      const atual = porPessoa.get(item.collaborator.id) ?? [];
      atual.push(item);
      porPessoa.set(item.collaborator.id, atual);
    }

    return [...porPessoa.values()]
      .filter((items): items is [Obligation, ...Obligation[]] => items.length > 0)
      .map((items) => ({
        id: items[0].collaborator.id,
        name: items[0].collaborator.name,
        color: items[0].collaborator.color,
        items: [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        atrasadas: items.filter((item) => item.overdue).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [obligations]);

  if (grupos.length === 0) {
    return null;
  }

  async function toggle(item: Obligation): Promise<void> {
    try {
      await update.mutateAsync({
        id: item.id,
        input: { status: item.status === 'completed' ? 'pending' : 'completed' },
      });
    } catch {
      toast.error('Não foi possível atualizar a tarefa.');
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {grupos.map((grupo) => (
        <Card key={grupo.id} className="p-3">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span
              className={cn('size-3 rounded-full', colorClasses(grupo.color).dot)}
              aria-hidden
            />
            {grupo.name}
            <span className="font-normal text-muted-foreground">
              {grupo.items.length === 1
                ? '1 tarefa'
                : `${grupo.items.length} tarefas`}
              {grupo.atrasadas > 0 ? ` · ${grupo.atrasadas} atrasadas` : ''}
            </span>
          </h3>

          <ul className="mt-2 space-y-1">
            {grupo.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={item.status === 'completed'}
                  onChange={() => void toggle(item)}
                  aria-label={`Concluir ${item.title}`}
                  className="size-4 shrink-0 rounded border-input"
                />
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 text-left hover:underline',
                    item.status === 'completed' && 'line-through opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      item.overdue
                        ? 'font-medium text-destructive'
                        : 'text-muted-foreground',
                    )}
                  >
                    {DATE_FORMATTER.format(new Date(item.dueDate))}
                  </span>
                  <span className="truncate">
                    {item.title}
                    {item.company ? ` — ${item.company.name}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {obligationTypeLabel(item)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
