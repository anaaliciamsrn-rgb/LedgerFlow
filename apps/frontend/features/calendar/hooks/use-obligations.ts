'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';

export function useObligations(from: string, to: string, assignee?: string) {
  return useQuery({
    queryKey: ['calendar', 'obligations', from, to, assignee ?? ''],
    queryFn: ({ signal }) => calendarService.list({ from, to, assignee }, signal),
  });
}
