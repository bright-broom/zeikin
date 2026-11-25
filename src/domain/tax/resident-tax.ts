import { RESIDENT_TAX } from './rates';
import { floorTo } from './rounding';

/**
 * 住民税の年額（所得割＋均等割＋森林環境税）。本人だけが払う。
 * 前年も同じ給与だったと仮定し、今年の所得にかかる分（来年6月から天引き）を今の天引き額とみなす。
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

/** 毎月の天引き額。年税額の 12分の1 の百円未満を切り捨てる（端数は 6月分に寄るため） */
export const residentTaxMonthly = (annual: number) => floorTo(annual / 12, 100);
