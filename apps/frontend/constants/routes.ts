export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  companies: {
    root: '/companies',
    detail: (companyId: string) => `/companies/${companyId}`,
  },
  audit: '/audit',
  calendar: '/calendar',
  import: '/import',
  activity: '/activity',
} as const;

export const PUBLIC_ROUTES = [ROUTES.login] as const;