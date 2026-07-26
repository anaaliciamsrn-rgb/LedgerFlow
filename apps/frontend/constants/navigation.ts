import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  CalendarDays,
  Upload,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { config } from '@/services/config';

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly enabled: boolean;
}

export const NAVIGATION: readonly NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    label: 'Empresas',
    href: ROUTES.companies.root,
    icon: Building2,
    enabled: true,
  },
  {
    label: 'Auditoria',
    href: ROUTES.audit,
    icon: ShieldCheck,
    enabled: config.features.auditModule,
  },
  {
    label: 'Calendário',
    href: ROUTES.calendar,
    icon: CalendarDays,
    enabled: config.features.calendarModule,
  },
  {
    label: 'Importação',
    href: ROUTES.import,
    icon: Upload,
    enabled: config.features.bulkImport,
  },
  {
    label: 'Atividades',
    href: ROUTES.activity,
    icon: Activity,
    enabled: config.features.activityFeed,
  },
].filter((item) => item.enabled);