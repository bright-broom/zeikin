import { memo, useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import type { Prefecture } from '@domain/tax';
import { texts } from '@constants';
import { formatYen as yen } from '@utils';
import { buildCurve, curveMaxFor, marginalTakeHome } from '../curve';
import type { CurvePoint } from '../curve';

interface CurveProps {
  salary: number;
  annualBonus: number;
  prefecture: Prefecture;
  hasSocialInsurance: boolean;
  isCareInsured: boolean;
  onSelect: (salaryMan: number) => void;
}

// 図の座標。viewBox の中だけで使う
const W = 720;
const H = 318;
const PAD = { left: 52, right: 14, top: 34, bottom: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const MAN = 10_000;

// 明細の内訳と同じ 3 色・同じ順番で、下から積み上げる
const BANDS = [
  { key: 'takeHome', color: 'var(--ai)', low: () => 0, high: (p: CurvePoint) => p.takeHome },
  { key: 'tax', color: 'var(--shu)', low: (p: CurvePoint) => p.takeHome, high: (p: CurvePoint) => p.takeHome + p.tax },
  { key: 'insurance', color: 'var(--ocher)', low: (p: CurvePoint) => p.takeHome + p.tax, high: (p: CurvePoint) => p.gross },
] as const;

// 目盛りは 4〜6 本になるきざみを選ぶ（万円）
const niceStep = (range: number) => [5, 10, 20, 25, 50, 100, 200].find((s) => range / s <= 6) ?? 500;

export const Curve = memo(({ salary, annualBonus, prefecture, hasSocialInsurance, isCareInsured, onSelect }: CurveProps) => {
  const base = useMemo(
    () => ({ annualBonus, prefecture, hasSocialInsurance, isCareInsured }),
    [annualBonus, prefecture, hasSocialInsurance, isCareInsured],
  );
  // 右端は月給が大きくはみ出したときだけ変わるので、スライダーを動かすたびには作り直さない
  const rightEnd = curveMaxFor(salary);
  const curve = useMemo(() => buildCurve(rightEnd, base), [rightEnd, base]);
  const marginal = useMemo(() => marginalTakeHome(salary, base), [salary, base]);
  const [hover, setHover] = useState<CurvePoint | null>(null);

  const { points, min, max, pensionCapAt } = curve;
  const yTop = Math.ceil((points[points.length - 1]?.gross ?? MAN) / MAN / niceStep(max)) * niceStep(max) * MAN;
  const x = (s: number) => PAD.left + ((s - min) / (max - min)) * PLOT_W;
  const y = (v: number) => PAD.top + (1 - v / yTop) * PLOT_H;

  const paths = BANDS.map((band) => {
    const upper = points.map((p) => `${x(p.salary).toFixed(1)},${y(band.high(p)).toFixed(1)}`);
    const lower = [...points].reverse().map((p) => `${x(p.salary).toFixed(1)},${y(band.low(p)).toFixed(1)}`);
    return { key: band.key, color: band.color, d: `M${upper.join('L')}L${lower.join('L')}Z` };
  });

  const xStep = niceStep(max - min);
  const xTicks: number[] = [];
  for (let s = Math.ceil(min / xStep) * xStep; s <= max; s += xStep) xTicks.push(s);
  const yStep = niceStep(yTop / MAN);
  const yTicks: number[] = [];
  for (let v = 0; v <= yTop / MAN; v += yStep) yTicks.push(v);

  const current = points.reduce((a, b) => (Math.abs(b.salary - salary) < Math.abs(a.salary - salary) ? b : a));
  const shown = hover ?? current;
  const inRange = salary >= min && salary <= max;

  const pick = (event: MouseEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const s = min + ((event.clientX - box.left) / box.width) * (max - min);
    return points.reduce((a, b) => (Math.abs(b.salary - s) < Math.abs(a.salary - s) ? b : a));
  };

  const rate = shown.gross > 0 ? Math.round((shown.takeHome / shown.gross) * 1000) / 10 : 0;
  const tipLeft = ((x(shown.salary) / W) * 100).toFixed(2);

  return (
    <section className="curve" aria-labelledby="curve-title">
      <h2 className="curve__title" id="curve-title">
        {texts.curve.title}
      </h2>
      <p className="curve__lead">
        {texts.curve.marginal(yen(marginal.takeHome), yen(marginal.deductions))}
        {marginal.gradeUp && texts.curve.gradeUp}
      </p>

      <figure className="curve__figure">
        <div className="curve__plot">
          <svg
            className="curve__svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={texts.curve.summary(min, max, salary, yen(current.takeHome))}
          >
            {yTicks.map((v) => (
              <g key={`y${v}`} className="curve__grid">
                <line x1={PAD.left} x2={W - PAD.right} y1={y(v * MAN)} y2={y(v * MAN)} />
                <text x={PAD.left - 8} y={y(v * MAN)} dy="0.32em" textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {xTicks.map((s) => (
              <text key={`x${s}`} className="curve__tick" x={x(s)} y={H - PAD.bottom + 22} textAnchor="middle">
                {s}
              </text>
            ))}
            <text className="curve__axis" x={PAD.left - 8} y={12} textAnchor="end">
              {texts.curve.yUnit}
            </text>
            <text className="curve__axis" x={W - PAD.right} y={H - 2} textAnchor="end">
              {texts.curve.xUnit}
            </text>

            {paths.map((p) => (
              <path key={p.key} className="curve__band" d={p.d} style={{ fill: p.color }} />
            ))}

            {pensionCapAt !== null && (
              <g className="curve__cap">
                <line x1={x(pensionCapAt)} x2={x(pensionCapAt)} y1={PAD.top - 20} y2={H - PAD.bottom} />
                <text x={x(pensionCapAt) + 6} y={PAD.top - 8}>
                  {texts.curve.pensionCap}
                </text>
              </g>
            )}

            {inRange && (
              <g className="curve__now" style={{ '--x': `${x(current.salary)}px` } as CSSProperties}>
                <line x1={x(current.salary)} x2={x(current.salary)} y1={y(current.gross)} y2={H - PAD.bottom} />
                <circle cx={x(current.salary)} cy={y(current.takeHome)} r={5.5} />
              </g>
            )}

            {hover && (
              <line
                className="curve__guide"
                x1={x(hover.salary)}
                x2={x(hover.salary)}
                y1={PAD.top}
                y2={H - PAD.bottom}
              />
            )}

            {/* なぞると読み、押すとその月給にする。キーボードでは左のスライダーが同じ役目をする */}
            <rect
              className="curve__hit"
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              aria-hidden="true"
              onPointerMove={(e) => setHover(pick(e))}
              onPointerLeave={() => setHover(null)}
              onClick={(e) => onSelect(pick(e).salary)}
            />
          </svg>

          <div className="curve__tip" style={{ left: `${tipLeft}%` }} aria-hidden="true" data-side={Number(tipLeft) > 60 ? 'left' : 'right'}>
            <p className="curve__tip-head">
              {texts.curve.tipSalary(shown.salary)}
              {!hover && <span>{texts.curve.now}</span>}
            </p>
            <dl>
              <div style={{ '--c': 'var(--ai)' } as CSSProperties}>
                <dt>{texts.slip.split.takeHome}</dt>
                <dd className="num">{yen(shown.takeHome)}</dd>
              </div>
              <div style={{ '--c': 'var(--shu)' } as CSSProperties}>
                <dt>{texts.slip.split.tax}</dt>
                <dd className="num">{yen(shown.tax)}</dd>
              </div>
              <div style={{ '--c': 'var(--ocher)' } as CSSProperties}>
                <dt>{texts.slip.split.insurance}</dt>
                <dd className="num">{yen(shown.insurance)}</dd>
              </div>
            </dl>
            <p className="curve__tip-rate">
              {texts.slip.rate} <span className="num">{rate}%</span>
            </p>
            {hover && hover.salary !== salary && <p className="curve__tip-hint">{texts.curve.clickHint}</p>}
          </div>
        </div>
        <figcaption className="curve__caption">{texts.curve.caption}</figcaption>
      </figure>
    </section>
  );
});
Curve.displayName = 'Curve';
