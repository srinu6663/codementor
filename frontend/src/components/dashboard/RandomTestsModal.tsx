import { useState } from 'react';
import api from '../../lib/api';
import { X, Loader2, Dice5, CheckCircle2, AlertCircle } from 'lucide-react';

const LANGS = [
  { id: 71, name: 'Python' },
  { id: 63, name: 'JavaScript' },
  { id: 62, name: 'Java' },
  { id: 54, name: 'C++' },
];

export function RandomTestsModal({ problemId, problemTitle, onClose, onDone }: {
  problemId: string; problemTitle: string; onClose: () => void; onDone?: () => void;
}) {
  const [genCode, setGenCode] = useState('');
  const [genLang, setGenLang] = useState(71);
  const [refCode, setRefCode] = useState('');
  const [refLang, setRefLang] = useState(71);
  const [count, setCount] = useState(5);
  const [makePublic, setMakePublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; requested: number; failures: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!genCode.trim() || !refCode.trim()) { setError('Generator and reference code are required'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api.post(`/api/faculty/problems/${problemId}/random-tests`, {
        count,
        generator_code: genCode, generator_language_id: genLang,
        reference_code: refCode, reference_language_id: refLang,
        make_public: makePublic,
      }, { timeout: 120000 });
      if (!res.data.success) throw new Error(res.data.error);
      setResult(res.data.data);
      onDone?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const codeBox = "w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-brand resize-y";
  const langSel = "bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="text-foreground font-semibold flex items-center gap-2"><Dice5 className="w-4 h-4 text-brand" /> Generate Random Tests</h3>
            <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-[400px]">{problemTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            The <b className="text-foreground">generator</b> prints a random input to stdout (it receives a seed integer on stdin).
            The <b className="text-foreground">reference solution</b> reads that input and prints the correct output. Fresh randomized
            hidden tests are minted so students can't hardcode answers.
          </p>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generator</label>
              <select value={genLang} onChange={e => setGenLang(parseInt(e.target.value, 10))} className={langSel}>
                {LANGS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <textarea rows={6} value={genCode} onChange={e => setGenCode(e.target.value)} spellCheck={false}
              placeholder={'import random, sys\nseed = int(sys.stdin.read() or 1)\nrandom.seed(seed)\nn = random.randint(1, 100)\nprint(n)'}
              className={codeBox} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference solution</label>
              <select value={refLang} onChange={e => setRefLang(parseInt(e.target.value, 10))} className={langSel}>
                {LANGS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <textarea rows={6} value={refCode} onChange={e => setRefCode(e.target.value)} spellCheck={false}
              placeholder={'n = int(input())\nprint(n * (n + 1) // 2)'}
              className={codeBox} />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-foreground">
              Count
              <input type="number" min={1} max={25} value={count} onChange={e => setCount(Math.min(25, Math.max(1, parseInt(e.target.value) || 5)))}
                className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-brand" />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={makePublic} onChange={e => setMakePublic(e.target.checked)} className="accent-brand w-4 h-4" />
              First 2 as visible samples
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          {result && (
            <div className="flex items-start gap-2 text-sm text-success bg-success/10 border border-success/30 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Created {result.created}/{result.requested} test cases.
              {result.failures?.length > 0 && <span className="text-warning ml-1">{result.failures.length} failed (check generator/reference).</span>}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:border-muted-foreground transition-colors">Close</button>
            <button onClick={generate} disabled={loading}
              className="flex-1 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dice5 className="w-4 h-4" />}
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
