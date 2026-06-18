import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../lib/api';
import { Shield, Loader2, ChevronRight, FileText, Flame } from 'lucide-react';

interface OverviewRow {
  id: string; title: string; deadline: string;
  pairs: number; avgSim: number; maxSim: number; lastRan: string | null;
}

const simColor = (s: number) =>
  s >= 90 ? 'var(--destructive)' : s >= 75 ? 'var(--warning)' : s > 0 ? 'var(--brand)' : 'var(--muted-foreground)';

const tooltipStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
};

export default function FacultyPlagiarismOverview() {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/faculty/plagiarism-overview')
      .then(r => { if (r.data?.success) setRows(r.data.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPairs = rows.reduce((s, r) => s + r.pairs, 0);
  const scanned = rows.filter(r => r.lastRan).length;
  const chartData = rows
    .filter(r => r.lastRan)
    .map(r => ({ name: r.title.length > 16 ? r.title.slice(0, 15) + '…' : r.title, pairs: r.pairs, avgSim: r.avgSim, maxSim: r.maxSim }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold text-foreground">Plagiarism</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Run JPlag token/structure-based detection on an assignment's submissions and review similarity analytics.
        </p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assignments yet — create one to run plagiarism checks.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary + trend */}
            {scanned > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-2xl font-bold font-mono text-destructive">{totalPairs}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Flagged pairs (all assignments)</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-2xl font-bold font-mono text-foreground">{scanned}/{rows.length}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Assignments scanned</div>
                  </div>
                </div>
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-destructive" /> Plagiarism trend across assignments
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartData} margin={{ left: -14, right: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                      <YAxis yAxisId="l" allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                      <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                      <Tooltip cursor={{ fill: 'var(--accent)', opacity: 0.4 }} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--foreground)' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
                      <Bar yAxisId="l" dataKey="pairs" name="Flagged pairs" fill="var(--brand)" radius={[3, 3, 0, 0]} />
                      <Line yAxisId="r" dataKey="maxSim" name="Max similarity %" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 2 }} />
                      <Line yAxisId="r" dataKey="avgSim" name="Avg similarity %" stroke="var(--warning)" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="4 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Assignment list */}
            <div className="space-y-2">
              {rows.map(a => (
                <Link
                  key={a.id}
                  to={`/faculty/assignments/${a.id}/plagiarism`}
                  className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 hover:border-brand/40 hover:-translate-y-0.5 hover:shadow-md transition-all group"
                >
                  <Shield className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.lastRan
                        ? `Last scan ${new Date(a.lastRan).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Not scanned yet'}
                    </div>
                  </div>
                  {a.lastRan && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{a.pairs} pair{a.pairs === 1 ? '' : 's'}</span>
                      {a.pairs > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: simColor(a.maxSim), background: `color-mix(in oklab, ${simColor(a.maxSim)} 14%, transparent)` }}>
                          {a.maxSim.toFixed(0)}% max
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground group-hover:text-brand transition-colors flex items-center gap-1 flex-shrink-0">
                    View report <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
