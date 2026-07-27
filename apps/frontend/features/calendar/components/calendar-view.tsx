'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthGrid } from '@/features/calendar/components/month-grid';
import { useObligations } from '@/features/calendar/hooks/use-obligations';

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** YYYY-MM-DD para um ano/mês/dia em UTC — nunca sofre o deslocamento de fuso que `toISOString` teria sobre uma data local. */
function isoDayUTC(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function CalendarView(): React.ReactNode {
  // "Agora" é congelado na primeira renderização: a navegação entre meses
  // deve mover o offset a partir de um ponto fixo, não do relógio corrente.
  const [now] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const [assignee, setAssignee] = useState('');

  // Ano/mês do calendário são derivados em UTC e mantidos como inteiros —
  // evita qualquer conversão local->UTC que faria a grade "vazar" um dia
  // (ver nota de fuso horário da Task 20).
  const anchor = useMemo(() => {
    const totalMonths = now.getUTCFullYear() * 12 + now.getUTCMonth() + offset;
    return {
      year: Math.floor(totalMonths / 12),
      monthIndex: ((totalMonths % 12) + 12) % 12,
    };
  }, [now, offset]);

  const month = useMemo(() => new Date(Date.UTC(anchor.year, anchor.monthIndex, 1)), [anchor]);
  const daysInMonth = new Date(Date.UTC(anchor.year, anchor.monthIndex + 1, 0)).getUTCDate();

  const from = isoDayUTC(anchor.year, anchor.monthIndex, 1);
  const to = isoDayUTC(anchor.year, anchor.monthIndex, daysInMonth);

  const { data, isLoading, isError } = useObligations(from, to, assignee || undefined);

  // As opções do filtro vêm de uma consulta SEM filtro de responsável. Se
  // viessem de `data`, ao escolher alguém a lista encolheria para essa única
  // pessoa e o usuário ficaria preso — só trocaria voltando a "Todos".
  // O React Query desduplica e cacheia, então não custa requisição por render.
  const { data: unfiltered } = useObligations(from, to, undefined);

  const responsaveis = useMemo(
    () => [...new Set((unfiltered ?? []).map((item) => item.assignee))].filter(Boolean).sort(),
    [unfiltered],
  );

  const atrasadas = (data ?? []).filter((item) => item.overdue).length;
  const emFeriado = (data ?? []).filter((item) => item.holidayConflict !== null).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário contábil" description="Tarefas recorrentes, prazos e feriados." />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setOffset((value) => value - 1)}>
            Anterior
          </Button>
          <span className="min-w-40 text-center text-sm font-medium capitalize">
            {MONTH_LABEL_FORMATTER.format(month)}
          </span>
          <Button variant="outline" onClick={() => setOffset((value) => value + 1)}>
            Próximo
          </Button>
        </div>

        <select
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          aria-label="Filtrar por responsável"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {atrasadas > 0 ? <Badge variant="destructive">{atrasadas} em atraso</Badge> : null}
        {emFeriado > 0 ? <Badge variant="warning">{emFeriado} em feriado nacional</Badge> : null}
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
          description="Ajuste o filtro de responsável ou navegue para outro mês."
        />
      ) : (
        <Card className="overflow-x-auto p-3">
          <div className="min-w-[560px]">
            <MonthGrid month={month} obligations={data} />
          </div>
        </Card>
      )}
    </div>
  );
}
