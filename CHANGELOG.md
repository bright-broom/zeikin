## **CHANGELOG.md**

📅 **更新履歴 - 税金計算システム**

---

### **🎨 バージョン 1.2.0 (最新)**

📅 **更新日:** 2026-11-25

### **🔧 変更内容**

1. **画面を「給与明細」をモチーフに作り直した**

   - 入力と同時に結果を出す（「計算する」ボタンをなくした）
   - 手取りを大きく、内訳の帯（手取り・税金・社会保険）、支給・控除の明細、差引支給額の式、会社の負担を表示
   - 月額・年額の切り替え、よくある月給のボタンとスライダー、スマホ下部の手取り表示を追加
   - 月給は万円の整数だけを受け付ける（計算が整数に切り捨てていたため。全角数字も可）
   - 厚生年金の初期値を「加入」にした（会社員のほとんどが加入しているため）
   - **影響範囲:** `src/features/tax-calculator/components/`, `src/styles/app.css`, `src/constants/texts.ts`

2. **MUI と Emotion をやめた**

   - 見た目を `src/styles/app.css` に一本化。英数字の書体（BIZ UDPゴシック）だけ同梱
   - 計算（`src/domain`, `hooks`）は変えていない

---

### **🚀 バージョン 1.1.0**

📅 **更新日:** 2025-02-13

### **🔧 変更内容**

1. **住民税の計算式修正**

   - **問題:** 住民税が固定値 `15,000 円` になっていた
   - **対応:** `課税所得の10% + 5,000円` の計算式に修正
   - **影響範囲:** `deductions.ts`

2. **会社負担の厚生年金が表示されないバグ修正**

   - **問題:** `employer.pensionInsurance` が `undefined` になり表示されなかった
   - **対応:** `undefined` ではなく `0` をデフォルト値として処理
   - **影響範囲:** `useTaxCalculation.ts`, `deductions.ts`, `EmployerTaxResult.tsx`

3. **所得税の計算ロジック修正**

   - **問題:** 計算結果が `7,750 円` になっていた（実際は異なるべき）
   - **対応:** 課税所得に応じた税率適用ロジックを `taxCalculations.ts` で見直し
   - **影響範囲:** `taxCalculations.ts`, `useTaxCalculation.ts`

4. **`deductions.ts` をリファクタリング**

   - **改善:** 会社負担と社員負担の計算を `calculateDeductions()` で統一
   - **影響範囲:** `deductions.ts`

5. **`TaxResult.tsx` を `EmployeeTaxResult.tsx` と `EmployerTaxResult.tsx` に分割**

   - **改善:** 可読性向上 & 再利用性アップ
   - **影響範囲:** `TaxResult.tsx`, `EmployeeTaxResult.tsx`, `EmployerTaxResult.tsx`

6. **非 null アサーション (`!`) の排除**

   - **問題:** `biome` の `lint/style/noNonNullAssertion` ルールでエラー発生
   - **対応:** `undefined` の可能性を考慮し、適切に `?? 0` で処理
   - **影響範囲:** `useTaxCalculation.ts`

7. **フォーム (`TaxForm.tsx`) の入力ハンドリング修正**
   - **問題:** `null` を数値型フィールドにセットして `NaN` 発生
   - **対応:** `0` をデフォルト値とし、`Number(value) || 0` で処理
   - **影響範囲:** `TaxForm.tsx`, `TaxCalculator.tsx`

---

### **🚀 バージョン 1.2.0 (最新)**

📅 **更新日:** 2025-02-14

### **🔧 変更内容**

1. **アニメーションの最適化**

   - **改善:** 不要なアニメーションの削除とトランジション時間の短縮
   - **対応:**
     - トランジション時間を `0.3s` から `0.2s` に短縮
     - `transform` プロパティによる移動アニメーションを削除
     - `all` トランジションを特定のプロパティのみに限定
   - **影響範囲:**
     - `Card.styles.ts`
     - `EmployeeTaxResult.tsx`
     - `EmployerTaxResult.tsx`
     - `Form.styles.ts`
     - `Button.styles.ts`
     - `TaxForm.tsx`

2. **パフォーマンスの最適化**
   - **改善:** レンダリングパフォーマンスの向上
   - **対応:**
     - シャドウ値の軽減（より小さな値に調整）
     - 複数のプロパティの同時アニメーションを削減
     - `backdropFilter` の使用を必要な箇所のみに限定
   - **効果:**
     - レンダリングパフォーマンスの向上
     - スムーズなインタラクション
     - バッテリー消費の削減

---

### **💡 今後の課題**

- **所得税の詳細な計算ロジックをもう一度精査**
- **税率が変更された場合に対応できるよう、外部データ管理を検討**
- **テストケースの追加（特にボーナスがある場合の計算）**

---

可読性の観点で分割

// =============================
// ファイル: src/components/TaxResult.tsx
// 役割 : 計算結果の表示
// - `useTaxCalculation.ts` の結果を表形式で表示
// - 社員負担・会社負担の税金合計を含む
// =============================

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import type { TaxCalculationResult } from '../hooks/useTaxCalculation';

interface TaxResultProps {
result: TaxCalculationResult;
}

// =============================
// 通貨フォーマット関数
// - 数値を "1,234 円" の形式に変換
// =============================
const formatCurrency = (amount: number) => `${amount.toLocaleString()} 円`;

export const TaxResult = ({ result }: TaxResultProps) => {
return (
<TableContainer component={Paper} sx={{ mt: 4, p: 2 }}>
{/_ ============================= _/}
{/_ 社員負担の税金合計 (Employee Burden) _/}
{/_ ============================= _/}
<Typography variant="h5" gutterBottom>
社員負担 (Employee Burden)
</Typography>

<Table>
<TableHead>
<TableRow>
<TableCell>項目</TableCell>
<TableCell align="right">年額 (Annual)</TableCell>
<TableCell align="right">月額 (Monthly)</TableCell>
</TableRow>
</TableHead>
<TableBody>
<TableRow>
<TableCell>額面収入 (Gross Income)</TableCell>
<TableCell align="right">{formatCurrency(result.employee.grossIncome.annual)}</TableCell>
<TableCell align="right">{formatCurrency(result.employee.grossIncome.monthly)}</TableCell>
</TableRow>
<TableRow>
<TableCell>所得税 (Income Tax)</TableCell>
<TableCell align="right">{formatCurrency(result.employee.incomeTax.annual)}</TableCell>
<TableCell align="right">{formatCurrency(result.employee.incomeTax.monthly)}</TableCell>
</TableRow>
<TableRow>
<TableCell>住民税 (Resident Tax)</TableCell>
<TableCell align="right">{formatCurrency(result.employee.residentTax.annual)}</TableCell>
<TableCell align="right">{formatCurrency(result.employee.residentTax.monthly)}</TableCell>
</TableRow>
<TableRow>
<TableCell>健康保険 (Health Insurance)</TableCell>
<TableCell align="right">{formatCurrency(result.employee.healthInsurance.annual)}</TableCell>
<TableCell align="right">{formatCurrency(result.employee.healthInsurance.monthly)}</TableCell>
</TableRow>
<TableRow>
<TableCell>雇用保険 (Employment Insurance)</TableCell>
<TableCell align="right">{formatCurrency(result.employee.employmentInsurance.annual)}</TableCell>
<TableCell align="right">{formatCurrency(result.employee.employmentInsurance.monthly)}</TableCell>
</TableRow>
<TableRow>
<TableCell><strong>税金合計 (Total Tax)</strong></TableCell>
<TableCell align="right"><strong>{formatCurrency(result.employee.totalTax.annual)}</strong></TableCell>
<TableCell align="right"><strong>{formatCurrency(result.employee.totalTax.monthly)}</strong></TableCell>
</TableRow>
<TableRow>
<TableCell>手取り額 (Net Income)</TableCell>
<TableCell align="right">{formatCurrency(result.employee.takeHome.annual)}</TableCell>
<TableCell align="right">{formatCurrency(result.employee.takeHome.monthly)}</TableCell>
</TableRow>
</TableBody>
</Table>

      {/* ============================= */}
      {/* 会社負担の税金合計 (Company's Share) */}
      {/* ============================= */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        会社負担 (Company's Share)
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>項目</TableCell>
            <TableCell align="right">年額 (Annual)</TableCell>
            <TableCell align="right">月額 (Monthly)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>住民税 (Inhabitant Tax)</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.residentTax.annual)}</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.residentTax.monthly)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>健康保険 (Health Insurance)</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.healthInsurance.annual)}</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.healthInsurance.monthly)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>厚生年金 (Employees' Pension)</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.pensionInsurance?.annual ?? 0)}</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.pensionInsurance?.monthly ?? 0)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>雇用保険 (Unemployment Insurance)</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.employmentInsurance.annual)}</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.employmentInsurance.monthly)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>労災保険 (Workers' Accident Compensation Insurance)</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.laborInsurance.annual)}</TableCell>
            <TableCell align="right">{formatCurrency(result.employer.laborInsurance.monthly)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>会社負担税金合計 (Total Company-Paid Taxes)</strong></TableCell>
            <TableCell align="right"><strong>{formatCurrency(result.employer.totalEmployerTax.annual)}</strong></TableCell>
            <TableCell align="right"><strong>{formatCurrency(result.employer.totalEmployerTax.monthly)}</strong></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>

);
};

排除：src/components/TaxResultTable.tsx

// //=============================//
// // ファイル: src/components/TaxResultTable.tsx
// // 役割 : 計算結果を表として表示
// // - 税金計算結果を受け取り、表として整形
// // - UI を分離して、再利用性を向上
// // - 関連ファイル:
// // - 計算ロジック: src/hooks/useTaxCalculation.ts
// // - 入力フォーム: src/components/TaxCalculator.tsx
// //=============================//

// import type { FC } from 'react';
// import {
// Table,
// TableBody,
// TableCell,
// TableContainer,
// TableHead,
// TableRow,
// Typography,
// Paper,
// } from '@mui/material';
// import type { TaxCalculationResult } from '../hooks/useTaxCalculation';

// interface TaxResultTableProps {
// result: TaxCalculationResult;
// }

// const formatCurrency = (amount: number) => `${amount.toLocaleString()} 円`;

// const TaxResultTable: FC<TaxResultTableProps> = ({ result }) => {
// //=============================//
// // 社員負担の税金合計計算
// //=============================//
// const totalTaxesAnnual =
// result.employee.incomeTax.annual +
// result.employee.residentTax.annual +
// result.employee.healthInsurance.annual +
// result.employee.pensionInsurance?.annual +
// result.employee.employmentInsurance.annual;

// const totalTaxesMonthly =
// result.employee.incomeTax.monthly +
// result.employee.residentTax.monthly +
// result.employee.healthInsurance.monthly +
// result.employee.pensionInsurance?.monthly +
// result.employee.employmentInsurance.monthly;

// //=============================//
// // 会社負担の税金合計計算
// //=============================//
// const totalEmployerTaxesAnnual =
// result.employer.residentTax.annual +
// result.employer.healthInsurance.annual +
// (result.employer.pensionInsurance?.annual ?? 0) +
// result.employer.employmentInsurance.annual +
// result.employer.laborInsurance.annual;

// const totalEmployerTaxesMonthly =
// result.employer.residentTax.monthly +
// result.employer.healthInsurance.monthly +
// (result.employer.pensionInsurance?.monthly ?? 0) +
// result.employer.employmentInsurance.monthly +
// result.employer.laborInsurance.monthly;

// return (
// <TableContainer component={Paper} sx={{ mt: 4, p: 2 }}>
// {/_ 社員負担の税金計算結果 (Employee Tax Burden) _/}
// <Typography variant="h5" gutterBottom>
// 社員負担 (Employee Burden)
// </Typography>
// <Table>
// <TableHead>
// <TableRow>
// <TableCell>項目 (Item)</TableCell>
// <TableCell align="right">年額 (Annual)</TableCell>
// <TableCell align="right">月額 (Monthly)</TableCell>
// </TableRow>
// </TableHead>
// <TableBody>
// <TableRow>
// <TableCell>額面収入 (Gross Income)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.grossIncome.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.grossIncome.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>所得税 (Income Tax)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.incomeTax.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.incomeTax.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>住民税 (Resident Tax)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.residentTax.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.residentTax.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>健康保険 (Health Insurance)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.healthInsurance.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.healthInsurance.monthly)}</TableCell>
// </TableRow>
// {result.employee.pensionInsurance && (
// <TableRow>
// <TableCell>厚生年金 (Pension Insurance)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.pensionInsurance.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.pensionInsurance.monthly)}</TableCell>
// </TableRow>
// )}
// <TableRow>
// <TableCell>雇用保険 (Employment Insurance)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.employmentInsurance.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.employmentInsurance.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell><strong>税金合計 (Total Tax)</strong></TableCell>
// <TableCell align="right"><strong>{formatCurrency(totalTaxesAnnual)}</strong></TableCell>
// <TableCell align="right"><strong>{formatCurrency(totalTaxesMonthly)}</strong></TableCell>
// </TableRow>
// <TableRow>
// <TableCell>手取り額 (Net Income)</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.takeHome.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employee.takeHome.monthly)}</TableCell>
// </TableRow>
// </TableBody>
// </Table>

// {/_ 会社負担の税金計算結果 _/}
// <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
// 会社負担 (Company's share)
// </Typography>
// <Table>
// <TableHead>
// <TableRow>
// <TableCell>項目 (Item)</TableCell>
// <TableCell align="right">年額 (Annual)</TableCell>
// <TableCell align="right">月額 (Monthly)</TableCell>
// </TableRow>
// </TableHead>
// <TableBody>
// <TableRow>
// <TableCell>住民税 (Inhabitant tax)</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.residentTax.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.residentTax.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>健康保険 (Health insurance)</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.healthInsurance.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.healthInsurance.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>厚生年金 (Employees' pension)</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.pensionInsurance?.annual ?? 0)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.pensionInsurance?.monthly ?? 0)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>雇用保険 (Unemployment insurance)</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.employmentInsurance.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.employmentInsurance.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell>労災保険 (Workers' accident compensation insurance)</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.laborInsurance.annual)}</TableCell>
// <TableCell align="right">{formatCurrency(result.employer.laborInsurance.monthly)}</TableCell>
// </TableRow>
// <TableRow>
// <TableCell><strong>会社負担税金合計 (Total company-paid taxes)</strong></TableCell>
// <TableCell align="right"><strong>{formatCurrency(totalEmployerTaxesAnnual)}</strong></TableCell>
// <TableCell align="right"><strong>{formatCurrency(totalEmployerTaxesMonthly)}</strong></TableCell>
// </TableRow>
// </TableBody>
// </Table>
// </TableContainer>
// );
// };

// export default TaxResultTable;
