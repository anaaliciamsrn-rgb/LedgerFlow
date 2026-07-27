import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { buildMockHolidays } from '@/services/mocks/calendar.mock';
import type { Holiday } from '@/features/calendar/types/calendar.types';
import type { ApiResponse } from '@/types/api.types';

export const holidaysService = {
  async listByYear(
    year: number,
    signal?: AbortSignal,
  ): Promise<readonly Holiday[]> {
    if (config.useMocks) {
      return buildMockHolidays(year);
    }
    const response = await httpClient.get<ApiResponse<readonly Holiday[]>>(
      `/calendar/holidays?year=${year}`,
      { signal },
    );
    return response.data;
  },
} as const;
