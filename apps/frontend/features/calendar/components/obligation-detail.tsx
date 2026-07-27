'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/constants/routes';
import { useUpdateObligation } from '@/features/calendar/hooks/use-obligation-mutations';
import { colorClasses } from '@/features/calendar/lib/collaborator-colors';
import {
  obligationTypeLabel,
  RECURRENCE_LABELS,
} from '@/features/calendar/lib/obligation-types';
import type {
  Obligation,
  UpdateObligationInput,
} from '@/features/calendar/types/calendar.types';

interface ObligationDetailProps {
  /** `null` mantém o painel fechado. */
  readonly obligation: Obligation | null;
  readonly onClose: () => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export function ObligationDetail({
  obligation,
  onClose,
}: ObligationDetailProps): React.ReactNode {
  const update = useUpdateObligation();

  if (!obligation) {
    return null;
  }

  const alvo = obligation;
  const isoDay = alvo.dueDate.slice(0, 10);

  async function run(
    input: UpdateObligationInput,
    message: string,
  ): Promise<void> {
    try {
      await update.mutateAsync({ id: alvo.id, input });
      toast.success(message);
      onClose();
    } catch {
      toast.error('Não foi possível salvar a alteração.');
    }
  }

  return (
    <Drawer open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{alvo.title}</DrawerTitle>
          <DrawerDescription>{obligationTypeLabel(alvo)}</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 pb-6">
          <div className="flex flex-wrap gap-2">
            {alvo.overdue ? <Badge variant="destructive">Em atraso</Badge> : null}
            {alvo.status === 'completed' ? (
              <Badge variant="success">Concluída</Badge>
            ) : null}
            {alvo.holidayConflict ? (
              <Badge variant="warning">Feriado: {alvo.holidayConflict}</Badge>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Responsável
              </dt>
              <dd className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'size-3 rounded-full',
                    colorClasses(alvo.collaborator.color).dot,
                  )}
                  aria-hidden
                />
                {alvo.collaborator.name}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Empresa
              </dt>
              <dd className="text-sm">
                {alvo.company ? (
                  <Link
                    href={ROUTES.companies.detail(alvo.company.id)}
                    className="underline underline-offset-4"
                  >
                    {alvo.company.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Vencimento
              </dt>
              <dd className="text-sm">
                {DATE_FORMATTER.format(new Date(alvo.dueDate))}
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Repetição
              </dt>
              <dd className="text-sm">{RECURRENCE_LABELS[alvo.recurrence]}</dd>
            </div>
          </dl>

          {alvo.holidayConflict ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                O vencimento cai em {alvo.holidayConflict}. Antecipar move a data
                para o dia útil anterior.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {alvo.status === 'pending' ? (
              <Button
                onClick={() => void run({ status: 'completed' }, 'Tarefa concluída')}
                disabled={update.isPending}
              >
                Marcar como concluída
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => void run({ status: 'pending' }, 'Tarefa reaberta')}
                disabled={update.isPending}
              >
                Reabrir tarefa
              </Button>
            )}

            {alvo.holidayConflict ? (
              <Button
                variant="outline"
                onClick={() =>
                  void run({ action: 'anticipate' }, 'Vencimento antecipado')
                }
                disabled={update.isPending}
              >
                Antecipar
              </Button>
            ) : null}
          </div>

          <div className="space-y-1 border-t pt-4">
            <label htmlFor="detail-due-date" className="text-sm font-medium">
              Alterar data
            </label>
            <input
              id="detail-due-date"
              type="date"
              defaultValue={isoDay}
              onChange={(event) => {
                if (event.target.value) {
                  void run({ dueDate: event.target.value }, 'Data alterada');
                }
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
