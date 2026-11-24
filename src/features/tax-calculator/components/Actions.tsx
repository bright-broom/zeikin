import { memo, useEffect, useState } from 'react';
import { texts } from '@constants';

type CopyState = 'idle' | 'copied' | 'failed';

// 明細の下に置く。条件ごと人に送る・紙で残す、の 2 つだけ
export const Actions = memo(() => {
  const [copy, setCopy] = useState<CopyState>('idle');

  useEffect(() => {
    if (copy === 'idle') return;
    const timer = window.setTimeout(() => setCopy('idle'), 2400);
    return () => window.clearTimeout(timer);
  }, [copy]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <div className="actions">
      <button type="button" className="action" onClick={handleCopy}>
        {copy === 'copied' ? texts.actions.copied : texts.actions.copy}
      </button>
      <button type="button" className="action" onClick={() => window.print()}>
        {texts.actions.print}
      </button>
      <p className="actions__note" role="status">
        {copy === 'failed' ? texts.actions.copyFailed : texts.actions.note}
      </p>
    </div>
  );
});
Actions.displayName = 'Actions';
