import { toCsv } from './csv';
import { toJson } from './json';
import { toMarkdown } from './markdown';
import { toXlsx, XLSX_MIME } from './xlsx';
import type { ExportDocument } from './model';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'markdown';

export interface FormatSpec {
  extension: string;
  mime: string;
  /** 文字列かバイト列を返す。Excel だけは zip のライブラリを読み込むので非同期 */
  render: (doc: ExportDocument) => string | Promise<Uint8Array>;
}

export const FORMATS: Record<ExportFormat, FormatSpec> = {
  csv: { extension: 'csv', mime: 'text/csv;charset=utf-8', render: toCsv },
  xlsx: { extension: 'xlsx', mime: XLSX_MIME, render: toXlsx },
  json: { extension: 'json', mime: 'application/json;charset=utf-8', render: toJson },
  markdown: { extension: 'md', mime: 'text/markdown;charset=utf-8', render: toMarkdown },
};

// ファイル名に使えない文字（Windows の禁止文字と制御文字）を _ にする
const safeName = (value: string) =>
  // eslint-disable-next-line no-control-regex
  value.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_');

/**
 * 例：給与明細_2026_月給30万円_賞与0円_東京都.csv
 * 条件をファイル名に入れ、何通りか書き出しても見分けられるようにする。
 */
export const fileNameFor = (doc: ExportDocument, format: ExportFormat): string => {
  const c = doc.conditions;
  const man = (yen: number) => (yen % 10_000 === 0 ? `${yen / 10_000}万円` : `${yen.toLocaleString('ja-JP')}円`);
  // 「2026年（令和8年）」の西暦の部分。どの年の制度で計算したかを名前に残す
  const year = doc.taxYear.slice(0, 4);
  const parts = ['給与明細', year, `月給${man(c.monthlySalary)}`, `賞与${man(c.annualBonus)}`, c.prefecture];
  return `${safeName(parts.join('_'))}.${FORMATS[format].extension}`;
};
