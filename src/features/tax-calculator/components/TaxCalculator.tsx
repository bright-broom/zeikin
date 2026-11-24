import { useCallback, useMemo, useRef, useState } from 'react';
import { calculatePay, TAX_YEAR_LABEL } from '@domain/tax';
import type { TaxCalculationResult } from '@domain/tax';
import { texts } from '@constants';
import { formatYen as yen } from '@utils';
import { Conditions } from './Conditions';
import type { ConditionInputs } from './Conditions';
import { PaySlip } from './PaySlip';
import type { Period } from './PaySlip';
import { EmployerCost } from './EmployerCost';
import { Basis } from './Basis';
import { Curve } from './Curve';
import { Actions } from './Actions';
import { readInputsFromUrl, useSyncInputsToUrl } from '../hooks/useUrlState';
import { useTween } from '../hooks/useTween';

const MAN = 10_000;
const MAX_SALARY_MAN = 10_000; // 月1億円。これより上は入力の打ち間違いとみなす
const MAX_BONUS_MAN = 100_000;

const INITIAL: ConditionInputs = {
  salary: '30',
  bonus: '',
  prefecture: '東京都',
  hasSocialInsurance: true,
  isCareInsured: false,
};

export const TaxCalculator = () => {
  // 共有されたリンクから開いたときは、その条件で始める
  const [inputs, setInputs] = useState<ConditionInputs>(() => readInputsFromUrl(INITIAL));
  useSyncInputsToUrl(inputs);
  const [period, setPeriod] = useState<Period>('monthly');
  // 入力の途中（空欄など）のあいだは、直前の結果を出したままにして画面が跳ねないようにする
  const lastResult = useRef<TaxCalculationResult | null>(null);

  const computed = useMemo(() => {
    const salary = Number(inputs.salary);
    if (!inputs.salary || !Number.isInteger(salary) || salary < 1 || salary > MAX_SALARY_MAN) {
      return { result: null, error: texts.errors.salary };
    }
    const bonus = Math.min(Number(inputs.bonus) || 0, MAX_BONUS_MAN);
    const result = calculatePay({
      monthlySalary: salary * MAN,
      annualBonus: bonus * MAN,
      prefecture: inputs.prefecture,
      hasSocialInsurance: inputs.hasSocialInsurance,
      isCareInsured: inputs.isCareInsured,
    });
    return { result, error: null };
  }, [inputs]);

  if (computed.result) lastResult.current = computed.result;
  const result = computed.result ?? lastResult.current;
  // 空欄は打ち直しの途中なので、エラーとして責めない
  const salaryError = inputs.salary === '' ? null : computed.error;

  const handleChange = useCallback(<K extends keyof ConditionInputs>(key: K, value: ConditionInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSelectSalary = useCallback((salaryMan: number) => {
    setInputs((prev) => ({ ...prev, salary: String(salaryMan) }));
  }, []);

  const dockAmount = useTween(result?.employee.takeHome[period] ?? 0);
  // 図は、明細に出ている結果と同じ月給・賞与で描く（入力の途中でも食い違わないように）
  const salaryMan = Math.round((result?.employee.salary.monthly ?? 0) / MAN);
  const bonusMan = Math.round((result?.employee.bonus.annual ?? 0) / MAN);

  return (
    <div className="page">
      <header className="masthead">
        <h1 className="masthead__name">{texts.app.title}</h1>
        <p className="masthead__lead">{texts.app.lead}</p>
        <p className="masthead__year">{TAX_YEAR_LABEL}の税率・保険料率</p>
      </header>

      {result && (
        <p className="print-conditions">
          {texts.print.conditions(
            yen(result.employee.salary.monthly),
            yen(result.employee.bonus.annual),
            inputs.prefecture,
            inputs.hasSocialInsurance,
            inputs.isCareInsured,
          )}
        </p>
      )}

      <div className="layout">
        <Conditions inputs={inputs} salaryError={salaryError} onChange={handleChange} />

        <main className="results">
          {result && (
            <>
              <PaySlip result={result} period={period} onPeriodChange={setPeriod} />
              <Actions />
              <Curve
                salary={salaryMan}
                annualBonus={bonusMan * MAN}
                prefecture={inputs.prefecture}
                hasSocialInsurance={inputs.hasSocialInsurance}
                isCareInsured={inputs.isCareInsured}
                onSelect={handleSelectSalary}
              />
              <EmployerCost result={result} period={period} />
              <Basis result={result} prefecture={inputs.prefecture} />
            </>
          )}
        </main>
      </div>

      {result && (
        <div className="dock" aria-hidden="true">
          <span>
            {texts.dock.label}（{texts.slip.period[period]}）{' '}
            <span className="dock__amount">{yen(dockAmount)}</span>円
          </span>
          <a href="#slip" tabIndex={-1}>
            {texts.dock.jump}
          </a>
        </div>
      )}
    </div>
  );
};
