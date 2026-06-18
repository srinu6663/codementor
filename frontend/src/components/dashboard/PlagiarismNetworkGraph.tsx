import { useMemo, useState } from 'react';

export interface NetworkPair {
  similarity: number;
  student_a_name: string; student_a_email: string;
  student_b_name: string; student_b_email: string;
}

const edgeColor = (s: number) =>
  s >= 90 ? 'var(--destructive)' : s >= 75 ? 'var(--warning)' : 'var(--brand)';

// Force-directed similarity graph. Nodes = students, edges = flagged pairs.
// Tight clusters reveal groups of students copying from one another — the single
// most legible way to spot a "copy ring" at a glance.
//
// Layout is computed deterministically in a useMemo (a fixed number of
// Fruchterman–Reingold iterations) so there's no animation jitter and no extra
// dependency — just SVG.
export function PlagiarismNetworkGraph({ pairs }: { pairs: NetworkPair[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const W = 680, H = 440;
    const nodeMap = new Map<string, { id: string; name: string; degree: number; maxSim: number }>();
    const edges = pairs.map(p => {
      for (const [name, email] of [
        [p.student_a_name, p.student_a_email],
        [p.student_b_name, p.student_b_email],
      ] as const) {
        if (!nodeMap.has(email)) nodeMap.set(email, { id: email, name, degree: 0, maxSim: 0 });
        const nd = nodeMap.get(email)!;
        nd.degree += 1;
        nd.maxSim = Math.max(nd.maxSim, p.similarity);
      }
      return { a: p.student_a_email, b: p.student_b_email, sim: p.similarity };
    });
    const nodes = Array.from(nodeMap.values());
    const n = nodes.length;
    const pos = new Map<string, { x: number; y: number }>();
    nodes.forEach((nd, i) => {
      const ang = (i / Math.max(n, 1)) * Math.PI * 2;
      pos.set(nd.id, {
        x: W / 2 + Math.cos(ang) * Math.min(W, H) * 0.33,
        y: H / 2 + Math.sin(ang) * Math.min(W, H) * 0.33,
      });
    });

    const k = Math.sqrt((W * H) / Math.max(n, 1));
    for (let it = 0; it < 320; it++) {
      const disp = new Map<string, { x: number; y: number }>();
      nodes.forEach(nd => disp.set(nd.id, { x: 0, y: 0 }));
      // repulsion between every node pair
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const A = pos.get(nodes[i].id)!, B = pos.get(nodes[j].id)!;
          let dx = A.x - B.x, dy = A.y - B.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const rep = ((k * k) / d) * 0.045;
          dx /= d; dy /= d;
          const di = disp.get(nodes[i].id)!, dj = disp.get(nodes[j].id)!;
          di.x += dx * rep; di.y += dy * rep;
          dj.x -= dx * rep; dj.y -= dy * rep;
        }
      }
      // attraction along edges (stronger for higher similarity)
      for (const e of edges) {
        const A = pos.get(e.a)!, B = pos.get(e.b)!;
        let dx = A.x - B.x, dy = A.y - B.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const att = ((d * d) / k) * 0.0016 * (e.sim / 100 + 0.3);
        dx /= d; dy /= d;
        const da = disp.get(e.a)!, db = disp.get(e.b)!;
        da.x -= dx * att; da.y -= dy * att;
        db.x += dx * att; db.y += dy * att;
      }
      // apply (capped), pull gently toward centre, clamp to viewport
      for (const nd of nodes) {
        const p = pos.get(nd.id)!, dp = disp.get(nd.id)!;
        p.x += Math.max(-8, Math.min(8, dp.x));
        p.y += Math.max(-8, Math.min(8, dp.y));
        p.x += (W / 2 - p.x) * 0.012;
        p.y += (H / 2 - p.y) * 0.012;
        p.x = Math.max(28, Math.min(W - 28, p.x));
        p.y = Math.max(28, Math.min(H - 28, p.y));
      }
    }

    return {
      W, H,
      nodes: nodes.map(nd => ({ ...nd, ...pos.get(nd.id)! })),
      edges: edges.map(e => ({ ...e, A: pos.get(e.a)!, B: pos.get(e.b)! })),
    };
  }, [pairs]);

  if (!pairs.length) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No flagged pairs to graph.</p>;
  }

  const maxDeg = Math.max(...layout.nodes.map(nd => nd.degree), 1);

  return (
    <div>
      <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="w-full" style={{ maxHeight: 460 }}>
        {layout.edges.map((e, i) => {
          const dim = hover && e.a !== hover && e.b !== hover;
          return (
            <line
              key={i}
              x1={e.A.x} y1={e.A.y} x2={e.B.x} y2={e.B.y}
              stroke={edgeColor(e.sim)}
              strokeWidth={1 + (e.sim - 70) / 14}
              strokeOpacity={dim ? 0.08 : 0.5}
            />
          );
        })}
        {layout.nodes.map(nd => {
          const r = 6 + (nd.degree / maxDeg) * 11;
          const active = hover === nd.id;
          const dim = hover && !active && !layout.edges.some(e =>
            (e.a === hover && e.b === nd.id) || (e.b === hover && e.a === nd.id));
          return (
            <g
              key={nd.id}
              onMouseEnter={() => setHover(nd.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={nd.x} cy={nd.y} r={r}
                fill={edgeColor(nd.maxSim)}
                fillOpacity={dim ? 0.2 : active ? 1 : 0.85}
                stroke="var(--card)" strokeWidth={2}
              />
              {(active || nd.degree >= maxDeg) && !dim && (
                <text x={nd.x} y={nd.y - r - 4} textAnchor="middle" fontSize="11" fill="var(--foreground)">
                  {nd.name.length > 18 ? nd.name.slice(0, 17) + '…' : nd.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--destructive)' }} /> ≥90%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--warning)' }} /> 75–89%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--brand)' }} /> &lt;75%</span>
        <span className="ml-2">Bigger node = more matches · hover to isolate</span>
      </div>
    </div>
  );
}
