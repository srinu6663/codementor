import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Code2, Flame, Trophy, Target, TrendingUp, Minus, Play, Zap, ArrowRight, CalendarDays } from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { ContributionHeatmap } from '../components/dashboard/ContributionHeatmap';
import { TopicStrengthRadar } from '../components/dashboard/TopicStrengthRadar';
import { RecentSubmissions } from '../components/dashboard/RecentSubmissions';
import { RecommendedProblems } from '../components/dashboard/RecommendedProblems';
import { UpcomingContests } from '../components/dashboard/UpcomingContests';

interface DashboardData {
  stats: {
    problemsSolved: number;
    streak: number;
    rank: number;
    totalSubs: number;
    acRate: number;
  };
  heatmap: { date: string; count: number }[];
  topics: { topic: string; mastery: number }[];
  recentSubmissions?: any[];
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData>({
    stats: { problemsSolved: 0, streak: 0, rank: 0, totalSubs: 0, acRate: 0 },
    heatmap: [],
    topics: [],
  });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recLevel, setRecLevel] = useState<string | undefined>(undefined);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const firstName = user?.name?.split(' ')[0] || 'Student';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, recRes, dailyRes] = await Promise.allSettled([
          api.get('/api/student/dashboard'),
          api.get('/api/student/recommendations'),
          api.get('/api/student/daily-challenge'),
        ]);
        if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
          const d = dashRes.value.data.data;
          setData({
            stats: d.stats ?? { problemsSolved: 0, streak: 0, rank: 0, totalSubs: 0, acRate: 0 },
            heatmap: d.heatmap ?? [],
            topics: d.topics ?? [],
          });
          if (d.recentSubmissions?.length) setSubmissions(d.recentSubmissions);
        }
        if (recRes.status === 'fulfilled' && recRes.value.data?.data?.length) {
          setRecommendations(recRes.value.data.data);
          setRecLevel(recRes.value.data.level);
        }
        if (dailyRes.status === 'fulfilled' && dailyRes.value.data?.data) {
          setDailyChallenge(dailyRes.value.data.data);
        }
      } catch {
        // Fail silently
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Problems Solved',
      value: data.stats.problemsSolved.toString(),
      trend: `+${Math.floor(data.stats.problemsSolved * 0.05)} this week`,
      trendType: 'up' as const,
      icon: Code2,
      color: 'var(--brand)',
      link: '/app/problems',
    },
    {
      title: 'Day Streak',
      value: `${data.stats.streak}`,
      trend: data.stats.streak > 0 ? 'Keep it going!' : 'Start today!',
      trendType: 'neutral' as const,
      icon: Flame,
      color: 'var(--warning)',
      link: '/app/dashboard',
    },
    {
      title: 'Global Rank',
      value: data.stats.rank > 0 ? `#${data.stats.rank.toLocaleString()}` : '—',
      trend: 'Leaderboard',
      trendType: 'up' as const,
      icon: Trophy,
      color: 'var(--purple)',
      link: '/app/leaderboard',
    },
    {
      title: 'Acceptance Rate',
      value: `${data.stats.acRate}%`,
      trend: `${data.stats.totalSubs} total subs`,
      trendType: 'neutral' as const,
      icon: Target,
      color: 'var(--success)',
      link: '/app/problems',
    },
  ];

  const diffColor = (d: string) =>
    d?.toLowerCase() === 'easy'   ? 'var(--success)' :
    d?.toLowerCase() === 'medium' ? 'var(--warning)' :
    d?.toLowerCase() === 'hard'   ? 'var(--destructive)' : 'var(--muted-foreground)';

  const quickActions = [
    { label: 'Browse Problems', sub: 'Start solving today', icon: Play, to: '/app/problems', primary: true },
    {
      label: 'Daily Challenge',
      sub: dailyChallenge ? dailyChallenge.title : "Solve today's problem",
      icon: Zap,
      to: dailyChallenge ? `/app/problems/${dailyChallenge.id}` : '/app/problems',
      primary: false
    },
    { label: 'Leaderboard', sub: 'See your ranking', icon: Trophy, to: '/app/leaderboard', primary: false },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <DashboardHeader />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Welcome */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Welcome back, <span className="text-brand">{firstName}</span>!
            </h1>
            <p className="text-muted-foreground text-base">Here is your coding progress and upcoming tasks for this week.</p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className={`group flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${
                    action.primary
                      ? 'bg-gradient-to-br from-brand to-purple border-transparent text-white shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30'
                      : 'bg-card border-border hover:border-brand/40 hover:shadow-md'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${action.primary ? 'bg-white/15 ring-1 ring-white/20' : 'bg-brand/10'}`}>
                    <Icon className={`w-5 h-5 ${action.primary ? 'text-white' : 'text-brand'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[15px] font-semibold truncate ${action.primary ? 'text-white' : 'text-foreground'}`}>{action.label}</div>
                    <div className={`text-xs mt-0.5 truncate ${action.primary ? 'text-white/75' : 'text-muted-foreground'}`}>{action.sub}</div>
                  </div>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${action.primary ? 'text-white' : 'text-muted-foreground'}`} />
                </Link>
              );
            })}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={idx}
                  to={stat.link}
                  className="relative overflow-hidden bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
                >
                  {/* faint color wash */}
                  <div
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: stat.color }}
                  />
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">{stat.title}</div>
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklab, ${stat.color} 14%, transparent)`, color: stat.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-auto pt-2">
                    <div className="text-foreground text-4xl font-bold tracking-tight">{stat.value}</div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${stat.trendType === 'up' ? 'text-success' : 'text-muted-foreground'}`}>
                      {stat.trendType === 'up' ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {stat.trend}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Heatmap + Radar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ContributionHeatmap
                data={data.heatmap}
                totalSubmissions={data.stats.totalSubs}
                maxStreak={data.stats.streak}
              />
            </div>
            <div className="xl:col-span-1">
              <TopicStrengthRadar data={data.topics} />
            </div>
          </div>

          {/* Daily Challenge */}
          {dailyChallenge && (
            <Link
              to={`/app/problems/${dailyChallenge.id}`}
              className="group flex items-center gap-5 p-5 bg-card border border-warning/30 hover:border-warning/60 transition-colors"
            >
              <div className="p-3 bg-warning/10 border border-warning/30 flex-shrink-0">
                <CalendarDays className="w-6 h-6 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-widest text-warning mb-1">Daily Challenge</div>
                <div className="text-foreground font-semibold truncate group-hover:text-warning transition-colors">
                  {dailyChallenge.title}
                </div>
                {dailyChallenge.difficulty && (
                  <div className="text-xs mt-0.5" style={{ color: diffColor(dailyChallenge.difficulty) }}>
                    {dailyChallenge.difficulty}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-warning group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          )}

          {/* Recommended + Recent */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RecommendedProblems problems={recommendations as never} level={recLevel} />
            <RecentSubmissions submissions={submissions as never} />
          </div>

          {/* Upcoming */}
          <div className="grid grid-cols-1 gap-6">
            <UpcomingContests />
          </div>

        </div>
      </main>
    </div>
  );
}
