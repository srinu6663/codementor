import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../lib/api';
import {
  Trophy, Clock, Users, Eye, EyeOff, Snowflake,
  CheckCircle2, Loader2, Play
} from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface Contest {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  scoreboard_mode: 'public' | 'frozen' | 'hidden';
  freeze_at: string | null;
  host_name: string;
  problem_count: number;
  registrant_count: number;
}

interface ScoreboardRow {
  user_id: string;
  name: string;
  email: string;
  solved: number;
  penalty: number;
  problems: Record<string, { accepted: boolean; attempts: number; penalty: number }>;
  is_frozen_row: boolean;
}

function contestStatus(c: Contest) {
  const now = Date.now();
  const start = new Date(c.starts_at).getTime();
  const end   = new Date(c.ends_at).getTime();
  if (now < start) return 'upcoming';
  if (now <= end)  return 'active';
  return 'past';
}

function timeLabel(c: Contest) {
  const status = contestStatus(c);
  const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (status === 'upcoming') return `Starts ${fmt(c.starts_at)}`;
  if (status === 'active')   return `Ends ${fmt(c.ends_at)}`;
  return `Ended ${fmt(c.ends_at)}`;
}

function ScoreboardModeIcon({ mode }: { mode: string }) {
  if (mode === 'hidden')  return <span title="Hidden scoreboard"><EyeOff    className="w-3.5 h-3.5 text-destructive"  /></span>;
  if (mode === 'frozen')  return <span title="Frozen scoreboard"><Snowflake  className="w-3.5 h-3.5 text-link" /></span>;
  return <span title="Live scoreboard"><Eye className="w-3.5 h-3.5 text-success" /></span>;
}

function ContestCard({ contest, onClick }: { contest: Contest; onClick: () => void }) {
  const status = contestStatus(contest);
  const statusColors: Record<string, string> = {
    upcoming: 'text-warning bg-warning/10 border-warning/20',
    active:   'text-success bg-success/10 border-success/20',
    past:     'text-muted-foreground bg-muted-foreground/10 border-muted-foreground/20',
  };

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 hover:border-muted-foreground cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-semibold text-base truncate">{contest.title}</h3>
          {contest.description && (
            <p className="text-muted-foreground text-sm mt-0.5 line-clamp-1">{contest.description}</p>
          )}
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeLabel(contest)}</span>
        <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{contest.problem_count} problems</span>
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{contest.registrant_count}</span>
        <span className="flex items-center gap-1 ml-auto">
          <ScoreboardModeIcon mode={contest.scoreboard_mode} />
          {contest.scoreboard_mode}
        </span>
      </div>
    </div>
  );
}

function ScoreboardPanel({ contestId, problemIds, frozen, hidden }: {
  contestId: string;
  problemIds: string[];
  frozen: boolean;
  hidden: boolean;
}) {
  const [rows, setRows] = useState<ScoreboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback((showSpinner = true) => {
    if (showSpinner) setLoading(true);
    api.get(`/api/contests/${contestId}/scoreboard`)
      .then(r => {
        if (r.data.success) setRows(r.data.data);
        else setError(r.data.error);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [contestId]);

  useEffect(() => { load(); }, [load]);

  // Live updates: join the contest room and refetch when a new verdict lands.
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => { socket.emit('join', `contest:${contestId}`); setLive(true); });
    socket.on('disconnect', () => setLive(false));
    socket.on('scoreboard_update', () => load(false));
    return () => { socket.emit('leave', `contest:${contestId}`); socket.disconnect(); };
  }, [contestId, load]);

  if (hidden) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <EyeOff className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Scoreboard is hidden during this contest.</p>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>;
  if (error)   return <p className="text-destructive text-sm py-4">{error}</p>;

  return (
    <div>
      {live && !frozen && (
        <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Live — updates automatically
        </div>
      )}
      {frozen && (
        <div className="flex items-center gap-2 bg-brand/10 border border-brand/30 rounded-lg px-4 py-2 mb-4 text-sm text-brand">
          <Snowflake className="w-4 h-4 flex-shrink-0" />
          Scoreboard is frozen — standings after the freeze time are not shown.
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="text-left py-2 px-3 w-8">#</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-center py-2 px-3">Solved</th>
                <th className="text-center py-2 px-3">Penalty</th>
                {problemIds.map((_, i) => (
                  <th key={i} className="text-center py-2 px-3 w-12">{String.fromCharCode(65 + i)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.user_id}
                  className={`border-b border-secondary ${row.is_frozen_row ? 'opacity-60' : ''}`}>
                  <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {row.is_frozen_row && <Snowflake className="w-3 h-3 text-brand flex-shrink-0" />}
                      <span className="text-foreground font-medium truncate max-w-[140px]">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-success">{row.solved}</td>
                  <td className="py-2 px-3 text-center text-muted-foreground font-mono text-xs">{row.penalty}</td>
                  {problemIds.map(pid => {
                    const p = row.problems[pid];
                    return (
                      <td key={pid} className="py-2 px-3 text-center">
                        {p?.accepted ? (
                          <span className="text-success text-xs font-mono">+{p.attempts > 1 ? p.attempts - 1 : ''}</span>
                        ) : p?.attempts ? (
                          <span className="text-destructive text-xs font-mono">-{p.attempts}</span>
                        ) : (
                          <span className="text-border">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ContestsPage() {
  const [contests, setContests]       = useState<Contest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Contest | null>(null);
  const [detail, setDetail]           = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab]                 = useState<'info' | 'scoreboard'>('info');
  const [registering, setRegistering]       = useState(false);
  const [registered, setRegistered]         = useState(false);
  const [sbData, setSbData]                 = useState<any>(null);
  const [startingVirtual, setStartingVirtual] = useState(false);
  const [virtualData, setVirtualData]       = useState<any>(null);

  // Faculty/admin live scoreboard control
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isFaculty = currentUser?.role === 'faculty' || currentUser?.role === 'admin';
  const [sbMode, setSbMode] = useState<'public' | 'frozen' | 'hidden'>('public');
  const [sbFreezeAt, setSbFreezeAt] = useState('');
  const [savingMode, setSavingMode] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/contests')
      .then(r => { if (r.data.success) setContests(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openContest = useCallback(async (c: Contest) => {
    setSelected(c); setDetail(null); setTab('info'); setSbData(null);
    setRegistered(false); setVirtualData(null);
    setSbMode(c.scoreboard_mode);
    setSbFreezeAt(c.freeze_at ? new Date(c.freeze_at).toISOString().slice(0, 16) : '');
    setFinalizeMsg(null);
    setDetailLoading(true);
    try {
      const [detRes, sbRes] = await Promise.allSettled([
        api.get(`/api/contests/${c.id}`),
        api.get(`/api/contests/${c.id}/scoreboard`),
      ]);
      if (detRes.status === 'fulfilled' && detRes.value.data.success)
        setDetail(detRes.value.data.data);
      if (sbRes.status === 'fulfilled' && sbRes.value.data.success)
        setSbData(sbRes.value.data);
    } catch {}
    finally { setDetailLoading(false); }
  }, []);

  const handleRegister = async () => {
    if (!selected) return;
    setRegistering(true);
    try {
      await api.post(`/api/contests/${selected.id}/register`);
      setRegistered(true);
    } catch {}
    finally { setRegistering(false); }
  };

  const handleStartVirtual = async () => {
    if (!selected) return;
    setStartingVirtual(true);
    try {
      await api.post(`/api/contests/${selected.id}/virtual`);
      const res = await api.get(`/api/contests/${selected.id}/virtual/scoreboard`);
      if (res.data.success) { setVirtualData(res.data.data); setTab('virtual' as any); }
    } catch {}
    finally { setStartingVirtual(false); }
  };

  const handleUpdateScoreboardMode = async () => {
    if (!selected) return;
    if (sbMode === 'frozen' && !sbFreezeAt) return;
    setSavingMode(true);
    try {
      const freeze = sbMode === 'frozen' ? sbFreezeAt : null;
      await api.patch(`/api/contests/${selected.id}/scoreboard-mode`, {
        scoreboard_mode: sbMode,
        freeze_at: freeze,
      });
      const patched = { scoreboard_mode: sbMode, freeze_at: freeze } as Partial<Contest>;
      setSelected(s => (s ? { ...s, ...patched } : s));
      setContests(prev => prev.map(c => (c.id === selected.id ? { ...c, ...patched } : c)));
      // Refresh the visible scoreboard to reflect the new mode immediately.
      const res = await api.get(`/api/contests/${selected.id}/scoreboard`);
      if (res.data.success) setSbData(res.data);
    } catch {}
    finally { setSavingMode(false); }
  };

  const handleFinalizeRatings = async () => {
    if (!selected) return;
    setFinalizing(true);
    setFinalizeMsg(null);
    try {
      const res = await api.post(`/api/rating/contest/${selected.id}/recompute`);
      const n = res.data?.data?.participants ?? 0;
      setFinalizeMsg(`✓ Ratings finalized for ${n} participant${n === 1 ? '' : 's'}.`);
    } catch (e: any) {
      setFinalizeMsg(e?.response?.data?.error || 'Failed to finalize ratings.');
    } finally {
      setFinalizing(false);
    }
  };

  const filterTab = (t: 'upcoming' | 'active' | 'past') =>
    contests.filter(c => contestStatus(c) === t);

  const TABS: { key: 'upcoming' | 'active' | 'past'; label: string }[] = [
    { key: 'active',   label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past',     label: 'Past' },
  ];
  const [listTab, setListTab] = useState<'upcoming' | 'active' | 'past'>('active');

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {/* List tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setListTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  listTab === t.key
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
                {t.key === 'active' && filterTab('active').length > 0 && (
                  <span className="ml-1.5 bg-success text-background text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {filterTab('active').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
          ) : filterTab(listTab).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No {listTab} contests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filterTab(listTab).map(c => (
                <ContestCard key={c.id} contest={c} onClick={() => openContest(c)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Slide-out detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-full max-w-2xl bg-card border-l border-border flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex-1 min-w-0">
                <h2 className="text-foreground font-semibold text-lg truncate">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{timeLabel(selected)}</span>
                  <span className="flex items-center gap-1">
                    <ScoreboardModeIcon mode={selected.scoreboard_mode} />
                    {selected.scoreboard_mode} scoreboard
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground ml-4">✕</button>
            </div>

            {/* Panel tabs */}
            <div className="flex border-b border-border">
              {[
                { key: 'info',        label: 'Info' },
                { key: 'scoreboard',  label: 'Scoreboard' },
                ...(contestStatus(selected) === 'past'
                  ? [{ key: 'virtual', label: 'Virtual' }]
                  : []),
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    tab === t.key ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
              ) : tab === ('virtual' as any) ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 bg-brand/10 border border-brand/30 rounded-xl p-4 text-sm text-brand">
                    <Play className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Virtual Participation</p>
                      <p className="text-muted-foreground text-xs">
                        Solve this past contest as if it's live. Your submissions are tracked separately
                        and won't affect the official scoreboard.
                      </p>
                    </div>
                  </div>

                  {virtualData ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-muted-foreground">Started <span className="text-foreground">{new Date(virtualData.started_at).toLocaleString()}</span></span>
                        <span className="text-success font-bold">{virtualData.solved} solved</span>
                        <span className="text-muted-foreground">Penalty <span className="text-foreground font-mono">{virtualData.penalty}</span></span>
                      </div>
                      <div className="space-y-1">
                        {(virtualData.problem_ids || []).map((pid: string, i: number) => {
                          const p = virtualData.problems?.[pid];
                          return (
                            <div key={pid} className="flex items-center gap-3 py-2 px-3 bg-background rounded-lg border border-border">
                              <span className="text-muted-foreground font-mono text-xs w-5">{String.fromCharCode(65 + i)}</span>
                              {p?.accepted ? (
                                <span className="text-success text-xs font-mono">AC +{p.attempts > 1 ? p.attempts - 1 : '0'} | {p.elapsed}min</span>
                              ) : p?.attempts ? (
                                <span className="text-destructive text-xs font-mono">WA ×{p.attempts}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Not attempted</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartVirtual}
                      disabled={startingVirtual}
                      className="w-full py-2.5 bg-brand-hover text-white text-sm font-medium rounded-lg hover:bg-brand disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {startingVirtual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {startingVirtual ? 'Starting…' : 'Start Virtual Participation'}
                    </button>
                  )}
                </div>
              ) : tab === 'info' ? (
                <div className="space-y-5">
                  {selected.description && <p className="text-muted-foreground text-sm">{selected.description}</p>}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-background border border-border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Problems</div>
                      <div className="text-foreground font-bold">{detail?.problems?.length ?? selected.problem_count}</div>
                    </div>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Registered</div>
                      <div className="text-foreground font-bold">{selected.registrant_count}</div>
                    </div>
                  </div>

                  {detail?.problems?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Problems</h3>
                      <div className="space-y-1">
                        {detail.problems.map((p: any, i: number) => (
                          <Link
                            key={p.id}
                            to={`/app/problems/${p.id}?contest=${selected.id}`}
                            className="flex items-center gap-3 py-2 px-3 bg-background rounded-lg border border-border hover:border-brand/40 transition-colors group"
                          >
                            <span className="text-muted-foreground font-mono text-xs w-5">{String.fromCharCode(65 + i)}</span>
                            <span className="text-foreground group-hover:text-brand text-sm flex-1 transition-colors">{p.title}</span>
                            <span className={`text-xs ${p.difficulty === 'easy' ? 'text-success' : p.difficulty === 'medium' ? 'text-warning' : 'text-destructive'}`}>
                              {p.difficulty}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {contestStatus(selected) !== 'past' && (
                    <button
                      onClick={handleRegister}
                      disabled={registering || registered}
                      className="w-full py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : registered ? <CheckCircle2 className="w-4 h-4" /> : null}
                      {registered ? 'Registered!' : registering ? 'Registering…' : 'Register'}
                    </button>
                  )}

                  {/* Faculty/admin: live scoreboard control (host-only on the backend) */}
                  {isFaculty && (
                    <div className="border border-border rounded-xl p-4 bg-background space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Eye className="w-3.5 h-3.5" /> Scoreboard Control
                      </div>
                      <div className="flex gap-2">
                        {(['public', 'frozen', 'hidden'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setSbMode(m)}
                            className={`flex-1 py-1.5 text-xs font-medium border rounded transition-colors ${
                              sbMode === m
                                ? 'bg-brand border-brand text-white'
                                : 'border-border text-muted-foreground hover:border-muted-foreground'
                            }`}
                          >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </button>
                        ))}
                      </div>
                      {sbMode === 'frozen' && (
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Freeze at</label>
                          <input
                            type="datetime-local"
                            value={sbFreezeAt}
                            onChange={e => setSbFreezeAt(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-link"
                          />
                        </div>
                      )}
                      <button
                        onClick={handleUpdateScoreboardMode}
                        disabled={savingMode || (sbMode === 'frozen' && !sbFreezeAt)}
                        className="w-full py-2 bg-[#238636] text-white text-sm font-medium rounded-lg hover:bg-[#2EA043] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {savingMode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {savingMode ? 'Updating…' : 'Update Scoreboard Mode'}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        Only the contest host can change this. Frozen hides standings after the freeze time; hidden conceals the board entirely during the contest.
                      </p>

                      {contestStatus(selected) === 'past' && (
                        <div className="pt-3 border-t border-border">
                          <button
                            onClick={handleFinalizeRatings}
                            disabled={finalizing}
                            className="w-full py-2 bg-purple text-white text-sm font-medium rounded-lg hover:bg-purple disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {finalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                            {finalizing ? 'Finalizing…' : 'Finalize Contest Ratings'}
                          </button>
                          {finalizeMsg && <p className="text-[11px] text-muted-foreground mt-2">{finalizeMsg}</p>}
                          <p className="text-[11px] text-muted-foreground mt-1">Applies Elo updates from final standings. Can only be run once per contest.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <ScoreboardPanel
                  contestId={selected.id}
                  problemIds={detail?.problems?.map((p: any) => p.id) ?? sbData?.problem_ids ?? []}
                  frozen={sbData?.frozen ?? false}
                  hidden={sbData?.hidden ?? false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
