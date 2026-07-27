const SATURDAY = 6;
const SUNDAY = 0;
const MAX_STEPS = 10;

/**
 * Cópia de `apps/backend/src/calendar/business-days.ts`. O cálculo roda dos
 * dois lados: aqui para o preview do formulário, lá para a ação `anticipate`.
 * São doze linhas — compartilhar exigiria um pacote comum que este monorepo
 * não tem. Os dois lados têm o mesmo teste, com os mesmos casos.
 */
export function previousBusinessDay(
  date: Date,
  holidays: ReadonlySet<string>,
): Date {
  const result = new Date(date.getTime());

  for (let step = 0; step < MAX_STEPS; step += 1) {
    result.setUTCDate(result.getUTCDate() - 1);
    const weekday = result.getUTCDay();
    const isWeekend = weekday === SATURDAY || weekday === SUNDAY;
    if (!isWeekend && !holidays.has(result.toISOString().slice(0, 10))) {
      return result;
    }
  }

  return result;
}
