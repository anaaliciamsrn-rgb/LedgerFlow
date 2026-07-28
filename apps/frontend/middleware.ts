import { NextResponse, type NextRequest } from 'next/server';

/** Mesmo nome usado pelo backend em `src/auth/session-cookie.ts`. */
const SESSION_COOKIE = 'lf_session';

const LOGIN = '/login';
const DASHBOARD = '/dashboard';

/**
 * Redireciona quem não tem sessão para o login, e quem tem para longe dele.
 *
 * **Isto não é autorização.** O middleware só verifica se o cookie existe —
 * não valida assinatura nem expiração, e nem poderia: a chave vive no
 * backend. Quem decide o que cada requisição pode fazer é o
 * `TenantContextGuard`, que confere o token de verdade. O papel daqui é
 * poupar o usuário de abrir uma tela vazia que falharia em seguida.
 *
 * Com `NEXT_PUBLIC_USE_MOCKS=true` não existe cookie nenhum, porque não há
 * backend; nesse modo o middleware sai do caminho.
 */
export function middleware(request: NextRequest): NextResponse {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return NextResponse.next();
  }

  const temSessao = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;
  const indoParaLogin = pathname === LOGIN;

  if (!temSessao && !indoParaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN;
    // Preserva o destino para voltar a ele depois de entrar.
    url.searchParams.set('proximo', pathname);
    return NextResponse.redirect(url);
  }

  if (temSessao && indoParaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Fora do middleware: estáticos, imagens, favicon e as rotas internas do
   * Next. Passar por eles só gastaria tempo em toda requisição.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
