import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { verifyPassword } from './password';
import type { UserRole } from '../common/auth/auth-context';
import type {
  JwtPayload,
  LoginInput,
  SessionDto,
} from './auth.schema';

/** Validade do token e do cookie. Um turno de trabalho. */
export const SESSION_SECONDS = 8 * 60 * 60;

/**
 * Hash descartável usado quando o e-mail não existe.
 *
 * Sem ele, e-mail inexistente responderia num piscar e e-mail cadastrado
 * levaria o tempo do bcrypt — a diferença revelaria quem tem conta. Medido
 * nesta base: hash válido gasta ~700ms, hash malformado retorna em 1ms. Por
 * isso este precisa ser um bcrypt **real** (de uma senha aleatória que
 * ninguém conhece), e não uma string qualquer com jeito de hash.
 */
const DUMMY_HASH =
  '$2b$12$dWujsPNjNugG3Z.TS2/gb.FHnEb8RbWMZTxGxJ9ChCbVY6sgS73MO';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly activity: ActivityService,
  ) {}

  /**
   * Valida as credenciais e devolve o token da sessão.
   *
   * A mensagem de erro é a mesma para e-mail inexistente, senha errada e
   * conta desativada: distinguir os casos entregaria de graça a lista de
   * quem tem conta no sistema.
   */
  async login(input: LoginInput): Promise<{ token: string; session: SessionDto }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { tenant: true },
    });

    const senhaConfere = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !user.active || !senhaConfere) {
      this.logger.warn(`Tentativa de login recusada para ${input.email}`);
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as UserRole,
    };
    const token = await this.jwt.signAsync(payload);

    await this.activity.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
    });

    return { token, session: this.toSession(user, user.tenant) };
  }

  /** Sessão do usuário já autenticado, para o frontend montar a tela. */
  async getSession(userId: string, tenantId: string): Promise<SessionDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, active: true },
      include: { tenant: true },
    });
    if (!user) {
      // Conta apagada ou desativada com token ainda válido.
      throw new UnauthorizedException('Sessão inválida');
    }
    return this.toSession(user, user.tenant);
  }

  private toSession(
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    },
    tenant: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      primaryColor: string;
      accentColor: string;
    },
  ): SessionDto {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: null,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        theme: {
          primaryColor: tenant.primaryColor,
          accentColor: tenant.accentColor,
        },
      },
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
    };
  }
}
