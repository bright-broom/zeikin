import { memo, useId } from 'react';
import type { ChangeEvent } from 'react';
import { texts } from '@constants';

export interface ConditionInputs {
  baseSalary: string;
  hasPension: boolean;
  hasCareInsurance: boolean;
  hasChildCare: boolean;
}

type ToggleKey = 'hasPension' | 'hasCareInsurance' | 'hasChildCare';

interface ConditionsProps {
  inputs: ConditionInputs;
  error: string | null;
  onSalaryChange: (value: string) => void;
  onToggle: (key: ToggleKey, value: boolean) => void;
}

// 求人票やよく話題にのぼる月給。押すだけで比べられるようにする
const PRESETS = [20, 25, 30, 35, 40, 50, 70] as const;
const SLIDER_MIN = 10;
const SLIDER_MAX = 120;

const OPTIONS: { key: ToggleKey; title: string; note: string }[] = [
  { key: 'hasPension', ...texts.form.options.pension },
  { key: 'hasCareInsurance', ...texts.form.options.careInsurance },
  { key: 'hasChildCare', ...texts.form.options.childCare },
];

export const Conditions = memo(({ inputs, error, onSalaryChange, onToggle }: ConditionsProps) => {
  const salaryId = useId();
  const hintId = useId();
  const errorId = useId();
  const sliderValue = Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, Number(inputs.baseSalary) || SLIDER_MIN));

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    // 全角数字で打たれても受け付ける（日本語入力のまま打つ人が多いため）。
    // 計算は万円の整数で行う（入力チェックが切り捨てる）ので、小数は最初から打てないようにする
    const value = e.target.value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    if (/^\d*$/.test(value)) onSalaryChange(value);
  };

  return (
    <section className="conditions" aria-label="条件">
      <div>
        <label className="field__label" htmlFor={salaryId}>
          {texts.form.salary.label}
        </label>
        <div className="salary">
          <input
            id={salaryId}
            className="salary__input"
            inputMode="numeric"
            autoComplete="off"
            value={inputs.baseSalary}
            onChange={handleInput}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? true : undefined}
          />
          <span className="salary__unit">{texts.form.salary.unit}</span>
        </div>
        <p className="field__hint" id={hintId}>
          {texts.form.salary.hint}
        </p>
        {error && (
          <p className="field__error" id={errorId} role="alert">
            {error}
          </p>
        )}
        <input
          type="range"
          className="slider"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={sliderValue}
          onChange={(e) => onSalaryChange(e.target.value)}
          aria-label={texts.form.salary.sliderLabel}
          aria-valuetext={`${sliderValue}万円`}
        />
        <ul className="presets" aria-label={texts.form.salary.presetsLabel}>
          {PRESETS.map((value) => (
            <li key={value}>
              <button
                type="button"
                className="preset"
                aria-pressed={Number(inputs.baseSalary) === value}
                onClick={() => onSalaryChange(String(value))}
              >
                {value}万
              </button>
            </li>
          ))}
        </ul>
      </div>

      <fieldset className="options">
        <legend>{texts.form.options.legend}</legend>
        {OPTIONS.map(({ key, title, note }) => (
          <label className="option" key={key}>
            <span className="option__title">{title}</span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={inputs[key]}
              onChange={(e) => onToggle(key, e.target.checked)}
            />
            <span className="option__note">{note}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
});
Conditions.displayName = 'Conditions';
