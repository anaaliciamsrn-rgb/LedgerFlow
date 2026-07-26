import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LoadingProps {
  readonly className?: string;
  readonly label?: string;
  readonly size?: number;
}

function Loading({
  className,
  label = 'Carregando',
  size = 20,
}: LoadingProps): React.ReactNode {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2', className)}
    >
      <Loader2 className="animate-spin text-muted-foreground" size={size} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { Loading };