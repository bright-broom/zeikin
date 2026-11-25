/** unit 円未満を切り捨てる（千円未満・百円未満の切り捨てに使う） */
export const floorTo = (value: number, unit: number) => Math.floor(value / unit) * unit;

/**
 * 給与から天引きする本人負担分の端数処理。50銭以下は切り捨て、50銭を超えたら切り上げ。
 * （健康保険法・厚生年金保険法の通知、雇用保険も同じ扱い）
 */
export const roundEmployeeShare = (value: number) => {
  const cents = Math.round(value * 100);
  const yen = Math.floor(cents / 100);
  return cents - yen * 100 > 50 ? yen + 1 : yen;
};
