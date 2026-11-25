import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * docs/design.md「作り物っぽさを避ける決まり」のうち、機械で見分けられるものを止める。
 * 画面を変えたときに定番の飾りが戻ってこないようにするため。
 */
const src = path.resolve(__dirname);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(tsx|ts|css)$/.test(name) && !name.endsWith('.test.ts') ? [p] : [];
  });
}

const files = walk(src).map((p) => ({ file: path.relative(src, p), text: readFileSync(p, 'utf8') }));

const rules: { what: string; test: (text: string) => boolean }[] = [
  { what: 'ぼかした影（box-shadow のぼかし幅が 0 でないもの）', test: (t) => /box-shadow:\s*(?!none)[^;]*\s\d+px\s+\d*[1-9]\d*px/.test(t) },
  { what: '字間を大きく空けた文字（letter-spacing 0.1em 以上）', test: (t) => /letter-spacing:\s*0\.[1-9]/.test(t) },
  { what: 'グラデーション', test: (t) => /(linear|radial|conic)-gradient\(/.test(t) },
  { what: 'すりガラス・ぼかし', test: (t) => /backdrop-filter|filter:\s*blur/.test(t) },
  { what: '斜めに傾けた飾り（rotate の数値が ±45deg 以外）', test: (t) => /rotate\((?!-?45deg\))-?\d+(\.\d+)?deg\)/.test(t) },
  { what: '色の太い線を上に引いたカード（border-top 3px 以上の色線）', test: (t) => /border-top:\s*[3-9]px solid var\(--(?!ink)/.test(t) },
  { what: '金額が数え上がる動き（useTween）', test: (t) => /\buseTween\b/.test(t) },
  { what: '絵文字', test: (t) => /\p{Extended_Pictographic}/u.test(t) },
  { what: '呼びかけの決まり文句（「しましょう」「！」）', test: (t) => /しましょう|！/.test(t) },
];

describe('作り物っぽさを避ける決まり（docs/design.md）', () => {
  for (const rule of rules) {
    it(`${rule.what} を使っていない`, () => {
      expect(files.filter(({ text }) => rule.test(text)).map(({ file }) => file)).toEqual([]);
    });
  }
});
