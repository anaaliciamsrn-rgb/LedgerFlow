'use client';

import { createContext } from 'react';
import type { Tenant } from '@/types/tenant.types';

export interface TenantContextValue {
  readonly tenant: Tenant;
  readonly tenantId: string;
}

export const TenantContext = createContext<TenantContextValue | null>(null);