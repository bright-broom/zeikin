import { calculatePay } from '@domain/tax';
import type { TaxCalculationInput } from '@domain/tax';

const MAN = 10_000;

export interface CurvePoint {
  /** 月給（万円） */
  salary: number;
  gross: number;
  takeHome: number;
  tax: number;
  insurance: number;
  pension: number;
}

export interface Curve {
  points: CurvePoint[];
  min: number;
  max: number;
  /** 厚生年金の保険料がこれ以上増えなくなる月給（万円）。範囲外や未加入なら null */
  pensionCapAt: number | null;
}

type BaseInput = Omit<TaxCalculationInput, 'monthlySalary'>;

const pointAt = (salary: number, base: BaseInput): CurvePoint => {
  const e = calculatePay({ ...base, monthlySalary: salary * MAN }).employee;
  const tax = e.incomeTax.monthly + e.residentTax.monthly;
  return {
    salary,
    gross: e.grossIncome.monthly,
    takeHome: e.takeHome.monthly,
    tax,
    insurance: e.totalTax.monthly - tax,
    pension: e.pensionInsurance?.monthly ?? 0,
  };
};

/**
 * 図の右端の月給（万円）。スライダーと同じ 120 万円を基本にし、いまの月給がはみ出すときだけ
 * 1.25 倍まで広げる。10 万円単位に丸めるので、少し動かしたくらいでは変わらない。
 */
export const curveMaxFor = (salary: number) => Math.min(500, Math.max(120, Math.ceil((salary * 1.25) / 10) * 10));

/** 月給を 10 万円から max まで変えたときの「賞与のない月」の内訳を並べる */
export const buildCurve = (max: number, base: BaseInput): Curve => {
  const min = 10;
  const step = max <= 150 ? 1 : Math.ceil((max - min) / 140);

  const points: CurvePoint[] = [];
  for (let s = min; s <= max; s += step) points.push(pointAt(s, base));
  if (points[points.length - 1]?.salary !== max) points.push(pointAt(max, base));

  return { points, min, max, pensionCapAt: findPensionCap(points) };
};

// 厚生年金は標準報酬月額 65 万円が上限。保険料が最後の値に達した最初の月給を探す
const findPensionCap = (points: CurvePoint[]): number | null => {
  const last = points[points.length - 1];
  if (!last || last.pension === 0) return null;
  const first = points.find((p) => p.pension === last.pension);
  if (!first || first === last) return null;
  return first.salary;
};

/**
 * 月給が 1 万円上がったときに、手取りがいくら増えるか（賞与のない月）。
 * 社会保険料は標準報酬月額の等級で段になって増えるので、その 1 万円で等級が上がるかも返す。
 */
export const marginalTakeHome = (salary: number, base: BaseInput) => {
  const now = calculatePay({ ...base, monthlySalary: salary * MAN });
  const next = calculatePay({ ...base, monthlySalary: (salary + 1) * MAN });
  const takeHome = next.employee.takeHome.monthly - now.employee.takeHome.monthly;
  return {
    takeHome,
    deductions: next.employee.grossIncome.monthly - now.employee.grossIncome.monthly - takeHome,
    gradeUp:
      base.hasSocialInsurance && next.basis.standardMonthly !== now.basis.standardMonthly,
  };
};
