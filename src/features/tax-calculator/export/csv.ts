import { texts } from '@constants';
import { SECTION_LABEL } from './model';
import type { ExportDocument } from './model';

/** Excel が UTF-8 だと見分けられるように先頭に付ける印（BOM） */
export const UTF8_BOM = '﻿';

/**
 * 表計算ソフトで開いたときに式として実行されうる先頭文字。
 * いまの項目名はすべて固定の文言だが、将来ほかの値が入っても式にならないよう、文字の欄には必ずかける
 * （OWASP「CSV Injection」の対策）。数値の欄はそのまま出す。
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const escapeCsvText = (value: string): string => {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const cell = (value: string | number | null): string => {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  return escapeCsvText(value);
};

/**
 * 明細を 1 つの表として出す（RFC 4180：区切りはカンマ、改行は CRLF）。
 * 条件などの説明の行は混ぜない。表を読み込む側が先頭行を見出しとして扱えるようにするため。
 * 条件はファイル名・JSON・Excel の「条件」シートに入れる。
 */
export const toCsv = (doc: ExportDocument): string => {
  const c = texts.exporting.columns;
  const lines = [
    [c.section, c.item, c.monthly, c.annual],
    ...doc.rows.map((r) => [SECTION_LABEL[r.section], r.label, r.monthly, r.annual]),
  ];
  return UTF8_BOM + lines.map((line) => line.map(cell).join(',')).join('\r\n') + '\r\n';
};
