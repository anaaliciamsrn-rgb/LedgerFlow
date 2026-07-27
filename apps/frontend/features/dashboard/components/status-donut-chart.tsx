'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

const COLORS = ['hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(0 72% 51%)', 'hsl(220 9% 46%)'];

interface Props {
  readonly data: readonly Bucket[];
}

export function StatusDonutChart({ data }: Props): React.ReactNode {
  const filtered = data.filter((d) => d.count > 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={[...filtered]} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {filtered.map((entry, index) => (
            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: '13px' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
