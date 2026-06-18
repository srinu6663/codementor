import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import api from '../../lib/api';

type Dim = 'department' | 'section' | 'year';
interface CohortTopicData { dim: string; cohorts: string[]; topics: Record<string, number | string>[]; }

const PALETTE = ['var(--brand)', 'var(--success)', 'var(--warning)', 'var(--purple)', 'var(--destructive)', 'var(--link)'];
const DIMS: { key: Dim; label: string }[] = [
  { key: 'department', label: 'Department' },
  { key: 'section', label: 'Section' },
  { key: 'year', label: 'Year' },
];

const tooltipStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
};

// Overlays cohorts (departments / sections / years) across topics so faculty can
// see, e.g., "Section A is strong in DP but weak in graphs" at a glance.
export function CohortRadarChart() {
  const [dim, setDim] = useState<Dim>('department');
  const [data, setData] = useState<CohortTopicData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/faculty/cohort-topics?dim=${dim}`)
      .then(r => { if (r.data?.success) setData(r.data.data); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dim]);

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {DIMS.map(d => (
          <button
            key={d.key}
            onClick={() => setDim(d.key)}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
              dim === d.key
                ? 'bg-brand/15 border-brand/40 text-link'
                : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
      ) : !data || data.topics.length < 3 || data.cohorts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-16 text-center">Not enough data to compare cohorts on this dimension yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data.topics} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="topic" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} stroke="var(--border)" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--foreground)' }} formatter={(v: any) => [`${v}%`, '']} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
            {data.cohorts.map((cohort, i) => (
              <Radar
                key={cohort}
                name={cohort}
                dataKey={cohort}
                stroke={PALETTE[i % PALETTE.length]}
                fill={PALETTE[i % PALETTE.length]}
                fillOpacity={0.12}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      )}
      <p className="text-xs text-muted-foreground mt-2 text-center">Each axis = acceptance rate (%) on that topic</p>
    </div>
  );
}
