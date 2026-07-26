import type { Tenant } from '@/types/tenant.types';

export const MOCK_TENANT: Tenant = {
  id: 'tenant_acme',
  name: 'Contabilidade Acme',
  slug: 'acme',
  logoUrl: null,
  theme: {
    primaryColor: '243 75% 59%',
    accentColor: '160 84% 39%',
  },
};