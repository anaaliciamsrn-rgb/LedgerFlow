import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthContext,
  RequestWithAuth,
  UserRole,
} from '../auth/auth-context';

const VALID_ROLES: readonly UserRole[] = [
  'owner',
  'admin',
  'accountant',
  'viewer',
];

function header(req: RequestWithAuth, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function toRole(value: string | undefined, fallback: UserRole): UserRole {
  return value && (VALID_ROLES as readonly string[]).includes(value)
    ? (value as UserRole)
    : fallback;
}

/**
 * Popula `req.auth` com o AuthContext.
 *
 * - AUTH_MODE=stub: lê os headers x-tenant-id / x-user-id / x-role,
 *   caindo para os defaults de ambiente (STUB_*). Facilita dev e testes.
 * - AUTH_MODE=jwt: ponto de integração com a Infra (validação real do
 *   cookie/JWT). Enquanto a Infra não entrega, mantém-se em stub.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const mode = this.config.get<string>('AUTH_MODE') ?? 'stub';

    const auth =
      mode === 'jwt' ? this.fromJwt(req) : this.fromStub(req);

    if (!auth) {
      throw new UnauthorizedException('Contexto de autenticação ausente');
    }

    req.auth = auth;
    return true;
  }

  private fromStub(req: RequestWithAuth): AuthContext | null {
    const tenantId =
      header(req, 'x-tenant-id') ??
      this.config.get<string>('STUB_TENANT_ID');
    const userId =
      header(req, 'x-user-id') ?? this.config.get<string>('STUB_USER_ID');
    const role = toRole(
      header(req, 'x-role'),
      this.config.get<UserRole>('STUB_ROLE') ?? 'viewer',
    );

    if (!tenantId || !userId) {
      return null;
    }
    return { tenantId, userId, role };
  }

  private fromJwt(_req: RequestWithAuth): AuthContext | null {
    // TODO(integração-infra): validar o cookie/JWT emitido pela frente de
    // Infra e extrair { userId, tenantId, role } do Membership.
    throw new UnauthorizedException(
      'AUTH_MODE=jwt ainda não integrado com a base de Infra/Auth',
    );
  }
}
