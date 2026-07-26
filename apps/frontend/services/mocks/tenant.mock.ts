import type { Tenant } from '@/types/tenant.types';

export const MOCK_TENANT: Tenant = {
  id: 'tenant_acme',
  name: 'Contabilidade Acme',
  slug: 'acme',
  logoUrl: null,
  theme: {
    primaryColor: '221 83% 53%',
    accentColor: '214 100% 97%',
  },
};
