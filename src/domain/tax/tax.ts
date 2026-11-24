import type { Prefecture } from './rates';

export interface TaxCalculationInput {
  /** 月給（額面・円） */
  monthlySalary: number;
  /** 賞与の年間合計（額面・円）。夏冬 2回に等分して計算する */
  annualBonus: number;
  /** 健康保険・厚生年金に加入しているか（会社員の通常の働き方なら加入） */
  hasSocialInsurance: boolean;
  /** 40〜64歳か（介護保険料がかかる） */
  isCareInsured: boolean;
  /** 協会けんぽの加入支部 */
  prefecture: Prefecture;
}

export interface MonthlyAnnual {
  /** 賞与のない月の 1か月分 */
  monthly: number;
  /** 月給 12か月分と賞与を合わせた 1年分 */
  annual: number;
}

export interface TaxCalculationResult {
  employee: {
    salary: MonthlyAnnual;
    bonus: MonthlyAnnual;
    grossIncome: MonthlyAnnual;
    incomeTax: MonthlyAnnual;
    residentTax: MonthlyAnnual;
    healthInsurance: MonthlyAnnual;
    careInsurance?: MonthlyAnnual;
    childSupport?: MonthlyAnnual;
    pensionInsurance?: MonthlyAnnual;
    employmentInsurance: MonthlyAnnual;
    totalTax: MonthlyAnnual;
    takeHome: MonthlyAnnual;
  };
  employer: {
    healthInsurance: MonthlyAnnual;
    careInsurance?: MonthlyAnnual;
    childSupport?: MonthlyAnnual;
    pensionInsurance?: MonthlyAnnual;
    childContribution?: MonthlyAnnual;
    employmentInsurance: MonthlyAnnual;
    workersComp: MonthlyAnnual;
    total: MonthlyAnnual;
  };
  /** 計算の途中の値。画面の「計算の前提」で使う */
  basis: {
    standardMonthly: number;
    pensionStandardMonthly: number;
    salaryIncome: number;
    basicDeduction: number;
    socialInsuranceDeduction: number;
    taxableIncome: number;
    residentTaxableIncome: number;
    healthRate: number;
  };
}
