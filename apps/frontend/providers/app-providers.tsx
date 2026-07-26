import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SessionProvider } from '@/providers/session-provider';
import { TenantProvider } from '@/providers/tenant-provider';
import { ToastProvider } from '@/providers/toast-provider';
import type { UserSession } from '@/types/session.types';

interface AppProvidersProps {
  readonly session: UserSession | null;
  readonly children: ReactNode;
}

export function AppProviders({
  session,
  children,
}: AppProvidersProps): ReactNode {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SessionProvider session={session}>
          <TenantProvider>
            <ToastProvider>{children}</ToastProvider>
          </TenantProvider>
        </SessionProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}