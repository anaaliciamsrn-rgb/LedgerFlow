import type { Obligation, ObligationStatus } from '@/features/calendar/types/calendar.types';

/**
 * O backend ainda não expõe `assignee` / `holidayConflict` / `recurrenceGroupId`
 * (Task 19 do plano de entrega), por isso o mock cobre a tela sozinho.
 *
 * Datas são geradas **relativas ao mês corrente** (nunca fixas), para que o
 * calendário nunca abra vazio, não importa em que dia a demo acontecer.
 * Todas as datas usam `Date.UTC` com horário fixo ao meio-dia — o mesmo
 * regime que `MonthGrid` usa para ler o dia (`getUTCDate`), então o
 * agendamento nunca "escorrega" um dia por causa do fuso horário do
 * navegador.
 */

const HOUR_UTC = 12;

/** Feriados nacionais de data fixa (suficiente para a demonstração). */
const NATIONAL_HOLIDAYS: ReadonlyArray<{ readonly month: number; readonly day: number; readonly name: string }> = [
  { month: 1, day: 1, name: 'Confraternização Universal' },
  { month: 4, day: 21, name: 'Tiradentes' },
  { month: 5, day: 1, name: 'Dia do Trabalho' },
  { month: 9, day: 7, name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2, name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  { month: 11, day: 20, name: 'Consciência Negra' },
  { month: 12, day: 25, name: 'Natal' },
];

/**
 * Soma `monthOffset` meses a `reference` e devolve a data em `day` (meio-dia
 * UTC), ajustando para o último dia do mês quando ele não existir — mesma
 * regra usada pelo gerador de ocorrências do backend.
 */
function addMonthsClampDay(reference: Date, monthOffset: number, day: number): Date {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() + monthOffset;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), HOUR_UTC, 0, 0));
}

/** Devolve o feriado nacional do mês corrente ou, na ausência de um, um dia fixo do mês para manter a demonstração visível. */
function holidayForMonth(monthNumber1Indexed: number): { readonly day: number; readonly name: string } {
  const exact = NATIONAL_HOLIDAYS.find((holiday) => holiday.month === monthNumber1Indexed);
  if (exact) {
    return { day: exact.day, name: exact.name };
  }
  const fallback = NATIONAL_HOLIDAYS[monthNumber1Indexed % NATIONAL_HOLIDAYS.length]!;
  return { day: 15, name: fallback.name };
}

function overdueOf(dueDate: Date, status: ObligationStatus, reference: Date): boolean {
  return status === 'pending' && dueDate.getTime() < reference.getTime();
}

interface Draft {
  readonly id: string;
  readonly companyId: string | null;
  readonly title: string;
  readonly type: string;
  readonly dueDate: Date;
  readonly status: ObligationStatus;
  readonly assignee: string;
  readonly recurrenceGroupId: string | null;
  readonly holidayConflict: string | null;
}

export function buildMockObligations(reference: Date = new Date()): readonly Obligation[] {
  const currentMonth1Indexed = reference.getUTCMonth() + 1;
  const holiday = holidayForMonth(currentMonth1Indexed);

  const recurrenceGroupId = 'rec_folha_ana';
  const overdueDueDate = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() - 5, HOUR_UTC, 0, 0),
  );

  const drafts: readonly Draft[] = [
    // Série recorrente mensal: mesmo recurrenceGroupId em 3 meses (anterior,
    // atual e próximo) — a ocorrência passada já está concluída, provando
    // que cada linha se conclui de forma independente.
    {
      id: 'obl_folha_prev',
      companyId: 'cmp_001',
      title: 'Fechamento da folha',
      type: 'FOLHA',
      dueDate: addMonthsClampDay(reference, -1, 5),
      status: 'completed',
      assignee: 'Ana Souza',
      recurrenceGroupId,
      holidayConflict: null,
    },
    {
      id: 'obl_folha_curr',
      companyId: 'cmp_001',
      title: 'Fechamento da folha',
      type: 'FOLHA',
      dueDate: addMonthsClampDay(reference, 0, 5),
      status: 'pending',
      assignee: 'Ana Souza',
      recurrenceGroupId,
      holidayConflict: null,
    },
    {
      id: 'obl_folha_next',
      companyId: 'cmp_001',
      title: 'Fechamento da folha',
      type: 'FOLHA',
      dueDate: addMonthsClampDay(reference, 1, 5),
      status: 'pending',
      assignee: 'Ana Souza',
      recurrenceGroupId,
      holidayConflict: null,
    },

    // Tarefa vencida — sinaliza atraso.
    {
      id: 'obl_conferencia_atrasada',
      companyId: 'cmp_002',
      title: 'Conferência mensal — Comércio Silva ME',
      type: 'CONFERENCIA',
      dueDate: overdueDueDate,
      status: 'pending',
      assignee: 'Bruno Lima',
      recurrenceGroupId: null,
      holidayConflict: null,
    },

    // Vencimento que coincide com feriado nacional.
    {
      id: 'obl_guias_feriado',
      companyId: 'cmp_003',
      title: 'Envio de guias (DAS)',
      type: 'DAS',
      dueDate: addMonthsClampDay(reference, 0, holiday.day),
      status: 'pending',
      assignee: 'Carla Menezes',
      recurrenceGroupId: null,
      holidayConflict: holiday.name,
    },

    // Tarefas adicionais para dar volume real ao calendário e reforçar os
    // três responsáveis distintos.
    {
      id: 'obl_conferencia_norte',
      companyId: 'cmp_005',
      title: 'Conferência mensal — Distribuidora Norte SA',
      type: 'CONFERENCIA',
      dueDate: addMonthsClampDay(reference, 0, 12),
      status: 'completed',
      assignee: 'Ana Souza',
      recurrenceGroupId: null,
      holidayConflict: null,
    },
    {
      id: 'obl_documentos_verde',
      companyId: 'cmp_003',
      title: 'Envio de documentos — Indústria Verde SA',
      type: 'DOCUMENTOS',
      dueDate: addMonthsClampDay(reference, 0, 22),
      status: 'pending',
      assignee: 'Bruno Lima',
      recurrenceGroupId: null,
      holidayConflict: null,
    },
    {
      id: 'obl_guias_proximo_mes',
      companyId: 'cmp_004',
      title: 'Emissão de guias',
      type: 'DAS',
      dueDate: addMonthsClampDay(reference, 1, 10),
      status: 'pending',
      assignee: 'Carla Menezes',
      recurrenceGroupId: null,
      holidayConflict: null,
    },
  ];

  return drafts.map((draft) => ({
    id: draft.id,
    companyId: draft.companyId,
    title: draft.title,
    type: draft.type,
    dueDate: draft.dueDate.toISOString(),
    status: draft.status,
    assignee: draft.assignee,
    recurrenceGroupId: draft.recurrenceGroupId,
    overdue: overdueOf(draft.dueDate, draft.status, reference),
    holidayConflict: draft.holidayConflict,
    createdAt: addMonthsClampDay(reference, -2, 1).toISOString(),
  }));
}
