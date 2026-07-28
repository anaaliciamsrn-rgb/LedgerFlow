import type { CookieOptions } from 'express';
import { SESSION_SECONDS } from './auth.service';

/** Nome do cookie de sessão. */
export const SESSION_COOKIE = 'lf_session';

/**
 * Opções do cookie de sessão.
 *
 * - `httpOnly`: o JavaScript da página não lê o token, então um XSS não o rouba.
 * - `secure` em produção: só trafega por HTTPS.
 * - `sameSite`: `lax` basta quando frontend e API estão no mesmo domínio (o
 *   arranjo recomendado, via rewrite do Vercel). Em domínios diferentes o
 *   cookie vira third-party e exige `none` — que os navegadores vêm
 *   restringindo. Por isso a preferência é o mesmo domínio, e `none` só entra
 *   quando `CROSS_SITE_COOKIE=true` declara explicitamente o arranjo.
 */
export function sessionCookieOptions(
  isProduction: boolean,
  crossSite: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
    maxAge: SESSION_SECONDS * 1000,
  };
}
