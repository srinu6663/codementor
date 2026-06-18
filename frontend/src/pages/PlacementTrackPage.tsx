import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Target, CheckCircle2, ArrowRight, Loader2, Building2, Sparkles } from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface TrackTopic { topic: string; label: string; target: number; solved: number; pct: number }
interface TrackGap { label: string; need: number }
interface Track {
  key: string; label: string; color: string; companies: string[]; focus: string;
  readiness: number; topics: TrackTopic[]; gaps: TrackGap[];
}
interface RecProblem { id: string; title: string; difficulty: string; tags: string[] }

const diffColor = (d: string) =>
  d?.toLowerCase() === 'easy' ? 'var(--success)' :
  d?.toLowerCase() === 'medium' ? 'var(--warning)' :
  d?.toLowerCase() === 'hard' ? 'var(--destructive)' : 'var(--muted-foreground)';

function ReadinessRing({ pct, color }: { pct: number; color: string }) {
  const r = 30, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--secondary)" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">{pct}%</span>
      </div>
    </div>
  );
}

export default function PlacementTrackPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [recommended, setRecommended] = useState<RecProblem[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/student/placement')
      .then(r => {
        if (r.data?.success) {
          setTracks(r.data.data.tracks || []);
          setRecommended(r.data.data.recommended || []);
          if (r.data.data.tracks?.length) setSelected(r.data.data.tracks[0].key);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const track = tracks.find(t => t.key === selected);

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Placement Track</h1>
            <p className="text-muted-foreground text-sm mt-1">Your readiness is computed from the problems you've actually solved, mapped to each recruitment track.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No track data available.</div>
          ) : (
            <>
              {/* Track readiness cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tracks.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setSelected(t.key)}
                    className={`text-left bg-card border rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      selected === t.key ? 'border-brand ring-2 ring-brand/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <ReadinessRing pct={t.readiness} color={t.color} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{t.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{t.focus}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {t.companies.slice(0, 4).map(co => (
                        <span key={co} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{co}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected track breakdown */}
              {track && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: track.color }} /> {track.label} — Topic Coverage
                    </h2>
                    <div className="space-y-3">
                      {track.topics.map(tp => (
                        <div key={tp.topic}>
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span className="text-foreground font-medium capitalize">{tp.label}</span>
                            <span className="font-mono text-muted-foreground">{tp.solved}/{tp.target}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${tp.pct}%`, background: tp.pct >= 100 ? 'var(--success)' : track.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-warning" /> What's Missing
                    </h2>
                    {track.gaps.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-success">
                        <CheckCircle2 className="w-8 h-8 mb-2" />
                        <p className="text-sm font-medium">You're track-ready! 🎉</p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {track.gaps.map(g => (
                          <li key={g.label} className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2">
                            <span className="text-foreground capitalize">{g.label}</span>
                            <span className="text-xs text-warning font-medium">+{g.need} to go</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Recommended next problems */}
              {recommended.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple" /> Recommended next — close your biggest gaps
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {recommended.map(p => (
                      <Link key={p.id} to={`/app/problems/${p.id}`}
                        className="group flex items-center gap-3 py-2.5 px-3 bg-background border border-border rounded-lg hover:border-brand/40 transition-colors">
                        <span className="flex-1 text-sm text-foreground group-hover:text-brand transition-colors truncate">{p.title}</span>
                        <span className="text-[11px] capitalize" style={{ color: diffColor(p.difficulty) }}>{p.difficulty}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
