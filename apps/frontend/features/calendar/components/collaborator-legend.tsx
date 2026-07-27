'use client';

import { cn } from '@/lib/cn';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import type { Collaborator } from '@/features/calendar/types/calendar.types';

interface CollaboratorLegendProps {
  readonly collaborators: readonly Collaborator[];
  /** Vazio = todos. */
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
}

/**
 * Legenda e filtro no mesmo controle: a bolinha ensina a cor de cada pessoa e
 * o clique restringe a grade àquela pessoa. Clicar de novo volta para "todos".
 */
export function CollaboratorLegend({
  collaborators,
  selectedId,
  onSelect,
}: CollaboratorLegendProps): React.ReactNode {
  const ativos = collaborators.filter((person) => person.active);
  if (ativos.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Responsáveis"
    >
      <button
        type="button"
        onClick={() => onSelect('')}
        aria-pressed={selectedId === ''}
        className={cn(
          'rounded-full border px-3 py-1 text-xs transition-colors',
          selectedId === '' ? 'border-primary bg-primary/10' : 'border-input',
        )}
      >
        Todos
      </button>

      {ativos.map((person) => (
        <button
          key={person.id}
          type="button"
          onClick={() => onSelect(selectedId === person.id ? '' : person.id)}
          aria-pressed={selectedId === person.id}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
            selectedId === person.id
              ? 'border-primary bg-primary/10'
              : 'border-input',
          )}
        >
          <span
            className={cn('size-2 rounded-full', colorClasses(person.color).dot)}
            aria-hidden
          />
          {person.name}
        </button>
      ))}
    </div>
  );
}
