import { texts } from '@constants';
import { describeConditions, SECTION_LABEL } from './model';
import type { ExportDocument } from './model';

const yen = (v: number | null) => (v === null ? '—' : v.toLocaleString('ja-JP'));

// 表の中で意味を持つ文字を無害にする。先に \ を処理しないと、もとからある \ が | の印を打ち消してしまう
export const escapeMarkdownCell = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** Notion・Slack・GitHub にそのまま貼れる形。金額は右寄せ */
export const toMarkdown = (doc: ExportDocument): string => {
  const c = texts.exporting.columns;
  const s = doc.summary;
  const lines: string[] = [
    `## ${texts.exporting.title}`,
    '',
    `**${texts.exporting.takeHome}**：月 ${yen(s.takeHome.monthly)}円 ／ 年 ${yen(s.takeHome.annual)}円（${texts.slip.rate} ${s.takeHomeRate.annual.toFixed(1)}%）`,
    '',
    ...describeConditions(doc).map(([k, v]) => `- ${escapeMarkdownCell(k)}：${escapeMarkdownCell(v)}`),
    '',
    `| ${c.section} | ${c.item} | ${c.monthly} | ${c.annual} |`,
    '| --- | --- | ---: | ---: |',
    ...doc.rows.map((r) => {
      const label = r.isTotal ? `**${escapeMarkdownCell(r.label)}**` : escapeMarkdownCell(r.label);
      const m = r.isTotal && r.monthly !== null ? `**${yen(r.monthly)}**` : yen(r.monthly);
      const a = r.isTotal ? `**${yen(r.annual)}**` : yen(r.annual);
      return `| ${SECTION_LABEL[r.section]} | ${label} | ${m} | ${a} |`;
    }),
    '',
    `${texts.exporting.note}`,
  ];
  return `${lines.join('\n')}\n`;
};
