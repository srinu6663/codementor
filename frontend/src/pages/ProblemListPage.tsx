import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Search, CircleCheck, Circle, Clock, ChevronLeft, ChevronRight, Dices, X } from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface Problem {
  _id?: string;
  id?: string | number;
  title: string;
  difficulty: string;
  tags?: string[];
  acceptance_rate?: number;
}

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard'] as const;

const getDifficultyColor = (d: string) => {
  switch (d?.toLowerCase()) {
    case 'easy':   return 'text-success';
    case 'medium': return 'text-warning';
    case 'hard':   return 'text-destructive';
    default:       return 'text-muted-foreground';
  }
};

export default function ProblemListPage() {
  const [searchParams] = useSearchParams();
  const [problems, setProblems]             = useState<Problem[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm]         = useState(() => searchParams.get('search') || searchParams.get('tag') || '');
  const [difficulty, setDifficulty]         = useState<(typeof DIFFICULTY_FILTERS)[number]>(() => {
    const d = searchParams.get('difficulty');
    return (DIFFICULTY_FILTERS.find(f => f.toLowerCase() === d?.toLowerCase()) as typeof DIFFICULTY_FILTERS[number]) || 'All';
  });
  const [loading, setLoading]               = useState(true);
  const [page, setPage]                     = useState(1);
  const [total, setTotal]                   = useState(0);
  const perPage = 50;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page, limit: perPage };
        if (searchTerm)  params.search     = searchTerm;
        if (difficulty !== 'All') params.difficulty = difficulty;

        const [probRes, solvedRes] = await Promise.allSettled([
          api.get('/api/problems', { params }),
          api.get('/api/student/solved-problems'),
        ]);

        if (probRes.status === 'fulfilled') {
          const resData = probRes.value.data.data || probRes.value.data;
          if (Array.isArray(resData) && resData.length > 0) {
            setProblems(resData);
            setTotal(resData.length);
          } else if (resData.problems?.length > 0) {
            setProblems(resData.problems);
            setTotal(resData.total ?? resData.problems.length);
          }
        }

        if (solvedRes.status === 'fulfilled' && solvedRes.value.data?.success) {
          setSolvedProblems(solvedRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load problems', err);
      } finally {
        setLoading(false);
      }
    };
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, difficulty, page]);

  const easyCount   = problems.filter(p => p.difficulty?.toLowerCase() === 'easy').length;
  const mediumCount = problems.filter(p => p.difficulty?.toLowerCase() === 'medium').length;
  const hardCount   = problems.filter(p => p.difficulty?.toLowerCase() === 'hard').length;
  const solvedPct   = total > 0 ? Math.round((solvedProblems.length / total) * 100) : 0;

  const hasActiveFilters = difficulty !== 'All' || searchTerm !== '';

  const handlePickRandom = () => {
    if (problems.length === 0) return;
    const rnd = problems[Math.floor(Math.random() * problems.length)];
    const pid = rnd._id || rnd.id;
    window.location.href = `/app/problems/${pid}`;
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Problem Set</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {solvedProblems.length} of {total} solved
              </p>
            </div>
            <button
              onClick={handlePickRandom}
              className="flex items-center gap-2 px-5 py-2 bg-brand border border-brand text-white text-sm font-medium hover:bg-brand-hover hover:border-brand-hover transition-colors"
            >
              <Dices className="w-4 h-4" />
              Pick Random
            </button>
          </div>

          {/* Progress cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Donut */}
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-5">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="var(--brand)" strokeWidth="3"
                    strokeDasharray={`${solvedPct} ${100 - solvedPct}`}
                    pathLength={100}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-foreground text-sm font-bold font-mono">{solvedPct}%</span>
                </div>
              </div>
              <div>
                <div className="text-foreground text-2xl font-bold font-mono leading-none">{solvedProblems.length}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mt-1.5">Total Solved</div>
              </div>
            </div>

            {/* Easy */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-semibold text-success">Easy</span>
                <span className="text-foreground text-sm font-mono">{easyCount} <span className="text-muted-foreground">/ {total}</span></span>
              </div>
              <div className="h-1.5 w-full bg-background border border-border overflow-hidden">
                <div className="h-full bg-success" style={{ width: `${total > 0 ? (easyCount / total) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Medium */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-semibold text-warning">Medium</span>
                <span className="text-foreground text-sm font-mono">{mediumCount} <span className="text-muted-foreground">/ {total}</span></span>
              </div>
              <div className="h-1.5 w-full bg-background border border-border overflow-hidden">
                <div className="h-full bg-warning" style={{ width: `${total > 0 ? (mediumCount / total) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Hard */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-semibold text-destructive">Hard</span>
                <span className="text-foreground text-sm font-mono">{hardCount} <span className="text-muted-foreground">/ {total}</span></span>
              </div>
              <div className="h-1.5 w-full bg-background border border-border overflow-hidden">
                <div className="h-full bg-destructive" style={{ width: `${total > 0 ? (hardCount / total) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-card p-3 border border-border">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full bg-background border border-border text-foreground text-sm pl-10 pr-4 py-2 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div className="hidden md:block h-7 w-px bg-border"></div>

            <div className="flex items-center border border-border divide-x divide-border">
              {DIFFICULTY_FILTERS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d); setPage(1); }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${difficulty === d ? 'bg-secondary text-foreground' : 'bg-background text-muted-foreground hover:text-foreground hover:bg-card'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setDifficulty('All'); setSearchTerm(''); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground w-16">Status</th>
                    <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground">Title</th>
                    <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground w-32">Acceptance</th>
                    <th className="py-3.5 px-5 text-xs font-semibold text-muted-foreground w-32">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="bg-background">
                        <td className="py-3.5 px-5"><div className="h-4 bg-card animate-pulse rounded w-4" /></td>
                        <td className="py-3.5 px-5"><div className="h-4 bg-card animate-pulse rounded w-48" /></td>
                        <td className="py-3.5 px-5"><div className="h-4 bg-card animate-pulse rounded w-12" /></td>
                        <td className="py-3.5 px-5"><div className="h-4 bg-card animate-pulse rounded w-14" /></td>
                      </tr>
                    ))
                  ) : problems.length === 0 ? (
                    <tr className="bg-background">
                      <td colSpan={4} className="py-12 px-5 text-center text-muted-foreground text-sm whitespace-normal">
                        No problems match your filters.
                      </td>
                    </tr>
                  ) : problems.map((problem, idx) => {
                    const pid    = String(problem._id || problem.id || '');
                    const isSolved = solvedProblems.includes(pid);
                    return (
                      <tr
                        key={pid ?? idx}
                        className="hover:bg-secondary transition-colors bg-background border-b border-border last:border-0 group"
                      >
                        <td className="py-3.5 px-5">
                          {isSolved
                            ? <CircleCheck className="w-4 h-4 text-success" />
                            : <Circle className="w-4 h-4 text-border group-hover:text-muted-foreground transition-colors" />
                          }
                        </td>
                        <td className="py-3.5 px-5">
                          <Link
                            to={`/app/problems/${pid}`}
                            className="text-foreground group-hover:text-brand text-sm font-medium transition-colors"
                          >
                            {problem.title}
                          </Link>
                          {problem.tags && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {(problem.tags as string[]).slice(0, 3).map(tag => (
                                <span key={tag} className="text-[10px] bg-card border border-border text-muted-foreground px-2 py-0.5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-sm text-foreground font-mono">
                          {problem.acceptance_rate ? `${problem.acceptance_rate.toFixed(1)}%` : '—'}
                        </td>
                        <td className={`py-3.5 px-5 text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                          {problem.difficulty}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-muted-foreground text-sm py-2">
            <span>Showing {problems.length} of {total} problems</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-brand border border-brand text-white text-sm font-medium">
                {page}
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={problems.length < perPage}
                className="p-1.5 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
