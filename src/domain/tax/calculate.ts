import { HEALTH_INSURANCE_RATES } from './rates';
import { calculateIncomeTax } from './income-tax';
import { calculatePremiums } from './premiums';
import { residentTaxFor, residentTaxMonthly } from './resident-tax';
import type { MonthlyAnnual, TaxCalculationInput, TaxCalculationResult } from './tax';

/*
 * 計算の入口。ここでは順番に呼んで結果をまとめるだけにする。
 *   1. 保険料（premiums.ts）     本人と会社に分ける。だれが払うかは PREMIUMS の表で決まる
 *   2. 所得税（income-tax.ts）    本人だけ。本人が払った保険料を引いてから計算する
 *   3. 住民税（resident-tax.ts）  本人だけ
 *   4. 手取り ＝ 額面 − 本人の保険料 − 所得税 − 住民税。会社の負担はここに入らない
 */

// 以前はこのファイルにあった関数。テストやほかのコードから同じ名前で使えるように残す
export { roundEmployeeShare } from './rounding';
export { standardMonthly } from './premiums';
export { basicDeduction, incomeTaxFor, salaryIncome } from './income-tax';
export { residentTaxFor } from './resident-tax';

const ma = (monthly: number, annual: number): MonthlyAnnual => ({ monthly, annual });

export const calculatePay = (input: TaxCalculationInput): TaxCalculationResult => {
  const salary = Math.max(0, Math.floor(input.monthlySalary));
  const bonusTotal = Math.max(0, Math.floor(input.annualBonus));
  const revenue = salary * 12 + bonusTotal;

  // 1. 保険料
  const premiums = calculatePremiums(input, salary, bonusTotal);
  const { items, applies } = premiums;
  const own = premiums.employeeTotal;

  // 2. 所得税（年末調整後の年税額）
  const incomeTax = calculateIncomeTax(revenue, own.annual);
  // 1か月分は、給与と賞与の「額面−社会保険料」の割合で年税額を配る
  const salaryShare = revenue - own.annual > 0 ? (salary * 12 - own.monthly * 12) / (revenue - own.annual) : 1;
  const incomeTaxMonthly = Math.floor((incomeTax.annual * salaryShare) / 12);

  // 3. 住民税
  const resident = residentTaxFor(incomeTax.salaryIncome, own.annual);
  const residentMonthly = residentTaxMonthly(resident.annual);

  // 4. 本人の控除合計と手取り
  const totalMonthly = incomeTaxMonthly + residentMonthly + own.monthly;
  const totalAnnual = incomeTax.annual + resident.annual + own.annual;

  /** かからない保険料は項目ごと出さない */
  const shown = (key: keyof typeof items, side: 'employee' | 'employer') => (applies[key] ? items[key][side] : undefined);

  return {
    employee: {
      salary: ma(salary, salary * 12),
      bonus: ma(0, bonusTotal),
      grossIncome: ma(salary, revenue),
      incomeTax: ma(incomeTaxMonthly, incomeTax.annual),
      residentTax: ma(residentMonthly, resident.annual),
      healthInsurance: items.healthInsurance.employee,
      careInsurance: shown('careInsurance', 'employee'),
      childSupport: shown('childSupport', 'employee'),
      pensionInsurance: shown('pensionInsurance', 'employee'),
      employmentInsurance: items.employmentInsurance.employee,
      totalTax: ma(totalMonthly, totalAnnual),
      takeHome: ma(salary - totalMonthly, revenue - totalAnnual),
    },
    employer: {
      healthInsurance: items.healthInsurance.employer,
      careInsurance: shown('careInsurance', 'employer'),
      childSupport: shown('childSupport', 'employer'),
      pensionInsurance: shown('pensionInsurance', 'employer'),
      childContribution: shown('childContribution', 'employer'),
      employmentInsurance: items.employmentInsurance.employer,
      workersComp: items.workersComp.employer,
      total: premiums.employerTotal,
    },
    basis: {
      standardMonthly: input.hasSocialInsurance ? premiums.standard.health : 0,
      pensionStandardMonthly: input.hasSocialInsurance ? premiums.standard.pension : 0,
      salaryIncome: incomeTax.salaryIncome,
      basicDeduction: incomeTax.basicDeduction,
      socialInsuranceDeduction: own.annual,
      taxableIncome: incomeTax.taxableIncome,
      residentTaxableIncome: resident.taxable,
      healthRate: HEALTH_INSURANCE_RATES[input.prefecture],
    },
  };
};
