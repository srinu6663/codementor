import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import {
  Users, Activity, FileText, Target, Search, X,
  CheckCircle2, Circle, BarChart2, BookOpen,
  Download, ChevronDown, ChevronUp, Loader2, TrendingUp, Plus, Shield
} from 'lucide-react';
import { VerdictPieChart } from '../components/dashboard/VerdictPieChart';
import { TopStudentsChart } from '../components/dashboard/TopStudentsChart';
import { TopicMasteryChart } from '../components/dashboard/TopicMasteryChart';
import { CohortComparisonChart, type CohortRow } from '../components/dashboard/CohortComparisonChart';
import { InsightCallouts, type Insight } from '../components/dashboard/InsightCallouts';
import { ClassTrendChart, type WeeklyRow } from '../components/dashboard/ClassTrendChart';
import { ScoreDistributionChart, type SolvedBucket } from '../components/dashboard/ScoreDistributionChart';
import { SubmissionHeatmap, type HeatCell } from '../components/dashboard/SubmissionHeatmap';
import { StudentDetailModal } from '../components/dashboard/StudentDetailModal';
import { CohortRadarChart } from '../components/dashboard/CohortRadarChart';
import { CohortDrilldown } from '../components/dashboard/CohortDrilldown';
import { CsvButton } from '../components/dashboard/CsvButton';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Stats {
  totalStudents: number; activeStudents: number;
  problemsSolved: number; totalSubs: number; acRate: number;
}

interface Student {
  id: string; name: string; email: string; joinedDate: string;
  department?: string | null; section?: string | null; year?: number | null; rollNo?: string | null;
  totalSubmissions: number; acceptedSubmissions: number;
  problemsSolved: number; acRate: number;
}

interface TopicRow { topic: string; solved_count: string; failed_count: string }
interface TimelineRow { date: string; count: number }
interface DiffRow { difficulty: string; count: string }

interface VerdictRow { name: string; value: number }
interface TopStudentRow { name: string; solved: number }
interface TopicMasteryRow { topic: string; solved: number; failed: number }

interface Analytics {
  topicWeakness: TopicRow[];
  submissionsTimeline: TimelineRow[];
  difficultyDistribution: DiffRow[];
  verdictDistribution?: VerdictRow[];
  topStudents?: TopStudentRow[];
  topicMastery?: TopicMasteryRow[];
  byDepartment?: CohortRow[];
  bySection?: CohortRow[];
  weeklyTrend?: WeeklyRow[];
  solvedDistribution?: SolvedBucket[];
  submissionHeatmap?: HeatCell[];
  languageDistribution?: { name: string; value: number }[];
  insights?: Insight[];
}

interface AssignmentItem {
  id: string; title: string; deadline: string;
}

interface AtRiskStudent {
  id: string; name: string; email: string;
  department?: string | null; section?: string | null;
  inactiveDays: number | null; totalSubmissions: number; acRate: number;
  reasons: string[];
}

interface ProgressData {
  problems: { id: string; title: string; difficulty: string }[];
  progress: {
    student: { id: string; name: string; email: string };
    solved: number; total: number;
    problems: { id: string; title: string; solved: boolean }[];
  }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const diffColor = (d: string) =>
  d?.toLowerCase() === 'easy'   ? 'var(--success)' :
  d?.toLowerCase() === 'medium' ? 'var(--warning)' :
  d?.toLowerCase() === 'hard'   ? 'var(--destructive)' : 'var(--muted-foreground)';



// ─── Mini Charts ───────────────────────────────────────────────────────────

function TopicWeaknessChart({ data }: { data: TopicRow[] }) {
  if (!data.length) return <EmptyState text="No topic data yet" />;
  const maxFailed = Math.max(...data.map(r => parseInt(r.failed_count) || 0), 1);
  return (
    <div className="space-y-2.5">
      {data.map(row => {
        const failed = parseInt(row.failed_count) || 0;
        const solved = parseInt(row.solved_count) || 0;
        const total  = failed + solved;
        const failPct = Math.round((failed / Math.max(total, 1)) * 100);
        const barW = Math.round((failed / maxFailed) * 100);
        return (
          <div key={row.topic}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground font-medium capitalize">{row.topic}</span>
              <span className="text-xs text-muted-foreground font-mono">{failPct}% fail rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary overflow-hidden">
                <div className="h-full bg-destructive/70 transition-all" style={{ width: `${barW}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono w-14 text-right">
                {failed}f / {solved}s
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineChart({ data }: { data: TimelineRow[] }) {
  if (!data.length) return <EmptyState text="No submissions in last 30 days" />;
  const W = 420, H = 90, PAD = 4;
  const counts = data.map(d => d.count);
  const maxC = Math.max(...counts, 1);
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.count / maxC) * (H - PAD * 2));
    return `${x},${y}`;
  }).join(' ');
  const fillPts = `${PAD},${H - PAD} ${pts} ${W - PAD},${H - PAD}`;
  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#tlGrad)" />
        <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

function DifficultyBars({ data }: { data: DiffRow[] }) {
  if (!data.length) return <EmptyState text="No solved problems yet" />;
  const order = ['easy', 'medium', 'hard'];
  const sorted = order
    .map(d => data.find(r => r.difficulty?.toLowerCase() === d))
    .filter(Boolean) as DiffRow[];
  const total = sorted.reduce((s, r) => s + (parseInt(r.count) || 0), 0) || 1;
  return (
    <div className="flex items-end gap-4 h-20">
      {sorted.map(r => {
        const cnt = parseInt(r.count) || 0;
        const pct = Math.round((cnt / total) * 100);
        return (
          <div key={r.difficulty} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-xs font-mono text-foreground">{cnt}</span>
            <div className="w-full flex items-end" style={{ height: '48px' }}>
              <div
                className="w-full transition-all"
                style={{ height: `${Math.max(pct, 4)}%`, background: diffColor(r.difficulty) }}
              />
            </div>
            <span className="text-[10px] capitalize" style={{ color: diffColor(r.difficulty) }}>{r.difficulty}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>;
}

// ─── Modals ────────────────────────────────────────────────────────────────

function StudentModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const acPct = student.totalSubmissions > 0
    ? Math.round((student.acceptedSubmissions / student.totalSubmissions) * 100) : 0;
  const radius = 28, circ = 2 * Math.PI * radius;
  const dashOff = circ - (acPct / 100) * circ;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-foreground font-semibold">{student.name}</h3>
            <p className="text-muted-foreground text-xs mt-0.5">{student.email}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* AC ring */}
          <div className="flex items-center justify-center">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r={radius} fill="none"
                  stroke={acPct >= 60 ? 'var(--success)' : acPct >= 30 ? 'var(--warning)' : 'var(--destructive)'}
                  strokeWidth="6"
                  strokeDasharray={`${circ}`}
                  strokeDashoffset={dashOff}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-foreground">{acPct}%</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">AC Rate</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Solved', value: student.problemsSolved, color: 'var(--success)' },
              { label: 'Submissions', value: student.totalSubmissions, color: 'var(--brand)' },
              { label: 'Accepted', value: student.acceptedSubmissions, color: 'var(--purple)' },
            ].map(s => (
              <div key={s.label} className="bg-background border border-border p-3 text-center border-t-2" style={{ borderTopColor: s.color }}>
                <div className="text-xl font-bold text-foreground font-mono">{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Joined {new Date(student.joinedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAssignmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle]       = useState('');
  const [deadline, setDeadline] = useState('');
  const [cidrInput, setCidrInput] = useState('');
  const [cidrs, setCidrs]       = useState<string[]>([]);
  const [cidrError, setCidrError] = useState('');
  const [isExam, setIsExam]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const addCIDR = () => {
    const v = cidrInput.trim();
    if (!v) return;
    // basic client-side format check
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/.test(v)) {
      setCidrError('Invalid CIDR — use format like 192.168.1.0/24');
      return;
    }
    setCidrError('');
    setCidrs(prev => prev.includes(v) ? prev : [...prev, v]);
    setCidrInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) { setError('Title and deadline are required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/faculty/assignments', {
        title: title.trim(),
        deadline,
        problem_ids: [],
        allowed_cidrs: cidrs,
        is_exam: isExam,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-semibold text-lg">New Assignment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link"
              placeholder="Midterm Lab — Arrays & Strings"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Deadline</label>
            <input
              type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link"
            />
          </div>

          {/* Proctored exam toggle */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none bg-background border border-border rounded-lg p-3">
            <input
              type="checkbox"
              checked={isExam}
              onChange={e => setIsExam(e.target.checked)}
              className="accent-destructive w-4 h-4 mt-0.5"
            />
            <span>
              <span className="text-sm text-foreground font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-destructive" /> Proctored exam
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Enforces fullscreen, tab-switch detection & keystroke logging. Leave off for normal assignments &amp; practice.
              </span>
            </span>
          </label>

          {/* IP Restriction (optional) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Shield className="w-3.5 h-3.5" /> Exam IP Restriction (optional)
            </label>
            <div className="flex gap-2">
              <input
                value={cidrInput} onChange={e => { setCidrInput(e.target.value); setCidrError(''); }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCIDR())}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link font-mono"
                placeholder="192.168.1.0/24"
              />
              <button type="button" onClick={addCIDR}
                className="px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground rounded-lg text-sm transition-colors">
                Add
              </button>
            </div>
            {cidrError && <p className="text-xs text-destructive mt-1">{cidrError}</p>}
            {cidrs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cidrs.map(c => (
                  <span key={c} className="flex items-center gap-1 bg-background border border-border rounded px-2 py-0.5 text-xs font-mono text-link">
                    {c}
                    <button type="button" onClick={() => setCidrs(p => p.filter(x => x !== c))}
                      className="text-muted-foreground hover:text-destructive ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave empty to allow submissions from any network. Add CIDR blocks to restrict to exam lab IPs.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:border-muted-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-[#238636] text-white rounded-lg text-sm hover:bg-[#2EA043] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ProctorRow {
  user_id: string; name: string; email: string; rollNo: string | null;
  tabSwitches: number; fullscreenExits: number; pastes: number; total: number;
  risk: 'low' | 'medium' | 'high';
}

function ProctorReportModal({ assignmentId, title, onClose }: { assignmentId: string; title: string; onClose: () => void }) {
  const [rows, setRows] = useState<ProctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/api/proctor/assignment/${assignmentId}`)
      .then(r => { if (r.data?.success) setRows(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const riskColor = (r: string) => r === 'high' ? 'text-destructive' : r === 'medium' ? 'text-warning' : 'text-success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="text-foreground font-semibold">Proctoring Report</h3>
            <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-[400px]">{title}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No proctoring events recorded for this assignment yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase border-b border-border">
                  <th className="text-left py-2 px-2">Student</th>
                  <th className="text-center py-2 px-2">Tab</th>
                  <th className="text-center py-2 px-2">FS exits</th>
                  <th className="text-center py-2 px-2">Pastes</th>
                  <th className="text-right py-2 px-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.user_id} className="border-b border-secondary">
                    <td className="py-2 px-2">
                      <div className="text-foreground font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.rollNo ? `${r.rollNo} · ` : ''}{r.email}</div>
                    </td>
                    <td className="text-center font-mono">{r.tabSwitches}</td>
                    <td className="text-center font-mono">{r.fullscreenExits}</td>
                    <td className="text-center font-mono">{r.pastes}</td>
                    <td className={`text-right font-semibold uppercase text-xs ${riskColor(r.risk)}`}>{r.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateContestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [startsAt, setStartsAt]     = useState('');
  const [endsAt, setEndsAt]         = useState('');
  const [mode, setMode]             = useState<'public' | 'frozen' | 'hidden'>('public');
  const [freezeAt, setFreezeAt]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) { setError('Title, start and end time are required'); return; }
    if (mode === 'frozen' && !freezeAt) { setError('Freeze time is required for frozen mode'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/contests', {
        title: title.trim(), description: description.trim() || undefined,
        starts_at: startsAt, ends_at: endsAt,
        scoreboard_mode: mode,
        freeze_at: mode === 'frozen' ? freezeAt : undefined,
        problem_ids: [],
      });
      onCreated(); onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create contest');
    } finally { setSaving(false); }
  };

  const modeInfo: Record<string, string> = {
    public:  'Live standings visible to all students at all times.',
    frozen:  'Standings freeze at a set time; students cannot see changes after that point.',
    hidden:  'Scoreboard hidden from students during the entire contest.',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-semibold text-lg">New Contest</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link"
              placeholder="Weekly Contest #1" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Description (optional)</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Starts at</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-link" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Ends at</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-link" />
            </div>
          </div>

          {/* Scoreboard Mode */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Scoreboard Mode</label>
            <div className="flex gap-2">
              {(['public', 'frozen', 'hidden'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 text-xs font-medium border rounded transition-colors ${
                    mode === m ? 'bg-brand border-brand text-white' : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{modeInfo[mode]}</p>
          </div>

          {mode === 'frozen' && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Freeze at</label>
              <input type="datetime-local" value={freezeAt} onChange={e => setFreezeAt(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-link" />
              <p className="text-xs text-muted-foreground mt-1">Standings after this time are hidden from students.</p>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:border-muted-foreground transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-[#238636] text-white rounded-lg text-sm hover:bg-[#2EA043] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Creating…' : 'Create Contest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgressModal({ assignmentId, assignmentTitle, onClose }: {
  assignmentId: string; assignmentTitle: string; onClose: () => void;
}) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'solved'>('solved');
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    api.get(`/api/faculty/assignments/${assignmentId}/progress`)
      .then(r => { if (r.data?.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/api/faculty/assignments/${assignmentId}/export`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'marks_export.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { }
  };

  const filtered = (data?.progress ?? [])
    .filter(p => p.student.name.toLowerCase().includes(search.toLowerCase()) ||
                 p.student.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const v = sort === 'name' ? a.student.name.localeCompare(b.student.name)
                                : a.solved - b.solved;
      return asc ? v : -v;
    });

  const toggle = (col: 'name' | 'solved') => {
    if (sort === col) setAsc(a => !a);
    else { setSort(col); setAsc(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-foreground font-semibold">{assignmentTitle}</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Student Progress</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground text-xs transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        ) : !data ? (
          <EmptyState text="Failed to load progress data" />
        ) : (
          <>
            <div className="px-6 py-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter students..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border text-foreground text-sm outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-left">
                      <button onClick={() => toggle('name')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                        Student {sort === 'name' ? (asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <button onClick={() => toggle('solved')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                        Progress {sort === 'solved' ? (asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </button>
                    </th>
                    {data.problems.map(p => (
                      <th key={p.id} className="py-3 px-3 text-center text-[10px] text-muted-foreground font-normal max-w-[80px]">
                        <div className="truncate" title={p.title}>{p.title}</div>
                        <div style={{ color: diffColor(p.difficulty) }} className="text-[9px] capitalize">{p.difficulty}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary">
                  {filtered.map(row => {
                    const pct = row.total > 0 ? Math.round((row.solved / row.total) * 100) : 0;
                    return (
                      <tr key={row.student.id} className="hover:bg-accent transition-colors">
                        <td className="py-3 px-4">
                          <div className="text-sm text-foreground font-medium">{row.student.name}</div>
                          <div className="text-xs text-muted-foreground">{row.student.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-secondary overflow-hidden min-w-[60px]">
                              <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{row.solved}/{row.total}</span>
                          </div>
                        </td>
                        {row.problems.map(p => (
                          <td key={p.id} className="py-3 px-3 text-center">
                            {p.solved
                              ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                              : <Circle className="w-4 h-4 text-border mx-auto" />
                            }
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={2 + (data.problems.length || 0)} className="py-10 text-center text-muted-foreground text-sm">
                        No students found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

type Tab = 'overview' | 'students' | 'analytics' | 'assignments';

export default function FacultyDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, activeStudents: 0, problemsSolved: 0, totalSubs: 0, acRate: 0 });
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [progressModal, setProgressModal] = useState<{ id: string; title: string } | null>(null);
  const [proctorReport, setProctorReport] = useState<{ id: string; title: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContestModal, setShowContestModal] = useState(false);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);

  useEffect(() => {
    api.get('/api/faculty/dashboard')
      .then(r => {
        if (r.data?.success) {
          setStats(r.data.data.stats ?? r.data.data);
          setAssignments(r.data.data.assignments ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get('/api/faculty/at-risk')
      .then(r => { if (r.data?.success) setAtRisk(r.data.data); })
      .catch(() => {});
  }, []);

  const loadStudents = useCallback(() => {
    if (students.length) return;
    setStudentsLoading(true);
    api.get('/api/faculty/students')
      .then(r => { if (r.data?.success) setStudents(r.data.data); })
      .catch(() => {})
      .finally(() => setStudentsLoading(false));
  }, [students.length]);

  const loadAnalytics = useCallback(() => {
    if (analytics) return;
    setAnalyticsLoading(true);
    api.get('/api/faculty/analytics')
      .then(r => { if (r.data?.success) setAnalytics(r.data.data); })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [analytics]);

  useEffect(() => {
    if (tab === 'students') loadStudents();
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadStudents, loadAnalytics]);

  // Load analytics eagerly so the Overview tab can surface insight callouts
  // without waiting for the user to open the Analytics tab.
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'students', label: 'Students' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'assignments', label: 'Assignments' },
  ];

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'var(--brand)' },
    { label: 'Active (7d)', value: stats.activeStudents, icon: Activity, color: 'var(--success)' },
    { label: 'Class AC Rate', value: `${stats.acRate}%`, icon: Target, color: 'var(--purple)' },
    { label: 'Total Submissions', value: stats.totalSubs, icon: FileText, color: 'var(--warning)' },
  ];

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
      {progressModal && (
        <ProgressModal
          assignmentId={progressModal.id}
          assignmentTitle={progressModal.title}
          onClose={() => setProgressModal(null)}
        />
      )}
      {showCreateModal && (
        <CreateAssignmentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            api.get('/api/faculty/dashboard')
              .then(r => { if (r.data?.success) setAssignments(r.data.data.assignments ?? []); })
              .catch(() => {});
          }}
        />
      )}
      {showContestModal && (
        <CreateContestModal
          onClose={() => setShowContestModal(false)}
          onCreated={() => {}}
        />
      )}
      {proctorReport && (
        <ProctorReportModal
          assignmentId={proctorReport.id}
          title={proctorReport.title}
          onClose={() => setProctorReport(null)}
        />
      )}

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Page title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Monitor student performance and class engagement.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await api.get('/api/pdf/class-report', { responseType: 'blob' });
                    const url = URL.createObjectURL(res.data);
                    const el = document.createElement('a'); el.href = url; el.download = 'class_report.pdf'; el.click();
                    URL.revokeObjectURL(url);
                  } catch { /* ignore */ }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-brand hover:border-brand/50 text-xs rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Class Report (PDF)
              </button>
              <button
                onClick={() => setShowContestModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-warning hover:border-warning/50 text-xs rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Contest
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div
                    className="p-2.5 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `color-mix(in oklab, ${s.color} 14%, transparent)`, color: s.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {loading ? '—' : s.value}
                    </div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.key
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {analytics?.insights && analytics.insights.length > 0 && (
                <InsightCallouts insights={analytics.insights} />
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand" /> Quick Summary
                </h2>
                <div className="space-y-3">
                  {[
                    { label: 'Problems solved class-wide', value: stats.problemsSolved },
                    { label: 'Active students this week', value: `${stats.activeStudents} / ${stats.totalStudents}` },
                    { label: 'Class acceptance rate', value: `${stats.acRate}%` },
                    { label: 'Total submissions', value: stats.totalSubs },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-semibold text-foreground font-mono">{loading ? '—' : row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple" /> Upcoming Deadlines
                </h2>
                {assignments.length === 0 ? (
                  <EmptyState text="No assignments created yet" />
                ) : (
                  <div className="space-y-2">
                    {assignments.slice(0, 5).map(a => {
                      const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000);
                      return (
                        <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-secondary last:border-0">
                          <span className="text-sm text-foreground truncate pr-4">{a.title}</span>
                          <span className={`text-xs font-medium whitespace-nowrap ${days < 0 ? 'text-destructive' : days <= 2 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* At-Risk Students (full width) */}
              <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" /> At-Risk Students
                  {atRisk.length > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">{atRisk.length}</span>
                  )}
                </h2>
                {atRisk.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No students currently flagged. 🎉</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {atRisk.slice(0, 12).map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-2 px-3 bg-background rounded-lg border border-border">
                        <div className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {s.name}
                            {(s.department || s.section) && (
                              <span className="ml-2 text-[10px] text-muted-foreground">{[s.department, s.section && `Sec ${s.section}`].filter(Boolean).join(' · ')}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
                          {s.reasons.map(reason => (
                            <span key={reason} className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium whitespace-nowrap">{reason}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* ── Students Tab ── */}
          {tab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-9 pr-3 py-2.5 bg-card border border-border text-foreground text-sm outline-none focus:border-brand transition-colors"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{filteredStudents.length} students</span>
              </div>

              <div className="bg-card border border-border overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                      <th className="py-3.5 px-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Solved</th>
                      <th className="py-3.5 px-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Submissions</th>
                      <th className="py-3.5 px-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">AC Rate</th>
                      <th className="py-3.5 px-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {studentsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {[1,2,3,4,5].map(j => (
                            <td key={j} className="py-3.5 px-5">
                              <div className="h-4 bg-border animate-pulse rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">
                          {studentSearch ? 'No matching students' : 'No students enrolled yet'}
                        </td>
                      </tr>
                    ) : filteredStudents.map(s => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className="hover:bg-accent transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-semibold text-sm flex-shrink-0">
                              {s.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                {s.name}
                                {(s.department || s.section) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                                    {[s.department, s.section && `Sec ${s.section}`, s.year && `Y${s.year}`].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{s.rollNo ? `${s.rollNo} · ` : ''}{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right text-sm font-mono text-success">{s.problemsSolved}</td>
                        <td className="py-3.5 px-5 text-right text-sm font-mono text-foreground">{s.totalSubmissions}</td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`text-sm font-mono font-medium ${
                            s.acRate >= 60 ? 'text-success' : s.acRate >= 30 ? 'text-warning' : 'text-destructive'
                          }`}>{s.acRate}%</span>
                        </td>
                        <td className="py-3.5 px-5 text-right text-xs text-muted-foreground">
                          {new Date(s.joinedDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Analytics Tab ── */}
          {tab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-brand animate-spin" />
                </div>
              ) : !analytics ? (
                <EmptyState text="Failed to load analytics" />
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Topic weakness */}
                  <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-destructive" /> Topic Weakness (class-wide)
                    </h2>
                    <TopicWeaknessChart data={analytics.topicWeakness} />
                  </div>

                  {/* Difficulty distribution */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-5">Difficulty Distribution</h2>
                    <DifficultyBars data={analytics.difficultyDistribution} />
                    <p className="text-xs text-muted-foreground mt-3 text-center">Accepted submissions</p>
                  </div>

                  {/* Submissions timeline */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand" /> Submission Activity (last 30 days)
                    </h2>
                    <TimelineChart data={analytics.submissionsTimeline} />
                  </div>

                  {/* Verdict distribution */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple" /> Verdict Distribution
                    </h2>
                    <VerdictPieChart data={analytics.verdictDistribution ?? []} />
                  </div>

                  {/* Top students */}
                  <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-success" /> Top Students (by problems solved)
                      </h2>
                      <CsvButton rows={analytics.topStudents ?? []} filename="top_students" />
                    </div>
                    <TopStudentsChart data={analytics.topStudents ?? []} />
                  </div>

                  {/* Topic mastery */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-brand" /> Topic Mastery (solved vs failed)
                      </h2>
                      <CsvButton rows={analytics.topicMastery ?? []} filename="topic_mastery" />
                    </div>
                    <TopicMasteryChart data={analytics.topicMastery ?? []} />
                  </div>

                  {/* Department comparison */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand" /> Department Comparison
                      </h2>
                      <CsvButton rows={analytics.byDepartment ?? []} filename="department_comparison" />
                    </div>
                    <CohortComparisonChart data={analytics.byDepartment ?? []} />
                  </div>

                  {/* Section comparison */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple" /> Section Comparison
                      </h2>
                      <CsvButton rows={analytics.bySection ?? []} filename="section_comparison" />
                    </div>
                    <CohortComparisonChart data={analytics.bySection ?? []} />
                  </div>

                  {/* Cohort topic radar */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Target className="w-4 h-4 text-brand" /> Topic Strengths by Cohort
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">Compare how departments, sections or years perform across topics.</p>
                    <CohortRadarChart />
                  </div>

                  {/* Cohort drill-down */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Users className="w-4 h-4 text-success" /> Cohort Explorer
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">Drill down department → section → student. Click any student for their full profile.</p>
                    <CohortDrilldown />
                  </div>

                  {/* Class performance trend (12 weeks) */}
                  <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-success" /> Class Trend (submissions &amp; AC rate, 12 wks)
                      </h2>
                      <CsvButton rows={analytics.weeklyTrend ?? []} filename="class_trend" />
                    </div>
                    <ClassTrendChart data={analytics.weeklyTrend ?? []} />
                  </div>

                  {/* Score distribution */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-brand" /> Problems-Solved Distribution
                      </h2>
                      <CsvButton rows={analytics.solvedDistribution ?? []} filename="solved_distribution" />
                    </div>
                    <ScoreDistributionChart data={analytics.solvedDistribution ?? []} />
                    <p className="text-xs text-muted-foreground mt-3 text-center">Students grouped by problems solved</p>
                  </div>

                  {/* Submission heatmap */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple" /> Activity Heatmap (last 60 days)
                    </h2>
                    <SubmissionHeatmap data={analytics.submissionHeatmap ?? []} />
                  </div>

                  {/* Language distribution */}
                  <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-warning" /> Language Distribution
                      </h2>
                      <CsvButton rows={analytics.languageDistribution ?? []} filename="language_distribution" />
                    </div>
                    {(analytics.languageDistribution ?? []).length === 0 ? (
                      <EmptyState text="No submissions yet" />
                    ) : (
                      <div className="space-y-2.5">
                        {(() => {
                          const langs = analytics.languageDistribution ?? [];
                          const max = Math.max(...langs.map(l => l.value), 1);
                          return langs.map(l => (
                            <div key={l.name}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-foreground font-medium capitalize">{l.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">{l.value}</span>
                              </div>
                              <div className="h-2 bg-secondary overflow-hidden rounded">
                                <div className="h-full bg-brand transition-all rounded" style={{ width: `${Math.round((l.value / max) * 100)}%` }} />
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Assignments Tab ── */}
          {tab === 'assignments' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] text-white text-xs rounded-lg hover:bg-[#2EA043] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New Assignment
                </button>
              </div>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-card border border-border animate-pulse" />
                ))
              ) : assignments.length === 0 ? (
                <div className="bg-card border border-border p-12 text-center">
                  <BookOpen className="w-12 h-12 text-border mx-auto mb-4" />
                  <p className="text-foreground font-medium">No assignments yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Create assignments from the assignment management page.</p>
                </div>
              ) : assignments.map(a => {
                const days = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000);
                return (
                  <div key={a.id} className="bg-card border border-border px-5 py-4 flex items-center gap-4 hover:border-muted-foreground transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                      <div className={`text-xs mt-0.5 ${days < 0 ? 'text-destructive' : days <= 2 ? 'text-warning' : 'text-muted-foreground'}`}>
                        Due {new Date(a.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {days < 0 && ' · Overdue'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setProgressModal({ id: a.id, title: a.title })}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground text-xs transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" /> View Progress
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.get(`/api/faculty/assignments/${a.id}/export`, {
                              responseType: 'blob'
                            });
                            const url = URL.createObjectURL(res.data);
                            const el = document.createElement('a'); el.href = url; el.download = 'marks_export.csv'; el.click();
                            URL.revokeObjectURL(url);
                          } catch { }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-success hover:border-success/50 text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>
                      <a
                        href={`/faculty/assignments/${a.id}/plagiarism`}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-warning hover:border-warning/50 text-xs transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" /> Plagiarism
                      </a>
                      <button
                        onClick={() => setProctorReport({ id: a.id, title: a.title })}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 text-xs transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" /> Proctor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
