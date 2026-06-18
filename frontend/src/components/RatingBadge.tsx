// Codeforces-style rating tiers. Lower rank == lower rating == cooler tier.
//   < 1200          Newbie     gray
//   1200 – 1399     Pupil      green
//   1400 – 1599     Specialist cyan
//   1600 – 1899     Expert     blue
//   1900 – 2199     Candidate  purple
//   2200+           Master     orange/red

interface Tier {
  label: string;
  color: string;   // text + border accent
  bg: string;      // translucent pill background
}

function tierFor(rating: number): Tier {
  if (rating < 1200)  return { label: 'Newbie',     color: 'var(--muted-foreground)', bg: 'rgba(139,148,158,0.12)' };
  if (rating < 1400)  return { label: 'Pupil',      color: 'var(--success)', bg: 'rgba(63,185,80,0.12)' };
  if (rating < 1600)  return { label: 'Specialist', color: '#22D3EE', bg: 'rgba(34,211,238,0.12)' };
  if (rating < 1900)  return { label: 'Expert',     color: 'var(--link)', bg: 'rgba(88,166,255,0.12)' };
  if (rating < 2200)  return { label: 'Candidate',  color: '#A371F7', bg: 'rgba(163,113,247,0.12)' };
  return { label: 'Master', color: '#F97316', bg: 'rgba(249,115,22,0.14)' };
}

export function RatingBadge({ rating }: { rating: number }) {
  const safe = Number.isFinite(rating) ? Math.round(rating) : 1200;
  const tier = tierFor(safe);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-bold border"
      style={{ color: tier.color, background: tier.bg, borderColor: `${tier.color}55` }}
      title={`${tier.label} · ${safe}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: tier.color }}
      />
      {safe}
    </span>
  );
}
