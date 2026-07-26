import type { Membership } from '@/features/auth/types/session.types';
import { MOCK_USER } from '@/services/mocks/user.mock';
import { MOCK_TENANT } from '@/services/mocks/tenant.mock';

export const MOCK_MEMBERSHIP: Membership = {
  id: 'membership_ana_acme',
  userId: MOCK_USER.id,
  tenantId: MOCK_TENANT.id,
  role: MOCK_USER.role,
  createdAt: '2026-01-15T12:00:00.000Z',
};