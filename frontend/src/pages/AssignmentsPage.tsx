import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface AssignmentProblem {
  id: string;
  title: string;
  difficulty: string;
  is_solved: boolean;
}

interface Assignment {
  id: string;
  title: string;
  deadline: string;
  isExam?: boolean;
  problems: AssignmentProblem[];
  total: number;
  solved: number;
}

const diffColor = (d: string) =>
  d?.toLowerCase() === 'easy'   ? 'text-success' :
  d?.toLowerCase() === 'medium' ? 'text-warning' :
  d?.toLowerCase() === 'hard'   ? 'text-destructive' : 'text-muted-foreground';

const getDaysLeft = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = getDaysLeft(deadline);
  if (days < 0)
    return (
      <span className="flex items-center gap-1 text-destructive text-xs font-semibold">
        <AlertTriangle className="w-3.5 h-3.5" /> Overdue
      </span>
    );
  if (days === 0)
    return (
      <span className="flex items-center gap-1 text-warning text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> Due today
      </span>
    );
  if (days <= 2)
    return (
      <span className="flex items-center gap-1 text-warning text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> {days}d left
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <Clock className="w-3.5 h-3.5" /> {days}d left
    </span>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [expanded, setExpanded] = useState(false);
  const pct = assignment.total > 0
    ? Math.round((assignment.solved / assignment.total) * 100)
    : 0;
  const isOverdue = getDaysLeft(assignment.deadline) < 0;
  const isComplete = assignment.solved === assignment.total && assignment.total > 0;

  return (
    <div className={`bg-card border overflow-hidden transition-colors ${
      isComplete ? 'border-success/40' :
      isOverdue  ? 'border-destructive/40' : 'border-border'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-5 hover:bg-accent transition-colors text-left"
      >
        {/* Progress ring */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke={isComplete ? 'var(--success)' : isOverdue ? 'var(--destructive)' : 'var(--brand)'}
              strokeWidth="3"
              strokeDasharray={`${pct} ${100 - pct}`}
              pathLength={100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-foreground">{pct}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-foreground font-semibold text-[15px] truncate">{assignment.title}</h3>
            {assignment.isExam && (
              <span className="text-[10px] px-2 py-0.5 bg-destructive/15 border border-destructive/40 text-destructive font-bold uppercase tracking-wide">
                Proctored Exam
              </span>
            )}
            {isComplete && (
              <span className="text-[10px] px-2 py-0.5 bg-success/15 border border-success/40 text-success font-bold uppercase tracking-wide">
                Complete
              </span>
            )}
            {isOverdue && !isComplete && (
              <span className="text-[10px] px-2 py-0.5 bg-destructive/15 border border-destructive/40 text-destructive font-bold uppercase tracking-wide">
                Overdue
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-muted-foreground text-xs font-mono">
              {assignment.solved}/{assignment.total} solved
            </span>
            <DeadlineBadge deadline={assignment.deadline} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden md:flex flex-col gap-1.5 w-32 flex-shrink-0">
          <div className="h-1.5 w-full bg-background border border-border overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background: isComplete ? 'var(--success)' : isOverdue ? 'var(--destructive)' : 'var(--brand)'
              }}
            />
          </div>
          <span className="text-muted-foreground text-[11px] text-right">
            Due {new Date(assignment.deadline).toLocaleDateString()}
          </span>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {/* Expanded problem list */}
      {expanded && (
        <div className="border-t border-border">
          {assignment.problems.map((prob) => (
            <div
              key={prob.id}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-accent transition-colors"
            >
              {prob.is_solved
                ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                : <Circle className="w-4 h-4 text-border flex-shrink-0" />
              }
              <span className={`text-sm flex-1 ${prob.is_solved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {prob.title}
              </span>
              <span className={`text-xs font-medium w-16 text-right ${diffColor(prob.difficulty)}`}>
                {prob.difficulty}
              </span>
              {!prob.is_solved && (
                <Link
                  to={`/app/problems/${prob.id}?assignment=${assignment.id}${assignment.isExam ? '&proctor=1' : ''}`}
                  className="flex items-center gap-1 text-xs text-brand hover:text-[#60A5FA] transition-colors flex-shrink-0"
                >
                  {assignment.isExam ? 'Start Exam' : 'Solve'} <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/student/assignments');
        if (res.data?.success) setAssignments(res.data.data);
      } catch (err) {
        console.error('Failed to load assignments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const filtered = assignments.filter(a => {
    if (filter === 'completed') return a.solved === a.total && a.total > 0;
    if (filter === 'pending')   return a.solved < a.total || a.total === 0;
    return true;
  });

  const completedCount = assignments.filter(a => a.solved === a.total && a.total > 0).length;
  const overdueCount   = assignments.filter(a => getDaysLeft(a.deadline) < 0 && a.solved < a.total).length;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {completedCount}/{assignments.length} completed
                {overdueCount > 0 && (
                  <span className="ml-2 text-destructive font-medium">· {overdueCount} overdue</span>
                )}
              </p>
            </div>
            <div className="flex items-center border border-border divide-x divide-border">
              {(['all', 'pending', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    filter === f
                      ? 'bg-secondary text-foreground'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:bg-card'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          {assignments.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total', value: assignments.length, color: 'var(--brand)' },
                { label: 'Completed', value: completedCount, color: 'var(--success)' },
                { label: 'Overdue', value: overdueCount, color: 'var(--destructive)' },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 border-l-[3px]" style={{ borderLeftColor: stat.color }}>
                  <div className="text-2xl font-bold text-foreground font-mono">{stat.value}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Assignment cards */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-border rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-border rounded w-1/3" />
                    <div className="h-3 bg-border rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border p-16 text-center">
              <BookOpen className="w-12 h-12 text-border mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
              </h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                {filter === 'all'
                  ? "Your instructor hasn't assigned any work yet."
                  : `You have no ${filter} assignments right now.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => <AssignmentCard key={a.id} assignment={a} />)}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
