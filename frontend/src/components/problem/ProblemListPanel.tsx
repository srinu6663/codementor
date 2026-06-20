import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import api from '../../lib/api';
import { Search, X, CircleCheck, Circle, ChevronRight } from 'lucide-react';

interface Problem {
  _id?: string;
  id?: string | number;
  title: string;
  difficulty: string;
  acceptance_rate?: number;
}

const diffColor = (d: string) => {
  switch (d?.toLowerCase()) {
    case 'easy':   return 'text-success';
    case 'medium': return 'text-warning';
    case 'hard':   return 'text-destructive';
    default:       return 'text-muted-foreground';
  }
};

interface Props {
  currentProblemId?: string;
  onClose: () => void;
  onSelect: (pid: string) => void;
}

export function ProblemListPanel({ currentProblemId, onClose, onSelect }: Props) {
  const [problems, setProblems]         = useState<Problem[]>([]);
  const [solved, setSolved]             = useState<string[]>([]);
  const [search, setSearch]             = useState('');
  const [diff, setDiff]                 = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [loading, setLoading]           = useState(true);
  const panelRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, sRes] = await Promise.allSettled([
          api.get('/api/problems', { params: { limit: 300, page: 1 } }),
          api.get('/api/student/solved-problems'),
        ]);
        if (pRes.status === 'fulfilled') {
          const d = pRes.value.data.data || pRes.value.data;
          setProblems(Array.isArray(d) ? d : (d.problems ?? []));
        }
        if (sRes.status === 'fulfilled' && sRes.value.data?.success) {
          setSolved(sRes.value.data.data ?? []);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = problems.filter(p => {
    const okSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const okDiff   = diff === 'All' || p.difficulty?.toLowerCase() === diff.toLowerCase();
    return okSearch && okDiff;
  });

  const handleBackdrop = (e: React.MouseEvent) => {
    if (!panelRef.current?.contains(e.target as Node)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={handleBackdrop}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Slide-in panel */}
      <motion.div
        ref={panelRef}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px] bg-card border-r border-border flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-foreground font-semibold text-sm">Problem List</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + difficulty filter */}
        <div className="px-4 py-3 border-b border-border space-y-2.5 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Search by title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-border text-foreground text-sm pl-9 pr-4 py-2 outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={`px-3 py-1 text-xs font-medium border transition-colors ${
                  diff === d
                    ? 'bg-brand border-brand text-white'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-border">
                <div className="w-4 h-4 bg-secondary animate-pulse" />
                <div className="flex-1 h-3.5 bg-secondary animate-pulse" />
                <div className="w-10 h-3.5 bg-secondary animate-pulse" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground text-sm">No problems match.</div>
          ) : (
            filtered.map((p, idx) => {
              const pid      = String(p._id || p.id || '');
              const isSolved  = solved.includes(pid);
              const isCurrent = pid === currentProblemId;
              return (
                <button
                  key={pid || idx}
                  onClick={() => onSelect(pid)}
                  className={`w-full flex items-center gap-3 px-5 py-3 border-b border-border text-left transition-colors ${
                    isCurrent ? 'bg-brand/8 hover:bg-brand/12' : 'hover:bg-secondary'
                  }`}
                >
                  {isSolved
                    ? <CircleCheck className="w-4 h-4 text-success flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-border flex-shrink-0" />
                  }
                  <span className={`flex-1 text-sm truncate ${isCurrent ? 'text-brand font-medium' : 'text-foreground'}`}>
                    {p.title}
                  </span>
                  <span className={`text-xs font-medium flex-shrink-0 ${diffColor(p.difficulty)}`}>
                    {p.difficulty}
                  </span>
                  {isCurrent && <ChevronRight className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border flex-shrink-0">
          <span className="text-xs text-muted-foreground">{filtered.length} problem{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </motion.div>
    </div>
  );
}
