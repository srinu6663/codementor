import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { X, Loader2, Flame } from 'lucide-react';

interface HeatCell {
  testIndex: number;
  isPublic: boolean;
  attempts: number;
  failures: number;
  failRate: number;
}

function rateColor(rate: number) {
  if (rate >= 60) return 'var(--destructive)';
  if (rate >= 30) return 'var(--warning)';
  if (rate > 0)   return 'var(--brand)';
  return 'var(--success)';
}

export function TestHeatmapModal({ problemId, problemTitle, onClose }: {
  problemId: string; problemTitle: string; onClose: () => void;
}) {
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [meta, setMeta] = useState<{ studentsAnalyzed: number; totalTests: number }>({ studentsAnalyzed: 0, totalTests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/faculty/problems/${problemId}/test-heatmap`)
      .then(r => {
        if (r.data?.success) {
          setCells(r.data.data.heatmap || []);
          setMeta({ studentsAnalyzed: r.data.data.studentsAnalyzed, totalTests: r.data.data.totalTests });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [problemId]);

  const worst = cells.reduce((m, c) => (c.failRate > (m?.failRate ?? -1) ? c : m), null as HeatCell | null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="text-foreground font-semibold flex items-center gap-2"><Flame className="w-4 h-4 text-destructive" /> Concept Heatmap</h3>
            <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-[380px]">{problemTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
          ) : cells.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No graded submissions yet for this problem.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Based on the latest attempt from <span className="text-foreground font-semibold">{meta.studentsAnalyzed}</span> student{meta.studentsAnalyzed === 1 ? '' : 's'}.
                {worst && worst.failRate > 0 && (
                  <> Most-failed: <span className="text-destructive font-semibold">Test {worst.testIndex} ({worst.failRate}%)</span>.</>
                )}
              </p>
              <div className="space-y-2.5">
                {cells.map(c => (
                  <div key={c.testIndex}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-foreground font-medium">
                        Test Case {c.testIndex}
                        <span className="ml-2 text-[10px] text-muted-foreground">{c.isPublic ? 'sample' : 'hidden'}</span>
                      </span>
                      <span className="font-mono text-muted-foreground">{c.failures}/{c.attempts} failed · {c.failRate}%</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.failRate}%`, background: rateColor(c.failRate) }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
