import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_SESSION } from '@/services/mocks/session.mock';
import type { UserSession } from '@/types/session.types';
import type { ApiResponse } from '@/types/api.types';

export const authService = {
  async getSession(signal?: AbortSignal): Promise<UserSession | null> {
    if (config.useMocks) {
      return MOCK_SESSION;
    }
    try {
      const response = await httpClient.get<ApiResponse<UserSession>>(
        '/auth/session',
        { signal },
      );
      return response.data;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    if (config.useMocks) {
      return;
    }
    await httpClient.post<void>('/auth/logout');
  },
} as const;