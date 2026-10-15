const W = 320;
const H = 140;
const PAD = { l: 36, r: 8, t: 10, b: 22 };

function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const step = Math.pow(10, Math.floor(Math.log10(max - min)));
  const s = (max - min) / step > 5 ? step * 2 : step;
  const ticks = [];
  for (let v = Math.ceil(min / s) * s; v <= max; v += s) ticks.push(Math.round(v * 100) / 100);
  return ticks.slice(0, 5);
}

const fmtShort = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtNum = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : String(Math.round(n * 10) / 10));

export function LineChart({ points, label }: { points: { x: number; y: number }[]; label: string }) {
  if (points.length < 2) return <p className="muted small">Log this exercise in at least two workouts to see a trend.</p>;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const padY = (y1 - y0) * 0.15 || y1 * 0.1 || 1;
  y0 = Math.max(0, y0 - padY);
  y1 += padY;
  const sx = (x: number) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
  const sy = (y: number) => H - PAD.b - ((y - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");

  return (
    <figure className="chart">
      <figcaption>{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {niceTicks(y0, y1).map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={PAD.l - 6} y={sy(t) + 3} textAnchor="end" className="tick">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className="tick">{fmtShort(x0)}</text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="tick">{fmtShort(x1)}</text>
        <path d={d} className="line" />
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} className="dot">
            <title>{`${fmtShort(p.x)}: ${fmtNum(p.y)}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}

export function BarChart({ bars, label, format = fmtNum }: { bars: { x: number; y: number }[]; label: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...bars.map((b) => b.y));
  const bw = (W - PAD.l - PAD.r) / bars.length;
  const sy = (y: number) => H - PAD.b - (y / max) * (H - PAD.t - PAD.b);
  return (
    <figure className="chart">
      <figcaption>{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {niceTicks(0, max).map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={PAD.l - 6} y={sy(t) + 3} textAnchor="end" className="tick">
              {format(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => (
          <rect key={i} x={PAD.l + i * bw + bw * 0.18} width={bw * 0.64} y={sy(b.y)} height={Math.max(0, H - PAD.b - sy(b.y))} rx={2} className={b.y ? "bar" : "bar empty"}>
            <title>{`Week of ${fmtShort(b.x)}: ${format(b.y)}`}</title>
          </rect>
        ))}
        <text x={PAD.l} y={H - 6} className="tick">{fmtShort(bars[0].x)}</text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="tick">This week</text>
      </svg>
    </figure>
  );
}
