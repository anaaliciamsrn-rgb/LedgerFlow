import type {
  Collaborator,
  Holiday,
  Obligation,
  ObligationStatus,
  ObligationType,
  Recurrence,
} from '@/features/calendar/types/calendar.types';

/**
 * Dados de demonstração para rodar a tela sem backend
 * (`NEXT_PUBLIC_USE_MOCKS=true`).
 *
 * Datas são geradas **relativas ao mês corrente** (nunca fixas), para que o
 * calendário nunca abra vazio, não importa em que dia a demo acontecer.
 * Todas as datas usam `Date.UTC` com horário fixo ao meio-dia — o mesmo
 * regime que `MonthGrid` usa para ler o dia (`getUTCDate`), então o
 * agendamento nunca "escorrega" um dia por causa do fuso horário do
 * navegador.
 */

const HOUR_UTC = 12;

export const MOCK_COLLABORATORS: readonly Collaborator[] = [
  {
    id: 'clb_ana',
    name: 'Ana Souza',
    color: 'blue',
    active: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'clb_bruno',
    name: 'Bruno Lima',
    color: 'violet',
    active: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'clb_carla',
    name: 'Carla Menezes',
    color: 'emerald',
    active: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

/** Feriados nacionais de data fixa (suficiente para a demonstração). */
const NATIONAL_HOLIDAYS: ReadonlyArray<{
  readonly month: number;
  readonly day: number;
  readonly name: string;
}> = [
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

export function buildMockHolidays(year: number): readonly Holiday[] {
  return NATIONAL_HOLIDAYS.map((holiday) => ({
    date: new Date(Date.UTC(year, holiday.month - 1, holiday.day))
      .toISOString()
      .slice(0, 10),
    name: holiday.name,
  }));
}

/**
 * Soma `monthOffset` meses a `reference` e devolve a data em `day` (meio-dia
 * UTC), ajustando para o último dia do mês quando ele não existir — mesma
 * regra usada pelo gerador de ocorrências do backend.
 */
function addMonthsClampDay(
  reference: Date,
  monthOffset: number,
  day: number,
): Date {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() + monthOffset;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), HOUR_UTC, 0, 0));
}

/** Devolve o feriado nacional do mês corrente ou, na ausência de um, um dia fixo do mês para manter a demonstração visível. */
function holidayForMonth(monthNumber1Indexed: number): {
  readonly day: number;
  readonly name: string;
} {
  const exact = NATIONAL_HOLIDAYS.find(
    (holiday) => holiday.month === monthNumber1Indexed,
  );
  if (exact) {
    return { day: exact.day, name: exact.name };
  }
  const fallback =
    NATIONAL_HOLIDAYS[monthNumber1Indexed % NATIONAL_HOLIDAYS.length]!;
  return { day: 15, name: fallback.name };
}

function overdueOf(
  dueDate: Date,
  status: ObligationStatus,
  reference: Date,
): boolean {
  return status === 'pending' && dueDate.getTime() < reference.getTime();
}

interface Draft {
  readonly id: string;
  readonly company: { readonly id: string; readonly name: string } | null;
  readonly title: string;
  readonly type: ObligationType;
  readonly customType?: string;
  readonly dueDate: Date;
  readonly status: ObligationStatus;
  readonly collaborator: Collaborator;
  readonly recurrence?: Recurrence;
  readonly recurrenceGroupId: string | null;
  readonly holidayConflict: string | null;
}

const ANA = MOCK_COLLABORATORS[0]!;
const BRUNO = MOCK_COLLABORATORS[1]!;
const CARLA = MOCK_COLLABORATORS[2]!;

export function buildMockObligations(
  reference: Date = new Date(),
): readonly Obligation[] {
  const currentMonth1Indexed = reference.getUTCMonth() + 1;
  const holiday = holidayForMonth(currentMonth1Indexed);

  const recurrenceGroupId = 'rec_folha_ana';
  const overdueDueDate = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate() - 5,
      HOUR_UTC,
      0,
      0,
    ),
  );

  const drafts: readonly Draft[] = [
    // Série recorrente mensal: mesmo recurrenceGroupId em 3 meses (anterior,
    // atual e próximo) — a ocorrência passada já está concluída, provando
    // que cada linha se conclui de forma independente.
    {
      id: 'obl_folha_prev',
      company: { id: 'cmp_001', name: 'Padaria do João LTDA' },
      title: 'Fechamento da folha',
      type: 'FOLHA',
      dueDate: addMonthsClampDay(reference, -1, 5),
      status: 'completed',
      collaborator: ANA,
      recurrence: 'monthly',
      recurrenceGroupId,
      holidayConflict: null,
    },
    {
      id: 'obl_folha_curr',
      company: { id: 'cmp_001', name: 'Padaria do João LTDA' },
      title: 'Fechamento da folha',
      type: 'FOLHA',
      dueDate: addMonthsClampDay(reference, 0, 5),
      status: 'pending',
      collaborator: ANA,
      recurrence: 'monthly',
      recurrenceGroupId,
      holidayConflict: null,
    },
    {
      id: 'obl_folha_next',
      company: { id: 'cmp_001', name: 'Padaria do João LTDA' },
      title: 'Fechamento da folha',
      type: 'FOLHA',
      dueDate: addMonthsClampDay(reference, 1, 5),
      status: 'pending',
      collaborator: ANA,
      recurrence: 'monthly',
      recurrenceGroupId,
      holidayConflict: null,
    },

    // Tarefa vencida — alimenta a faixa de atrasadas do topo.
    {
      id: 'obl_conferencia_atrasada',
      company: { id: 'cmp_002', name: 'Comércio Silva ME' },
      title: 'Conferência mensal',
      type: 'CONFERENCIA',
      dueDate: overdueDueDate,
      status: 'pending',
      collaborator: BRUNO,
      recurrenceGroupId: null,
      holidayConflict: null,
    },

    // Vencimento que coincide com feriado nacional.
    {
      id: 'obl_guias_feriado',
      company: { id: 'cmp_003', name: 'Indústria Verde SA' },
      title: 'Envio de guias (DAS)',
      type: 'GUIAS',
      dueDate: addMonthsClampDay(reference, 0, holiday.day),
      status: 'pending',
      collaborator: CARLA,
      recurrenceGroupId: null,
      holidayConflict: holiday.name,
    },

    // Tarefas adicionais para dar volume real ao calendário e reforçar os
    // três responsáveis distintos.
    {
      id: 'obl_conferencia_norte',
      company: { id: 'cmp_005', name: 'Distribuidora Norte SA' },
      title: 'Conferência mensal',
      type: 'CONFERENCIA',
      dueDate: addMonthsClampDay(reference, 0, 12),
      status: 'completed',
      collaborator: ANA,
      recurrenceGroupId: null,
      holidayConflict: null,
    },
    {
      id: 'obl_documentos_verde',
      company: { id: 'cmp_003', name: 'Indústria Verde SA' },
      title: 'Envio de documentos',
      type: 'DOCUMENTOS',
      dueDate: addMonthsClampDay(reference, 0, 22),
      status: 'pending',
      collaborator: BRUNO,
      recurrenceGroupId: null,
      holidayConflict: null,
    },
    {
      id: 'obl_baixa_protocolo',
      company: null,
      title: 'Baixa de protocolo',
      type: 'OUTRO',
      customType: 'Baixa de protocolo na junta comercial',
      dueDate: addMonthsClampDay(reference, 0, 18),
      status: 'pending',
      collaborator: CARLA,
      recurrenceGroupId: null,
      holidayConflict: null,
    },
    {
      id: 'obl_guias_proximo_mes',
      company: { id: 'cmp_004', name: 'Transportes Litoral LTDA' },
      title: 'Emissão de guias',
      type: 'GUIAS',
      dueDate: addMonthsClampDay(reference, 1, 10),
      status: 'pending',
      collaborator: CARLA,
      recurrenceGroupId: null,
      holidayConflict: null,
    },
  ];

  return drafts.map((draft) => ({
    id: draft.id,
    title: draft.title,
    type: draft.type,
    customType: draft.customType ?? null,
    dueDate: draft.dueDate.toISOString(),
    status: draft.status,
    recurrence: draft.recurrence ?? 'none',
    recurrenceGroupId: draft.recurrenceGroupId,
    collaborator: {
      id: draft.collaborator.id,
      name: draft.collaborator.name,
      color: draft.collaborator.color,
    },
    company: draft.company,
    overdue: overdueOf(draft.dueDate, draft.status, reference),
    holidayConflict: draft.holidayConflict,
    createdAt: addMonthsClampDay(reference, -2, 1).toISOString(),
  }));
}
