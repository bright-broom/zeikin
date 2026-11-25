import { describe, expect, it } from 'vitest';
import { calculatePay } from './calculate';
import { calculatePremiums, PREMIUM_KEYS, PREMIUMS, shareBurden } from './premiums';
import { HEALTH_INSURANCE_RATES, PREFECTURES, STANDARD_MONTHLY_GRADES } from './rates';
import type { TaxCalculationInput } from './tax';

/**
 * 「会社と分け合う保険料を本人が全部払っていないか」を、どの条件でも確かめる。
 * 個別の金額の照合は calculate.test.ts、ここは負担の分け方の決まりを守っているかを見る。
 */

const base: TaxCalculationInput = {
  monthlySalary: 300_000,
  annualBonus: 0,
  hasSocialInsurance: true,
  isCareInsured: true,
  prefecture: '東京都',
};

const salaries = Array.from({ length: 196 }, (_, i) => 50_000 + i * 10_000); // 5万〜200万円
const bonuses = [0, 600_000, 2_468_000, 12_000_000];

const sharingOf = (key: (typeof PREMIUM_KEYS)[number], input: TaxCalculationInput) => PREMIUMS[key].sharing(input);

describe('負担の分け方（1回分）', () => {
  it('労使折半：本人は半分（50銭以下切り捨て）、会社は残り。合計は 料率×基礎の額', () => {
    expect(shareBurden(300_000, { kind: 'split', rate: 0.0985 })).toEqual({ employee: 14_775, employer: 14_775 });
    // 410,000×9.85%＝40,385。半分は 20,192.5 → 本人 20,192、会社 20,193
    expect(shareBurden(410_000, { kind: 'split', rate: 0.0985 })).toEqual({ employee: 20_192, employer: 20_193 });
  });
  it('会社だけが払うもの：本人は 0', () => {
    expect(shareBurden(300_000, { kind: 'employerOnly', rate: 0.003 })).toEqual({ employee: 0, employer: 900 });
  });
  it('雇用保険：本人 0.5%、会社 0.85%', () => {
    expect(shareBurden(300_000, { kind: 'separate', employeeRate: 0.005, employerRate: 0.0085 })).toEqual({ employee: 1_500, employer: 2_550 });
  });
});

describe('どの月給・賞与・都道府県でも', () => {
  // 半分に 1円未満の端数が出たときは、50銭以下なら会社が、50銭を超えたら本人が 1円多く持つ（法令どおり）
  it('労使折半の保険料は、本人と会社の差が 1円以内', () => {
    for (const prefecture of PREFECTURES) {
      for (const monthlySalary of salaries) {
        const input = { ...base, monthlySalary, prefecture };
        const { items } = calculatePremiums(input, monthlySalary, 0);
        for (const key of PREMIUM_KEYS) {
          if (sharingOf(key, input).kind !== 'split') continue;
          const { employee, employer } = items[key];
          expect(Math.abs(employer.monthly - employee.monthly), `${key} ${prefecture} ${monthlySalary}`).toBeLessThanOrEqual(1);
          expect(employee.monthly, `${key} ${prefecture} ${monthlySalary}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('賞与を含む年額でも、本人と会社の差は支払い 1回につき 1円以内', () => {
    for (const monthlySalary of salaries) {
      for (const annualBonus of bonuses) {
        const input = { ...base, monthlySalary, annualBonus };
        const { items } = calculatePremiums(input, monthlySalary, annualBonus);
        for (const key of PREMIUM_KEYS) {
          if (sharingOf(key, input).kind !== 'split') continue;
          const gap = Math.abs(items[key].employer.annual - items[key].employee.annual);
          expect(gap, `${key} ${monthlySalary} ${annualBonus}`).toBeLessThanOrEqual(14); // 給与 12回＋賞与 2回
        }
      }
    }
  });

  it('会社だけが払う保険料（労災・子ども・子育て拠出金）は、本人の負担が 0', () => {
    for (const monthlySalary of salaries) {
      for (const annualBonus of bonuses) {
        const { items } = calculatePremiums({ ...base, monthlySalary, annualBonus }, monthlySalary, annualBonus);
        expect(items.workersComp.employee).toEqual({ monthly: 0, annual: 0 });
        expect(items.childContribution.employee).toEqual({ monthly: 0, annual: 0 });
      }
    }
  });

  it('合計は項目の足し算と一致する（足し忘れ・二重計上がない）', () => {
    for (const monthlySalary of salaries) {
      for (const annualBonus of bonuses) {
        const p = calculatePremiums({ ...base, monthlySalary, annualBonus }, monthlySalary, annualBonus);
        for (const period of ['monthly', 'annual'] as const) {
          expect(PREMIUM_KEYS.reduce((s, k) => s + p.items[k].employee[period], 0)).toBe(p.employeeTotal[period]);
          expect(PREMIUM_KEYS.reduce((s, k) => s + p.items[k].employer[period], 0)).toBe(p.employerTotal[period]);
        }
      }
    }
  });

  it('手取り ＝ 額面 −（所得税＋住民税＋本人の保険料）。会社の負担は手取りを減らさない', () => {
    for (const monthlySalary of salaries) {
      for (const annualBonus of bonuses) {
        const input = { ...base, monthlySalary, annualBonus };
        const r = calculatePay(input);
        const p = calculatePremiums(input, monthlySalary, annualBonus);
        for (const period of ['monthly', 'annual'] as const) {
          const own = r.employee.incomeTax[period] + r.employee.residentTax[period] + p.employeeTotal[period];
          expect(r.employee.totalTax[period]).toBe(own);
          expect(r.employee.takeHome[period]).toBe(r.employee.grossIncome[period] - own);
        }
        expect(r.employer.total).toEqual(p.employerTotal);
        expect(r.basis.socialInsuranceDeduction).toBe(p.employeeTotal.annual);
      }
    }
  });

  it('加入していない保険料は、本人も会社も 0', () => {
    const input = { ...base, hasSocialInsurance: false, annualBonus: 600_000 };
    const p = calculatePremiums(input, input.monthlySalary, input.annualBonus);
    for (const key of ['healthInsurance', 'careInsurance', 'childSupport', 'pensionInsurance', 'childContribution'] as const) {
      expect(p.items[key]).toEqual({ employee: { monthly: 0, annual: 0 }, employer: { monthly: 0, annual: 0 } });
      expect(p.applies[key]).toBe(false);
    }
    expect(p.items.employmentInsurance.employee.monthly).toBe(1_500);
  });
});

describe('月給50万円・大阪府・40〜64歳・賞与120万円（手計算と照合）', () => {
  const input: TaxCalculationInput = { ...base, monthlySalary: 500_000, annualBonus: 1_200_000, prefecture: '大阪府' };
  const r = calculatePay(input);

  it('毎月：本人と会社が同じ額を払う', () => {
    expect(r.employee.healthInsurance.monthly).toBe(25_325); // 500,000×10.13%＝50,650 の半分
    expect(r.employer.healthInsurance.monthly).toBe(25_325);
    expect(r.employee.careInsurance?.monthly).toBe(4_050); // ×1.62%＝8,100 の半分
    expect(r.employer.careInsurance?.monthly).toBe(4_050);
    expect(r.employee.childSupport?.monthly).toBe(575); // ×0.23%＝1,150 の半分
    expect(r.employer.childSupport?.monthly).toBe(575);
    expect(r.employee.pensionInsurance?.monthly).toBe(45_750); // ×18.3%＝91,500 の半分
    expect(r.employer.pensionInsurance?.monthly).toBe(45_750);
    expect(r.employee.employmentInsurance.monthly).toBe(2_500); // ×0.5%
    expect(r.employer.employmentInsurance.monthly).toBe(4_250); // ×0.85%
    expect(r.employer.workersComp.monthly).toBe(1_500); // ×0.3%
    expect(r.employer.childContribution?.monthly).toBe(1_800); // ×0.36%
  });

  it('賞与 60万円×2回の分', () => {
    // 1回：健保 600,000×10.13%＝60,780 → 30,390、厚年 109,800 → 54,900
    expect(r.employee.healthInsurance.annual).toBe(25_325 * 12 + 30_390 * 2);
    expect(r.employer.healthInsurance.annual).toBe(25_325 * 12 + 30_390 * 2);
    expect(r.employee.pensionInsurance?.annual).toBe(45_750 * 12 + 54_900 * 2);
    expect(r.employee.employmentInsurance.annual).toBe(2_500 * 12 + 3_000 * 2);
  });
});

describe('料率の表の形（書き間違いを見つける）', () => {
  it('健康保険料率は 47都道府県あり、9〜11% に収まる', () => {
    expect(PREFECTURES).toHaveLength(47);
    for (const p of PREFECTURES) {
      expect(HEALTH_INSURANCE_RATES[p]).toBeGreaterThan(0.09);
      expect(HEALTH_INSURANCE_RATES[p]).toBeLessThan(0.11);
    }
  });
  it('標準報酬月額の表は 50等級で、下限・標準報酬とも小さい順。標準報酬は等級の範囲に入る', () => {
    expect(STANDARD_MONTHLY_GRADES).toHaveLength(50);
    STANDARD_MONTHLY_GRADES.forEach(([lower, standard], i) => {
      const next = STANDARD_MONTHLY_GRADES[i + 1];
      expect(standard).toBeGreaterThanOrEqual(lower);
      if (next) {
        expect(next[0]).toBeGreaterThan(lower);
        expect(standard).toBeLessThan(next[0]);
      }
    });
  });
});
