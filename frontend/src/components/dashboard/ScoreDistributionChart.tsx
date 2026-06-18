import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

export interface SolvedBucket { range: string; students: number; }

const tooltipStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
};

// Histogram: how many students fall into each "problems solved" band.
// The 0-solved bucket is highlighted in red — those are the students at risk.
export function ScoreDistributionChart({ data }: { data: SolvedBucket[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="range" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
        <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
        <Tooltip cursor={{ fill: 'var(--accent)', opacity: 0.4 }} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--foreground)' }} />
        <Bar dataKey="students" name="students" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.range === '0' ? 'var(--destructive)' : 'var(--brand)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
