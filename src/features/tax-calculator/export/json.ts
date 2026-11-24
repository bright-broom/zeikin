import type { ExportDocument } from './model';

/** そのまま他のシステムに渡せる形。キーは英語、金額は円の整数、月額のない項目は null */
export const toJson = (doc: ExportDocument): string => `${JSON.stringify(doc, null, 2)}\n`;
