import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ObligationStats } from '@/types/api';

const COLORS: Record<string, string> = {
  potential: '#ff6e42',
  confirmed: '#16a34a',
  rejected: '#dc2626',
  completed: '#475569',
  overdue: '#d97706',
};

const LABELS: Record<string, string> = {
  potential: 'Needs review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  completed: 'Completed',
  overdue: 'Overdue',
};

export function ObligationDistributionChart({ stats }: { stats: ObligationStats }) {
  const data = Object.entries(stats)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([status, count]) => ({ name: LABELS[status] ?? status, status, value: count ?? 0 }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center text-xs text-[var(--color-text-faint)]">
        <span>No obligations recorded yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Donut chart container with centered total count */}
      <div className="relative h-44 w-full max-w-[200px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={46}
              outerRadius={68}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={COLORS[entry.status] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} obligations`, `${name}`]}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                boxShadow: 'var(--shadow-sm)',
                fontSize: 12,
                padding: '6px 10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centered count */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] leading-none">
            {total}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-faint)] mt-0.5">
            Total
          </span>
        </div>
      </div>

      {/* Responsive legend grid below chart — guaranteed never to overflow or clip */}
      <ul className="mt-3 w-full grid grid-cols-2 gap-x-3 gap-y-1.5 pt-3 border-t border-[var(--color-border)]">
        {data.map((entry) => (
          <li key={entry.status} className="flex items-center gap-1.5 text-xs min-w-0">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[entry.status] ?? '#94a3b8' }}
              aria-hidden="true"
            />
            <span className="truncate text-[var(--color-text-muted)] text-[11px]" title={entry.name}>
              {entry.name}
            </span>
            <span className="ml-auto font-semibold text-[var(--color-text-primary)] text-xs pl-1">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
