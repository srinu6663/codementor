import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  User, Code2, Flame, Trophy, Target, Lock,
  CheckCircle2, AlertCircle, Loader2, Edit2
} from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { RatingBadge } from '../components/RatingBadge';
import { TwoFactorSetup } from '../components/auth/TwoFactorSetup';

const diffColor = (d: string) =>
  d?.toLowerCase() === 'easy'   ? 'var(--success)' :
  d?.toLowerCase() === 'medium' ? 'var(--warning)' :
  d?.toLowerCase() === 'hard'   ? 'var(--destructive)' : 'var(--muted-foreground)';


export default function ProfilePage() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ST';

  const [stats, setStats] = useState({ problemsSolved: 0, streak: 0, rank: 0, totalSubs: 0, acRate: 0, rating: 1200 });
  const [topics, setTopics] = useState<{ topic: string; mastery: number }[]>([]);
  const [languages, setLanguages] = useState<{ language: string; count: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingHistory, setRatingHistory] = useState<{ id: string; contest_title: string; old_rating: number; new_rating: number; delta: number; rank: number; created_at: string }[]>([]);
  const [badges, setBadges] = useState<{ key: string; label: string; icon: string; desc: string; earned: boolean; progress: number; cur: number; target: number }[]>([]);

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    api.get('/api/student/dashboard')
      .then(r => {
        if (r.data?.data) {
          const d = r.data.data;
          setStats(d.stats ?? stats);
          setTopics(d.topics ?? []);
          setLanguages(d.languages ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (user?.id) {
      api.get(`/api/rating/user/${user.id}`)
        .then(r => { if (r.data?.success) setRatingHistory(r.data.data.history ?? []); })
        .catch(() => {});
    }

    api.get('/api/student/badges')
      .then(r => { if (r.data?.success) setBadges(r.data.data.badges ?? []); })
      .catch(() => {});
  }, []);

  const handleNameSave = async () => {
    if (!nameVal.trim()) return;
    setNameLoading(true); setNameMsg(null);
    try {
      await api.put('/api/student/profile', { name: nameVal.trim() }, {});
      const updated = { ...user, name: nameVal.trim() };
      localStorage.setItem('user', JSON.stringify(updated));
      setNameMsg({ text: 'Name updated', ok: true });
      setEditingName(false);
    } catch {
      setNameMsg({ text: 'Failed to update name', ok: false });
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwMsg({ text: 'All fields are required', ok: false }); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ text: 'Passwords do not match', ok: false }); return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters', ok: false }); return;
    }
    setPwLoading(true); setPwMsg(null);
    try {
      await api.put('/api/student/profile', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      }, {});
      setPwMsg({ text: 'Password changed successfully', ok: true });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      setPwMsg({ text: e?.response?.data?.error || 'Failed to change password', ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  const totalLangSubs = languages.reduce((s, l) => s + parseInt(l.count), 0) || 1;

  const topTopics = [...topics].sort((a, b) => b.mastery - a.mastery).slice(0, 8);

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Profile card */}
          <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-5 flex-wrap">
            <div className="w-16 h-16 bg-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    className="bg-background border border-border text-foreground px-3 py-1.5 text-sm outline-none focus:border-brand transition-colors"
                    onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                    autoFocus
                  />
                  <button onClick={handleNameSave} disabled={nameLoading}
                    className="px-3 py-1.5 bg-brand text-white text-xs font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors">
                    {nameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1.5 border border-border">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-xl font-bold text-foreground">{user?.name || 'Student'}</h1>
                  <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {nameMsg && (
                <p className={`text-xs mb-1 ${nameMsg.ok ? 'text-success' : 'text-destructive'}`}>{nameMsg.text}</p>
              )}
              <p className="text-muted-foreground text-sm">{user?.email || ''}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 bg-brand/10 border border-brand/30 text-link uppercase tracking-wider font-bold capitalize">
                  {user?.role || 'student'}
                </span>
                {!loading && <RatingBadge rating={stats.rating} />}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Problems Solved', value: stats.problemsSolved, icon: Code2, color: 'var(--brand)' },
              { label: 'Day Streak',       value: stats.streak,         icon: Flame,  color: 'var(--warning)' },
              { label: 'Global Rank',      value: stats.rank > 0 ? `#${stats.rank}` : '—', icon: Trophy, color: 'var(--purple)' },
              { label: 'AC Rate',          value: `${stats.acRate}%`,  icon: Target, color: 'var(--success)' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-card border border-border border-l-[3px] p-4 flex items-center gap-3"
                     style={{ borderLeftColor: s.color }}>
                  <Icon className="w-5 h-5 flex-shrink-0" style={{ color: s.color }} />
                  <div>
                    <div className="text-xl font-bold text-foreground font-mono">
                      {loading ? '—' : s.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Language breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Languages Used</h2>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-6 bg-border animate-pulse rounded" />)}
                </div>
              ) : languages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet</p>
              ) : (
                <div className="space-y-3">
                  {languages.map(l => {
                    const pct = Math.round((parseInt(l.count) / totalLangSubs) * 100);
                    return (
                      <div key={l.language}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{l.language}</span>
                          <span className="text-xs text-muted-foreground font-mono">{l.count} subs · {pct}%</span>
                        </div>
                        <div className="h-2 bg-background border border-border overflow-hidden">
                          <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topic mastery */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Topic Mastery</h2>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-6 bg-border animate-pulse rounded" />)}
                </div>
              ) : topTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No topics solved yet</p>
              ) : (
                <div className="space-y-3">
                  {topTopics.map(t => (
                    <div key={t.topic}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground capitalize">{t.topic}</span>
                        <span className="text-xs text-muted-foreground font-mono">{t.mastery}%</span>
                      </div>
                      <div className="h-2 bg-background border border-border overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${t.mastery}%`,
                            background: t.mastery >= 80 ? 'var(--success)' : t.mastery >= 40 ? 'var(--brand)' : 'var(--warning)'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" /> Badges
                <span className="ml-auto text-xs text-muted-foreground">{badges.filter(b => b.earned).length}/{badges.length} earned</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {badges.map(b => (
                  <div
                    key={b.key}
                    title={b.earned ? b.desc : `${b.desc} — ${b.cur}/${b.target}`}
                    className={`flex flex-col items-center text-center p-3 rounded-lg border transition-all ${
                      b.earned ? 'border-warning/40 bg-warning/5' : 'border-border bg-background opacity-60'
                    }`}
                  >
                    <div className={`text-2xl mb-1 ${b.earned ? '' : 'grayscale'}`}>{b.icon}</div>
                    <div className="text-[11px] font-semibold text-foreground leading-tight">{b.label}</div>
                    {!b.earned && (
                      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-warning/60" style={{ width: `${b.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contest Rating */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple" /> Contest Rating
              <span className="ml-auto"><RatingBadge rating={stats.rating} /></span>
            </h2>
            {ratingHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No rated contests yet. Compete in a contest to earn a rating.
              </p>
            ) : (
              <div className="space-y-2">
                {ratingHistory.slice().reverse().map(h => (
                  <div key={h.id} className="flex items-center gap-3 py-2 px-3 bg-background border border-border text-sm">
                    <span className="flex-1 text-foreground truncate">{h.contest_title || 'Contest'}</span>
                    <span className="text-muted-foreground text-xs">Rank #{h.rank}</span>
                    <span className="font-mono text-muted-foreground text-xs">{h.old_rating}→{h.new_rating}</span>
                    <span className={`font-mono text-xs font-bold w-12 text-right ${h.delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {h.delta >= 0 ? '+' : ''}{h.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" /> Change Password
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: 'current', label: 'Current Password', placeholder: '••••••••' },
                { key: 'next',    label: 'New Password',     placeholder: 'Min 6 characters' },
                { key: 'confirm', label: 'Confirm New',      placeholder: 'Repeat new password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input
                    type="password"
                    value={pwForm[f.key as keyof typeof pwForm]}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-background border border-border text-foreground px-3 py-2.5 text-sm outline-none focus:border-brand transition-colors"
                  />
                </div>
              ))}
            </div>

            {pwMsg && (
              <div className={`flex items-center gap-2 mt-3 text-sm ${pwMsg.ok ? 'text-success' : 'text-destructive'}`}>
                {pwMsg.ok
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                }
                {pwMsg.text}
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={pwLoading}
              className="flex items-center gap-2 mt-4 px-5 py-2.5 bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" /> Two-Factor Authentication
            </h2>
            <TwoFactorSetup />
          </div>

        </div>
      </main>
    </div>
  );
}
