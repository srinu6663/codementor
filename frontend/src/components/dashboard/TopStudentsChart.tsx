import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface Props {
  data: { name: string; solved: number }[];
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-10 text-center">{text}</p>;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground font-medium">{label}</div>
      <div className="text-muted-foreground mt-1 font-mono">
        {value} {value === 1 ? 'problem solved' : 'problems solved'}
      </div>
    </div>
  );
}

export function TopStudentsChart({ data }: Props) {
  const cleaned = (data ?? []).filter(d => d && d.name);
  if (!cleaned.length) return <EmptyState text="No student activity yet" />;

  // Sort descending so the strongest students sit at the top of the chart.
  const sorted = [...cleaned]
    .map(d => ({ name: d.name, solved: Number(d.solved) || 0 }))
    .sort((a, b) => b.solved - a.solved);

  // Give each row some breathing room; cap so very large classes stay readable.
  const chartHeight = Math.max(sorted.length * 38, 120);

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid horizontal={false} stroke="var(--secondary)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: 'var(--foreground)', fontSize: 11 }}
            stroke="var(--border)"
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--secondary)', opacity: 0.5 }} />
          <Bar dataKey="solved" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {sorted.map((entry, i) => (
              <Cell key={`${entry.name}-${i}`} fill={i === 0 ? 'var(--success)' : 'var(--brand)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
