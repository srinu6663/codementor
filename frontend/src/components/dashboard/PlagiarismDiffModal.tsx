import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, FileCode } from 'lucide-react';
import api from '../../lib/api';

interface DiffProblem { title: string; language: string; codeA: string | null; codeB: string | null; }
interface DiffData {
  similarity: number;
  studentA: { name: string; email: string };
  studentB: { name: string; email: string };
  problems: DiffProblem[];
}

const norm = (line: string) => line.trim().replace(/\s+/g, ' ');

// Returns the set of normalized non-empty lines that appear on both sides —
// a lightweight "matched lines" heuristic for highlighting copied code.
function matchedSet(a: string | null, b: string | null): Set<string> {
  const set = new Set<string>();
  if (!a || !b) return set;
  const bSet = new Set(b.split('\n').map(norm).filter(l => l.length > 2));
  for (const l of a.split('\n').map(norm)) {
    if (l.length > 2 && bSet.has(l)) set.add(l);
  }
  return set;
}

function CodePane({ code, matched, title }: { code: string | null; matched: Set<string>; title: string }) {
  if (!code) {
    return (
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1.5 font-medium">{title}</div>
        <div className="bg-background border border-border rounded-lg p-4 text-xs text-muted-foreground italic">
          No accepted submission for this problem.
        </div>
      </div>
    );
  }
  const lines = code.split('\n');
  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-muted-foreground mb-1.5 font-medium">{title}</div>
      <pre className="bg-background border border-border rounded-lg overflow-x-auto text-[11px] leading-relaxed font-mono">
        {lines.map((line, i) => {
          const hit = matched.has(norm(line)) && norm(line).length > 2;
          return (
            <div key={i} className="flex" style={hit ? { background: 'color-mix(in oklab, var(--warning) 18%, transparent)' } : undefined}>
              <span className="select-none text-muted-foreground/50 px-2 text-right w-9 flex-shrink-0">{i + 1}</span>
              <code className="px-2 whitespace-pre text-foreground">{line || ' '}</code>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export function PlagiarismDiffModal({ assignmentId, pairId, onClose }: {
  assignmentId: string; pairId: string; onClose: () => void;
}) {
  const [data, setData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/faculty/assignments/${assignmentId}/plagiarism/${pairId}/diff`)
      .then(r => { if (r.data?.success) setData(r.data.data); else setError('Failed to load'); })
      .catch(e => setError(e?.response?.data?.error || 'Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [assignmentId, pairId]);

  const matchedByProblem = useMemo(
    () => (data?.problems ?? []).map(p => matchedSet(p.codeA, p.codeB)),
    [data]
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-warning" />
            <div>
              <h3 className="text-foreground font-semibold">Code Comparison</h3>
              {data && (
                <p className="text-muted-foreground text-xs mt-0.5">
                  {data.studentA.name} vs {data.studentB.name} ·{' '}
                  <span className="font-semibold" style={{ color: data.similarity >= 90 ? 'var(--destructive)' : data.similarity >= 75 ? 'var(--warning)' : 'var(--brand)' }}>
                    {data.similarity.toFixed(0)}% similar
                  </span>
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-warning animate-spin" /></div>
        ) : error || !data ? (
          <p className="text-sm text-destructive py-16 text-center">{error || 'No data'}</p>
        ) : data.problems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">No accepted submissions to compare.</p>
        ) : (
          <div className="p-6 space-y-6">
            <p className="text-xs text-muted-foreground">
              Highlighted lines appear in <span className="font-semibold text-warning">both</span> submissions.
            </p>
            {data.problems.map((p, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-foreground">{p.title}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{p.language}</span>
                </div>
                <div className="flex flex-col lg:flex-row gap-4">
                  <CodePane code={p.codeA} matched={matchedByProblem[i]} title={data.studentA.name} />
                  <CodePane code={p.codeB} matched={matchedByProblem[i]} title={data.studentB.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
