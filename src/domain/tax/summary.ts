import type { MonthlyAnnual, TaxCalculationResult } from './tax';

/** 1万円。画面の入力は万円、計算は円で行う */
export const MAN = 10_000;

/** 手取り率（%、小数第 1位まで）。画面・図・書き出しで同じ値を使う */
export const takeHomeRate = (takeHome: number, gross: number) =>
  gross > 0 ? Math.round((takeHome / gross) * 1000) / 10 : 0;

/** 本人の控除を「税金（所得税＋住民税）」と「社会保険」に分ける。足すと控除合計になる */
export const splitDeductions = (employee: TaxCalculationResult['employee'], period: keyof MonthlyAnnual) => {
  const tax = employee.incomeTax[period] + employee.residentTax[period];
  return { tax, insurance: employee.totalTax[period] - tax };
};
