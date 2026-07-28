import { z } from 'zod';
import type { UserRole } from '../common/auth/auth-context';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail ou senha inválidos'),
  password: z.string().min(1, 'E-mail ou senha inválidos'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Conteúdo do token. Nada de dado sensível: o cookie viaja no navegador. */
export interface JwtPayload {
  /** `sub` é o id do usuário, seguindo a convenção do JWT. */
  readonly sub: string;
  readonly tenantId: string;
  readonly role: UserRole;
}

export interface SessionUserDto {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly avatarUrl: string | null;
}

export interface SessionTenantDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
  readonly theme: {
    readonly primaryColor: string;
    readonly accentColor: string;
  };
}

export interface SessionDto {
  readonly user: SessionUserDto;
  readonly tenant: SessionTenantDto;
  readonly expiresAt: string;
}
