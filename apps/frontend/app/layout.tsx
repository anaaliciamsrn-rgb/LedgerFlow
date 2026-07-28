import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import { authService } from '@/features/auth/services/auth.service';
import { buildTenantCssVariables, cssVariablesToStyle } from '@/styles/themes';
import { A11Y_COOKIE_NAME } from '@/features/settings/types/a11y.types';
import { parseA11yCookie, a11yClassNames } from '@/features/settings/lib/a11y-cookie';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Plataforma Contábil',
  description:
    'Plataforma de gestão contábil multi-tenant para escritórios de contabilidade',
};

export default async function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactNode> {
  const session = await authService.getSession();

  const cookieStore = await cookies();
  const a11yPreferences = parseA11yCookie(cookieStore.get(A11Y_COOKIE_NAME)?.value);
  const a11yClasses = a11yClassNames(a11yPreferences);

  const themeStyle = session
    ? cssVariablesToStyle(buildTenantCssVariables(session.tenant))
    : undefined;

  return (
    <html lang="pt-BR" className={`${inter.variable} ${a11yClasses}`} suppressHydrationWarning>
      <body style={themeStyle} className="min-h-screen bg-background font-sans antialiased">
        <AppProviders session={session} a11yPreferences={a11yPreferences}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
