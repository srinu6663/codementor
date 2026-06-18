import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  data: { topic: string; solved: number; failed: number }[];
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-10 text-center">{text}</p>;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground font-medium capitalize">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="text-foreground font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function renderLegend({ payload }: any) {
  if (!payload) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
      {payload.map((entry: any, i: number) => (
        <li key={`${entry.value}-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

export function TopicMasteryChart({ data }: Props) {
  const cleaned = (data ?? [])
    .filter(d => d && d.topic)
    .map(d => ({ topic: d.topic, solved: Number(d.solved) || 0, failed: Number(d.failed) || 0 }));
  if (!cleaned.length) return <EmptyState text="No topic data yet" />;

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cleaned} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--secondary)" />
          <XAxis
            dataKey="topic"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
            stroke="var(--border)"
            interval={0}
            angle={-25}
            textAnchor="end"
            height={56}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--secondary)', opacity: 0.5 }} />
          <Legend content={renderLegend} verticalAlign="bottom" />
          <Bar dataKey="solved" name="Solved" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} maxBarSize={40} />
          <Bar dataKey="failed" name="Failed" stackId="a" fill="var(--destructive)" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
