import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { History, Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface Submission {
  id: string;
  verdict: string;
  language: string;
  runtime: number | null;
  memory: number | null;
  submitted_at: string;
  problem_title: string;
  problem_id: string;
}

const verdictStyle = (v: string) => {
  if (v === 'Accepted') return { color: 'var(--success)', icon: CheckCircle2 };
  if (v === 'Partial')  return { color: 'var(--warning)', icon: Clock };
  return { color: 'var(--destructive)', icon: XCircle };
};

export default function MySubmissionsPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'failed'>('all');

  useEffect(() => {
    api.get('/api/submissions')
      .then(r => { if (r.data?.success) setSubs(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = subs.filter(s =>
    filter === 'all' ? true :
    filter === 'accepted' ? s.verdict === 'Accepted' :
    s.verdict !== 'Accepted'
  );

  const acCount = subs.filter(s => s.verdict === 'Accepted').length;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <History className="w-6 h-6 text-brand" />
            <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Your last {subs.length} submissions · {acCount} accepted
          </p>

          <div className="flex gap-1 mb-4 border-b border-border">
            {([
              { key: 'all', label: 'All' },
              { key: 'accepted', label: 'Accepted' },
              { key: 'failed', label: 'Failed' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  filter === t.key
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No submissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-card border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left py-3 px-4">Problem</th>
                    <th className="text-left py-3 px-4">Verdict</th>
                    <th className="text-left py-3 px-4">Lang</th>
                    <th className="text-right py-3 px-4">Runtime</th>
                    <th className="text-right py-3 px-4">When</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const vs = verdictStyle(s.verdict);
                    const Icon = vs.icon;
                    return (
                      <tr key={s.id} className="border-b border-secondary hover:bg-background/50">
                        <td className="py-3 px-4">
                          <Link to={`/app/problems/${s.problem_id}`}
                            className="text-foreground hover:text-link flex items-center gap-1.5 group">
                            <span className="truncate max-w-[220px]">{s.problem_title}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 font-medium" style={{ color: vs.color }}>
                            <Icon className="w-3.5 h-3.5" /> {s.verdict}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{s.language}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground font-mono text-xs">
                          {s.runtime != null ? `${s.runtime} ms` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                          {new Date(s.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
