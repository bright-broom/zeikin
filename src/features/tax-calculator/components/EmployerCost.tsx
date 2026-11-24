import { memo } from 'react';
import type { TaxCalculationResult } from '@domain/tax';
import { texts } from '@constants';
import { formatYen as yen } from '@utils';
import type { Period } from './PaySlip';

interface EmployerCostProps {
  result: TaxCalculationResult;
  period: Period;
}

export const EmployerCost = memo(({ result, period: p }: EmployerCostProps) => {
  const r = result.employer;
  const gross = result.employee.grossIncome[p];
  const burden = r.totalEmployerTax[p];

  const rows = [
    { label: texts.labels.residentTax, item: r.residentTax },
    { label: texts.labels.healthInsurance, item: r.healthInsurance },
    { label: texts.labels.pensionInsurance, item: r.pensionInsurance },
    { label: texts.labels.careInsurance, item: r.careInsurance },
    { label: texts.labels.employmentInsurance, item: r.employmentInsurance },
    { label: texts.labels.laborInsurance, item: r.laborInsurance },
    { label: texts.labels.childCare, item: r.childCare },
  ];

  return (
    <section className="employer" aria-labelledby="employer-title">
      <h2 className="employer__title" id="employer-title">
        {texts.employer.title}
      </h2>
      <p className="employer__lead">{texts.employer.lead}</p>

      <p className="equation">
        <span className="equation__term">
          <small>{texts.employer.gross}</small>
          <span className="num">{yen(gross)}</span>
        </span>
        <span className="equation__op" aria-hidden="true">
          ＋
        </span>
        <span className="equation__term">
          <small>{texts.employer.burden}</small>
          <span className="num">{yen(burden)}</span>
        </span>
        <span className="equation__op" aria-hidden="true">
          ＝
        </span>
        <span className="equation__term equation__term--result">
          <small>{texts.employer.total}</small>
          <span className="num">{yen(gross + burden)}円</span>
        </span>
      </p>

      <dl className="ledger__rows">
        {rows.map(({ label, item }) =>
          item ? (
            <div className="row" key={label}>
              <dt>{label}</dt>
              <dd className="num">{yen(item[p])}</dd>
            </div>
          ) : null,
        )}
        <div className="row row--total">
          <dt>{texts.employer.burden}</dt>
          <dd className="num">{yen(burden)}</dd>
        </div>
      </dl>
    </section>
  );
});
EmployerCost.displayName = 'EmployerCost';
