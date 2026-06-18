import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { Shield, AlertTriangle, RefreshCw, ChevronLeft, Loader2, Users, Flame, Share2 } from 'lucide-react';
import api from '../lib/api';
import { PlagiarismNetworkGraph } from '../components/dashboard/PlagiarismNetworkGraph';
import { PlagiarismDiffModal } from '../components/dashboard/PlagiarismDiffModal';

interface PlagiarismPair {
  id: string;
  similarity: number;
  language: string;
  ran_at: string;
  student_a_name: string;
  student_a_email: string;
  student_b_name: string;
  student_b_email: string;
}

interface StudentStat {
  email: string; name: string; pairs: number; maxSim: number;
}

const simColor = (sim: number) =>
  sim >= 90 ? 'var(--destructive)' : sim >= 75 ? 'var(--warning)' : 'var(--brand)';
const severityLabel = (sim: number) => (sim >= 90 ? 'Critical' : sim >= 75 ? 'High' : 'Moderate');
const severityClasses = (sim: number) =>
  sim >= 90 ? 'border-destructive/40 bg-destructive/5'
  : sim >= 75 ? 'border-warning/40 bg-warning/5'
  : 'border-border bg-card';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-foreground font-medium">{label}</div>
      <div className="text-muted-foreground">{payload[0].name}: <span className="text-foreground font-mono">{payload[0].value}</span></div>
    </div>
  );
}

export default function PlagiarismPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();

  const [pairs, setPairs] = useState<PlagiarismPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [lastRan, setLastRan] = useState<string | null>(null);
  const [diffPairId, setDiffPairId] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/api/faculty/assignments/${assignmentId}/plagiarism`);
      if (!res.data.success) throw new Error(res.data.error);
      setPairs(res.data.data);
      if (res.data.data.length > 0) setLastRan(res.data.data[0].ran_at);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleRunCheck = async () => {
    setRunning(true); setError(null); setNotConfigured(false);
    try {
      const res = await api.post(`/api/faculty/assignments/${assignmentId}/plagiarism`);
      if (!res.data.success) throw new Error(res.data.error);
      await fetchResults();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e.message;
      if (status === 503) { setNotConfigured(true); setError(msg); }
      else setError(msg);
    } finally {
      setRunning(false);
    }
  };

  // ── Derived analytics ──────────────────────────────────────────────────────
  const critical = pairs.filter(p => p.similarity >= 90).length;
  const high = pairs.filter(p => p.similarity >= 75 && p.similarity < 90).length;

  const studentStats = useMemo<StudentStat[]>(() => {
    const map: Record<string, StudentStat> = {};
    for (const p of pairs) {
      for (const [name, email] of [[p.student_a_name, p.student_a_email], [p.student_b_name, p.student_b_email]] as const) {
        if (!map[email]) map[email] = { email, name, pairs: 0, maxSim: 0 };
        map[email].pairs += 1;
        map[email].maxSim = Math.max(map[email].maxSim, p.similarity);
      }
    }
    return Object.values(map).sort((a, b) => b.maxSim - a.maxSim || b.pairs - a.pairs);
  }, [pairs]);

  const distribution = useMemo(() => {
    const buckets = [
      { range: '70–79%', count: 0, color: 'var(--brand)' },
      { range: '80–89%', count: 0, color: 'var(--warning)' },
      { range: '90–100%', count: 0, color: 'var(--destructive)' },
    ];
    for (const p of pairs) {
      if (p.similarity >= 90) buckets[2].count++;
      else if (p.similarity >= 80) buckets[1].count++;
      else buckets[0].count++;
    }
    return buckets;
  }, [pairs]);

  const topStudents = studentStats.slice(0, 8).map(s => ({
    name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name,
    pairs: s.pairs, color: simColor(s.maxSim),
  }));

  return (
    <div className="min-h-screen bg-background p-6">
      {diffPairId && assignmentId && (
        <PlagiarismDiffModal
          assignmentId={assignmentId}
          pairId={diffPairId}
          onClose={() => setDiffPairId(null)}
        />
      )}
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/faculty/plagiarism" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold text-foreground">Plagiarism Review</h1>
          <button
            onClick={handleRunCheck}
            disabled={running}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? 'Running JPlag…' : 'Run Plagiarism Check'}
          </button>
        </div>

        {notConfigured && (
          <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6 text-sm text-warning">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>JPlag isn't configured on this server yet (Java + the JPlag JAR). See <span className="font-mono">docs/PLAGIARISM_SETUP.md</span>. Results below are from previous scans, if any.</span>
          </div>
        )}
        {error && !notConfigured && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
        ) : pairs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-foreground">No suspicious pairs found</p>
            <p className="text-sm mt-1">
              {lastRan ? 'Last scan found nothing above the similarity threshold.' : 'Run a plagiarism check to analyse submissions.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Flagged pairs', value: pairs.length, color: 'var(--brand)' },
                { label: 'Critical (≥90%)', value: critical, color: 'var(--destructive)' },
                { label: 'High (75–89%)', value: high, color: 'var(--warning)' },
                { label: 'Students involved', value: studentStats.length, color: 'var(--purple)' },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                  <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Last scan: <span className="text-foreground">{lastRan ? new Date(lastRan).toLocaleString() : 'Never'}</span>
            </p>

            {/* Similarity network — clusters of copying light up at a glance */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-destructive" /> Similarity network
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Each node is a student; lines connect flagged pairs. Tight clusters indicate a group sharing code.
              </p>
              <PlagiarismNetworkGraph pairs={pairs} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-destructive" /> Most-flagged students</h2>
                <ResponsiveContainer width="100%" height={Math.max(180, topStudents.length * 34)}>
                  <BarChart data={topStudents} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                    <YAxis type="category" dataKey="name" width={96} tick={{ fill: 'var(--foreground)', fontSize: 12 }} stroke="var(--border)" />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.4 }} />
                    <Bar dataKey="pairs" name="flagged pairs" radius={[0, 4, 4, 0]}>
                      {topStudents.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Similarity distribution</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distribution} margin={{ left: -16, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="range" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.4 }} />
                    <Bar dataKey="count" name="pairs" radius={[4, 4, 0, 0]}>
                      {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-student risk table */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-brand" /> Per-student risk</h2>
              <div className="space-y-1.5">
                {studentStats.map(s => (
                  <div key={s.email} className="flex items-center gap-3 py-2 px-3 bg-background rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.pairs} pair{s.pairs === 1 ? '' : 's'}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: simColor(s.maxSim), background: 'color-mix(in oklab, ' + simColor(s.maxSim) + ' 14%, transparent)' }}>
                      {s.maxSim.toFixed(0)}% max
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pair list */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Flagged pairs</h2>
              <div className="space-y-2">
                {pairs.map(pair => (
                  <div key={pair.id} className={`flex items-center gap-4 p-4 rounded-xl border ${severityClasses(pair.similarity)}`}>
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="text-2xl font-bold" style={{ color: simColor(pair.similarity) }}>{pair.similarity.toFixed(0)}%</div>
                      <div className="text-xs font-medium mt-0.5 text-muted-foreground">{severityLabel(pair.similarity)}</div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">{pair.student_a_name}</div>
                        <div className="text-xs text-muted-foreground">{pair.student_a_email}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{pair.student_b_name}</div>
                        <div className="text-xs text-muted-foreground">{pair.student_b_email}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono px-2 py-1 rounded bg-secondary text-muted-foreground border border-border">{pair.language}</div>
                    <button
                      onClick={() => setDiffPairId(pair.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-warning hover:border-warning/50 text-xs rounded-lg transition-colors whitespace-nowrap"
                    >
                      Compare code
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
