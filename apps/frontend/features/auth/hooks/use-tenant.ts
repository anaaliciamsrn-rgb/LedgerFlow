'use client';

import { useContext } from 'react';
import {
  TenantContext,
  type TenantContextValue,
} from '@/contexts/tenant.context';

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (context === null) {
    throw new Error(
      'useTenant deve ser usado dentro de TenantProvider (área autenticada)',
    );
  }
  return context;
}