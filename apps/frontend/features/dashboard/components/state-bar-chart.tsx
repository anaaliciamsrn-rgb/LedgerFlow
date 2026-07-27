'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

interface Props {
  readonly data: readonly Bucket[];
}

export function StateBarChart({ data }: Props): React.ReactNode {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={[...data]} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={36} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: '13px' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell key={entry.label} fill="hsl(var(--primary))" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
