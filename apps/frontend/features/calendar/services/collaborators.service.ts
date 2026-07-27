import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_COLLABORATORS } from '@/services/mocks/calendar.mock';
import type {
  Collaborator,
  CreateCollaboratorInput,
  UpdateCollaboratorInput,
} from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

export const collaboratorsService = {
  async list(signal?: AbortSignal): Promise<readonly Collaborator[]> {
    if (config.useMocks) {
      return MOCK_COLLABORATORS;
    }
    const response = await httpClient.get<ApiResponse<readonly Collaborator[]>>(
      '/calendar/collaborators',
      { signal },
    );
    return response.data;
  },

  async create(input: CreateCollaboratorInput): Promise<Collaborator> {
    const response = await httpClient.post<ApiResponse<Collaborator>>(
      '/calendar/collaborators',
      input,
    );
    return response.data;
  },

  async update(
    id: string,
    input: UpdateCollaboratorInput,
  ): Promise<Collaborator> {
    const response = await httpClient.patch<ApiResponse<Collaborator>>(
      `/calendar/collaborators/${id}`,
      input,
    );
    return response.data;
  },
} as const;
