import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 *
 * Sem CSP por ora: uma política restritiva quebraria os estilos inline que o
 * Next injeta, e uma política frouxa daria falsa sensação de proteção. Os
 * quatro abaixo não têm esse risco e cobrem clickjacking, sniffing de tipo,
 * vazamento de referrer e acesso a APIs sensíveis do navegador.
 */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // Este app é autocontido em apps/frontend (tem seu próprio lockfile).
  // Fixar a raiz evita o aviso de "workspace root" causado pelos múltiplos
  // package-lock.json e escopa o rastreamento de arquivos ao frontend.
  outputFileTracingRoot: __dirname,
  experimental: {
    // Garante tree-shaking dos pacotes de UI (imports por barril).
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'sonner',
      'vaul',
    ],
  },
};

export default nextConfig;