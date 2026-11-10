export type Series = {
  label: string;
  color: string;
  points: [number, number][];
  dots?: boolean;
};

const W = 360;
const H = 180;
const PAD = { left: 36, right: 8, top: 10, bottom: 22 };

export function Chart({
  title,
  series,
  x = [0, 1],
  time,
}: {
  title: string;
  series: Series[];
  x?: [number, number];
  /** A cursor at this time, in seconds. */
  time?: number;
}) {
  const ys = series.flatMap((s) => s.points.map(([, y]) => y));
  let lo = Math.min(0, ...ys);
  let hi = Math.max(1, ...ys);
  const pad = (hi - lo) * 0.06;
  lo -= pad;
  hi += pad;
  const sx = (t: number) =>
    PAD.left + ((t - x[0]) / (x[1] - x[0])) * (W - PAD.left - PAD.right);
  const sy = (y: number) =>
    PAD.top + (1 - (y - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const ticks = Array.from(
    { length: 6 },
    (_, i) => x[0] + ((x[1] - x[0]) * i) / 5,
  );

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <line
          className="axis"
          x1={PAD.left}
          x2={W - PAD.right}
          y1={sy(0)}
          y2={sy(0)}
        />
        <line
          className="grid"
          x1={PAD.left}
          x2={W - PAD.right}
          y1={sy(1)}
          y2={sy(1)}
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              className="grid"
              x1={sx(t)}
              x2={sx(t)}
              y1={PAD.top}
              y2={H - PAD.bottom}
            />
            <text className="tick" x={sx(t)} y={H - 6} textAnchor="middle">
              {Math.round(t * 1000)}
            </text>
          </g>
        ))}
        <text className="tick" x={PAD.left - 4} y={sy(1) + 3} textAnchor="end">
          {Number(1).toFixed(1)}
        </text>
        <text className="tick" x={PAD.left - 4} y={sy(0) + 3} textAnchor="end">
          0
        </text>
        {series.map((s) =>
          s.dots ? (
            <g key={s.label} fill={s.color}>
              {s.points.map(([t, y]) => (
                <circle key={`${t}-${y}`} cx={sx(t)} cy={sy(y)} r={2.2} />
              ))}
            </g>
          ) : (
            <polyline
              key={s.label}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              points={s.points.map(([t, y]) => `${sx(t)},${sy(y)}`).join(" ")}
            />
          ),
        )}
        {time !== undefined && time >= x[0] && time <= x[1] && (
          <line
            className="cursor"
            x1={sx(time)}
            x2={sx(time)}
            y1={PAD.top}
            y2={H - PAD.bottom}
          />
        )}
      </svg>
      <ul className="legend">
        {series.map((s) => (
          <li key={s.label}>
            <span
              style={{ background: s.color, borderRadius: s.dots ? 4 : 1 }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
