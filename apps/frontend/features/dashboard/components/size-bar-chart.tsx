'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

const COLORS = ['hsl(221 83% 53%)', 'hsl(262 83% 58%)', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)'];

interface Props {
  readonly data: readonly Bucket[];
}

export function SizeBarChart({ data }: Props): React.ReactNode {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={[...data]} margin={{ left: 0, right: 8, top: 8 }}>
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis axisLine={false} tickLine={false} width={28} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: '13px' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
