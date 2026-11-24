import { memo } from 'react';
import type { TaxCalculationResult } from '@domain/tax';
import { TAX_YEAR_LABEL } from '@domain/tax';
import { texts } from '@constants';
import { formatYen as yen } from '@utils';

interface BasisProps {
  result: TaxCalculationResult;
  prefecture: string;
}

const pct = (rate: number) => `${(rate * 100).toFixed(2).replace(/0$/, '')}%`;

// 数字の根拠をすべて見せる。税理士や経理の人がこの欄だけで検算できるようにする
export const Basis = memo(({ result, prefecture }: BasisProps) => {
  const b = result.basis;
  const rows: [string, string][] = [
    [texts.basis.healthRate, `${pct(b.healthRate)}（協会けんぽ ${prefecture}）`],
    [texts.basis.standardMonthly, b.standardMonthly ? `${yen(b.standardMonthly)}円` : '—'],
    [texts.basis.pensionStandardMonthly, b.pensionStandardMonthly ? `${yen(b.pensionStandardMonthly)}円` : '—'],
    [texts.basis.salaryIncome, `${yen(b.salaryIncome)}円`],
    [texts.basis.socialInsuranceDeduction, `${yen(b.socialInsuranceDeduction)}円`],
    [texts.basis.basicDeduction, `${yen(b.basicDeduction)}円`],
    [texts.basis.taxableIncome, `${yen(b.taxableIncome)}円`],
    [texts.basis.residentTaxableIncome, `${yen(b.residentTaxableIncome)}円`],
  ];

  return (
    <details className="basis">
      <summary>{texts.basis.title}</summary>
      <div className="basis__body">
        <dl className="ledger__rows">
          {rows.map(([label, value]) => (
            <div className="row" key={label}>
              <dt>{label}</dt>
              <dd className="num">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="basis__heading">料率と制度（{TAX_YEAR_LABEL}）</h3>
        <ul className="basis__list">
          <li>所得税：給与所得控除の最低額 74万円、基礎控除は合計所得 489万円以下で 104万円（令和8年分）。速算表で計算し、復興特別所得税 2.1% を加えて百円未満を切り捨て。年末調整後の年税額を、給与と賞与の割合で月に配っています</li>
          <li>住民税：所得割 10%（市6%・県4%）、調整控除 2,500円、均等割と森林環境税で 5,000円。前年も同じ年収だった場合の額です</li>
          <li>健康保険・介護保険（1.62%）・子ども・子育て支援金（0.23%）・厚生年金（18.3%）：標準報酬月額に掛けて労使で折半。本人分は 50銭以下切り捨て</li>
          <li>賞与：2回に等分。標準賞与額は千円未満切り捨て、厚生年金は 1回 150万円、健康保険は年 573万円が上限</li>
          <li>雇用保険：本人 0.5%、会社 0.85%（一般の事業、令和8年度）。労災保険 0.3%（その他の各種事業）、子ども・子育て拠出金 0.36% は会社のみ</li>
        </ul>

        <h3 className="basis__heading">含めていないもの</h3>
        <ul className="basis__list">
          <li>扶養控除・配偶者控除、生命保険料控除、iDeCo、ふるさと納税などの控除</li>
          <li>通勤手当の非課税分、自治体ごとの住民税の超過課税、健康保険組合の独自の料率</li>
        </ul>

        <h3 className="basis__heading">出典</h3>
        <ul className="basis__list basis__list--sources">
          <li>
            <a href="https://www.mof.go.jp/tax_policy/publication/brochure/zeisei2026_pdf/zeisei26_01.pdf" rel="noopener noreferrer" target="_blank">
              財務省「令和8年度税制改正」
            </a>
          </li>
          <li>
            <a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm" rel="noopener noreferrer" target="_blank">
              国税庁「所得税の税率」
            </a>
          </li>
          <li>
            <a href="https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r08" rel="noopener noreferrer" target="_blank">
              全国健康保険協会「令和8年度 都道府県単位保険料率」
            </a>
          </li>
          <li>
            <a href="https://www.mhlw.go.jp/content/001672589.pdf" rel="noopener noreferrer" target="_blank">
              厚生労働省「令和8年度 雇用保険料率のご案内」
            </a>
          </li>
          <li>
            <a href="https://www.nenkin.go.jp/service/kounen/hokenryo/ryogaku/ryogakuhyo/20200825.html" rel="noopener noreferrer" target="_blank">
              日本年金機構「厚生年金保険料額表」
            </a>
          </li>
        </ul>
      </div>
    </details>
  );
});
Basis.displayName = 'Basis';
