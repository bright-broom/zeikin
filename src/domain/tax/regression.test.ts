import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { calculatePay } from './calculate';
import { PREFECTURES } from './rates';

/**
 * 計算結果が意図せず変わっていないことの見張り。約 9万通りの条件の結果をまとめて 1つの値にしている。
 * 料率を更新したときや計算を直したときは値が変わる。変わった理由を説明できることを確かめてから、下の値を直す。
 * （コードの整理だけなら、この値は変わってはいけない）
 */
const EXPECTED = '92064 e4f8323cf7d66521a498847312453c3b07d4653441e07c31e07ee2192839091c';

it('約 9万通りの条件で、計算結果が前と同じ', () => {
  const hash = createHash('sha256');
  let count = 0;
  const salaries: number[] = [];
  for (let s = 0; s <= 2_000_000; s += 7_000) salaries.push(s);
  // 標準報酬月額の等級の境目の前後
  for (let s = 55_000; s <= 1_400_000; s += 5_000) salaries.push(s, s - 1, s + 1);
  for (const monthlySalary of salaries)
    for (const annualBonus of [0, 10_000, 600_000, 1_234_000, 3_000_000, 6_000_000, 12_000_000])
      for (const [hasSocialInsurance, isCareInsured] of [[true, false], [true, true], [false, false], [false, true]] as const)
        for (const prefecture of [PREFECTURES[12], PREFECTURES[40], PREFECTURES[14]]) {
          hash.update(JSON.stringify(calculatePay({ monthlySalary, annualBonus, hasSocialInsurance, isCareInsured, prefecture })));
          count++;
        }
  for (const prefecture of PREFECTURES)
    hash.update(JSON.stringify(calculatePay({ monthlySalary: 333_333, annualBonus: 777_000, hasSocialInsurance: true, isCareInsured: true, prefecture })));
  expect(`${count} ${hash.digest('hex')}`).toBe(EXPECTED);
});
