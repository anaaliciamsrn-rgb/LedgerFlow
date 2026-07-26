import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
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