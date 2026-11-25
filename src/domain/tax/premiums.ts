import {
  BONUS_CAP,
  BONUS_PAYMENTS_PER_YEAR,
  CARE_INSURANCE_RATE,
  CHILD_CONTRIBUTION_RATE,
  CHILD_SUPPORT_RATE,
  EMPLOYMENT_INSURANCE,
  HEALTH_INSURANCE_RATES,
  PENSION_RATE,
  PENSION_STANDARD_RANGE,
  STANDARD_MONTHLY_GRADES,
  WORKERS_COMP_RATE,
} from './rates';
import { floorTo, roundEmployeeShare } from './rounding';
import type { MonthlyAnnual, TaxCalculationInput } from './tax';

/**
 * 社会保険・労働保険の保険料。
 *
 * 「どの保険料を、何に掛けて、だれが払うか」を下の PREMIUMS の表 1つで決める。
 * 合計（本人の控除合計・会社の負担）はこの表を足し上げて作るので、
 * 項目を足し忘れたり、会社が払う分を本人の控除に入れたりする間違いが起きない。
 */

/** 1回の支払い（毎月の給与、または賞与 1回）での負担額 */
export interface Burden {
  /** 本人が払う額（給与から天引き） */
  employee: number;
  /** 会社が払う額（本人の手取りには関係しない） */
  employer: number;
}

/** だれが払うか */
type Sharing =
  /** 労使折半。本人が半分（端数処理あり）、残りを会社が払う */
  | { kind: 'split'; rate: number }
  /** 本人と会社で料率が別（雇用保険） */
  | { kind: 'separate'; employeeRate: number; employerRate: number }
  /** 全額を会社が払う。本人の負担は必ず 0 */
  | { kind: 'employerOnly'; rate: number };

/** 料率を掛ける金額。health＝健康保険の標準報酬、pension＝厚生年金の標準報酬、wage＝実際に支払われた額 */
type BaseKind = 'health' | 'pension' | 'wage';
type Bases = Record<BaseKind, number>;

interface PremiumDefinition {
  base: BaseKind;
  /** この人にこの保険料がかかるか */
  applies: (input: TaxCalculationInput) => boolean;
  sharing: (input: TaxCalculationInput) => Sharing;
}

const insured = (input: TaxCalculationInput) => input.hasSocialInsurance;
const careInsured = (input: TaxCalculationInput) => input.hasSocialInsurance && input.isCareInsured;
const always = () => true;

export const PREMIUMS = {
  healthInsurance: {
    base: 'health',
    applies: insured,
    sharing: (input) => ({ kind: 'split', rate: HEALTH_INSURANCE_RATES[input.prefecture] }),
  },
  careInsurance: {
    base: 'health',
    applies: careInsured,
    sharing: () => ({ kind: 'split', rate: CARE_INSURANCE_RATE }),
  },
  childSupport: {
    base: 'health',
    applies: insured,
    sharing: () => ({ kind: 'split', rate: CHILD_SUPPORT_RATE }),
  },
  pensionInsurance: {
    base: 'pension',
    applies: insured,
    sharing: () => ({ kind: 'split', rate: PENSION_RATE }),
  },
  childContribution: {
    base: 'pension',
    applies: insured,
    sharing: () => ({ kind: 'employerOnly', rate: CHILD_CONTRIBUTION_RATE }),
  },
  employmentInsurance: {
    base: 'wage',
    applies: always,
    sharing: () => ({
      kind: 'separate',
      employeeRate: EMPLOYMENT_INSURANCE.employee,
      employerRate: EMPLOYMENT_INSURANCE.employer,
    }),
  },
  workersComp: {
    base: 'wage',
    applies: always,
    sharing: () => ({ kind: 'employerOnly', rate: WORKERS_COMP_RATE }),
  },
} as const satisfies Record<string, PremiumDefinition>;

export type PremiumKey = keyof typeof PREMIUMS;
export const PREMIUM_KEYS = Object.keys(PREMIUMS) as PremiumKey[];

/** 1回の支払いの保険料を、本人と会社に分ける */
export const shareBurden = (base: number, sharing: Sharing): Burden => {
  switch (sharing.kind) {
    case 'split': {
      const total = base * sharing.rate;
      const employee = roundEmployeeShare(total / 2);
      return { employee, employer: Math.round(total) - employee };
    }
    case 'separate':
      return {
        employee: roundEmployeeShare(base * sharing.employeeRate),
        employer: Math.round(base * sharing.employerRate),
      };
    case 'employerOnly':
      return { employee: 0, employer: Math.round(base * sharing.rate) };
  }
};

/** 報酬月額から標準報酬月額を引く（健康保険の等級表） */
export const standardMonthly = (salary: number) => {
  let grade = STANDARD_MONTHLY_GRADES[0][1];
  for (const [lower, standard] of STANDARD_MONTHLY_GRADES) {
    if (salary >= lower) grade = standard;
  }
  return grade;
};

/** 厚生年金の標準報酬月額。健康保険の等級を 88,000円〜650,000円の範囲に収める */
export const pensionStandardMonthly = (healthStandard: number) =>
  Math.min(PENSION_STANDARD_RANGE.max, Math.max(PENSION_STANDARD_RANGE.min, healthStandard));

/** 毎月の給与で、料率を掛ける金額 */
const monthlyBases = (salary: number): Bases => {
  const health = standardMonthly(salary);
  return { health, pension: pensionStandardMonthly(health), wage: salary };
};

/**
 * 賞与 1回ごとの、料率を掛ける金額。標準賞与額は千円未満を切り捨てる。
 * 上限は、健康保険（介護・支援金も同じ）が年度の累計 573万円、厚生年金が 1回 150万円。
 */
const bonusBases = (bonusEach: number): Bases[] => {
  const standard = floorTo(bonusEach, 1_000);
  let healthRemaining: number = BONUS_CAP.healthAnnual;
  return Array.from({ length: BONUS_PAYMENTS_PER_YEAR }, () => {
    const health = Math.min(standard, healthRemaining);
    healthRemaining -= health;
    return { health, pension: Math.min(standard, BONUS_CAP.pensionPerPayment), wage: bonusEach };
  });
};

export interface PremiumAmounts {
  employee: MonthlyAnnual;
  employer: MonthlyAnnual;
}

export interface PremiumsResult {
  /** 保険料ごとの本人・会社の負担。かからない保険料は 0 */
  items: Record<PremiumKey, PremiumAmounts>;
  /** その保険料がこの人にかかるか（かからないものは画面に出さない） */
  applies: Record<PremiumKey, boolean>;
  /** 本人が払う保険料の合計（＝社会保険料控除の額） */
  employeeTotal: MonthlyAnnual;
  /** 会社が払う保険料の合計 */
  employerTotal: MonthlyAnnual;
  /** 標準報酬月額（健康保険・厚生年金） */
  standard: { health: number; pension: number };
}

const NONE: Burden = { employee: 0, employer: 0 };

/** 月給と賞与（年間の合計）から、すべての保険料を本人・会社に分けて計算する */
export const calculatePremiums = (input: TaxCalculationInput, salary: number, bonusTotal: number): PremiumsResult => {
  const monthly = monthlyBases(salary);
  const bonuses = bonusTotal > 0 ? bonusBases(bonusTotal / BONUS_PAYMENTS_PER_YEAR) : [];

  const items = {} as Record<PremiumKey, PremiumAmounts>;
  const applies = {} as Record<PremiumKey, boolean>;
  const employeeTotal = { monthly: 0, annual: 0 };
  const employerTotal = { monthly: 0, annual: 0 };

  for (const key of PREMIUM_KEYS) {
    const def: PremiumDefinition = PREMIUMS[key];
    const on = def.applies(input);
    const sharing = def.sharing(input);
    const burden = (bases: Bases) => (on ? shareBurden(bases[def.base], sharing) : NONE);

    const perMonth = burden(monthly);
    const perBonus = bonuses.map(burden);
    const sum = (pick: (b: Burden) => number) => perBonus.reduce((total, b) => total + pick(b), 0);

    const amounts: PremiumAmounts = {
      employee: { monthly: perMonth.employee, annual: perMonth.employee * 12 + sum((b) => b.employee) },
      employer: { monthly: perMonth.employer, annual: perMonth.employer * 12 + sum((b) => b.employer) },
    };
    items[key] = amounts;
    applies[key] = on;
    employeeTotal.monthly += amounts.employee.monthly;
    employeeTotal.annual += amounts.employee.annual;
    employerTotal.monthly += amounts.employer.monthly;
    employerTotal.annual += amounts.employer.annual;
  }

  return { items, applies, employeeTotal, employerTotal, standard: { health: monthly.health, pension: monthly.pension } };
};
