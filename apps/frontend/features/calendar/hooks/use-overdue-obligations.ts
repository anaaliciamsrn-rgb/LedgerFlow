'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';

/** Atrasadas de qualquer mês — independe do mês exibido na grade. */
export function useOverdueObligations() {
  return useQuery({
    queryKey: ['calendar', 'obligations', 'overdue'],
    queryFn: ({ signal }) => calendarService.listOverdue(signal),
  });
}
