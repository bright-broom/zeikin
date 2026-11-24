export const texts = {
  app: {
    title: 'ZEIKIN',
    lead: '月給から手取りと、引かれるお金の内訳を出します',
  },
  form: {
    salary: {
      label: '月給（額面）',
      unit: '万円',
      hint: '残業代や通勤手当を含む、毎月の支給額',
      sliderLabel: '月給',
      presetsLabel: 'よくある月給',
    },
    bonus: {
      label: '賞与（年間の合計）',
      unit: '万円',
      hint: '夏と冬の2回に分けて支給される前提です',
    },
    prefecture: {
      label: '健康保険の加入支部',
      hint: '協会けんぽの都道府県。勤務先の所在地のことが多いです',
    },
    options: {
      legend: '加入状況',
      socialInsurance: {
        title: '健康保険・厚生年金',
        note: '会社員はふつう加入しています',
      },
      careInsurance: {
        title: '40〜64歳',
        note: '介護保険料がかかります',
      },
    },
  },
  slip: {
    title: '給与明細',
    period: {
      label: '期間',
      monthly: '月額',
      annual: '年額',
    },
    net: '差引支給額（手取り）',
    netSub: {
      monthly: (gross: string) => `額面 ${gross}円（賞与のない月）`,
      annual: (gross: string) => `額面 ${gross}円（賞与を含む1年分）`,
    },
    seal: '手取り率',
    split: {
      takeHome: '手取り',
      tax: '税金',
      insurance: '社会保険',
    },
    pay: '支給',
    deduction: '控除',
    deductionTotal: '控除合計',
    payTotal: '総支給額',
    netShort: '差引支給額 ＝ 総支給額 − 控除合計',
  },
  labels: {
    salary: '給与',
    bonus: '賞与',
    incomeTax: '所得税',
    residentTax: '住民税',
    healthInsurance: '健康保険',
    careInsurance: '介護保険',
    childSupport: '子ども・子育て支援金',
    pensionInsurance: '厚生年金',
    employmentInsurance: '雇用保険',
    workersComp: '労災保険',
    childContribution: '子ども・子育て拠出金',
  },
  employer: {
    title: '会社が払っている額',
    lead: '社会保険料の半分と、労災保険・拠出金は会社が払います。所得税と住民税は本人だけの負担です。',
    gross: '額面',
    burden: '会社の負担',
    total: '会社が払う総額',
  },
  basis: {
    title: '計算の前提と途中の数字',
    standardMonthly: '標準報酬月額（健康保険）',
    pensionStandardMonthly: '標準報酬月額（厚生年金）',
    salaryIncome: '給与所得（年収−給与所得控除）',
    socialInsuranceDeduction: '社会保険料控除（年）',
    basicDeduction: '基礎控除（所得税）',
    taxableIncome: '課税所得（所得税）',
    residentTaxableIncome: '課税所得（住民税）',
    healthRate: '健康保険料率',
  },
  dock: {
    label: '手取り',
    jump: '明細へ',
  },
  errors: {
    salary: '1以上の整数を入れてください',
  },
  currency: {
    yen: '円',
  },
} as const;
