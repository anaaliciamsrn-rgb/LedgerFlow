'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

interface BucketChartProps {
  readonly title: string;
  readonly data: readonly Bucket[];
}

export function BucketChart({ title, data }: BucketChartProps): React.ReactNode {
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados para o filtro atual.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...data]} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip cursor={{ fillOpacity: 0.1 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
