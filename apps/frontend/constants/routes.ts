import type { Route } from 'next';

export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  companies: {
    root: '/companies',
    detail: (companyId: string): Route => `/companies/${companyId}` as Route,
  },
  clients: '/clients',
  finance: '/finance',
  receivables: '/receivables',
  fiscal: '/fiscal',
  documents: '/documents',
  audit: '/audit',
  activity: '/activity',
  integrations: '/integrations',
  workflows: '/workflows',
  ai: '/ai',
  reports: '/reports',
  calendar: '/calendar',
  import: '/import',
  settings: '/settings',
} as const;

export const PUBLIC_ROUTES = [ROUTES.login] as const;
