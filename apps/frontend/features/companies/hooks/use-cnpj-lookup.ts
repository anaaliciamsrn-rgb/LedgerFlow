'use client';

import { useMutation } from '@tanstack/react-query';
import { cnpjLookupService } from '@/features/companies/services/cnpj-lookup.service';
import type { CnpjLookupResult } from '@/features/companies/schemas/cnpj-lookup.schema';

export function useCnpjLookup() {
  return useMutation<CnpjLookupResult, Error, string>({
    mutationFn: (cnpj: string) => cnpjLookupService.lookup(cnpj),
  });
}
