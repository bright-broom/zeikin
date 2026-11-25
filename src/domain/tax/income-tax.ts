import { BASIC_DEDUCTION_INCOME_TAX, INCOME_TAX_BRACKETS, RECONSTRUCTION_TAX_RATE, SALARY_DEDUCTION } from './rates';
import { floorTo } from './rounding';

/**
 * 給与所得の金額（所得税法 28条、別表第五）。令和8年分の給与所得控除で計算する。
 * 660万円未満は、収入を 4,000円単位に切り捨ててから率を掛ける（別表第五の作り方に合わせる）。
 * 住民税もこの金額を使う。
 */
export const salaryIncome = (revenue: number) => {
  if (revenue <= SALARY_DEDUCTION.minimumUntil) return Math.max(0, revenue - SALARY_DEDUCTION.minimum);
  if (revenue < 6_600_000) {
    const base = floorTo(revenue, 4_000);
    if (revenue <= 3_600_000) return Math.floor(base * 0.7 - 80_000);
    return Math.floor(base * 0.8 - 440_000);
  }
  if (revenue <= 8_500_000) return Math.floor(revenue * 0.9 - 1_100_000);
  return revenue - SALARY_DEDUCTION.max;
};

/** 所得税の基礎控除。合計所得金額で決まる */
export const basicDeduction = (totalIncome: number) =>
  BASIC_DEDUCTION_INCOME_TAX.find((row) => totalIncome <= row.upTo)?.amount ?? 0;

/** 年税額（所得税＋復興特別所得税）。課税所得は千円未満、税額は百円未満を切り捨てる */
export const incomeTaxFor = (taxableIncome: number) => {
  const taxable = floorTo(Math.max(0, taxableIncome), 1_000);
  if (taxable === 0) return 0;
  const bracket = INCOME_TAX_BRACKETS.find((row) => taxable <= row.upTo) ?? INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.length - 1];
  const base = Math.max(0, taxable * bracket.rate - bracket.deduction);
  return floorTo(base * (1 + RECONSTRUCTION_TAX_RATE), 100);
};

export interface IncomeTaxResult {
  /** 給与所得（年収 − 給与所得控除） */
  salaryIncome: number;
  basicDeduction: number;
  /** 課税所得（千円未満切り捨て） */
  taxableIncome: number;
  /** 年末調整後の年税額 */
  annual: number;
}

/**
 * 所得税（年末調整後の年税額）。本人だけが払う。
 * 引くのは本人が払った社会保険料だけで、会社が払った分は関係しない。
 */
export const calculateIncomeTax = (revenue: number, employeePremiumsAnnual: number): IncomeTaxResult => {
  const income = salaryIncome(revenue);
  const basic = basicDeduction(income);
  const taxableIncome = floorTo(Math.max(0, income - employeePremiumsAnnual - basic), 1_000);
  return { salaryIncome: income, basicDeduction: basic, taxableIncome, annual: incomeTaxFor(taxableIncome) };
};
