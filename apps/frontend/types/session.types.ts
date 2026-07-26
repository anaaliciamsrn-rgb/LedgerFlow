import type { Tenant } from '@/types/tenant.types';

export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatarUrl: string | null;
}

export interface UserSession {
  readonly user: User;
  readonly tenant: Tenant;
  readonly expiresAt: string;
}