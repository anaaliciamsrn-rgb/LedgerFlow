'use client';

import { useMemo, useState } from 'react';

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** YYYY-MM-DD em UTC — nunca sofre o deslocamento que `toISOString` teria sobre uma data local. */
function isoDayUTC(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/**
 * Mês exibido pela grade. "Agora" é congelado na primeira renderização: a
 * navegação move um offset a partir de um ponto fixo, não do relógio corrente.
 * Ano e mês são mantidos como inteiros em UTC — qualquer conversão local
 * faria a grade "vazar" um dia.
 */
export function useMonthAnchor() {
  const [now] = useState(() => new Date());
  const [offset, setOffset] = useState(0);

  return useMemo(() => {
    const totalMonths = now.getUTCFullYear() * 12 + now.getUTCMonth() + offset;
    const year = Math.floor(totalMonths / 12);
    const monthIndex = ((totalMonths % 12) + 12) % 12;
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const month = new Date(Date.UTC(year, monthIndex, 1));

    return {
      month,
      from: isoDayUTC(year, monthIndex, 1),
      to: isoDayUTC(year, monthIndex, daysInMonth),
      label: MONTH_LABEL_FORMATTER.format(month),
      isCurrentMonth: offset === 0,
      goPrevious: () => setOffset((value) => value - 1),
      goNext: () => setOffset((value) => value + 1),
      goToToday: () => setOffset(0),
    };
  }, [now, offset]);
}
