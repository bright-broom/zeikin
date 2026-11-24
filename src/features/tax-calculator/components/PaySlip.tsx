import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { MonthlyAnnual, TaxCalculationResult } from '@domain/tax';
import { texts } from '@constants';
import { formatYen as yen } from '@utils';

export type Period = keyof MonthlyAnnual;

interface PaySlipProps {
  result: TaxCalculationResult;
  period: Period;
  onPeriodChange: (period: Period) => void;
}


// 内訳の 3 色。CSS の --ai / --shu / --ocher と同じ
const COLOR = {
  takeHome: 'var(--ai)',
  tax: 'var(--shu)',
  insurance: 'var(--ocher)',
} as const;

const Row = ({ label, value, group }: { label: string; value: number; group?: string }) => (
  <div className={group ? 'row row--group' : 'row'} style={group ? ({ '--c': group } as CSSProperties) : undefined}>
    <dt>{label}</dt>
    <dd className="num">{yen(value)}</dd>
  </div>
);

export const PaySlip = memo(({ result, period, onPeriodChange }: PaySlipProps) => {
  const e = result.employee;
  const p = period;
  const gross = e.grossIncome[p];
  const takeHome = e.takeHome[p];
  const tax = e.incomeTax[p] + e.residentTax[p];
  const insurance =
    e.healthInsurance[p] + (e.pensionInsurance?.[p] ?? 0) + (e.careInsurance?.[p] ?? 0) + e.employmentInsurance[p];
  // 帯は「手取り＋控除」を 100% とする。賞与の扱いで額面と合計がずれる場合でも帯が崩れないように
  const whole = takeHome + tax + insurance || 1;
  const rate = gross > 0 ? Math.round((takeHome / gross) * 1000) / 10 : 0;
  const periodLabel = texts.slip.period[p];

  const segments = [
    { key: 'takeHome', label: texts.slip.split.takeHome, value: takeHome, color: COLOR.takeHome },
    { key: 'tax', label: texts.slip.split.tax, value: tax, color: COLOR.tax },
    { key: 'insurance', label: texts.slip.split.insurance, value: insurance, color: COLOR.insurance },
  ];

  return (
    <article className="slip" id="slip" aria-labelledby="slip-title">
      <header className="slip__head">
        <div>
          <h2 className="slip__title" id="slip-title">
            {texts.slip.title}
          </h2>
          <p className="slip__basis">{texts.slip.basis}</p>
        </div>
        <div className="period" role="group" aria-label={texts.slip.period.label}>
          {(['monthly', 'annual'] as const).map((key) => (
            <button key={key} type="button" aria-pressed={period === key} onClick={() => onPeriodChange(key)}>
              {texts.slip.period[key]}
            </button>
          ))}
        </div>
      </header>

      <div className="net">
        <div>
          <p className="net__label">{texts.slip.net}</p>
          <p className="net__amount" aria-live="polite">
            {yen(takeHome)}
            <span className="net__yen">{texts.currency.yen}</span>
          </p>
          <p className="net__sub">{texts.slip.netSub(yen(gross), periodLabel)}</p>
        </div>
        <div className="seal" aria-label={`${texts.slip.seal} ${rate}%`}>
          <span className="seal__label" aria-hidden="true">
            {texts.slip.seal}
          </span>
          <span className="seal__value" aria-hidden="true">
            {rate}%
          </span>
        </div>
      </div>

      <div className="split">
        <div className="split__bar" aria-hidden="true">
          {segments.map((s) => (
            <div key={s.key} className="split__seg" style={{ flexBasis: `${(s.value / whole) * 100}%`, background: s.color }} />
          ))}
        </div>
        <ul className="split__legend">
          {segments.map((s) => (
            <li key={s.key} style={{ '--c': s.color } as CSSProperties}>
              <span>{s.label}</span>
              <span className="num">{yen(s.value)}円</span>
              <small>{Math.round((s.value / whole) * 100)}%</small>
            </li>
          ))}
        </ul>
      </div>

      <div className="ledger">
        <section className="ledger__col" aria-labelledby="pay-caption">
          <h3 className="ledger__caption" id="pay-caption">
            {texts.slip.pay}
          </h3>
          <dl className="ledger__rows">
            <Row label={texts.labels.grossIncome} value={gross} />
          </dl>
          <dl className="ledger__rows" style={{ flex: 'none' }}>
            <div className="row row--total">
              <dt>{texts.slip.payTotal}</dt>
              <dd className="num">{yen(gross)}</dd>
            </div>
          </dl>
        </section>
        <section className="ledger__col" aria-labelledby="deduction-caption">
          <h3 className="ledger__caption" id="deduction-caption">
            {texts.slip.deduction}
          </h3>
          <dl className="ledger__rows">
            <Row label={texts.labels.incomeTax} value={e.incomeTax[p]} group={COLOR.tax} />
            <Row label={texts.labels.residentTax} value={e.residentTax[p]} group={COLOR.tax} />
            <Row label={texts.labels.healthInsurance} value={e.healthInsurance[p]} group={COLOR.insurance} />
            {e.pensionInsurance && <Row label={texts.labels.pensionInsurance} value={e.pensionInsurance[p]} group={COLOR.insurance} />}
            {e.careInsurance && <Row label={texts.labels.careInsurance} value={e.careInsurance[p]} group={COLOR.insurance} />}
            <Row label={texts.labels.employmentInsurance} value={e.employmentInsurance[p]} group={COLOR.insurance} />
          </dl>
          <dl className="ledger__rows" style={{ flex: 'none' }}>
            <div className="row row--total">
              <dt>{texts.slip.deductionTotal}</dt>
              <dd className="num">{yen(e.totalTax[p])}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p className="slip__foot">
        <span>{texts.slip.netShort}</span>
        <span className="slip__formula">
          <span className="num">{yen(gross)}</span>
          <span aria-label="ひく"> − </span>
          <span className="num">{yen(e.totalTax[p])}</span>
          <span aria-label="は"> ＝ </span>
          <strong className="num">{yen(takeHome)}円</strong>
        </span>
      </p>
    </article>
  );
});
PaySlip.displayName = 'PaySlip';
