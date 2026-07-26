import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SessionProvider } from '@/providers/session-provider';
import { TenantProvider } from '@/providers/tenant-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { A11yProvider } from '@/providers/a11y-provider';
import type { UserSession } from '@/types/session.types';
import type { A11yPreferences } from '@/features/settings/types/a11y.types';

interface AppProvidersProps {
  readonly session: UserSession | null;
  readonly a11yPreferences: A11yPreferences;
  readonly children: ReactNode;
}

export function AppProviders({ session, a11yPreferences, children }: AppProvidersProps): ReactNode {
  return (
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <A11yProvider initialPreferences={a11yPreferences}>
          <SessionProvider session={session}>
            <TenantProvider>
              <ToastProvider>{children}</ToastProvider>
            </TenantProvider>
          </SessionProvider>
        </A11yProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
