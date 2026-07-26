'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronsUpDown } from 'lucide-react';
import { NAV_SECTIONS } from '@/constants/navigation';
import { useTenant } from '@/features/auth/hooks/use-tenant';
import { useSession } from '@/features/auth/hooks/use-session';
import { cn } from '@/lib/cn';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function Sidebar(): React.ReactNode {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const { session } = useSession();
  const user = session?.user ?? null;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{tenant.name}</p>
          <p className="truncate text-xs text-muted-foreground">Plano Enterprise</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0 transition-colors', active ? 'text-primary' : '')} />
                    <span className="truncate">{item.label}</span>
                    {active ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {user ? getInitials(user.name) : '—'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user?.name ?? 'Usuário'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
