import { useEffect } from 'react';
import { PREFECTURES } from '@domain/tax';
import type { Prefecture } from '@domain/tax';
import type { ConditionInputs } from '../components/Conditions';

// URL に残す条件の名前。短くしておくと、共有したときに読みやすい
const KEY = {
  salary: 's',
  bonus: 'b',
  prefecture: 'pref',
  hasSocialInsurance: 'si',
  isCareInsured: 'care',
} as const;

const isPrefecture = (value: string): value is Prefecture => (PREFECTURES as readonly string[]).includes(value);

const digits = (value: string | null) => (value && /^\d{1,6}$/.test(value) ? value : null);

/** URL の条件を読み、足りないところは初期値で埋める。おかしな値は無視する */
export const readInputsFromUrl = (fallback: ConditionInputs): ConditionInputs => {
  if (typeof window === 'undefined') return fallback;
  const q = new URLSearchParams(window.location.search);
  const prefecture = q.get(KEY.prefecture);
  return {
    salary: digits(q.get(KEY.salary)) ?? fallback.salary,
    bonus: digits(q.get(KEY.bonus)) ?? fallback.bonus,
    prefecture: prefecture && isPrefecture(prefecture) ? prefecture : fallback.prefecture,
    hasSocialInsurance: q.has(KEY.hasSocialInsurance) ? q.get(KEY.hasSocialInsurance) !== '0' : fallback.hasSocialInsurance,
    isCareInsured: q.has(KEY.isCareInsured) ? q.get(KEY.isCareInsured) === '1' : fallback.isCareInsured,
  };
};

/** 条件が変わるたびに URL を書き換える。履歴は増やさない（戻るボタンで入力を1文字ずつ戻らないように） */
export const useSyncInputsToUrl = (inputs: ConditionInputs) => {
  useEffect(() => {
    const q = new URLSearchParams();
    if (inputs.salary) q.set(KEY.salary, inputs.salary);
    if (inputs.bonus) q.set(KEY.bonus, inputs.bonus);
    q.set(KEY.prefecture, inputs.prefecture);
    if (!inputs.hasSocialInsurance) q.set(KEY.hasSocialInsurance, '0');
    if (inputs.isCareInsured) q.set(KEY.isCareInsured, '1');
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
  }, [inputs]);
};
