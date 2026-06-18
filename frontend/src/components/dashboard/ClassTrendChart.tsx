import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

export interface WeeklyRow {
  week: string; total: number; accepted: number; acRate: number;
}

const tooltipStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
};

// Submission volume (bars) + acceptance-rate trend (line) over the last 12 weeks.
export function ClassTrendChart({ data }: { data: WeeklyRow[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Not enough history yet.</p>;
  }
  const fmt = data.map(d => ({ ...d, label: d.week.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={fmt} margin={{ left: -12, right: 8, top: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
        <YAxis yAxisId="l" allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
        <Tooltip cursor={{ fill: 'var(--accent)', opacity: 0.4 }} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--foreground)' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
        <Bar yAxisId="l" dataKey="total" name="Submissions" fill="var(--brand)" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" dataKey="acRate" name="AC rate %" stroke="var(--success)" strokeWidth={2} dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
