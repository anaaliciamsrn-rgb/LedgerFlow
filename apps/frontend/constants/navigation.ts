import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  CalendarDays,
  Upload,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Route } from 'next';
import { ROUTES } from '@/constants/routes';

export interface NavItem {
  readonly label: string;
  readonly href: Route;
  readonly icon: LucideIcon;
}

export interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Carteira',
    items: [
      { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'Empresas', href: ROUTES.companies.root, icon: Building2 },
      { label: 'Auditoria', href: ROUTES.audit, icon: ShieldCheck },
      { label: 'Calendário', href: ROUTES.calendar, icon: CalendarDays },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
      { label: 'Importação', href: ROUTES.import, icon: Upload },
      { label: 'Assistente IA', href: ROUTES.ai, icon: Sparkles },
      { label: 'Configurações', href: ROUTES.settings, icon: Settings },
    ],
  },
];
