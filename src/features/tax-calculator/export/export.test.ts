import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { calculatePay } from '@domain/tax';
import type { TaxCalculationInput } from '@domain/tax';
import { buildExportDocument, EXPORT_SCHEMA, EXPORT_VERSION } from './model';
import { escapeCsvText, toCsv, UTF8_BOM } from './csv';
import { toJson } from './json';
import { toMarkdown } from './markdown';
import { buildXlsxParts, columnName, escapeXml, toXlsx } from './xlsx';
import { fileNameFor } from './formats';

const NOW = new Date('2026-11-25T03:04:05.000Z');

const input = (over: Partial<TaxCalculationInput> = {}): TaxCalculationInput => ({
  monthlySalary: 300_000,
  annualBonus: 600_000,
  prefecture: '東京都',
  hasSocialInsurance: true,
  isCareInsured: true,
  ...over,
});

const docFor = (over: Partial<TaxCalculationInput> = {}) => {
  const i = input(over);
  return buildExportDocument(i, calculatePay(i), { now: NOW, sourceUrl: 'https://zeikin-tedori.pages.dev/?s=30&b=60' });
};

const pick = (doc: ReturnType<typeof docFor>, section: string, key: string) =>
  doc.rows.find((r) => r.section === section && r.key === key);

describe('buildExportDocument（書き出しの中身）', () => {
  it('明細の画面と同じ数字になる（30 万円・賞与 60 万円・東京都）', () => {
    const doc = docFor({ isCareInsured: false });
    // 年額は docs/calculation.md の手計算と同じ。月額は画面と同じ計算の結果と一致すること
    expect(doc.summary.takeHome.annual).toBe(3_328_920);
    expect(doc.summary.takeHome.monthly).toBe(calculatePay(input({ isCareInsured: false })).employee.takeHome.monthly);
    expect(pick(doc, 'deduction', 'incomeTax')?.annual).toBe(64_400);
    expect(pick(doc, 'deduction', 'residentTax')?.annual).toBe(189_700);
  });

  it('控除の各行を足すと控除合計に、支給の各行を足すと総支給額になる（月額・年額とも）', () => {
    for (const over of [{}, { hasSocialInsurance: false }, { annualBonus: 0 }, { monthlySalary: 1_200_000 }]) {
      const doc = docFor(over);
      const sum = (section: string, field: 'monthly' | 'annual') =>
        doc.rows.filter((r) => r.section === section && !r.isTotal).reduce((t, r) => t + (r[field] ?? 0), 0);
      for (const f of ['monthly', 'annual'] as const) {
        expect(sum('deduction', f)).toBe(pick(doc, 'deduction', 'totalDeductions')?.[f]);
        expect(sum('pay', f)).toBe(pick(doc, 'pay', 'grossIncome')?.[f]);
        expect(sum('employer', f)).toBe(pick(doc, 'employer', 'employerBurden')?.[f]);
      }
      expect(doc.summary.grossIncome.annual - doc.summary.totalDeductions.annual).toBe(doc.summary.takeHome.annual);
    }
  });

  it('賞与には月額がない（null）。賞与がなければ行を出さない', () => {
    expect(pick(docFor(), 'pay', 'bonus')).toMatchObject({ monthly: null, annual: 600_000 });
    expect(pick(docFor({ annualBonus: 0 }), 'pay', 'bonus')).toBeUndefined();
  });

  it('入っていない保険の行は出さない', () => {
    const doc = docFor({ hasSocialInsurance: false, isCareInsured: false });
    expect(pick(doc, 'deduction', 'pensionInsurance')).toBeUndefined();
    expect(pick(doc, 'deduction', 'careInsurance')).toBeUndefined();
    expect(pick(doc, 'deduction', 'employmentInsurance')).toBeDefined();
  });

  it('金額はすべて円の整数', () => {
    for (const r of docFor({ monthlySalary: 333_333, annualBonus: 777_777 }).rows) {
      expect(Number.isInteger(r.annual)).toBe(true);
      if (r.monthly !== null) expect(Number.isInteger(r.monthly)).toBe(true);
    }
  });
});

describe('CSV', () => {
  const csv = toCsv(docFor());

  it('先頭に BOM、改行は CRLF、末尾も改行で終わる', () => {
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('先頭行が見出しで、どの行も 4 列', () => {
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('区分,項目,月額（賞与のない月・円）,年額（円）');
    for (const line of lines) expect(line.split(',')).toHaveLength(4);
  });

  it('金額は桁区切りのない数値、月額のない賞与は空欄', () => {
    expect(csv).toContain('支給,賞与,,600000\r\n');
    expect(csv).toContain('支給,給与,300000,3600000\r\n');
  });

  it('文字の欄はカンマ・引用符・改行を囲み、式として実行されうる先頭文字を無害にする', () => {
    expect(escapeCsvText('a,b')).toBe('"a,b"');
    expect(escapeCsvText('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvText('x\ny')).toBe('"x\ny"');
    expect(escapeCsvText('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvText('+1')).toBe("'+1");
    expect(escapeCsvText('-1')).toBe("'-1");
    expect(escapeCsvText('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvText('健康保険')).toBe('健康保険');
  });
});

describe('JSON', () => {
  it('版つきの決まった形で、読み戻すと同じ中身になる', () => {
    const doc = docFor();
    const parsed: unknown = JSON.parse(toJson(doc));
    expect(parsed).toEqual(doc);
    expect(doc.schema).toBe(EXPORT_SCHEMA);
    expect(doc.version).toBe(EXPORT_VERSION);
    expect(doc.generatedAt).toBe('2026-11-25T03:04:05.000Z');
    expect(doc.conditions).toEqual(input());
  });

  it('行のキーは英語で、同じ区分の中で重ならない', () => {
    const doc = docFor();
    const ids = doc.rows.map((r) => `${r.section}.${r.key}`);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of doc.rows) expect(r.key).toMatch(/^[a-zA-Z]+$/);
  });
});

describe('Markdown', () => {
  const md = toMarkdown(docFor());

  it('表の各行は同じ列の数で、金額の列は右寄せ', () => {
    const table = md.split('\n').filter((l) => l.startsWith('|'));
    expect(table[1]).toBe('| --- | --- | ---: | ---: |');
    for (const line of table) expect(line.split(/(?<!\\)\|/).length).toBe(6);
  });

  it('条件と手取りが書かれている', () => {
    expect(md).toContain('東京都');
    expect(md).toContain('**差引支給額（手取り）**');
    expect(md).toContain('| 支給 | 賞与 | — | 600,000 |');
  });
});

describe('Excel（.xlsx）', () => {
  it('列名は A〜Z の次が AA', () => {
    expect([0, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });

  it('XML で特別な意味の文字と、使えない制御文字を処理する', () => {
    expect(escapeXml('a<b & "c">')).toBe('a&lt;b &amp; &quot;c&quot;&gt;');
    expect(escapeXml('ok\u0001\u0008')).toBe('ok');
    expect(escapeXml('改行\nとタブ\t')).toBe('改行\nとタブ\t');
  });

  it('必要な部品がそろい、金額は数値のセルに入る', () => {
    const parts = buildXlsxParts(docFor());
    expect(Object.keys(parts).sort()).toEqual(
      [
        '[Content_Types].xml',
        '_rels/.rels',
        'docProps/core.xml',
        'xl/_rels/workbook.xml.rels',
        'xl/styles.xml',
        'xl/workbook.xml',
        'xl/worksheets/sheet1.xml',
        'xl/worksheets/sheet2.xml',
      ].sort(),
    );
    const sheet = parts['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="C2" s="1"><v>300000</v></c>');
    expect(sheet).toContain('<c r="D2" s="1"><v>3600000</v></c>');
    // 賞与の月額は空のセル（C 列を出さない）
    expect(sheet).toMatch(/<row r="3"><c r="A3"[^>]*>.*<c r="B3"[^>]*>.*賞与.*<\/c><c r="D3" s="1"><v>600000<\/v><\/c><\/row>/);
    expect(parts['xl/workbook.xml']).toContain('name="明細"');
  });

  it('zip として開け、中身が部品と一致する', async () => {
    const doc = docFor();
    const bytes = await toXlsx(doc);
    // zip の先頭は "PK\x03\x04"
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const files = unzipSync(bytes);
    const parts = buildXlsxParts(doc);
    for (const [path, xml] of Object.entries(parts)) expect(strFromU8(files[path] ?? new Uint8Array())).toBe(xml);
  });

  it('同じ中身なら同じバイト列になる', async () => {
    const doc = docFor();
    expect(await toXlsx(doc)).toEqual(await toXlsx(doc));
  });
});

describe('ファイル名', () => {
  it('条件が入り、形式ごとの拡張子になる', () => {
    const doc = docFor();
    expect(fileNameFor(doc, 'csv')).toBe('給与明細_2026_月給30万円_賞与60万円_東京都.csv');
    expect(fileNameFor(doc, 'xlsx')).toMatch(/\.xlsx$/);
    expect(fileNameFor(doc, 'markdown')).toMatch(/\.md$/);
  });

  it('万円で割り切れない金額は円で書く', () => {
    expect(fileNameFor(docFor({ monthlySalary: 305_500, annualBonus: 0 }), 'json')).toBe(
      '給与明細_2026_月給305,500円_賞与0万円_東京都.json',
    );
  });
});
