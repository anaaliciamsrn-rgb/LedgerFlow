export type Frequency = 'none' | 'monthly';

const MAX_OCCURRENCES = 24;

/**
 * Materializa as ocorrências de uma tarefa recorrente (decisão B1 da spec):
 * cada ocorrência é uma linha própria no banco, para poder ser concluída
 * individualmente. Trabalha em UTC de ponta a ponta para não sofrer com fuso.
 *
 * Dia 31 em mês de 30 (ou 28/29) dias vira o último dia do mês — sem isso,
 * o comportamento nativo do `Date` vazaria para o mês seguinte
 * (ex.: 31/01 + 1 mês em `Date` nativo vira 03/03, não 28/02).
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
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  return Array.from({ length: total }, (_, index) => {
    // Dia 0 do mês seguinte = último dia do mês alvo.
    const lastDay = new Date(Date.UTC(year, month + index + 1, 0)).getUTCDate();
    return new Date(
      Date.UTC(
        year,
        month + index,
        Math.min(day, lastDay),
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
        start.getUTCMilliseconds(),
      ),
    );
  });
}
