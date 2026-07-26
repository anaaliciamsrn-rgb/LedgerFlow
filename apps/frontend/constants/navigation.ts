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
    title: 'Geral',
    items: [
      { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'Empresas', href: ROUTES.companies.root, icon: Building2 },
      { label: 'Clientes', href: ROUTES.clients, icon: Users },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Financeiro', href: ROUTES.finance, icon: Wallet },
      { label: 'Recebimentos', href: ROUTES.receivables, icon: BarChart3 },
      { label: 'Fiscal', href: ROUTES.fiscal, icon: Landmark },
    ],
  },
  {
    title: 'Operações',
    items: [
      { label: 'Documentos', href: ROUTES.documents, icon: FileText },
      { label: 'Auditoria', href: ROUTES.audit, icon: ShieldCheck },
      { label: 'Atividades', href: ROUTES.activity, icon: Activity },
      { label: 'Calendário', href: ROUTES.calendar, icon: CalendarDays },
      { label: 'Importação', href: ROUTES.import, icon: Upload },
    ],
  },
  {
    title: 'Automação',
    items: [
      { label: 'Integrações', href: ROUTES.integrations, icon: Plug },
      { label: 'Fluxos n8n', href: ROUTES.workflows, icon: Workflow },
      { label: 'IA', href: ROUTES.ai, icon: Sparkles },
    ],
  },
  {
    title: 'Análise',
    items: [
      { label: 'Relatórios', href: ROUTES.reports, icon: BarChart3 },
      { label: 'Configurações', href: ROUTES.settings, icon: Settings },
    ],
  },
];
