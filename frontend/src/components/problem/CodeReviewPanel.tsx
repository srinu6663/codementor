import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Sparkles, Loader2, AlertCircle, RefreshCw, Gauge, Clock, Database, AlertTriangle, Lightbulb } from 'lucide-react';

interface Review {
  qualityScore: number;
  timeComplexity: string;
  spaceComplexity: string;
  codeSmells: string[];
  improvementSuggestions: string[];
}

function scoreColor(s: number) {
  if (s >= 85) return 'var(--success)';
  if (s >= 65) return 'var(--warning)';
  return 'var(--destructive)';
}

export function CodeReviewPanel({
  code,
  problemTitle,
  problemDescription,
  language,
  reviewKey,
}: {
  code: string;
  problemTitle?: string;
  problemDescription?: string;
  language?: string;
  reviewKey: number;
}) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    if (!code || !code.trim()) {
      setError('Solve the problem first — there is no accepted code to review yet.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const desc = [problemTitle ? `Title: ${problemTitle}` : null, problemDescription || null]
        .filter(Boolean).join('\n\n') || 'Coding problem';
      const res = await api.post('/api/ai/review-code', {
        problemDescription: desc,
        code: `Language: ${language || 'unknown'}\n\n${code}`,
      }, { timeout: 25000 });
      const data = res.data?.review || res.data?.data?.review;
      if (!data) throw new Error('No review returned');
      setReview(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to generate review. Try again.');
    } finally {
      setLoading(false);
    }
  }, [code, problemTitle, problemDescription, language]);

  // Fetch when the panel is shown for a fresh acceptance (reviewKey changes).
  useEffect(() => {
    if (reviewKey > 0) fetchReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewKey]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple" />
          <h3 className="text-foreground font-semibold">AI Code Review</h3>
        </div>
        <button
          onClick={fetchReview}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Re-run
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin mb-3 text-purple" />
          <p className="text-sm">Analysing your solution…</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {review && !loading && (
        <div className="space-y-5">
          {/* Score + complexity */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border p-4 flex flex-col items-center justify-center">
              <Gauge className="w-4 h-4 mb-1" style={{ color: scoreColor(review.qualityScore) }} />
              <div className="text-2xl font-bold font-mono" style={{ color: scoreColor(review.qualityScore) }}>
                {review.qualityScore}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Quality</div>
            </div>
            <div className="bg-card border border-border p-4 flex flex-col items-center justify-center">
              <Clock className="w-4 h-4 mb-1 text-link" />
              <div className="text-lg font-bold font-mono text-foreground">{review.timeComplexity}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</div>
            </div>
            <div className="bg-card border border-border p-4 flex flex-col items-center justify-center">
              <Database className="w-4 h-4 mb-1 text-purple" />
              <div className="text-lg font-bold font-mono text-foreground">{review.spaceComplexity}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Space</div>
            </div>
          </div>

          {/* Code smells */}
          {review.codeSmells?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-warning uppercase tracking-wider mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Code Smells
              </h4>
              <ul className="space-y-1.5">
                {review.codeSmells.map((s, i) => (
                  <li key={i} className="text-sm text-foreground bg-card border border-border px-3 py-2 border-l-2 border-l-warning">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {review.improvementSuggestions?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-success uppercase tracking-wider mb-2">
                <Lightbulb className="w-3.5 h-3.5" /> Suggestions
              </h4>
              <ul className="space-y-1.5">
                {review.improvementSuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-foreground bg-card border border-border px-3 py-2 border-l-2 border-l-success">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
