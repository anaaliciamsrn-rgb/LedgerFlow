'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  COLLABORATOR_COLORS,
  COLOR_LABELS,
  colorClasses,
  nextFreeColor,
} from '@/features/calendar/lib/collaborator-colors';
import {
  useCollaborators,
  useSaveCollaborator,
} from '@/features/calendar/hooks/use-collaborators';
import { ApiError } from '@/types/api.types';
import type { CollaboratorColor } from '@/features/calendar/types/calendar.types';

interface CollaboratorManagerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CollaboratorManager({
  open,
  onOpenChange,
}: CollaboratorManagerProps): React.ReactNode {
  const { data: collaborators, isLoading } = useCollaborators();
  const { create, update } = useSaveCollaborator();

  const [name, setName] = useState('');
  const [color, setColor] = useState<CollaboratorColor>('blue');
  const [error, setError] = useState<string | null>(null);

  const usadas = (collaborators ?? []).map((person) => person.color);

  async function handleCreate(): Promise<void> {
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), color });
      setName('');
      setColor(nextFreeColor([...usadas, color]));
      toast.success('Responsável adicionado');
    } catch (caught) {
      // 409 volta como erro de campo, não como toast: o problema é o nome.
      setError(
        caught instanceof ApiError && caught.status === 409
          ? caught.message
          : 'Não foi possível salvar o responsável.',
      );
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Responsáveis</DrawerTitle>
          <DrawerDescription>
            Quem cuida das tarefas do escritório. Cada pessoa tem uma cor no
            calendário.
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-4 pb-6">
          <section className="space-y-3 rounded-md border p-3">
            <h3 className="text-sm font-medium">Adicionar responsável</h3>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do colaborador"
              aria-label="Nome do colaborador"
            />

            <fieldset>
              <legend className="mb-2 text-xs text-muted-foreground">Cor</legend>
              <div className="flex flex-wrap gap-2">
                {COLLABORATOR_COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={COLOR_LABELS[option]}
                    aria-pressed={color === option}
                    className={cn(
                      'size-7 rounded-full ring-offset-2 ring-offset-background transition-all',
                      colorClasses(option).dot,
                      color === option && 'ring-2 ring-foreground',
                    )}
                  />
                ))}
              </div>
            </fieldset>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              onClick={handleCreate}
              disabled={name.trim().length === 0 || create.isPending}
            >
              Adicionar
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Cadastrados</h3>
            {isLoading ? (
              <Loading />
            ) : (
              <ul className="space-y-1">
                {(collaborators ?? []).map((person) => (
                  <li
                    key={person.id}
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-2 rounded-md border p-2',
                      !person.active && 'opacity-50',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <span
                        className={cn(
                          'size-3 shrink-0 rounded-full',
                          colorClasses(person.color).dot,
                        )}
                        aria-hidden
                      />
                      {/* Renomear no lugar: salva ao sair do campo, sem botão extra. */}
                      <input
                        defaultValue={person.name}
                        aria-label={`Nome de ${person.name}`}
                        onBlur={(event) => {
                          const novo = event.target.value.trim();
                          if (novo && novo !== person.name) {
                            update.mutate({ id: person.id, input: { name: novo } });
                          } else {
                            event.target.value = person.name;
                          }
                        }}
                        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-input focus:border-input focus:outline-none"
                      />
                      {!person.active ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          (inativo)
                        </span>
                      ) : null}
                    </span>

                    <span className="flex items-center gap-1">
                      {COLLABORATOR_COLORS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-label={`Cor ${COLOR_LABELS[option]} para ${person.name}`}
                          onClick={() =>
                            update.mutate({ id: person.id, input: { color: option } })
                          }
                          className={cn(
                            'size-4 rounded-full ring-offset-1 ring-offset-background',
                            colorClasses(option).dot,
                            person.color === option && 'ring-2 ring-foreground',
                          )}
                        />
                      ))}
                      <Button
                        variant="outline"
                        className="ml-2 h-8 px-2 text-xs"
                        onClick={() =>
                          update.mutate({
                            id: person.id,
                            input: { active: !person.active },
                          })
                        }
                      >
                        {person.active ? 'Desativar' : 'Reativar'}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
