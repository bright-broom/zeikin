import { memo, useId } from 'react';
import type { ChangeEvent } from 'react';
import { texts } from '@constants';
import { PREFECTURES } from '@domain/tax';
import type { Prefecture } from '@domain/tax';

export interface ConditionInputs {
  salary: string;
  bonus: string;
  prefecture: Prefecture;
  hasSocialInsurance: boolean;
  isCareInsured: boolean;
}

export type ToggleKey = 'hasSocialInsurance' | 'isCareInsured';

interface ConditionsProps {
  inputs: ConditionInputs;
  salaryError: string | null;
  onChange: <K extends keyof ConditionInputs>(key: K, value: ConditionInputs[K]) => void;
}

const PRESETS = [20, 25, 30, 35, 40, 50, 70] as const;
const SLIDER_MIN = 10;
const SLIDER_MAX = 120;

const OPTIONS: { key: ToggleKey; title: string; note: string }[] = [
  { key: 'hasSocialInsurance', ...texts.form.options.socialInsurance },
  { key: 'isCareInsured', ...texts.form.options.careInsurance },
];

// 全角数字のまま打たれても受け付ける。万円の整数だけを通す
const toDigits = (raw: string) => {
  const value = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  return /^\d*$/.test(value) ? value : null;
};

export const Conditions = memo(({ inputs, salaryError, onChange }: ConditionsProps) => {
  const salaryId = useId();
  const bonusId = useId();
  const prefId = useId();
  const sliderValue = Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, Number(inputs.salary) || SLIDER_MIN));

  const handleDigits = (key: 'salary' | 'bonus') => (e: ChangeEvent<HTMLInputElement>) => {
    const value = toDigits(e.target.value);
    if (value !== null) onChange(key, value);
  };

  return (
    <section className="conditions" aria-label="条件">
      <div className="field">
        <label className="field__label" htmlFor={salaryId}>
          {texts.form.salary.label}
        </label>
        <div className="amount amount--large">
          <input
            id={salaryId}
            className="amount__input"
            inputMode="numeric"
            autoComplete="off"
            value={inputs.salary}
            onChange={handleDigits('salary')}
            aria-describedby={`${salaryId}-hint${salaryError ? ` ${salaryId}-error` : ''}`}
            aria-invalid={salaryError ? true : undefined}
          />
          <span className="amount__unit">{texts.form.salary.unit}</span>
        </div>
        <p className="field__hint" id={`${salaryId}-hint`}>
          {texts.form.salary.hint}
        </p>
        {salaryError && (
          <p className="field__error" id={`${salaryId}-error`} role="alert">
            {salaryError}
          </p>
        )}
        <input
          type="range"
          className="slider"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={sliderValue}
          onChange={(e) => onChange('salary', e.target.value)}
          aria-label={texts.form.salary.sliderLabel}
          aria-valuetext={`${sliderValue}万円`}
        />
        <ul className="presets" aria-label={texts.form.salary.presetsLabel}>
          {PRESETS.map((value) => (
            <li key={value}>
              <button
                type="button"
                className="preset"
                aria-pressed={Number(inputs.salary) === value}
                onClick={() => onChange('salary', String(value))}
              >
                {value}万
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={bonusId}>
          {texts.form.bonus.label}
        </label>
        <div className="amount">
          <input
            id={bonusId}
            className="amount__input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={inputs.bonus}
            onChange={handleDigits('bonus')}
            aria-describedby={`${bonusId}-hint`}
          />
          <span className="amount__unit">{texts.form.bonus.unit}</span>
        </div>
        <p className="field__hint" id={`${bonusId}-hint`}>
          {texts.form.bonus.hint}
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={prefId}>
          {texts.form.prefecture.label}
        </label>
        <select
          id={prefId}
          className="select"
          value={inputs.prefecture}
          onChange={(e) => onChange('prefecture', e.target.value as Prefecture)}
          aria-describedby={`${prefId}-hint`}
        >
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <p className="field__hint" id={`${prefId}-hint`}>
          {texts.form.prefecture.hint}
        </p>
      </div>

      <fieldset className="options">
        <legend className="field__label">{texts.form.options.legend}</legend>
        {OPTIONS.map(({ key, title, note }) => (
          <label className="option" key={key}>
            <span className="option__title">{title}</span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={inputs[key]}
              onChange={(e) => onChange(key, e.target.checked)}
            />
            <span className="option__note">{note}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
});
Conditions.displayName = 'Conditions';
