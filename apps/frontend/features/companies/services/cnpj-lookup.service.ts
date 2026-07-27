import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { getCnpjLookupMock } from '@/services/mocks/cnpj-lookup.mock';
import { cnpjLookupSchema, type CnpjLookupResult } from '@/features/companies/schemas/cnpj-lookup.schema';
import type { ApiResponse } from '@/types/api.types';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export const cnpjLookupService = {
  async lookup(cnpj: string, signal?: AbortSignal): Promise<CnpjLookupResult> {
    const digits = onlyDigits(cnpj);

    if (config.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return getCnpjLookupMock(digits);
    }

    const response = await httpClient.get<ApiResponse<CnpjLookupResult>>(
      `/cnpj/${digits}`,
      { signal },
    );
    return cnpjLookupSchema.parse(response.data);
  },
} as const;
