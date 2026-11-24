import { texts } from '@constants';
import { describeConditions, SECTION_LABEL } from './model';
import type { ExportDocument } from './model';

/**
 * Excel（.xlsx＝Office Open XML の SpreadsheetML）を、必要な最小限の部品だけで組み立てる。
 * 大きな表計算ライブラリを入れず、zip に固めるところだけ fflate を使う。
 * 金額は文字ではなく数値として入れ、桁区切りの表示形式を付ける（Excel で足し算・並べ替えができるように）。
 */

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

// XML 1.0 で使えない制御文字は消し、特別な意味を持つ文字は実体参照にする
export const escapeXml = (value: string): string =>
  value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 0 始まりの列番号を A, B, …, Z, AA … にする */
export const columnName = (index: number): string => {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

// styles.xml の cellXfs の並びと対応させる
const STYLE = {
  text: 0,
  yen: 1,
  header: 2,
  totalText: 3,
  totalYen: 4,
  percent: 5,
} as const;

type Cell = { kind: 'text'; value: string; style?: number } | { kind: 'number'; value: number; style?: number } | null;

const text = (value: string, style: number = STYLE.text): Cell => ({ kind: 'text', value, style });
const num = (value: number | null, style: number = STYLE.yen): Cell =>
  value === null ? null : { kind: 'number', value, style };

const renderCell = (cell: Cell, ref: string): string => {
  if (!cell) return '';
  const s = cell.style ? ` s="${cell.style}"` : '';
  if (cell.kind === 'number') return `<c r="${ref}"${s}><v>${cell.value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
};

const renderSheet = (rows: Cell[][], widths: number[], freezeHeader: boolean): string => {
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const pane = freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const body = rows
    .map((cells, r) => {
      const inner = cells.map((c, i) => renderCell(c, `${columnName(i)}${r + 1}`)).join('');
      return `<row r="${r + 1}">${inner}</row>`;
    })
    .join('');
  return `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">${pane}<cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
};

const detailSheet = (doc: ExportDocument): string => {
  const c = texts.exporting.columns;
  const rows: Cell[][] = [
    [text(c.section, STYLE.header), text(c.item, STYLE.header), text(c.monthly, STYLE.header), text(c.annual, STYLE.header)],
    ...doc.rows.map((r) => {
      const t = r.isTotal ? STYLE.totalText : STYLE.text;
      const n = r.isTotal ? STYLE.totalYen : STYLE.yen;
      return [text(SECTION_LABEL[r.section], t), text(r.label, t), num(r.monthly, n), num(r.annual, n)];
    }),
  ];
  return renderSheet(rows, [12, 26, 24, 16], true);
};

const conditionsSheet = (doc: ExportDocument): string => {
  const b = doc.basis;
  const B = texts.basis;
  const rows: Cell[][] = [
    [text(texts.exporting.conditionsHeading, STYLE.header), text('', STYLE.header)],
    ...describeConditions(doc).map(([k, v]) => [text(k), text(v)]),
    [],
    [text(texts.exporting.basisHeading, STYLE.header), text('', STYLE.header)],
    [text(B.healthRate), { kind: 'number', value: b.healthRate, style: STYLE.percent }],
    [text(B.standardMonthly), num(b.standardMonthly)],
    [text(B.pensionStandardMonthly), num(b.pensionStandardMonthly)],
    [text(B.salaryIncome), num(b.salaryIncome)],
    [text(B.socialInsuranceDeduction), num(b.socialInsuranceDeduction)],
    [text(B.basicDeduction), num(b.basicDeduction)],
    [text(B.taxableIncome), num(b.taxableIncome)],
    [text(B.residentTaxableIncome), num(b.residentTaxableIncome)],
    [],
    [text(texts.exporting.note)],
  ];
  return renderSheet(rows, [34, 48], false);
};

const STYLES = `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="0.00%"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Yu Gothic"/><family val="2"/></font><font><b/><sz val="11"/><name val="Yu Gothic"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF7"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF17202B"/></top><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** .xlsx を作る部品（zip の中のパスと XML）。zip に固める前の段階で中身を確かめられるよう分けておく */
export const buildXlsxParts = (doc: ExportDocument): Record<string, string> => {
  const sheets = [texts.exporting.sheetDetail, texts.exporting.sheetConditions];
  return {
    '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    '_rels/.rels': `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    'docProps/core.xml': `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(`${texts.exporting.title} ${doc.taxYear}`)}</dc:title><dc:creator>ZEIKIN</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(doc.generatedAt)}</dcterms:created></cp:coreProperties>`,
    'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>${sheets
      .map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS_REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': STYLES,
    'xl/worksheets/sheet1.xml': detailSheet(doc),
    'xl/worksheets/sheet2.xml': conditionsSheet(doc),
  };
};

/** .xlsx のバイト列。fflate はここで初めて読み込む（最初の画面を軽く保つため） */
export const toXlsx = async (doc: ExportDocument): Promise<Uint8Array> => {
  const { zipSync, strToU8 } = await import('fflate');
  const parts = buildXlsxParts(doc);
  const files = Object.fromEntries(Object.entries(parts).map(([path, xml]) => [path, strToU8(xml)]));
  // zip の中の日付を固定し、同じ中身なら同じバイト列になるようにする（試験で比べられるように）
  return zipSync(files, { level: 6, mtime: new Date('2026-01-01T00:00:00Z') });
};
