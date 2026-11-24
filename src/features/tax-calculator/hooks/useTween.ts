import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 360;

// 終わりにかけてゆっくり止まる。金額が「すっと落ち着く」ように見せる
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 数値が変わったとき、前の値から新しい値へ短い時間で移り変わる値を返す。
 * 途中で次の値が来たら、そのとき表示している値から続ける（数字が飛ばない）。
 * 動きを減らす設定の端末では、すぐに新しい値にする。
 */
export const useTween = (target: number): number => {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    const duration = prefersReducedMotion() ? 0 : DURATION_MS;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(t);
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
};
