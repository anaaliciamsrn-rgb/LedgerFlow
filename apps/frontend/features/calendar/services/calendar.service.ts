import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { buildMockObligations } from '@/services/mocks/calendar.mock';
import type { Obligation } from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

interface ListParams {
  readonly from: string;
  readonly to: string;
  readonly assignee?: string;
}

/** Compara apenas a parte de data (YYYY-MM-DD) do ISO string, em UTC. */
function isWithinRange(dueDate: string, from: string, to: string): boolean {
  const day = dueDate.slice(0, 10);
  return day >= from && day <= to;
}

export const calendarService = {
  async list(params: ListParams, signal?: AbortSignal): Promise<readonly Obligation[]> {
    // O backend ainda não expõe assignee/holidayConflict/recurrenceGroupId
    // (depende da Task 19), então o mock cobre a tela sozinho até lá.
    if (config.useMocks) {
      const obligations = buildMockObligations().filter((item) =>
        isWithinRange(item.dueDate, params.from, params.to),
      );
      return params.assignee
        ? obligations.filter((item) => item.assignee === params.assignee)
        : obligations;
    }

    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.assignee) {
      search.set('assignee', params.assignee);
    }
    const response = await httpClient.get<ApiResponse<readonly Obligation[]>>(
      `/calendar/obligations?${search.toString()}`,
      { signal },
    );
    return response.data;
  },
} as const;
