# ZEIKIN

月給と賞与から、所得税・住民税・社会保険料と手取りを計算して、給与明細の形で表示します。

https://zeikin-tedori.pages.dev/

- 2026年（令和8年）の税制と保険料率で計算します。所得税は令和8年分（基礎控除 最大104万円、給与所得控除 最低74万円）
- 健康保険は協会けんぽの都道府県別の料率、介護保険（40〜64歳）、子ども・子育て支援金に対応
- 標準報酬月額の等級、賞与の保険料の上限、端数処理まで実務と同じ扱いにしています
- 会社が負担している社会保険料も表示します
- 試算結果を CSV・Excel・JSON・Markdown で書き出せます

計算の仕様と出典は [docs/calculation.md](docs/calculation.md)、書き出しの形式は [docs/export.md](docs/export.md)、画面のデザインは [docs/design.md](docs/design.md) にあります。

## 開発

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # 計算の単体テスト
npm run lint
npm run build
```

Node.js 20 以上。

## 公開

Cloudflare Pages で公開しています。`main` に入ると自動でビルドして公開し、プルリクエストごとに確認用の URL も作られます。

- ビルドコマンド: `npm run build`
- 出力先: `dist`
- セキュリティ用のヘッダーは `public/_headers` に書いています

## 構成

```
src/
  domain/tax/
    rates.ts            税率・保険料率（年度が変わったらここだけ直す）
    calculate.ts        計算（画面に依存しない関数）
    calculate.test.ts   手計算と照らし合わせたテスト
  features/tax-calculator/export/
    model.ts            書き出しの中身（全形式の元）
    csv.ts / xlsx.ts / json.ts / markdown.ts   各形式への変換
  features/tax-calculator/components/
    TaxCalculator.tsx   入力の状態と画面全体
    Conditions.tsx      入力欄
    PaySlip.tsx         給与明細
    EmployerCost.tsx    会社の負担
    Basis.tsx           計算の前提と途中の数字
  styles/app.css        見た目のすべて
  constants/texts.ts    画面の文言
```

## 料率の更新

毎年 3〜4月に協会けんぽの健康保険料率・介護保険料率と雇用保険料率が、12月の年末調整前後に所得税の控除額が変わることがあります。`src/domain/tax/rates.ts` を直し、`calculate.test.ts` の期待値を手計算で作り直してください。

## ライセンス

MIT
