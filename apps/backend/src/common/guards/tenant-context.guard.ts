import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SESSION_COOKIE } from '../../auth/session-cookie';
import type { JwtPayload } from '../../auth/auth.schema';
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
 * - AUTH_MODE=jwt: valida o token do cookie httpOnly emitido no login.
 * - AUTH_MODE=stub: lê os headers x-tenant-id / x-user-id / x-role, caindo
 *   para os defaults de ambiente. Só existe para desenvolvimento e testes —
 *   qualquer cliente escolheria o próprio tenant. `validateEnv` recusa este
 *   modo quando NODE_ENV=production.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const mode = this.config.get<string>('AUTH_MODE') ?? 'stub';

    const auth =
      mode === 'jwt' ? await this.fromJwt(req) : this.fromStub(req);

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

  /**
   * O token vem do cookie httpOnly, nunca de header ou corpo: assim o
   * JavaScript da página não o alcança, e um XSS não consegue roubá-lo.
   */
  private async fromJwt(req: RequestWithAuth): Promise<AuthContext | null> {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (!payload.sub || !payload.tenantId) {
        return null;
      }
      return {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: toRole(payload.role, 'viewer'),
      };
    } catch {
      // Token expirado, adulterado ou assinado com outra chave.
      return null;
    }
  }
}
