import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface VerdictDatum {
  name: string;
  value: number;
}

interface Props {
  data: { name: string; value: number }[];
}

// Map common Judge0 / platform verdicts to theme colors. Anything unknown
// falls back to the muted palette so the chart never renders an undefined fill.
const VERDICT_COLORS: Record<string, string> = {
  'Accepted': 'var(--success)',
  'Wrong Answer': 'var(--destructive)',
  'Time Limit Exceeded': 'var(--warning)',
  'Runtime Error': 'var(--purple)',
  'Compilation Error': 'var(--link)',
  'Memory Limit Exceeded': 'var(--chart-5)',
};

const FALLBACK_PALETTE = ['var(--brand)', 'var(--success)', 'var(--warning)', 'var(--destructive)', 'var(--purple)', 'var(--link)', 'var(--chart-5)', 'var(--muted-foreground)'];

const colorFor = (name: string, idx: number) =>
  VERDICT_COLORS[name] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-10 text-center">{text}</p>;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border px-3 py-2 text-xs shadow-lg">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: item.payload.fill }} />
        <span className="text-foreground font-medium">{item.name}</span>
      </div>
      <div className="text-muted-foreground mt-1 font-mono">
        {item.value} {item.value === 1 ? 'submission' : 'submissions'}
      </div>
    </div>
  );
}

function renderLegend({ payload }: any) {
  if (!payload) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
      {payload.map((entry: any, i: number) => (
        <li key={`${entry.value}-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

export function VerdictPieChart({ data }: Props) {
  const cleaned = (data ?? []).filter(d => d && Number(d.value) > 0);
  if (!cleaned.length) return <EmptyState text="No submissions yet" />;

  const total = cleaned.reduce((s, d) => s + Number(d.value), 0);

  return (
    <div className="w-full h-[260px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={cleaned}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {cleaned.map((entry, i) => (
              <Cell key={entry.name} fill={colorFor(entry.name, i)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Legend content={renderLegend} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
      {/* Center total label (donut hole) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-7">
        <span className="text-2xl font-bold text-foreground font-mono">{total}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
      </div>
    </div>
  );
}
