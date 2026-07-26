'use client';

import { useContext, useMemo, type ReactNode } from 'react';
import {
  TenantContext,
  type TenantContextValue,
} from '@/contexts/tenant.context';
import { SessionContext } from '@/contexts/session.context';
import {
  buildTenantCssVariables,
  cssVariablesToStyle,
} from '@/styles/themes';

interface TenantProviderProps {
  readonly children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps): ReactNode {
  const sessionContext = useContext(SessionContext);

  if (sessionContext === null) {
    throw new Error('TenantProvider deve estar dentro de SessionProvider');
  }

  const tenant = sessionContext.session?.tenant ?? null;

  const value = useMemo<TenantContextValue | null>(
    () =>
      tenant === null
        ? null
        : { tenant, tenantId: tenant.id },
    [tenant],
  );

  const themeStyle = useMemo(
    () =>
      tenant === null
        ? undefined
        : cssVariablesToStyle(buildTenantCssVariables(tenant)),
    [tenant],
  );

  if (value === null) {
    return <>{children}</>;
  }

  return (
    <TenantContext.Provider value={value}>
      <div style={themeStyle} className="contents">
        {children}
      </div>
    </TenantContext.Provider>
  );
}