'use client';

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

interface BucketChartProps {
  readonly title: string;
  readonly data: readonly Bucket[];
}

/**
 * Paleta rotativa para as barras. Mantém o azul primário como cor dominante
 * e usa os tokens semânticos do design system nas demais, para os gráficos
 * ficarem coerentes com o restante do produto (e com o dark mode).
 */
const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--ai))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
];

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>): React.ReactNode {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-elevation-md">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {value} {value === 1 ? 'empresa' : 'empresas'}
      </p>
    </div>
  );
}

export function BucketChart({ title, data }: BucketChartProps): React.ReactNode {
  const isEmpty = data.length === 0;

  return (
    <Card className="p-5 transition-shadow duration-200 hover:shadow-elevation-md">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {isEmpty ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Sem dados para o filtro atual.</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...data]} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={56}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={32}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {data.map((bucket, index) => (
                  <Cell
                    key={bucket.label}
                    fill={data.length > 1 && index > 0 ? BAR_COLORS[index % BAR_COLORS.length] : 'url(#barGradient)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
