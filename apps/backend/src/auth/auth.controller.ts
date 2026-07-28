import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie';
import { loginSchema, type LoginInput, type SessionDto } from './auth.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    return sessionCookieOptions(
      this.config.get<string>('NODE_ENV') === 'production',
      this.config.get<string>('CROSS_SITE_COOKIE') === 'true',
    );
  }

  /**
   * Rota pública — é a única que pode ser, já que é ela quem cria a sessão.
   *
   * O token vai **só** no cookie httpOnly; o corpo devolve apenas os dados de
   * exibição. Devolvê-lo no JSON permitiria que o JavaScript da página o
   * guardasse, e aí o `httpOnly` não protegeria nada.
   */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDto> {
    const { token, session } = await this.auth.login(body);
    res.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return session;
  }

  @Get('session')
  @UseGuards(TenantContextGuard)
  getSession(@CurrentUser() auth: AuthContext): Promise<SessionDto> {
    return this.auth.getSession(auth.userId, auth.tenantId);
  }

  /**
   * Sem guard de propósito: sair deve funcionar mesmo com token expirado ou
   * corrompido — o objetivo é justamente apagar o cookie.
   */
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
  }
}
