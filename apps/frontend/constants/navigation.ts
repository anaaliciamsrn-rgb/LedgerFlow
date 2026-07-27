import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  Landmark,
  FileText,
  ShieldCheck,
  Activity,
  Plug,
  Workflow,
  Sparkles,
  BarChart3,
  CalendarDays,
  Upload,
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
    title: 'Em breve',
    items: [
      { label: 'Clientes', href: ROUTES.clients, icon: Users },
      { label: 'Financeiro', href: ROUTES.finance, icon: Wallet },
      { label: 'Recebimentos', href: ROUTES.receivables, icon: BarChart3 },
      { label: 'Fiscal', href: ROUTES.fiscal, icon: Landmark },
      { label: 'Documentos', href: ROUTES.documents, icon: FileText },
      { label: 'Atividades', href: ROUTES.activity, icon: Activity },
      { label: 'Importação', href: ROUTES.import, icon: Upload },
      { label: 'Integrações', href: ROUTES.integrations, icon: Plug },
      { label: 'Fluxos n8n', href: ROUTES.workflows, icon: Workflow },
      { label: 'IA', href: ROUTES.ai, icon: Sparkles },
      { label: 'Relatórios', href: ROUTES.reports, icon: BarChart3 },
      { label: 'Configurações', href: ROUTES.settings, icon: Settings },
    ],
  },
];
