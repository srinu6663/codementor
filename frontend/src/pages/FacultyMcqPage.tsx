import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import {
  Brain, Loader2, Plus, Trash2, X, Eye, EyeOff, ListChecks, BarChart2, ChevronLeft, Save,
} from 'lucide-react';

interface TestRow {
  id: string; title: string; category: string; duration_minutes: number;
  is_published: boolean; question_count: number; attempt_count: number;
}
interface QForm {
  question_text: string; options: string[]; correct_index: number;
  marks: number; topic: string; explanation: string;
}

const CATS = ['aptitude', 'technical', 'verbal', 'logical', 'general'];
const blankQ = (): QForm => ({ question_text: '', options: ['', ''], correct_index: 0, marks: 1, topic: '', explanation: '' });

export default function FacultyMcqPage() {
  const [mode, setMode] = useState<'list' | 'build' | 'results'>('list');
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/mcq/tests')
      .then(r => { if (r.data?.success) setTests(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // ── builder state ──
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildTitle, setBuildTitle] = useState('');
  const [questions, setQuestions] = useState<QForm[]>([]);
  const [buildLoading, setBuildLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openBuilder = async (id: string) => {
    setMode('build'); setBuildId(id); setBuildLoading(true);
    try {
      const r = await api.get(`/api/mcq/tests/${id}`);
      if (r.data?.success) {
        setBuildTitle(r.data.data.test.title);
        const qs: QForm[] = r.data.data.questions.map((q: any) => ({
          question_text: q.question_text, options: q.options, correct_index: q.correct_index,
          marks: q.marks, topic: q.topic || '', explanation: q.explanation || '',
        }));
        setQuestions(qs.length ? qs : [blankQ()]);
      }
    } finally { setBuildLoading(false); }
  };

  const saveQuestions = async () => {
    // light client validation
    for (const [i, q] of questions.entries()) {
      if (!q.question_text.trim()) return flash(`Q${i + 1}: question text required`);
      if (q.options.length < 2 || q.options.some(o => !o.trim())) return flash(`Q${i + 1}: fill all options`);
    }
    setSaving(true);
    try {
      await api.put(`/api/mcq/tests/${buildId}/questions`, { questions });
      flash('Questions saved'); load();
    } catch (e: any) {
      flash(e?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  // ── results state ──
  const [results, setResults] = useState<any>(null);
  const [resTitle, setResTitle] = useState('');
  const openResults = async (t: TestRow) => {
    setMode('results'); setResults(null); setResTitle(t.title);
    try {
      const r = await api.get(`/api/mcq/tests/${t.id}/results`);
      if (r.data?.success) setResults(r.data.data);
    } catch { /* ignore */ }
  };

  const togglePublish = async (t: TestRow) => {
    try {
      await api.patch(`/api/mcq/tests/${t.id}/publish`, { is_published: !t.is_published });
      load();
    } catch (e: any) { flash(e?.response?.data?.error || 'Failed'); }
  };
  const del = async (t: TestRow) => {
    if (!confirm(`Delete "${t.title}"? This removes all its questions and attempts.`)) return;
    try { await api.delete(`/api/mcq/tests/${t.id}`); load(); } catch { flash('Delete failed'); }
  };

  // ───────────────────────── BUILD MODE ─────────────────────────
  if (mode === 'build') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => { setMode('list'); load(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to tests
          </button>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ListChecks className="w-5 h-5 text-brand" /> {buildTitle}</h1>
            <button onClick={saveQuestions} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#238636] text-white text-sm rounded-lg hover:bg-[#2EA043] disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>

          {buildLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-brand animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand">Question {qi + 1}</span>
                    <button onClick={() => setQuestions(qs => qs.filter((_, i) => i !== qi))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <textarea value={q.question_text} onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, question_text: e.target.value } : x))}
                    placeholder="Question text" rows={2}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link resize-none mb-2" />
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" checked={q.correct_index === oi} onChange={() => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, correct_index: oi } : x))}
                          className="accent-success" title="Mark as correct" />
                        <input value={opt} onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o) } : x))}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-link" />
                        {q.options.length > 2 && (
                          <button onClick={() => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, options: x.options.filter((_, j) => j !== oi), correct_index: Math.min(x.correct_index, x.options.length - 2) } : x))}
                            className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {q.options.length < 6 && (
                      <button onClick={() => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, options: [...x.options, ''] } : x))}
                        className="text-xs text-link hover:underline">+ option</button>
                    )}
                    <input value={q.topic} onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, topic: e.target.value } : x))}
                      placeholder="Topic (optional)" className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-link w-40" />
                    <label className="text-xs text-muted-foreground flex items-center gap-1">marks
                      <input type="number" min={1} value={q.marks} onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, marks: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                        className="w-14 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-link" /></label>
                  </div>
                  <input value={q.explanation} onChange={e => setQuestions(qs => qs.map((x, i) => i === qi ? { ...x, explanation: e.target.value } : x))}
                    placeholder="Explanation shown after submit (optional)"
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:border-link mt-2" />
                </div>
              ))}
              <button onClick={() => setQuestions(qs => [...qs, blankQ()])}
                className="w-full py-2.5 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground rounded-xl text-sm flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Add question
              </button>
            </div>
          )}
        </div>
        {toast && <div className="fixed bottom-6 right-6 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground shadow-lg">{toast}</div>}
      </div>
    );
  }

  // ───────────────────────── RESULTS MODE ─────────────────────────
  if (mode === 'results') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setMode('list')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to tests
          </button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4"><BarChart2 className="w-5 h-5 text-brand" /> Results — {resTitle}</h1>
          {!results ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-brand animate-spin" /></div>
          ) : results.attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-16 text-center">No submissions yet.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Submissions', value: results.summary.attempts },
                  { label: 'Avg score', value: results.summary.avgScore },
                  { label: 'Top score', value: results.summary.maxScore },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                    <div className="text-2xl font-bold font-mono text-foreground">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Per-question accuracy</h2>
                <ResponsiveContainer width="100%" height={Math.max(160, results.questionStats.length * 28)}>
                  <BarChart data={results.questionStats.map((q: any, i: number) => ({ name: `Q${i + 1}`, accuracy: q.accuracy }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
                    <YAxis type="category" dataKey="name" width={40} tick={{ fill: 'var(--foreground)', fontSize: 11 }} stroke="var(--border)" />
                    <Tooltip cursor={{ fill: 'var(--accent)', opacity: 0.4 }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--foreground)' }} formatter={(v: any) => [`${v}%`, 'accuracy']} />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                      {results.questionStats.map((q: any, i: number) => (
                        <Cell key={i} fill={q.accuracy >= 60 ? 'var(--success)' : q.accuracy >= 35 ? 'var(--warning)' : 'var(--destructive)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                      <th className="text-left py-3 px-4">Student</th>
                      <th className="text-left py-3 px-4">Dept/Sec</th>
                      <th className="text-right py-3 px-4">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.attempts.map((a: any) => (
                      <tr key={a.userId} className="border-b border-secondary">
                        <td className="py-2.5 px-4"><div className="text-foreground">{a.name}</div><div className="text-xs text-muted-foreground">{a.rollNo || a.email}</div></td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">{[a.department, a.section].filter(Boolean).join(' / ') || '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-foreground">{a.score}/{a.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────── LIST MODE ─────────────────────────
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-brand" />
            <h1 className="text-2xl font-bold text-foreground">Aptitude & MCQ Tests</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#238636] text-white text-sm rounded-lg hover:bg-[#2EA043] transition-colors">
            <Plus className="w-4 h-4" /> New Test
          </button>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Create timed MCQ/aptitude tests, publish them to students, and review results.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No tests yet — create your first MCQ/aptitude test.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium truncate">{t.title}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t.category}</span>
                    {t.is_published
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-medium">Published</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">Draft</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.question_count} questions · {t.duration_minutes} min · {t.attempt_count} attempts</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openBuilder(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground text-xs rounded-lg transition-colors"><ListChecks className="w-3.5 h-3.5" /> Questions</button>
                  <button onClick={() => togglePublish(t)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground text-xs rounded-lg transition-colors">
                    {t.is_published ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                  </button>
                  <button onClick={() => openResults(t)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:text-brand hover:border-brand/50 text-xs rounded-lg transition-colors"><BarChart2 className="w-3.5 h-3.5" /> Results</button>
                  <button onClick={() => del(t)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateTestModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); load(); openBuilder(id); }} />}
      {toast && <div className="fixed bottom-6 right-6 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground shadow-lg">{toast}</div>}
    </div>
  );
}

function CreateTestModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('aptitude');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const r = await api.post('/api/mcq/tests', { title: title.trim(), category, duration_minutes: duration });
      if (r.data?.success) onCreated(r.data.data.id);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create test');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-semibold text-lg">New MCQ Test</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quantitative Aptitude — Set 1"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link capitalize">
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Duration (min)</label>
              <input type="number" min={1} value={duration} onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 30))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-link" />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:border-muted-foreground transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#238636] text-white rounded-lg text-sm hover:bg-[#2EA043] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create &amp; add questions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
