'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorsService } from '@/features/calendar/services/collaborators.service';
import type {
  CreateCollaboratorInput,
  UpdateCollaboratorInput,
} from '@/features/calendar/types/calendar.types';

export const COLLABORATORS_KEY = ['calendar', 'collaborators'] as const;

export function useCollaborators() {
  return useQuery({
    queryKey: COLLABORATORS_KEY,
    queryFn: ({ signal }) => collaboratorsService.list(signal),
    // A lista muda raramente e é lida por quase todo componente da tela.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveCollaborator() {
  const queryClient = useQueryClient();

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COLLABORATORS_KEY });
    // A cor do responsável aparece dentro de cada tarefa: recolorir precisa
    // repintar o calendário também.
    await queryClient.invalidateQueries({
      queryKey: ['calendar', 'obligations'],
    });
  };

  const create = useMutation({
    mutationFn: (input: CreateCollaboratorInput) =>
      collaboratorsService.create(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCollaboratorInput }) =>
      collaboratorsService.update(id, input),
    onSuccess: invalidate,
  });

  return { create, update };
}
