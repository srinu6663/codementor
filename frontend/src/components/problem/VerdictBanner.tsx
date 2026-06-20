import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { CheckCircle2, XCircle, WifiOff, ArrowRight, Bot, RefreshCw, X } from "lucide-react";

export type WorkspaceStatus = "idle" | "judging" | "ran" | "accepted" | "wrong" | "error";

interface VerdictBannerProps {
  status: WorkspaceStatus;
  data?: {
    failingTest?: { input: string | null; expected: string | null; output: string; hidden?: boolean } | null;
    runtimeMs?: number | null;
    memoryMB?: number | null;
    testsPassed?: number;
    testsTotal?: number;
    [key: string]: any;
  };
  errorMsg?: string;
  onNext?: () => void;
  onAskTutor?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function VerdictBanner({
  status,
  data,
  onNext,
  onAskTutor,
  onRetry,
  onDismiss,
  errorMsg,
}: VerdictBannerProps) {
  const { failingTest, runtimeMs, memoryMB, testsPassed = 0, testsTotal = 0 } = data || {};
  const fired = useRef(false);

  useEffect(() => {
    if (status === "accepted" && !fired.current) {
      fired.current = true;
      const end = Date.now() + 600;
      const frame = () => {
        confetti({
          particleCount: 4,
          spread: 60,
          startVelocity: 28,
          origin: { x: 0.5, y: 0.2 },
          colors: ["var(--success)", "var(--brand)", "var(--purple)"],
          disableForReducedMotion: true,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
    if (status !== "accepted") fired.current = false;
  }, [status]);

  if (status === "idle" || status === "judging" || status === "ran") return null;

  if (status === "accepted") {
    return (
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed bottom-6 right-6 z-50 w-[420px] rounded-lg shadow-2xl border border-success/30 bg-success/10 backdrop-blur-md px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-success font-semibold">Accepted</h3>
              <div className="flex items-center gap-2">
                {onNext && (
                  <button onClick={onNext} className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-white text-sm font-semibold hover:bg-[#16A34A] transition-colors rounded">
                    Next problem <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {onDismiss && (
                  <button onClick={onDismiss} className="p-1.5 text-success/70 hover:text-success hover:bg-success/20 rounded transition-colors" title="Dismiss">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground mt-0.5 mb-3">
              All {testsTotal || "all"} test cases passed. Nicely done.
            </p>
            {(runtimeMs || memoryMB) && (
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {runtimeMs && <Percentile label="Runtime" value={`${runtimeMs} ms`} beats={82} />}
                {memoryMB && <Percentile label="Memory" value={`${memoryMB} MB`} beats={71} />}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "wrong") {
    return (
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed bottom-6 right-6 z-50 w-[480px] rounded-lg shadow-2xl border border-destructive/30 bg-destructive/10 backdrop-blur-md px-5 py-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-destructive font-semibold">Wrong Answer</h3>
              <div className="flex items-center gap-2">
                {onAskTutor && (
                  <button onClick={onAskTutor} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple text-white text-sm font-medium hover:bg-purple transition-colors">
                    <Bot className="w-4 h-4" /> Ask AI Tutor
                  </button>
                )}
                {onDismiss && (
                  <button onClick={onDismiss} className="p-1.5 text-muted-foreground hover:text-foreground" title="Dismiss">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">
              Passed {testsPassed}/{testsTotal} test cases. Compare the outputs below:
            </p>
            {failingTest && (
              failingTest.hidden || failingTest.input == null ? (
                <p className="text-sm text-muted-foreground bg-card border border-border px-3 py-2">
                  Failed on a <span className="text-foreground">hidden</span> test case — the input and expected output are not shown. Think about edge cases your code may not handle.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <DiffCol label="Input" value={failingTest.input} />
                  <DiffCol label="Expected" value={failingTest.expected ?? ''} tone="text-success" />
                  <DiffCol label="Your output" value={failingTest.output} tone="text-destructive" />
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Network / execution error
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed bottom-6 right-6 z-50 w-[420px] rounded-lg shadow-2xl border border-warning/30 bg-warning/10 backdrop-blur-md px-5 py-4">
      <div className="flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-warning font-semibold">Submission couldn't be judged</h3>
            {onDismiss && (
              <button onClick={onDismiss} className="p-1.5 text-warning/70 hover:text-warning hover:bg-warning/20 rounded transition-colors" title="Dismiss">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-foreground mt-0.5 mb-3">{errorMsg || 'Your code is saved. Check your connection and try again.'}</p>
          {onRetry && (
            <button onClick={onRetry} className="flex w-fit items-center gap-1.5 px-3 py-1.5 border border-warning/50 text-warning text-sm font-medium hover:bg-warning/20 rounded transition-colors">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Percentile({ label, value, beats }: { label: string; value: string; beats: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-card border border-border overflow-hidden">
        <div className="h-full bg-success" style={{ width: `${beats}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">Beats {beats}% of submissions</div>
    </div>
  );
}

function DiffCol({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-card border border-border overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <pre className={`px-3 py-2 text-sm font-['JetBrains_Mono'] whitespace-pre-wrap ${tone}`}>{value}</pre>
    </div>
  );
}
