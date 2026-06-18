import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Brain, Loader2, Clock, CheckCircle2, XCircle, ChevronLeft, Trophy } from 'lucide-react';

interface TestCard {
  id: string; title: string; description: string | null; category: string;
  durationMinutes: number; questionCount: number;
  attempted: boolean; score: number | null; total: number | null;
}
interface Question { id: string; question_text: string; options: string[]; marks: number; topic: string | null; }
interface ReviewItem { questionId: string; selected: number | null; correctIndex: number; correct: boolean; explanation: string | null; }

const catColor = (c: string) => ({
  aptitude: 'var(--brand)', technical: 'var(--purple)', verbal: 'var(--success)',
  logical: 'var(--warning)', general: 'var(--muted-foreground)',
} as Record<string, string>)[c] || 'var(--brand)';

export default function AptitudePage() {
  const [view, setView] = useState<'list' | 'taking' | 'result'>('list');
  const [tests, setTests] = useState<TestCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<{ id: string; title: string; durationMinutes: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; review: ReviewItem[] } | null>(null);
  const submitRef = useRef<() => void>(() => {});

  const loadList = useCallback(() => {
    setLoading(true);
    api.get('/api/mcq/available')
      .then(r => { if (r.data?.success) setTests(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const startTest = async (id: string) => {
    try {
      const r = await api.get(`/api/mcq/${id}/start`);
      if (!r.data?.success) return;
      setActive(r.data.data.test);
      setQuestions(r.data.data.questions);
      setAnswers({});
      setSecondsLeft(r.data.data.test.durationMinutes * 60);
      setView('taking');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Could not start the test.');
      loadList();
    }
  };

  const submit = useCallback(async () => {
    if (!active || submitting) return;
    setSubmitting(true);
    try {
      const r = await api.post(`/api/mcq/${active.id}/submit`, { responses: answers });
      if (r.data?.success) { setResult(r.data.data); setView('result'); }
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }, [active, answers, submitting]);
  submitRef.current = submit;

  // Countdown timer with auto-submit at zero.
  useEffect(() => {
    if (view !== 'taking') return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(t); submitRef.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [view]);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answeredCount = Object.keys(answers).length;

  // ── List view ──
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full bg-background min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <Brain className="w-6 h-6 text-brand" />
              <h1 className="text-2xl font-bold text-foreground">Aptitude & MCQ Tests</h1>
            </div>
            <p className="text-muted-foreground text-sm mb-6">Timed assessments for placement preparation — aptitude, technical, verbal and logical reasoning.</p>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
            ) : tests.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No tests published yet. Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map(t => (
                  <div key={t.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: catColor(t.category), background: `color-mix(in oklab, ${catColor(t.category)} 14%, transparent)` }}>{t.category}</span>
                      {t.attempted && <span className="text-xs font-mono text-success flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{t.score}/{t.total}</span>}
                    </div>
                    <h3 className="text-foreground font-semibold">{t.title}</h3>
                    {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                      <span>{t.questionCount} questions</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t.durationMinutes} min</span>
                    </div>
                    <button
                      onClick={() => startTest(t.id)}
                      disabled={t.attempted}
                      className="mt-4 w-full py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {t.attempted ? 'Completed' : 'Start Test'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Taking view ──
  if (view === 'taking' && active) {
    const low = secondsLeft <= 60;
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-foreground font-semibold">{active.title}</h2>
            <p className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</p>
          </div>
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${low ? 'text-destructive' : 'text-foreground'}`}>
            <Clock className="w-4 h-4" /> {mmss(secondsLeft)}
          </div>
        </div>
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex gap-2 mb-3">
                <span className="text-xs font-bold text-brand">Q{qi + 1}</span>
                <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">{q.question_text}</p>
              </div>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const sel = answers[q.id] === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center gap-2 ${
                        sel ? 'border-brand bg-brand/10 text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground'
                      }`}>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${sel ? 'border-brand text-brand' : 'border-muted-foreground'}`}>{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button onClick={submit} disabled={submitting}
            className="w-full py-3 bg-[#238636] text-white rounded-lg font-medium hover:bg-[#2EA043] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Test
          </button>
        </div>
      </div>
    );
  }

  // ── Result view ──
  if (view === 'result' && result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    const qById = new Map(questions.map(q => [q.id, q]));
    return (
      <div className="flex flex-col h-full bg-background min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <button onClick={() => { setView('list'); setResult(null); loadList(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="w-4 h-4" /> Back to tests
            </button>
            <div className="bg-card border border-border rounded-xl p-6 text-center mb-6">
              <div className="text-4xl font-bold font-mono" style={{ color: pct >= 60 ? 'var(--success)' : pct >= 35 ? 'var(--warning)' : 'var(--destructive)' }}>
                {result.score}/{result.total}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{pct}% — {pct >= 60 ? 'Well done!' : 'Keep practicing'}</div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Review</h3>
            <div className="space-y-3">
              {result.review.map((rv, i) => {
                const q = qById.get(rv.questionId);
                if (!q) return null;
                return (
                  <div key={rv.questionId} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex gap-2 mb-2">
                      {rv.correct ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />}
                      <p className="text-sm text-foreground flex-1">Q{i + 1}. {q.question_text}</p>
                    </div>
                    <div className="space-y-1 ml-6">
                      {q.options.map((opt, oi) => {
                        const isCorrect = oi === rv.correctIndex;
                        const isSelected = oi === rv.selected;
                        return (
                          <div key={oi} className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                            isCorrect ? 'bg-success/10 text-success' : isSelected ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'
                          }`}>
                            <span className="font-bold">{String.fromCharCode(65 + oi)}</span> {opt}
                            {isCorrect && <span className="ml-auto text-[10px]">correct</span>}
                            {isSelected && !isCorrect && <span className="ml-auto text-[10px]">your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                    {rv.explanation && <p className="text-xs text-muted-foreground mt-2 ml-6 italic">{rv.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
