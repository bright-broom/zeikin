import type { MonthlyAnnual, TaxCalculationInput, TaxCalculationResult } from '@domain/tax';
import { takeHomeRate, TAX_YEAR_LABEL } from '@domain/tax';
import { texts } from '@constants';

/**
 * 書き出しの中身。CSV・Excel・JSON・Markdown はすべてこれを書式に変えるだけにして、
 * 形式によって数字や項目が食い違わないようにする。画面（DOM）には依存しない。
 */

/** JSON の `schema` と `version`。項目の意味を変えたり消したりしたら version を上げる */
export const EXPORT_SCHEMA = 'zeikin.payslip' as const;
export const EXPORT_VERSION = 1 as const;

export type SectionKey = 'pay' | 'deduction' | 'summary' | 'employer';

export interface ExportRow {
  section: SectionKey;
  /** 機械で扱うための名前（JSON の利用者が日本語の見出しに頼らなくてよいように） */
  key: string;
  label: string;
  /** 賞与のない月の 1か月分（円）。賞与のように月額がないものは null */
  monthly: number | null;
  /** 1年分（円） */
  annual: number;
  /** 合計の行か */
  isTotal: boolean;
}

export interface ExportDocument {
  schema: typeof EXPORT_SCHEMA;
  version: typeof EXPORT_VERSION;
  taxYear: string;
  /** 書き出した日時（ISO 8601、UTC） */
  generatedAt: string;
  /** この条件で開き直せる URL */
  sourceUrl: string | null;
  conditions: TaxCalculationInput;
  summary: {
    grossIncome: MonthlyAnnual;
    totalDeductions: MonthlyAnnual;
    takeHome: MonthlyAnnual;
    /** 手取り ÷ 額面（%、小数第 1 位まで） */
    takeHomeRate: MonthlyAnnual;
    employerBurden: MonthlyAnnual;
    employerTotalCost: MonthlyAnnual;
  };
  rows: ExportRow[];
  basis: TaxCalculationResult['basis'];
}

export const SECTION_LABEL: Record<SectionKey, string> = {
  pay: texts.slip.pay,
  deduction: texts.slip.deduction,
  summary: texts.exporting.sectionSummary,
  employer: texts.exporting.sectionEmployer,
};


const row = (
  section: SectionKey,
  key: string,
  label: string,
  value: MonthlyAnnual | undefined,
  isTotal = false,
): ExportRow[] => (value ? [{ section, key, label, monthly: value.monthly, annual: value.annual, isTotal }] : []);

export interface BuildExportOptions {
  /** 書き出した日時。テストで固定できるよう、呼ぶ側から渡す */
  now: Date;
  sourceUrl: string | null;
}

export const buildExportDocument = (
  input: TaxCalculationInput,
  result: TaxCalculationResult,
  { now, sourceUrl }: BuildExportOptions,
): ExportDocument => {
  const e = result.employee;
  const r = result.employer;
  const L = texts.labels;

  const rows: ExportRow[] = [
    ...row('pay', 'salary', L.salary, e.salary),
    // 賞与は年に 2回なので「賞与のない月」の月額はない
    ...(e.bonus.annual > 0
      ? [{ section: 'pay' as const, key: 'bonus', label: L.bonus, monthly: null, annual: e.bonus.annual, isTotal: false }]
      : []),
    ...row('pay', 'grossIncome', texts.slip.payTotal, e.grossIncome, true),

    ...row('deduction', 'incomeTax', L.incomeTax, e.incomeTax),
    ...row('deduction', 'residentTax', L.residentTax, e.residentTax),
    ...row('deduction', 'healthInsurance', L.healthInsurance, e.healthInsurance),
    ...row('deduction', 'careInsurance', L.careInsurance, e.careInsurance),
    ...row('deduction', 'childSupport', L.childSupport, e.childSupport),
    ...row('deduction', 'pensionInsurance', L.pensionInsurance, e.pensionInsurance),
    ...row('deduction', 'employmentInsurance', L.employmentInsurance, e.employmentInsurance),
    ...row('deduction', 'totalDeductions', texts.slip.deductionTotal, e.totalTax, true),

    ...row('summary', 'takeHome', texts.exporting.takeHome, e.takeHome, true),

    ...row('employer', 'healthInsurance', L.healthInsurance, r.healthInsurance),
    ...row('employer', 'careInsurance', L.careInsurance, r.careInsurance),
    ...row('employer', 'childSupport', L.childSupport, r.childSupport),
    ...row('employer', 'pensionInsurance', L.pensionInsurance, r.pensionInsurance),
    ...row('employer', 'employmentInsurance', L.employmentInsurance, r.employmentInsurance),
    ...row('employer', 'workersComp', L.workersComp, r.workersComp),
    ...row('employer', 'childContribution', L.childContribution, r.childContribution),
    ...row('employer', 'employerBurden', texts.employer.burden, r.total, true),
  ];

  return {
    schema: EXPORT_SCHEMA,
    version: EXPORT_VERSION,
    taxYear: TAX_YEAR_LABEL,
    generatedAt: now.toISOString(),
    sourceUrl,
    conditions: { ...input },
    summary: {
      grossIncome: { ...e.grossIncome },
      totalDeductions: { ...e.totalTax },
      takeHome: { ...e.takeHome },
      takeHomeRate: {
        monthly: takeHomeRate(e.takeHome.monthly, e.grossIncome.monthly),
        annual: takeHomeRate(e.takeHome.annual, e.grossIncome.annual),
      },
      employerBurden: { ...r.total },
      employerTotalCost: {
        monthly: e.grossIncome.monthly + r.total.monthly,
        annual: e.grossIncome.annual + r.total.annual,
      },
    },
    rows,
    basis: { ...result.basis },
  };
};

/** 条件を人が読む形の行にする（Excel の「条件」シートと Markdown で使う） */
export const describeConditions = (doc: ExportDocument): [string, string][] => {
  const c = doc.conditions;
  const yen = (v: number) => `${v.toLocaleString('ja-JP')}円`;
  return [
    [texts.exporting.taxYear, doc.taxYear],
    [texts.form.salary.label, yen(c.monthlySalary)],
    [texts.form.bonus.label, yen(c.annualBonus)],
    [texts.form.prefecture.label, c.prefecture],
    [texts.form.options.socialInsurance.title, c.hasSocialInsurance ? texts.exporting.yes : texts.exporting.no],
    [texts.exporting.careInsured, c.isCareInsured ? texts.exporting.yes : texts.exporting.no],
    [texts.exporting.generatedAt, doc.generatedAt],
    ...(doc.sourceUrl ? [[texts.exporting.sourceUrl, doc.sourceUrl] as [string, string]] : []),
  ];
};
