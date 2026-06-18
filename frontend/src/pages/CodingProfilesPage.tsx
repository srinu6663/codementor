import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Trophy, Loader2, RefreshCw, CheckCircle2, AlertCircle, Link2, Save } from 'lucide-react';

interface Profile {
  platform: string; handle: string; solved: number;
  rating: number | null; max_rating: number | null;
  extra: any; sync_status: string; last_synced: string | null;
}
interface LbRow {
  rank: number; userId: string; name: string; department: string | null; section: string | null;
  totalSolved: number; cfRating: number | null; platforms: number; byPlatform: Record<string, number>;
}

const META: Record<string, { label: string; live: boolean; placeholder: string }> = {
  codeforces: { label: 'Codeforces', live: true,  placeholder: 'tourist' },
  leetcode:   { label: 'LeetCode',   live: true,  placeholder: 'your-username' },
  hackerrank: { label: 'HackerRank', live: false, placeholder: 'profile id' },
  codechef:   { label: 'CodeChef',   live: false, placeholder: 'username' },
  gfg:        { label: 'GeeksforGeeks', live: false, placeholder: 'username' },
};
const ORDER = ['codeforces', 'leetcode', 'hackerrank', 'codechef', 'gfg'];

export default function CodingProfilesPage() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingP, setSavingP] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [lb, setLb] = useState<LbRow[]>([]);
  const [dept, setDept] = useState('');
  const [section, setSection] = useState('');

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const loadMine = useCallback(() => {
    setLoading(true);
    api.get('/api/profiles/me')
      .then(r => {
        if (r.data?.success) {
          const map: Record<string, Profile> = {};
          const d: Record<string, string> = {};
          for (const p of r.data.data) { map[p.platform] = p; d[p.platform] = p.handle; }
          setProfiles(map); setDrafts(d);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadLeaderboard = useCallback(() => {
    const q = new URLSearchParams();
    if (dept) q.set('department', dept);
    if (section) q.set('section', section);
    api.get('/api/profiles/leaderboard?' + q.toString())
      .then(r => { if (r.data?.success) setLb(r.data.data); })
      .catch(() => {});
  }, [dept, section]);

  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const saveHandle = async (platform: string) => {
    setSavingP(platform);
    try {
      await api.put('/api/profiles/me', { platform, handle: drafts[platform] || '' });
      await loadMine();
      flash((drafts[platform] || '').trim() ? 'Saved' : 'Removed');
    } catch { flash('Save failed'); } finally { setSavingP(null); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api.post('/api/profiles/me/sync');
      const errs = (r.data?.data || []).filter((x: any) => x.status === 'error');
      flash(errs.length ? `Synced — ${errs.length} failed (check handles)` : 'Synced successfully');
      await loadMine();
      loadLeaderboard();
    } catch (e: any) {
      flash(e?.response?.data?.error || 'Sync failed');
    } finally { setSyncing(false); }
  };

  const statusIcon = (s: string) =>
    s === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
    : s === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-destructive" />
    : <Link2 className="w-3.5 h-3.5 text-muted-foreground" />;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="w-6 h-6 text-brand" />
            <h1 className="text-2xl font-bold text-foreground">Coding Profiles</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-6">Link your competitive-programming accounts. Codeforces &amp; LeetCode sync live; others are stored as links.</p>

          {/* Handles */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Your accounts</h2>
              <button onClick={sync} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync my stats
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {ORDER.map(pf => {
                  const m = META[pf]; const p = profiles[pf];
                  return (
                    <div key={pf} className="flex items-center gap-3">
                      <div className="w-28 flex-shrink-0">
                        <div className="text-sm text-foreground font-medium">{m.label}</div>
                        <div className="text-[10px] uppercase tracking-wide" style={{ color: m.live ? 'var(--success)' : 'var(--muted-foreground)' }}>
                          {m.live ? 'auto-sync' : 'link only'}
                        </div>
                      </div>
                      <input
                        value={drafts[pf] ?? ''}
                        onChange={e => setDrafts(d => ({ ...d, [pf]: e.target.value }))}
                        placeholder={m.placeholder}
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-link"
                      />
                      <button onClick={() => saveHandle(pf)} disabled={savingP === pf}
                        className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
                        {savingP === pf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      </button>
                      <div className="w-32 flex-shrink-0 text-right">
                        {p ? (
                          <div className="flex items-center justify-end gap-1.5 text-xs">
                            {statusIcon(p.sync_status)}
                            {m.live && p.sync_status === 'ok'
                              ? <span className="text-foreground font-mono">{p.solved} solved{p.rating ? ` · ${p.rating}` : ''}</span>
                              : <span className="text-muted-foreground">{p.sync_status === 'error' ? 'sync failed' : 'saved'}</span>}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Trophy className="w-4 h-4 text-warning" /> College Coding Leaderboard</h2>
              <div className="flex gap-2">
                <input value={dept} onChange={e => setDept(e.target.value)} placeholder="Dept"
                  className="w-24 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-link" />
                <input value={section} onChange={e => setSection(e.target.value)} placeholder="Sec"
                  className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-link" />
              </div>
            </div>

            {lb.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No synced profiles yet. Add your handles and click “Sync my stats”.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                      <th className="text-left py-2 px-3 w-12">#</th>
                      <th className="text-left py-2 px-3">Student</th>
                      <th className="text-right py-2 px-3">Total solved</th>
                      <th className="text-right py-2 px-3">CF rating</th>
                      <th className="text-right py-2 px-3">Platforms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lb.map(r => {
                      const mine = me && r.userId === me.id;
                      return (
                        <tr key={r.userId} className={`border-b border-secondary ${mine ? 'bg-brand/5' : ''}`}>
                          <td className="py-2 px-3 font-mono text-muted-foreground">{r.rank}</td>
                          <td className="py-2 px-3">
                            <span className="text-foreground font-medium">{r.name}{mine && <span className="ml-1 text-[10px] text-brand">(you)</span>}</span>
                            {(r.department || r.section) && <span className="ml-2 text-[10px] text-muted-foreground">{[r.department, r.section && `Sec ${r.section}`].filter(Boolean).join(' · ')}</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-success">{r.totalSolved}</td>
                          <td className="py-2 px-3 text-right font-mono text-muted-foreground">{r.cfRating ?? '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-muted-foreground">{r.platforms}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      {toast && <div className="fixed bottom-6 right-6 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground shadow-lg">{toast}</div>}
    </div>
  );
}
