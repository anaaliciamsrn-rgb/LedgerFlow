'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';
import type {
  CreateObligationInput,
  UpdateObligationInput,
} from '@/features/calendar/types/calendar.types';

/** Invalida a grade do mês e a faixa de atrasadas de uma vez. */
function useInvalidateObligations() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['calendar', 'obligations'] });
}

export function useCreateObligation() {
  const invalidate = useInvalidateObligations();
  return useMutation({
    mutationFn: (input: CreateObligationInput) => calendarService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateObligation() {
  const invalidate = useInvalidateObligations();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateObligationInput }) =>
      calendarService.update(id, input),
    onSuccess: invalidate,
  });
}
