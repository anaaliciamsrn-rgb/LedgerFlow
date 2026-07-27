import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { buildMockObligations } from '@/services/mocks/calendar.mock';
import type {
  CreateObligationInput,
  Obligation,
  UpdateObligationInput,
} from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

interface ListParams {
  readonly from: string;
  readonly to: string;
  readonly collaboratorId?: string;
}

/** Compara apenas a parte de data (YYYY-MM-DD) do ISO string, em UTC. */
function isWithinRange(dueDate: string, from: string, to: string): boolean {
  const day = dueDate.slice(0, 10);
  return day >= from && day <= to;
}

export const calendarService = {
  async list(
    params: ListParams,
    signal?: AbortSignal,
  ): Promise<readonly Obligation[]> {
    if (config.useMocks) {
      const obligations = buildMockObligations().filter((item) =>
        isWithinRange(item.dueDate, params.from, params.to),
      );
      return params.collaboratorId
        ? obligations.filter(
            (item) => item.collaborator.id === params.collaboratorId,
          )
        : obligations;
    }

    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.collaboratorId) {
      search.set('collaboratorId', params.collaboratorId);
    }
    const response = await httpClient.get<ApiResponse<readonly Obligation[]>>(
      `/calendar/obligations?${search.toString()}`,
      { signal },
    );
    return response.data;
  },

  /** Pendentes vencidas de qualquer mês — alimenta a faixa fixa do topo. */
  async listOverdue(signal?: AbortSignal): Promise<readonly Obligation[]> {
    if (config.useMocks) {
      return buildMockObligations().filter((item) => item.overdue);
    }
    const response = await httpClient.get<ApiResponse<readonly Obligation[]>>(
      '/calendar/obligations?overdueOnly=true',
      { signal },
    );
    return response.data;
  },

  async create(input: CreateObligationInput): Promise<readonly Obligation[]> {
    const response = await httpClient.post<ApiResponse<readonly Obligation[]>>(
      '/calendar/obligations',
      input,
    );
    return response.data;
  },

  async update(
    id: string,
    input: UpdateObligationInput,
  ): Promise<Obligation> {
    const response = await httpClient.patch<ApiResponse<Obligation>>(
      `/calendar/obligations/${id}`,
      input,
    );
    return response.data;
  },
} as const;
