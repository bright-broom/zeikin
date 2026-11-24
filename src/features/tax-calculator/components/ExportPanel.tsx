import { memo, useEffect, useState } from 'react';
import type { TaxCalculationInput, TaxCalculationResult } from '@domain/tax';
import { texts } from '@constants';
import { buildExportDocument, FORMATS, fileNameFor, saveFile } from '../export';
import type { ExportFormat } from '../export';

interface ExportPanelProps {
  input: TaxCalculationInput;
  result: TaxCalculationResult;
}

type Status = { kind: 'idle' } | { kind: 'working'; format: ExportFormat } | { kind: 'done'; message: string } | { kind: 'failed' };

const ORDER: ExportFormat[] = ['csv', 'xlsx', 'json', 'markdown'];

/**
 * いま画面に出ている試算を、ファイルやクリップボードに書き出す。
 * 中身は export/ の関数で作り、この部品は「押されたら作って渡す」ことと、結果を伝えることだけを受け持つ。
 */
export const ExportPanel = memo(({ input, result }: ExportPanelProps) => {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    if (status.kind !== 'done' && status.kind !== 'failed') return;
    const timer = window.setTimeout(() => setStatus({ kind: 'idle' }), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleExport = async (format: ExportFormat) => {
    // 中身は押した時点で確定させる。Excel を作っている途中で条件が変わっても、押したときの試算を書き出す
    const doc = buildExportDocument(input, result, {
      now: new Date(),
      sourceUrl: window.location.href,
    });
    setStatus({ kind: 'working', format });
    try {
      const spec = FORMATS[format];
      const data = await spec.render(doc);
      if (format === 'markdown' && typeof data === 'string') {
        await navigator.clipboard.writeText(data);
        setStatus({ kind: 'done', message: texts.exporting.status.copied });
        return;
      }
      const name = fileNameFor(doc, format);
      saveFile(data, spec.mime, name);
      setStatus({ kind: 'done', message: texts.exporting.status.saved(name) });
    } catch {
      setStatus({ kind: 'failed' });
    }
  };

  const busy = status.kind === 'working';
  const message =
    status.kind === 'working'
      ? texts.exporting.status.working
      : status.kind === 'done'
        ? status.message
        : status.kind === 'failed'
          ? texts.exporting.status.failed
          : texts.exporting.lead;

  return (
    <section className="export" aria-labelledby="export-title">
      <h2 className="export__title" id="export-title">
        {texts.exporting.heading}
      </h2>
      <ul className="export__list">
        {ORDER.map((format) => {
          const f = texts.exporting.formats[format];
          return (
            <li key={format}>
              <button
                type="button"
                className="export__button"
                onClick={() => void handleExport(format)}
                disabled={busy}
                aria-busy={status.kind === 'working' && status.format === format}
              >
                <span className="export__label">{f.label}</span>
                <span className="export__note">{f.note}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className={`export__status${status.kind === 'failed' ? ' export__status--error' : ''}`} role="status">
        {message}
      </p>
    </section>
  );
});
ExportPanel.displayName = 'ExportPanel';
