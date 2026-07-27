import type { Recurrence } from '@/features/calendar/types/calendar.types';

const MAX_OCCURRENCES = 24;
const DAY_STEP: Readonly<Partial<Record<Recurrence, number>>> = {
  weekly: 7,
  biweekly: 14,
};
const MONTH_STEP: Readonly<Partial<Record<Recurrence, number>>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Datas que o cadastro vai gerar, em `YYYY-MM-DD`. Mesma regra do backend
 * (`src/calendar/recurrence.ts`), inclusive o ajuste de fim de mês — o preview
 * mentiria se divergisse do que é gravado.
 */
export function previewOccurrences(
  startISODay: string,
  recurrence: Recurrence,
  occurrences: number,
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISODay)) {
    return [];
  }

  if (recurrence === 'none') {
    return [startISODay];
  }

  // A regex acima já garantiu o formato; `Number` aqui nunca produz NaN.
  const year = Number(startISODay.slice(0, 4));
  const month = Number(startISODay.slice(5, 7));
  const day = Number(startISODay.slice(8, 10));

  const total = Math.min(MAX_OCCURRENCES, Math.max(1, occurrences));
  const days = DAY_STEP[recurrence];
  const start = Date.UTC(year, month - 1, day);

  if (days !== undefined) {
    return Array.from({ length: total }, (_, index) =>
      new Date(start + index * days * 86_400_000).toISOString().slice(0, 10),
    );
  }

  const months = MONTH_STEP[recurrence] ?? 1;
  return Array.from({ length: total }, (_, index) => {
    const target = month - 1 + index * months;
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, target, Math.min(day, lastDay)))
      .toISOString()
      .slice(0, 10);
  });
}
