import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/auth/auth-context';

interface SessionUserDto {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly avatarUrl: string | null;
}

interface SessionTenantDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
  readonly theme: {
    readonly primaryColor: string;
    readonly accentColor: string;
  };
}

interface SessionDto {
  readonly user: SessionUserDto;
  readonly tenant: SessionTenantDto;
  readonly expiresAt: string;
}

const SESSION_HOURS = 8;

/**
 * Sessão do usuário logado.
 *
 * O brief do cliente não pede autenticação, mas o frontend precisa saber
 * QUAL tenant está exibindo — é daqui que ele lê o nome, o logo e as cores
 * que sustentam o white label. Enquanto `AUTH_MODE=stub`, a identidade vem
 * do `TenantContextGuard` (headers/env) e o tenant vem do banco.
 *
 * Quando a autenticação real existir, só este arquivo muda: o contrato
 * devolvido ao frontend continua o mesmo.
 */
@UseGuards(TenantContextGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('session')
  async getSession(@CurrentUser() auth: AuthContext): Promise<SessionDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: auth.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

    return {
      user: {
        id: auth.userId,
        name: this.config.get<string>('STUB_USER_NAME') ?? 'Usuário',
        email: this.config.get<string>('STUB_USER_EMAIL') ?? 'usuario@exemplo.com.br',
        role: auth.role,
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
      expiresAt: expiresAt.toISOString(),
    };
  }

  @Post('logout')
  @HttpCode(204)
  logout(): void {
    // Em modo stub não há cookie a invalidar. O endpoint existe para o
    // frontend não precisar saber disso.
  }
}
