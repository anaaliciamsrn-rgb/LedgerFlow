'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

const COLORS = [
  'hsl(221 83% 53%)',
  'hsl(262 83% 58%)',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(0 72% 51%)',
];

interface Props {
  readonly data: readonly Bucket[];
}

function truncate(text: string, max = 42): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function CnaeBarChart({ data }: Props): React.ReactNode {
  const rows = data.map((d) => ({ ...d, label: truncate(d.label) }));
  const height = Math.max(240, rows.length * 44);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={220}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            fontSize: '13px',
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
          {rows.map((entry, index) => (
            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
