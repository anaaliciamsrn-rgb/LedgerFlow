export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';

/**
 * Contrato mínimo que o Core consome da frente de Infra/Auth.
 * A emissão/validação do JWT e a resolução do Membership são da Infra;
 * o Core só recebe este contexto já resolvido por request.
 */
export interface AuthContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: UserRole;
}

/** Request do Express enriquecida com o contexto de auth pelo guard. */
export interface RequestWithAuth {
  auth?: AuthContext;
  headers: Record<string, string | string[] | undefined>;
  /** Preenchido pelo `cookie-parser`; ausente se o middleware não rodou. */
  cookies?: Record<string, string | undefined>;
}
