export type Frequency =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

const MAX_OCCURRENCES = 24;

/** Frequências que avançam em dias — aritmética direta, sem borda de mês. */
const DAY_STEP: Readonly<Partial<Record<Frequency, number>>> = {
  weekly: 7,
  biweekly: 14,
};

/** Frequências que avançam em meses — precisam da regra de fim de mês. */
const MONTH_STEP: Readonly<Partial<Record<Frequency, number>>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Materializa as ocorrências de uma tarefa recorrente (decisão B1 da spec):
 * cada ocorrência é uma linha própria no banco, para poder ser concluída
 * individualmente. Trabalha em UTC de ponta a ponta para não sofrer com fuso.
 *
 * Nas frequências que somam meses, dia 31 em mês de 30 (ou 28/29) dias vira o
 * último dia do mês — sem isso, o comportamento nativo do `Date` vazaria para o
 * mês seguinte (ex.: 31/01 + 1 mês em `Date` nativo vira 03/03, não 28/02).
 */
export function generateOccurrences(
  start: Date,
  frequency: Frequency,
  count: number,
): Date[] {
  if (frequency === 'none') {
    return [start];
  }

  const total = Math.min(MAX_OCCURRENCES, Math.max(1, count));
  const days = DAY_STEP[frequency];

  if (days !== undefined) {
    return Array.from(
      { length: total },
      (_, index) => new Date(start.getTime() + index * days * 86_400_000),
    );
  }

  const months = MONTH_STEP[frequency] ?? 1;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  return Array.from({ length: total }, (_, index) => {
    const target = month + index * months;
    // Dia 0 do mês seguinte = último dia do mês alvo.
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return new Date(
      Date.UTC(
        year,
        target,
        Math.min(day, lastDay),
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
        start.getUTCMilliseconds(),
      ),
    );
  });
}
