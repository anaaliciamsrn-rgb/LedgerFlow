import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export default function NotFound(): React.ReactNode {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <div className="space-y-2">
        <p className="text-6xl font-bold tracking-tight text-primary">404</p>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
      </div>
      <Button asChild>
        <Link href={ROUTES.dashboard}>Voltar ao início</Link>
      </Button>
    </div>
  );
}