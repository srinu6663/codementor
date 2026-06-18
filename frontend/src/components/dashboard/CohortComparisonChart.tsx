import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';

export interface CohortRow {
  label: string;
  students: number;
  solved: number;
  acRate: number;
  avgSolved: number;
}

function CohortTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CohortRow;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-foreground mb-1">{d.label}</div>
      <div className="text-muted-foreground">Students: <span className="text-foreground font-mono">{d.students}</span></div>
      <div className="text-muted-foreground">Avg solved/student: <span className="text-foreground font-mono">{d.avgSolved}</span></div>
      <div className="text-muted-foreground">Acceptance rate: <span className="text-foreground font-mono">{d.acRate}%</span></div>
    </div>
  );
}

export function CohortComparisonChart({ data }: { data: CohortRow[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No cohort data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
        <YAxis
          type="category" dataKey="label" width={90}
          tick={{ fill: 'var(--foreground)', fontSize: 12 }} stroke="var(--border)"
        />
        <Tooltip content={<CohortTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
        <Bar dataKey="avgSolved" name="Avg solved / student" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill="var(--brand)" />)}
        </Bar>
        <Bar dataKey="acRate" name="Acceptance %" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill="var(--success)" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
