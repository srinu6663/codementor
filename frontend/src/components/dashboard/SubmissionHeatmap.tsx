export interface HeatCell { dow: number; hour: number; count: number; }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// GitHub-style activity grid: 7 days × 24 hours, intensity by submission count.
// Reveals deadline crunches and quiet stretches at a glance.
export function SubmissionHeatmap({ data }: { data: HeatCell[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No activity recorded.</p>;
  }
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const c of data) {
    if (c.dow >= 0 && c.dow < 7 && c.hour >= 0 && c.hour < 24) {
      grid[c.dow][c.hour] = c.count;
      if (c.count > max) max = c.count;
    }
  }
  const intensity = (v: number) => (v === 0 ? 0 : 0.18 + (v / max) * 0.82);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* hour axis */}
        <div className="flex">
          <div className="w-9 flex-shrink-0" />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 text-center text-[8px] text-muted-foreground">{h % 3 === 0 ? h : ''}</div>
          ))}
        </div>
        {grid.map((row, d) => (
          <div key={d} className="flex items-center">
            <div className="w-9 flex-shrink-0 text-[10px] text-muted-foreground pr-1.5 text-right">{DAYS[d]}</div>
            {row.map((v, h) => (
              <div
                key={h}
                className="flex-1 aspect-square m-[1px] rounded-sm"
                title={`${DAYS[d]} ${String(h).padStart(2, '0')}:00 — ${v} submission${v === 1 ? '' : 's'}`}
                style={{
                  background: v === 0
                    ? 'var(--secondary)'
                    : `color-mix(in oklab, var(--brand) ${Math.round(intensity(v) * 100)}%, transparent)`,
                }}
              />
            ))}
          </div>
        ))}
        {/* legend */}
        <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 0.3, 0.55, 0.8, 1].map((t, i) => (
            <div key={i} className="w-3 h-3 rounded-sm"
              style={{ background: t === 0 ? 'var(--secondary)' : `color-mix(in oklab, var(--brand) ${Math.round((0.18 + t * 0.82) * 100)}%, transparent)` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
