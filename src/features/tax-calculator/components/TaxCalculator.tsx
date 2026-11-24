import { useCallback, useMemo, useRef, useState } from 'react';
import { useTaxCalculation } from '../hooks/useTaxCalculation';
import type { TaxCalculationResult } from '@domain/tax';
import { validateSalary, safeMathOperation } from '@domain/validation';
import { texts } from '@constants';
import { Conditions } from './Conditions';
import type { ConditionInputs } from './Conditions';
import { PaySlip } from './PaySlip';
import { formatYen as yen } from '@utils';
import type { Period } from './PaySlip';
import { EmployerCost } from './EmployerCost';

// 初期値は「月給30万円・厚生年金に加入」。会社員のごく一般的な条件で、開いた瞬間に明細が見えるようにする
const INITIAL: ConditionInputs = {
  baseSalary: '30',
  hasPension: true,
  hasCareInsurance: false,
  hasChildCare: false,
};

export const TaxCalculator = () => {
  const [inputs, setInputs] = useState<ConditionInputs>(INITIAL);
  const [period, setPeriod] = useState<Period>('monthly');
  // 入力が途中（空など）のあいだは、直前の結果を出したままにして画面が跳ねないようにする
  const lastResult = useRef<TaxCalculationResult | null>(null);
  // useTaxCalculation は描画のたびに新しい関数を返すので、最初の 1 つを使い続ける（再計算の連鎖を防ぐ）
  const [{ calculate }] = useState(useTaxCalculation);

  const computed = useMemo(() => {
    const salary = validateSalary(inputs.baseSalary);
    if (!salary.isValid || !salary.sanitizedValue) return { result: null, error: texts.errors.invalid };
    const result = safeMathOperation(
      () =>
        calculate({
          baseSalary: salary.sanitizedValue ?? 0,
          // 賞与は計算側の扱いを見直すまで入力に出さない（README 参照）
          bonus: 0,
          hasPension: inputs.hasPension,
          hasCareInsurance: inputs.hasCareInsurance,
          hasChildCare: inputs.hasChildCare,
        }),
      null,
      'tax calculation failed',
    );
    return result ? { result, error: null } : { result: null, error: texts.errors.invalid };
  }, [inputs, calculate]);

  if (computed.result) lastResult.current = computed.result;
  const result = computed.result ?? lastResult.current;
  // 空欄は打ち直しの途中なので、エラーとして責めない
  const error = inputs.baseSalary === '' ? null : computed.error;

  const handleSalaryChange = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, baseSalary: value }));
  }, []);

  const handleToggle = useCallback((key: 'hasPension' | 'hasCareInsurance' | 'hasChildCare', value: boolean) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="page">
      <header className="masthead">
        <h1 className="masthead__name">{texts.app.title}</h1>
        <p className="masthead__lead">{texts.app.lead}</p>
      </header>

      <div className="layout">
        <Conditions inputs={inputs} error={error} onSalaryChange={handleSalaryChange} onToggle={handleToggle} />

        <main>
          {result && (
            <>
              <PaySlip result={result} period={period} onPeriodChange={setPeriod} />
              <EmployerCost result={result} period={period} />
            </>
          )}
          <p className="disclaimer">{texts.disclaimer}</p>
        </main>
      </div>

      {result && (
        <div className="dock" aria-hidden="true">
          <span>
            {texts.dock.label}（{texts.slip.period[period]}）{' '}
            <span className="dock__amount">{yen(result.employee.takeHome[period])}</span>円
          </span>
          <a href="#slip" tabIndex={-1}>
            {texts.dock.jump}
          </a>
        </div>
      )}
    </div>
  );
};
