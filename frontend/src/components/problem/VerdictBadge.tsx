export type Verdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE";

const VERDICT_CONFIG: Record<Verdict, { label: string; bg: string; text: string }> = {
  AC:  { label: "Accepted",               bg: "bg-success/10 border-success/40", text: "text-success" },
  WA:  { label: "Wrong Answer",           bg: "bg-destructive/10 border-destructive/40", text: "text-destructive" },
  TLE: { label: "Time Limit Exceeded",    bg: "bg-warning/10 border-warning/40", text: "text-warning" },
  MLE: { label: "Memory Limit Exceeded",  bg: "bg-warning/10 border-warning/40", text: "text-warning" },
  RE:  { label: "Runtime Error",          bg: "bg-destructive/10 border-destructive/40", text: "text-destructive" },
  CE:  { label: "Compile Error",          bg: "bg-destructive/10 border-destructive/40", text: "text-destructive" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict | string }) {
  const cfg = VERDICT_CONFIG[verdict as Verdict] ?? {
    label: verdict,
    bg: "bg-muted-foreground/10 border-muted-foreground/40",
    text: "text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold border ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
