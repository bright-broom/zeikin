import {
  BASIC_DEDUCTION_INCOME_TAX,
  BONUS_CAP,
  BONUS_PAYMENTS_PER_YEAR,
  CARE_INSURANCE_RATE,
  CHILD_CONTRIBUTION_RATE,
  CHILD_SUPPORT_RATE,
  EMPLOYMENT_INSURANCE,
  HEALTH_INSURANCE_RATES,
  INCOME_TAX_BRACKETS,
  PENSION_RATE,
  PENSION_STANDARD_RANGE,
  RECONSTRUCTION_TAX_RATE,
  RESIDENT_TAX,
  SALARY_DEDUCTION,
  STANDARD_MONTHLY_GRADES,
  WORKERS_COMP_RATE,
} from './rates';
import type { MonthlyAnnual, TaxCalculationInput, TaxCalculationResult } from './tax';

const floorTo = (value: number, unit: number) => Math.floor(value / unit) * unit;

/**
 * 給与から天引きする被保険者負担分の端数処理。50銭以下は切り捨て、50銭を超えたら切り上げ。
 * （健康保険法・厚生年金保険法の通知、雇用保険も同じ扱い）
 */
export const roundEmployeeShare = (value: number) => {
  const cents = Math.round(value * 100);
  const yen = Math.floor(cents / 100);
  return cents - yen * 100 > 50 ? yen + 1 : yen;
};

/** 報酬月額から標準報酬月額を引く（健康保険の等級表） */
export const standardMonthly = (salary: number) => {
  let grade = STANDARD_MONTHLY_GRADES[0][1];
  for (const [lower, standard] of STANDARD_MONTHLY_GRADES) {
    if (salary >= lower) grade = standard;
  }
  return grade;
};

const pensionStandard = (healthStandard: number) =>
  Math.min(PENSION_STANDARD_RANGE.max, Math.max(PENSION_STANDARD_RANGE.min, healthStandard));

/**
 * 給与所得の金額（所得税法 28条、別表第五）。令和8年分の給与所得控除で計算する。
 * 660万円未満は、収入を 4,000円単位に切り捨ててから率を掛ける（別表第五の作り方に合わせる）。
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

/**
 * 住民税の年額（所得割＋均等割＋森林環境税）。前年も同じ給与だったと仮定し、
 * 今年の所得にかかる分（来年6月から天引き）を今の天引き額とみなす。
 */
export const residentTaxFor = (totalIncome: number, socialInsurance: number) => {
  if (totalIncome <= RESIDENT_TAX.exemptIncomeLimit) return { annual: 0, taxable: 0 };
  const taxable = floorTo(Math.max(0, totalIncome - socialInsurance - RESIDENT_TAX.basicDeduction), 1_000);
  // 調整控除は課税所得の 5% が上限（課税所得 5万円未満のとき）
  const adjustmentScale = Math.min(1, taxable / 50_000);
  const city = floorTo(Math.max(0, taxable * RESIDENT_TAX.cityRate - RESIDENT_TAX.cityAdjustment * adjustmentScale), 100);
  const pref = floorTo(Math.max(0, taxable * RESIDENT_TAX.prefRate - RESIDENT_TAX.prefAdjustment * adjustmentScale), 100);
  return { annual: city + pref + RESIDENT_TAX.perCapita, taxable };
};

/** 1回分の保険料を被保険者・事業主に分ける。被保険者分を端数処理し、残りを事業主分とする */
const split = (base: number, rate: number) => {
  const total = base * rate;
  const employee = roundEmployeeShare(total / 2);
  return { employee, employer: Math.round(total) - employee };
};

const ma = (monthly: number, annual: number): MonthlyAnnual => ({ monthly, annual });

export const calculatePay = (input: TaxCalculationInput): TaxCalculationResult => {
  const salary = Math.max(0, Math.floor(input.monthlySalary));
  const bonusTotal = Math.max(0, Math.floor(input.annualBonus));
  const bonusEach = bonusTotal / BONUS_PAYMENTS_PER_YEAR;
  const healthRate = HEALTH_INSURANCE_RATES[input.prefecture];
  const insured = input.hasSocialInsurance;

  // ── 社会保険（毎月）。標準報酬月額に料率を掛ける
  const standard = standardMonthly(salary);
  const pStandard = pensionStandard(standard);
  const monthly = {
    health: insured ? split(standard, healthRate) : { employee: 0, employer: 0 },
    care: insured && input.isCareInsured ? split(standard, CARE_INSURANCE_RATE) : { employee: 0, employer: 0 },
    support: insured ? split(standard, CHILD_SUPPORT_RATE) : { employee: 0, employer: 0 },
    pension: insured ? split(pStandard, PENSION_RATE) : { employee: 0, employer: 0 },
  };

  // ── 社会保険（賞与）。標準賞与額は 1回ごとに千円未満を切り捨て、上限をかける
  const bonusStandard = floorTo(bonusEach, 1_000);
  let healthBonusRemaining: number = BONUS_CAP.healthAnnual;
  const perBonus = { health: 0, care: 0, support: 0, pension: 0, healthER: 0, careER: 0, supportER: 0, pensionER: 0, contribution: 0 };
  for (let i = 0; i < BONUS_PAYMENTS_PER_YEAR && insured && bonusStandard > 0; i++) {
    const healthBase = Math.min(bonusStandard, healthBonusRemaining);
    healthBonusRemaining -= healthBase;
    const pensionBase = Math.min(bonusStandard, BONUS_CAP.pensionPerPayment);
    const h = split(healthBase, healthRate);
    const c = input.isCareInsured ? split(healthBase, CARE_INSURANCE_RATE) : { employee: 0, employer: 0 };
    const s = split(healthBase, CHILD_SUPPORT_RATE);
    const p = split(pensionBase, PENSION_RATE);
    perBonus.health += h.employee; perBonus.healthER += h.employer;
    perBonus.care += c.employee; perBonus.careER += c.employer;
    perBonus.support += s.employee; perBonus.supportER += s.employer;
    perBonus.pension += p.employee; perBonus.pensionER += p.employer;
    perBonus.contribution += Math.round(pensionBase * CHILD_CONTRIBUTION_RATE);
  }

  // ── 雇用保険・労災は実際の賃金（賞与も含む）に掛ける
  const employmentMonthly = roundEmployeeShare(salary * EMPLOYMENT_INSURANCE.employee);
  const employmentBonus = bonusEach > 0 ? roundEmployeeShare(bonusEach * EMPLOYMENT_INSURANCE.employee) * BONUS_PAYMENTS_PER_YEAR : 0;
  const employmentERMonthly = Math.round(salary * EMPLOYMENT_INSURANCE.employer);
  const employmentERBonus = Math.round(bonusEach * EMPLOYMENT_INSURANCE.employer) * BONUS_PAYMENTS_PER_YEAR;
  const compMonthly = Math.round(salary * WORKERS_COMP_RATE);
  const compBonus = Math.round(bonusEach * WORKERS_COMP_RATE) * BONUS_PAYMENTS_PER_YEAR;
  const contributionMonthly = insured ? Math.round(pStandard * CHILD_CONTRIBUTION_RATE) : 0;

  const siMonthly = monthly.health.employee + monthly.care.employee + monthly.support.employee + monthly.pension.employee + employmentMonthly;
  const siBonus = perBonus.health + perBonus.care + perBonus.support + perBonus.pension + employmentBonus;
  const siAnnual = siMonthly * 12 + siBonus;

  // ── 所得税（年末調整後の年税額）
  const revenue = salary * 12 + bonusTotal;
  const income = salaryIncome(revenue);
  const basic = basicDeduction(income);
  const taxable = floorTo(Math.max(0, income - siAnnual - basic), 1_000);
  const incomeTaxAnnual = incomeTaxFor(taxable);
  // 1か月分は、給与と賞与の「額面−社会保険料」の割合で年税額を配る
  const salaryShare = revenue - siAnnual > 0 ? (salary * 12 - siMonthly * 12) / (revenue - siAnnual) : 1;
  const incomeTaxMonthly = Math.floor((incomeTaxAnnual * salaryShare) / 12);

  // ── 住民税（特別徴収。年税額の 1/12 の百円未満を切り捨てた額が毎月の天引き）
  const resident = residentTaxFor(income, siAnnual);
  const residentMonthly = floorTo(resident.annual / 12, 100);

  const totalMonthly = incomeTaxMonthly + residentMonthly + siMonthly;
  const totalAnnual = incomeTaxAnnual + resident.annual + siAnnual;

  const opt = (m: number, a: number, on: boolean) => (on ? ma(m, a) : undefined);
  const careOn = insured && input.isCareInsured;

  const erMonthly =
    monthly.health.employer + monthly.care.employer + monthly.support.employer + monthly.pension.employer +
    employmentERMonthly + compMonthly + contributionMonthly;
  const erBonus =
    perBonus.healthER + perBonus.careER + perBonus.supportER + perBonus.pensionER +
    employmentERBonus + compBonus + perBonus.contribution;

  return {
    employee: {
      salary: ma(salary, salary * 12),
      bonus: ma(0, bonusTotal),
      grossIncome: ma(salary, revenue),
      incomeTax: ma(incomeTaxMonthly, incomeTaxAnnual),
      residentTax: ma(residentMonthly, resident.annual),
      healthInsurance: ma(monthly.health.employee, monthly.health.employee * 12 + perBonus.health),
      careInsurance: opt(monthly.care.employee, monthly.care.employee * 12 + perBonus.care, careOn),
      childSupport: opt(monthly.support.employee, monthly.support.employee * 12 + perBonus.support, insured),
      pensionInsurance: opt(monthly.pension.employee, monthly.pension.employee * 12 + perBonus.pension, insured),
      employmentInsurance: ma(employmentMonthly, employmentMonthly * 12 + employmentBonus),
      totalTax: ma(totalMonthly, totalAnnual),
      takeHome: ma(salary - totalMonthly, revenue - totalAnnual),
    },
    employer: {
      healthInsurance: ma(monthly.health.employer, monthly.health.employer * 12 + perBonus.healthER),
      careInsurance: opt(monthly.care.employer, monthly.care.employer * 12 + perBonus.careER, careOn),
      childSupport: opt(monthly.support.employer, monthly.support.employer * 12 + perBonus.supportER, insured),
      pensionInsurance: opt(monthly.pension.employer, monthly.pension.employer * 12 + perBonus.pensionER, insured),
      childContribution: opt(contributionMonthly, contributionMonthly * 12 + perBonus.contribution, insured),
      employmentInsurance: ma(employmentERMonthly, employmentERMonthly * 12 + employmentERBonus),
      workersComp: ma(compMonthly, compMonthly * 12 + compBonus),
      total: ma(erMonthly, erMonthly * 12 + erBonus),
    },
    basis: {
      standardMonthly: insured ? standard : 0,
      pensionStandardMonthly: insured ? pStandard : 0,
      salaryIncome: income,
      basicDeduction: basic,
      socialInsuranceDeduction: siAnnual,
      taxableIncome: taxable,
      residentTaxableIncome: resident.taxable,
      healthRate,
    },
  };
};
