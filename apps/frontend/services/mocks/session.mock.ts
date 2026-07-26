import type { UserSession } from '@/types/session.types';
import { MOCK_USER } from '@/services/mocks/user.mock';
import { MOCK_TENANT } from '@/services/mocks/tenant.mock';

function expiresInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const MOCK_SESSION: UserSession = {
  user: MOCK_USER,
  tenant: MOCK_TENANT,
  expiresAt: expiresInDays(7),
};