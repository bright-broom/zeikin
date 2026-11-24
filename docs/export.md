# 試算結果の書き出し

画面の「データで書き出す」から、いま表示している試算を 4 つの形式で書き出せます。月額（賞与のない月）と年額の両方を出し、金額はすべて円の整数です。

| 形式 | 用途 | 中身 |
| --- | --- | --- |
| CSV | 表計算ソフトで開く・取り込む | 明細の表だけ（見出し 1 行＋項目） |
| Excel（.xlsx） | 表計算ソフトでそのまま使う | 「明細」と「条件と根拠」の 2 シート |
| JSON | 他のシステムに渡す | 条件・要約・明細・計算の根拠のすべて |
| Markdown | Notion・Slack・GitHub に貼る | 手取り・条件・明細の表（クリップボードにコピー） |

ファイル名は `給与明細_2026_月給30万円_賞与60万円_東京都.csv` のように、計算の条件を含めます。

## 作り

- 中身は `src/features/tax-calculator/export/model.ts` の `buildExportDocument` で 1 回だけ作り、各形式はそれを書式に変えるだけにしている。形式によって数字や項目が食い違わない
- `model.ts`・`csv.ts`・`json.ts`・`markdown.ts`・`xlsx.ts` は画面（DOM）に依存しない関数。ブラウザに触るのは保存を受け持つ `download.ts` だけ
- 書き出した日時は呼ぶ側から渡す。試験では固定した日時で同じ結果を確かめる

## CSV

- 文字コードは UTF-8（先頭に BOM）。Excel でそのまま開いても文字化けしない
- 区切りはカンマ、改行は CRLF（RFC 4180）
- 1 行目が見出し：`区分,項目,月額（賞与のない月・円）,年額（円）`。条件の説明の行は混ぜない（取り込む側が先頭行を見出しとして扱えるように）
- 金額は桁区切りのない整数。賞与のように月額がないものは空欄
- 文字の欄が `= + - @` やタブ・改行で始まるときは、先頭に `'` を付けて式として実行されないようにする（CSV Injection 対策）

## Excel（.xlsx）

- 大きな表計算ライブラリは使わず、Office Open XML の必要な部品だけを組み立てて zip に固める（zip だけ [fflate](https://github.com/101arrowz/fflate) を使う）
- fflate は Excel のボタンを押したときに初めて読み込む。最初に開くページの大きさは変わらない
- 金額は数値のセルに入れ、表示形式 `#,##0` を付ける。Excel で足し算・並べ替えができる
- 「明細」シートは見出し行を固定。合計の行は太字と上の罫線
- 「条件と根拠」シートには、計算の条件と、標準報酬月額・課税所得などの途中の数字を入れる。健康保険料率は `0.00%` の表示形式の数値
- Microsoft Excel・LibreOffice Calc・openpyxl で開けることを確かめている

## JSON

キーは英語、金額は円の整数、月額のない項目は `null`。`schema` と `version` で形を見分ける。項目の意味を変えたり消したりするときは `version` を上げる（足すだけなら上げない）。

月給 30 万円・賞与 60 万円・東京都・介護保険なしの例：

```jsonc
{
  "schema": "zeikin.payslip",
  "version": 1,
  "taxYear": "2026年（令和8年）",
  "generatedAt": "2026-11-25T03:04:05.000Z", // ISO 8601（UTC）
  "sourceUrl": "https://zeikin-tedori.pages.dev/?s=30&b=60&pref=…", // この条件で開き直せる URL
  "conditions": {
    "monthlySalary": 300000,
    "annualBonus": 600000,
    "prefecture": "東京都",
    "hasSocialInsurance": true,
    "isCareInsured": false
  },
  "summary": {
    "grossIncome":       { "monthly": 300000, "annual": 4200000 },
    "totalDeductions":   { "monthly": 64470,  "annual": 871080 },
    "takeHome":          { "monthly": 235530, "annual": 3328920 },
    "takeHomeRate":      { "monthly": 78.5,   "annual": 79.3 },    // %、小数第 1 位まで
    "employerBurden":    { "monthly": 47100,  "annual": 659400 },
    "employerTotalCost": { "monthly": 347100, "annual": 4859400 }  // 額面＋会社の負担
  },
  "rows": [
    // section: "pay" | "deduction" | "summary" | "employer"
    { "section": "pay", "key": "salary", "label": "給与", "monthly": 300000, "annual": 3600000, "isTotal": false },
    { "section": "pay", "key": "bonus",  "label": "賞与", "monthly": null,   "annual": 600000,  "isTotal": false }
    // …
  ],
  "basis": {
    "standardMonthly": 300000,
    "pensionStandardMonthly": 300000,
    "salaryIncome": 2920000,
    "basicDeduction": 1040000,
    "socialInsuranceDeduction": 616980,
    "taxableIncome": 1263000,
    "residentTaxableIncome": 1873000,
    "healthRate": 0.0985
  }
}
```

`rows` の `key`：

| section | key |
| --- | --- |
| pay | `salary` `bonus`（賞与があるときだけ） `grossIncome`（合計） |
| deduction | `incomeTax` `residentTax` `healthInsurance` `careInsurance`※ `childSupport`※ `pensionInsurance`※ `employmentInsurance` `totalDeductions`（合計） |
| summary | `takeHome` |
| employer | `healthInsurance` `careInsurance`※ `childSupport`※ `pensionInsurance`※ `employmentInsurance` `workersComp` `childContribution`※ `employerBurden`（合計） |

※ 加入していない・対象外のときは行がない。

次のことは試験で確かめている（`export.test.ts`）。

- 明細の各行を足すと合計の行になる
- 額面 − 控除合計 ＝ 手取り
- 読み戻すと同じ中身になる
