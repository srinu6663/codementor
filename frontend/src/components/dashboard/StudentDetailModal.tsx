import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { X, Loader2, TrendingUp, Target } from 'lucide-react';
import api from '../../lib/api';
import { VerdictPieChart } from './VerdictPieChart';

interface BasicStudent { id: string; name: string; email: string; }

interface Detail {
  student: {
    id: string; name: string; email: string;
    department?: string | null; section?: string | null; year?: number | null;
    rollNo?: string | null; rating?: number | null; joinedDate: string;
  };
  totals: { total: number; accepted: number; solved: number; acRate: number };
  learningCurve: { date: string; solved: number }[];
  topicBreakdown: { topic: string; solved: number; attempts: number }[];
  verdictBreakdown: { name: string; value: number }[];
}

const tooltipStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
};

export function StudentDetailModal({ student, onClose }: { student: BasicStudent; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/faculty/students/${student.id}/detail`)
      .then(r => { if (r.data?.success) setDetail(r.data.data); else setError('Failed to load'); })
      .catch(e => setError(e?.response?.data?.error || 'Failed to load student detail'))
      .finally(() => setLoading(false));
  }, [student.id]);

  const t = detail?.totals;
  const tags = [
    detail?.student.rollNo,
    detail?.student.department,
    detail?.student.section && `Sec ${detail.student.section}`,
    detail?.student.year && `Year ${detail.student.year}`,
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-foreground font-semibold">{student.name}</h3>
            <p className="text-muted-foreground text-xs mt-0.5">{student.email}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-brand animate-spin" /></div>
        ) : error || !detail ? (
          <p className="text-sm text-destructive py-16 text-center">{error || 'No data'}</p>
        ) : (
          <div className="p-6 space-y-6">
            {/* Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Solved', value: t!.solved, color: 'var(--success)' },
                { label: 'AC Rate', value: `${t!.acRate}%`, color: t!.acRate >= 60 ? 'var(--success)' : t!.acRate >= 30 ? 'var(--warning)' : 'var(--destructive)' },
                { label: 'Submissions', value: t!.total, color: 'var(--brand)' },
                { label: 'Rating', value: detail.student.rating ?? '—', color: 'var(--purple)' },
              ].map(s => (
                <div key={s.label} className="bg-background border border-border rounded-lg p-3 text-center border-t-2" style={{ borderTopColor: s.color }}>
                  <div className="text-xl font-bold text-foreground font-mono">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Learning curve */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" /> Learning curve — problems solved over time
              </h4>
              {detail.learningCurve.length < 2 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Not enough solved problems yet to plot a curve.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={detail.learningCurve} margin={{ left: -18, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--foreground)' }} />
                    <Area dataKey="solved" name="Solved" stroke="var(--brand)" strokeWidth={2} fill="url(#lcGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Topic radar */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple" /> Topic mastery
                </h4>
                {detail.topicBreakdown.length < 3 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Not enough topic coverage yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={detail.topicBreakdown} outerRadius="70%">
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="topic" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} stroke="var(--border)" />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--foreground)' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
                      <Radar name="Attempts" dataKey="attempts" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.15} />
                      <Radar name="Solved" dataKey="solved" stroke="var(--success)" fill="var(--success)" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Verdict mix */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand" /> Verdict mix
                </h4>
                <VerdictPieChart data={detail.verdictBreakdown} />
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-secondary">
              Joined {new Date(detail.student.joinedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
