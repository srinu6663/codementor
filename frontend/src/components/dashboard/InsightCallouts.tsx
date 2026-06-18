import { TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

export interface Insight {
  tone: 'positive' | 'negative' | 'warning' | 'neutral';
  text: string;
}

const toneMap = {
  positive: { color: 'var(--success)',     Icon: TrendingUp },
  negative: { color: 'var(--destructive)', Icon: TrendingDown },
  warning:  { color: 'var(--warning)',     Icon: AlertTriangle },
  neutral:  { color: 'var(--brand)',       Icon: Info },
} as const;

// Plain-language takeaways surfaced above the charts so a non-technical viewer
// (e.g. HOD) gets the point without reading any axes.
export function InsightCallouts({ insights }: { insights: Insight[] }) {
  if (!insights?.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {insights.map((ins, i) => {
        const { color, Icon } = toneMap[ins.tone] ?? toneMap.neutral;
        return (
          <div
            key={i}
            className="flex items-start gap-2.5 bg-card border border-border rounded-xl p-3.5"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
            <span className="text-sm text-foreground leading-snug">{ins.text}</span>
          </div>
        );
      })}
    </div>
  );
}
