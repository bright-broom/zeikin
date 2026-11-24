import type { MonthlyAnnual } from '@domain/tax';

export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString()} 円`;
};

export const calculateTotal = (
  items: Record<string, MonthlyAnnual | undefined>,
  key: keyof MonthlyAnnual
): number => {
  return Object.values(items)
    .filter((item): item is MonthlyAnnual => item !== undefined)
    .reduce((total, item) => total + item[key], 0);
};

// 明細の金額表示。1円未満は四捨五入し、3桁ごとに区切る
export const formatYen = (amount: number): string => Math.round(amount).toLocaleString('ja-JP');
