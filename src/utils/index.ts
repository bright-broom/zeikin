// 金額の表示。1円未満は四捨五入し、3桁ごとに区切る
export const formatYen = (amount: number): string => Math.round(amount).toLocaleString('ja-JP');
