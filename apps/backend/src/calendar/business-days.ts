const SATURDAY = 6;
const SUNDAY = 0;

/**
 * Máximo de recuos antes de desistir. Um feriado que emende com o fim de
 * semana consome no máximo 4 dias; 10 é folga suficiente e garante que a
 * função nunca gire sem fim se a lista de feriados vier corrompida.
 */
const MAX_STEPS = 10;

/**
 * Primeiro dia útil **anterior** a `date`, pulando sábados, domingos e
 * feriados. Recua sempre ao menos um dia: é chamada apenas quando a data já
 * cai em feriado, e "antecipar" para o próprio dia não faria sentido.
 *
 * Trabalha em UTC (`getUTCDay`, `setUTCDate`) pelo mesmo motivo do resto do
 * módulo: a chave de feriado é `YYYY-MM-DD` em UTC.
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
