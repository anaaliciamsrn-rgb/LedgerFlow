import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import { authService } from '@/features/auth/services/auth.service';
import { buildTenantCssVariables, cssVariablesToStyle } from '@/styles/themes';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LedgerFlow',
  description:
    'Plataforma de gestão contábil multi-tenant para escritórios de contabilidade',
};

export default async function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactNode> {
  const session = await authService.getSession();

  const themeStyle = session
    ? cssVariablesToStyle(buildTenantCssVariables(session.tenant))
    : undefined;

  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body style={themeStyle} className="min-h-screen bg-background font-sans antialiased">
        <AppProviders session={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
