'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { holidaysService } from '@/features/calendar/services/holidays.service';

/**
 * Feriados do ano inteiro, buscados uma vez. O formulário resolve o aviso
 * localmente — sem isso seria uma requisição a cada tecla digitada na data.
 */
export function useHolidays(year: number) {
  const query = useQuery({
    queryKey: ['calendar', 'holidays', year],
    queryFn: ({ signal }) => holidaysService.listByYear(year, signal),
    // A lista de um ano não muda; o backend também cacheia.
    staleTime: Infinity,
  });

  const byDate = useMemo(
    () =>
      new Map((query.data ?? []).map((holiday) => [holiday.date, holiday.name])),
    [query.data],
  );

  const dates = useMemo(() => new Set(byDate.keys()), [byDate]);

  return { ...query, byDate, dates };
}
