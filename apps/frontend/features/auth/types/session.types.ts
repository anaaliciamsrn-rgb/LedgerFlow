import type { UserRole } from '@/types/session.types';

export interface Membership {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly role: UserRole;
  readonly createdAt: string;
}