import { describe, expect, it } from 'vitest';
import {
  basicDeduction,
  calculatePay,
  incomeTaxFor,
  residentTaxFor,
  roundEmployeeShare,
  salaryIncome,
  standardMonthly,
} from './calculate';

const base = { annualBonus: 0, hasSocialInsurance: true, isCareInsured: false, prefecture: '東京都' as const };

describe('端数処理（被保険者負担分）', () => {
  it('50銭以下は切り捨て、50銭を超えると切り上げ', () => {
    expect(roundEmployeeShare(14_775.5)).toBe(14_775);
    expect(roundEmployeeShare(14_775.51)).toBe(14_776);
    expect(roundEmployeeShare(1_500)).toBe(1_500);
  });
});

describe('標準報酬月額', () => {
  it('等級の境目', () => {
    expect(standardMonthly(62_999)).toBe(58_000);
    expect(standardMonthly(63_000)).toBe(68_000);
    expect(standardMonthly(300_000)).toBe(300_000);
    expect(standardMonthly(309_999)).toBe(300_000);
    expect(standardMonthly(310_000)).toBe(320_000);
    expect(standardMonthly(2_000_000)).toBe(1_390_000);
  });
});

describe('給与所得（令和8年分）', () => {
  it('最低保障額 74万円は収入 220万円まで', () => {
    expect(salaryIncome(700_000)).toBe(0);
    expect(salaryIncome(1_780_000)).toBe(1_040_000);
    expect(salaryIncome(2_200_000)).toBe(1_460_000);
  });
  it('220万円超は 4,000円単位で計算する', () => {
    expect(salaryIncome(3_600_000)).toBe(2_440_000);
    expect(salaryIncome(3_601_999)).toBe(2_440_000);
    expect(salaryIncome(5_000_000)).toBe(3_560_000);
    expect(salaryIncome(8_000_000)).toBe(6_100_000);
    expect(salaryIncome(10_000_000)).toBe(8_050_000);
  });
  it('年収 178万円までは所得税がかからない（基礎控除 104万円＋給与所得控除 74万円）', () => {
    const income = salaryIncome(1_780_000);
    expect(income - basicDeduction(income)).toBe(0);
  });
});

describe('基礎控除（令和8・9年分）', () => {
  it('合計所得の区分', () => {
    expect(basicDeduction(4_890_000)).toBe(1_040_000);
    expect(basicDeduction(4_890_001)).toBe(670_000);
    expect(basicDeduction(6_550_001)).toBe(620_000);
    expect(basicDeduction(25_000_001)).toBe(0);
  });
});

describe('所得税（復興特別所得税を含む）', () => {
  it('速算表と 2.1%、百円未満切り捨て', () => {
    expect(incomeTaxFor(871_160)).toBe(44_400); // 871,000×5%=43,550 ×1.021=44,464.5
    expect(incomeTaxFor(5_000_000)).toBe(584_500); // ×20%−427,500=572,500 ×1.021=584,522.5
    expect(incomeTaxFor(999)).toBe(0);
  });
});

describe('住民税', () => {
  it('所得割（市6%・県4%、調整控除を引き百円未満切り捨て）＋均等割 5,000円', () => {
    // 課税所得 1,481,000：市 88,860−1,500→87,300、県 59,240−1,000→58,200
    expect(residentTaxFor(2_440_000, 528_840).annual).toBe(150_500);
  });
  it('合計所得 45万円以下は非課税', () => {
    expect(residentTaxFor(450_000, 0).annual).toBe(0);
    // 課税所得 20,000：市 1,200−調整600＝600、県 800−調整400＝400、均等割 5,000
    expect(residentTaxFor(450_001, 0).annual).toBe(6_000);
  });
});

describe('月給30万円・東京都・40歳未満・賞与なし（手計算と照合）', () => {
  const r = calculatePay({ ...base, monthlySalary: 300_000 });

  it('社会保険（月額）', () => {
    expect(r.employee.healthInsurance.monthly).toBe(14_775); // 300,000×9.85%÷2
    expect(r.employee.childSupport?.monthly).toBe(345); // ×0.23%÷2
    expect(r.employee.pensionInsurance?.monthly).toBe(27_450); // ×18.3%÷2
    expect(r.employee.employmentInsurance.monthly).toBe(1_500); // ×0.5%
    expect(r.employee.careInsurance).toBeUndefined();
  });

  it('税（年額と月額）', () => {
    expect(r.basis.taxableIncome).toBe(871_000);
    expect(r.employee.incomeTax.annual).toBe(44_400);
    expect(r.employee.incomeTax.monthly).toBe(3_700);
    expect(r.employee.residentTax.annual).toBe(150_500);
    expect(r.employee.residentTax.monthly).toBe(12_500);
  });

  it('手取り', () => {
    expect(r.employee.takeHome.monthly).toBe(239_730);
    expect(r.employee.takeHome.annual).toBe(2_876_260);
  });

  it('会社の負担（住民税は含まない）', () => {
    // 健保 14,775＋支援金 345＋厚年 27,450＋雇用 2,550＋労災 900＋拠出金 1,080
    expect(r.employer.total.monthly).toBe(47_100);
  });
});

describe('どの条件でも 額面＝手取り＋控除合計', () => {
  const cases = [
    { monthlySalary: 180_000, annualBonus: 0 },
    { monthlySalary: 300_000, annualBonus: 600_000 },
    { monthlySalary: 450_000, annualBonus: 1_200_000, isCareInsured: true, prefecture: '佐賀県' as const },
    { monthlySalary: 2_000_000, annualBonus: 8_000_000, isCareInsured: true },
    { monthlySalary: 90_000, annualBonus: 0, hasSocialInsurance: false },
  ];
  for (const c of cases) {
    it(`${c.monthlySalary}円・賞与${c.annualBonus}円`, () => {
      const r = calculatePay({ ...base, ...c });
      const e = r.employee;
      expect(e.takeHome.monthly + e.totalTax.monthly).toBe(e.grossIncome.monthly);
      expect(e.takeHome.annual + e.totalTax.annual).toBe(e.grossIncome.annual);
      const parts = [e.incomeTax, e.residentTax, e.healthInsurance, e.careInsurance, e.childSupport, e.pensionInsurance, e.employmentInsurance];
      expect(parts.reduce((s, p) => s + (p?.annual ?? 0), 0)).toBe(e.totalTax.annual);
    });
  }
});

describe('上限', () => {
  it('厚生年金の標準報酬は 65万円で頭打ち', () => {
    const r = calculatePay({ ...base, monthlySalary: 1_000_000 });
    expect(r.basis.pensionStandardMonthly).toBe(650_000);
    expect(r.employee.pensionInsurance?.monthly).toBe(59_475); // 650,000×18.3%÷2
  });
  it('賞与：厚生年金は 1回 150万円、健康保険は年 573万円まで', () => {
    // 賞与 800万円＝2回×400万円。健保は 400万＋173万、厚年は 150万×2
    const withBonus = calculatePay({ ...base, monthlySalary: 300_000, annualBonus: 8_000_000 });
    const without = calculatePay({ ...base, monthlySalary: 300_000 });
    const diff = (k: 'pensionInsurance' | 'healthInsurance') =>
      (withBonus.employee[k]?.annual ?? 0) - (without.employee[k]?.annual ?? 0);
    expect(diff('pensionInsurance')).toBe(2 * 137_250); // 1,500,000×18.3%÷2
    expect(diff('healthInsurance')).toBe(197_000 + 85_202); // 4,000,000×9.85%÷2、1,730,000×9.85%÷2=85,202.5→85,202
  });
});
