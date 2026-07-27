'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';

export function useObligations(
  from: string,
  to: string,
  collaboratorId?: string,
) {
  return useQuery({
    queryKey: ['calendar', 'obligations', from, to, collaboratorId ?? ''],
    queryFn: ({ signal }) =>
      calendarService.list({ from, to, collaboratorId }, signal),
  });
}
