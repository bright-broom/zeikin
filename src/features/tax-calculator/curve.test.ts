import { describe, expect, it } from 'vitest';
import { buildCurve, curveMaxFor, marginalTakeHome } from './curve';

const tokyo = {
  annualBonus: 0,
  hasSocialInsurance: true,
  isCareInsured: false,
  prefecture: '東京都' as const,
};

describe('buildCurve', () => {
  it('10〜120 万円を 1 万円きざみで並べる', () => {
    const curve = buildCurve(curveMaxFor(30), tokyo);
    expect(curve.min).toBe(10);
    expect(curve.max).toBe(120);
    expect(curve.points).toHaveLength(111);
    expect(curve.points[20]?.salary).toBe(30);
  });

  it('右端は 120 万円が基本で、はみ出すときだけ広げる（上限 500 万円）', () => {
    expect(curveMaxFor(30)).toBe(120);
    expect(curveMaxFor(100)).toBe(130);
    expect(curveMaxFor(10_000)).toBe(500);
  });

  it('手取り・税金・社会保険を足すと額面になる', () => {
    for (const p of buildCurve(curveMaxFor(30), tokyo).points) {
      expect(p.takeHome + p.tax + p.insurance).toBe(p.gross);
    }
  });

  it('30 万円の点は、明細の計算と同じ手取りになる', () => {
    const p = buildCurve(curveMaxFor(30), tokyo).points.find((x) => x.salary === 30);
    expect(p?.takeHome).toBe(239_730);
  });

  it('月給がはみ出すときは範囲を広げ、終わりの点を必ず含める', () => {
    const curve = buildCurve(curveMaxFor(300), tokyo);
    expect(curve.max).toBe(380);
    expect(curve.points[curve.points.length - 1]?.salary).toBe(380);
  });

  it('厚生年金が頭打ちになる月給を見つける（標準報酬 65 万円の等級の下限 63.5 万円の次）', () => {
    expect(buildCurve(curveMaxFor(30), tokyo).pensionCapAt).toBe(64);
  });

  it('社会保険に入っていなければ、頭打ちの印は出さない', () => {
    expect(buildCurve(curveMaxFor(30), { ...tokyo, hasSocialInsurance: false }).pensionCapAt).toBeNull();
  });
});

describe('marginalTakeHome', () => {
  it('1 万円の昇給で増える手取りと、引かれる分を足すと 1 万円になる', () => {
    const m = marginalTakeHome(30, tokyo);
    expect(m.takeHome + m.deductions).toBe(10_000);
    expect(m.takeHome).toBeGreaterThan(0);
    expect(m.takeHome).toBeLessThan(10_000);
  });

  it('その 1 万円で標準報酬月額の等級が上がるかを返す（45→46 万円は 44 万→47 万円の等級へ）', () => {
    expect(marginalTakeHome(45, tokyo).gradeUp).toBe(true);
    expect(marginalTakeHome(33, tokyo).gradeUp).toBe(false); // 33万・34万円はどちらも 34 万円の等級
    expect(marginalTakeHome(45, { ...tokyo, hasSocialInsurance: false }).gradeUp).toBe(false);
  });
});
