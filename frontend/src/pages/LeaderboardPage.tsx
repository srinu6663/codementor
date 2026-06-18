import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Trophy, Medal, Search, Flame } from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { RatingBadge } from '../components/RatingBadge';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  rating: number;
  department?: string | null;
  section?: string | null;
  score: number;
  solvedCount: number;
  totalSubmissions: number;
}

interface RatingEntry { id: string; rank: number; name: string; rating: number; contestsParticipated: number }

export default function LeaderboardPage() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<'solved' | 'rating'>('solved');
  const [dept, setDept] = useState('all');
  const [ratingData, setRatingData] = useState<RatingEntry[]>([]);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const currentUserId = user?.id;

  const departments = Array.from(new Set(data.map(u => u.department).filter(Boolean))) as string[];

  useEffect(() => {
    api.get('/api/student/leaderboard')
      .then(r => { if (r.data?.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (board === 'rating' && !ratingLoaded) {
      setRatingLoading(true);
      api.get('/api/rating/leaderboard')
        .then(r => { if (r.data?.success) setRatingData(r.data.data); })
        .catch(() => {})
        .finally(() => { setRatingLoading(false); setRatingLoaded(true); });
    }
  }, [board, ratingLoaded]);

  const me = data.find(u => u.id === currentUserId);
  const visible = data.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) &&
    (dept === 'all' || u.department === dept)
  );

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-warning" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-[#9CA3AF]" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-[#B45309]" />;
    return <span className="text-muted-foreground font-mono text-sm w-5 text-center inline-block">{rank}</span>;
  };

  const getTierLabel = (rank: number) => {
    if (rank === 1) return { label: 'Grandmaster', color: 'var(--warning)' };
    if (rank <= 3)  return { label: 'Master', color: 'var(--purple)' };
    if (rank <= 10) return { label: 'Diamond', color: 'var(--brand)' };
    if (rank <= 25) return { label: 'Platinum', color: 'var(--success)' };
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {board === 'solved'
                ? `Top ${data.length} students ranked by problems solved.`
                : `Top ${ratingData.length} ranked by contest rating.`}
            </p>
          </div>

          {/* Board toggle */}
          <div className="flex gap-1 border-b border-border">
            {([
              { key: 'solved', label: 'By Problems' },
              { key: 'rating', label: 'By Rating' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setBoard(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  board === t.key ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {board === 'rating' && (
            <div className="bg-card border border-border overflow-hidden">
              {ratingLoading ? (
                <div className="py-16 text-center text-muted-foreground">Loading…</div>
              ) : ratingData.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">No rated users yet — finalize a contest's ratings first.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16 text-center">Rank</th>
                      <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                      <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 text-right">Rating</th>
                      <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 text-right hidden md:table-cell">Contests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {ratingData
                      .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
                      .map(u => {
                        const isMe = u.id === currentUserId;
                        return (
                          <tr key={u.id} className={isMe ? 'bg-brand/10 border-l-2 border-l-brand' : 'hover:bg-accent'}>
                            <td className="py-4 px-4 text-center">{getRankDisplay(u.rank)}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${isMe ? 'bg-brand' : 'bg-border'}`}>
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-foreground text-sm font-medium flex items-center gap-2">
                                  {u.name}
                                  {isMe && <span className="text-[10px] px-1.5 py-0.5 bg-brand/15 border border-brand/40 text-link uppercase tracking-wider font-bold">You</span>}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right"><div className="flex justify-end"><RatingBadge rating={u.rating} /></div></td>
                            <td className="py-4 px-4 text-right hidden md:table-cell text-sm font-mono text-muted-foreground">{u.contestsParticipated}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {board === 'solved' && <>
          {/* Top 3 podium */}
          {!loading && data.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[data[1], data[0], data[2]].map((entry, podiumIdx) => {
                if (!entry) return null;
                const heights = ['h-24', 'h-32', 'h-20'];
                const colors = ['#9CA3AF', 'var(--warning)', '#B45309'];
                const positions = [2, 1, 3];
                const isMe = entry.id === currentUserId;
                return (
                  <div key={entry.id} className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isMe ? 'bg-brand' : 'bg-border'}`}>
                      {entry.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-xs font-medium text-foreground text-center truncate max-w-[90px]">{entry.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{entry.solvedCount} solved</div>
                    <div
                      className={`w-full flex items-end justify-center border border-border ${heights[podiumIdx]}`}
                      style={{ background: `${colors[podiumIdx]}15`, borderBottomColor: colors[podiumIdx] }}
                    >
                      <span className="text-2xl font-bold pb-2" style={{ color: colors[podiumIdx] }}>
                        #{positions[podiumIdx]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Your rank banner */}
          {me && (
            <div className="bg-card border border-brand/40 border-l-[3px] border-l-brand p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {me.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold text-sm">{me.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-brand/15 border border-brand/40 text-link uppercase tracking-wider font-bold">You</span>
                </div>
                <div className="text-muted-foreground text-xs mt-0.5 font-mono">{me.solvedCount} solved · {me.totalSubmissions} submissions</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-foreground font-mono leading-none">#{me.rank}</div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">{me.score.toLocaleString()} pts</div>
              </div>
            </div>
          )}

          {/* Search + department filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-card border border-border text-foreground text-sm pl-10 pr-4 py-2.5 outline-none focus:border-brand transition-colors"
              />
            </div>
            {board === 'solved' && departments.length > 0 && (
              <select
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="bg-card border border-border text-foreground text-sm px-3 py-2.5 outline-none focus:border-brand transition-colors"
              >
                <option value="all">All departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          {/* Table */}
          <div className="bg-card border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 text-right">Rating</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 text-right">Solved</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 text-right">Score</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 text-right hidden md:table-cell">Submissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 bg-border animate-pulse rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {search ? 'No matching students' : 'No students yet'}
                    </td>
                  </tr>
                ) : visible.map(u => {
                  const isMe = u.id === currentUserId;
                  const tier = getTierLabel(u.rank);
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isMe
                          ? 'bg-brand/10 border-l-2 border-l-brand'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex justify-center items-center">
                          {getRankDisplay(u.rank)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${isMe ? 'bg-brand' : 'bg-border'}`}>
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-foreground text-sm font-medium flex items-center gap-2">
                              {u.name}
                              {isMe && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-brand/15 border border-brand/40 text-link uppercase tracking-wider font-bold">You</span>
                              )}
                            </div>
                            {tier && (
                              <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: tier.color }}>
                                <Flame className="w-2.5 h-2.5 inline mr-0.5" />
                                {tier.label}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end">
                          <RatingBadge rating={u.rating} />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-mono text-success font-semibold">{u.solvedCount}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-mono text-brand font-semibold">{u.score.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4 text-right hidden md:table-cell">
                        <span className="text-sm font-mono text-muted-foreground">{u.totalSubmissions}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Score = problems solved × 10 pts · Showing top {data.length} students
            </p>
          )}
          </>}
        </div>
      </main>
    </div>
  );
}
