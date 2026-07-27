'use client';

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

interface Props {
  readonly data: readonly Bucket[];
}

export function HealthAreaChart({ data }: Props): React.ReactNode {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={[...data]} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis axisLine={false} tickLine={false} width={28} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: '13px' }} />
        <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
