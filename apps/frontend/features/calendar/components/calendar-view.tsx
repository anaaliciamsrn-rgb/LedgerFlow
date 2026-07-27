'use client';

import { useState } from 'react';
import { CalendarDays, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthGrid } from '@/features/calendar/components/month-grid';
import { OverdueBanner } from '@/features/calendar/components/overdue-banner';
import { CollaboratorLegend } from '@/features/calendar/components/collaborator-legend';
import { CollaboratorManager } from '@/features/calendar/components/collaborator-manager';
import { ObligationForm } from '@/features/calendar/components/obligation-form';
import { ObligationDetail } from '@/features/calendar/components/obligation-detail';
import { AssigneeTaskList } from '@/features/calendar/components/assignee-task-list';
import { useMonthAnchor } from '@/features/calendar/hooks/use-month-anchor';
import { useObligations } from '@/features/calendar/hooks/use-obligations';
import { useCollaborators } from '@/features/calendar/hooks/use-collaborators';
import type { Obligation } from '@/features/calendar/types/calendar.types';

export function CalendarView(): React.ReactNode {
  const anchor = useMonthAnchor();
  const [collaboratorId, setCollaboratorId] = useState('');
  const [isFormOpen, setFormOpen] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);
  const [selected, setSelected] = useState<Obligation | null>(null);

  const { data: collaborators } = useCollaborators();
  const { data, isLoading, isError } = useObligations(
    anchor.from,
    anchor.to,
    collaboratorId || undefined,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário contábil"
        description="Tarefas recorrentes do escritório, prazos e feriados."
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden />
          Nova tarefa
        </Button>
        <Button variant="outline" onClick={() => setManagerOpen(true)}>
          <Users className="mr-2 size-4" aria-hidden />
          Responsáveis
        </Button>
      </div>

      <OverdueBanner onSelect={setSelected} />

      <CollaboratorLegend
        collaborators={collaborators ?? []}
        selectedId={collaboratorId}
        onSelect={setCollaboratorId}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={anchor.goPrevious}>
          Anterior
        </Button>
        <span className="min-w-40 text-center text-sm font-medium capitalize">
          {anchor.label}
        </span>
        <Button variant="outline" onClick={anchor.goNext}>
          Próximo
        </Button>
        {!anchor.isCurrentMonth ? (
          <Button variant="outline" onClick={anchor.goToToday}>
            Hoje
          </Button>
        ) : null}
      </div>

      {isError ? (
        <EmptyState
          icon={CalendarDays}
          title="Erro ao carregar o calendário"
          description="Tente novamente em instantes."
        />
      ) : isLoading || !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma tarefa neste mês"
          description='Clique em "Nova tarefa" para cadastrar uma rotina do escritório.'
        />
      ) : (
        <>
          <Card className="overflow-x-auto p-3">
            <div className="min-w-[560px]">
              <MonthGrid
                month={anchor.month}
                obligations={data}
                onSelect={setSelected}
              />
            </div>
          </Card>

          <AssigneeTaskList obligations={data} onSelect={setSelected} />
        </>
      )}

      <ObligationForm open={isFormOpen} onOpenChange={setFormOpen} />
      <CollaboratorManager open={isManagerOpen} onOpenChange={setManagerOpen} />
      <ObligationDetail obligation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
