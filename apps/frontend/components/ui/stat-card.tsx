import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  readonly title: string;
  readonly value: string;
  readonly icon?: LucideIcon;
  readonly trend?: number;
  readonly isLoading?: boolean;
  readonly className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, isLoading = false, className }: StatCardProps): React.ReactNode {
  const isPositive = typeof trend === 'number' && trend >= 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {typeof trend === 'number' ? (
              <span className={cn('flex items-center text-xs font-medium', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                {isPositive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                {Math.abs(trend)}%
              </span>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}