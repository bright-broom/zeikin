export const texts = {
  app: {
    title: 'ZEIKIN',
    lead: '月給を入れると、手取りと「どこに引かれるか」がすぐ分かる給与明細シミュレーター',
  },
  form: {
    salary: {
      label: '月給（額面）',
      unit: '万円',
      hint: '残業代や手当を含む、毎月の支給額の合計',
      sliderLabel: '月給をスライダーで調整',
      presetsLabel: 'よくある月給',
    },
    options: {
      legend: '加入している保険',
      pension: {
        title: '厚生年金',
        note: '会社員・公務員のほぼ全員が加入',
      },
      careInsurance: {
        title: '介護保険',
        note: '40〜64歳の人が払います',
      },
      childCare: {
        title: '子ども・子育て拠出金',
        note: '会社だけが払う。手取りは変わりません',
      },
    },
  },
  slip: {
    title: '給与明細',
    basis: '令和7年度（2025年度）の税率・保険料率で試算',
    period: {
      label: '表示する期間',
      monthly: '月額',
      annual: '年額',
    },
    net: '差引支給額（手取り）',
    netShort: '差引支給額 ＝ 総支給額 − 控除合計',
    netSub: (gross: string, period: string) => `額面 ${gross}円 のうち、${period}に受け取れる額`,
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
  },
  labels: {
    grossIncome: '基本給・手当（額面）',
    incomeTax: '所得税',
    residentTax: '住民税',
    healthInsurance: '健康保険',
    pensionInsurance: '厚生年金',
    careInsurance: '介護保険',
    employmentInsurance: '雇用保険',
    laborInsurance: '労災保険',
    childCare: '子ども・子育て拠出金',
  },
  employer: {
    title: '会社はこれだけ払っています',
    lead: '額面の給与のほかに、会社は社会保険などを負担しています。あなたを雇うのにかかる本当の金額です。',
    gross: '額面の給与',
    burden: '会社の負担',
    total: '会社が払う総額',
  },
  dock: {
    label: '手取り',
    jump: '明細を見る',
  },
  errors: {
    invalid: '0より大きい数字を入れてください',
  },
  disclaimer:
    '扶養控除や各種控除、自治体ごとの住民税の差、賞与は考慮していない目安の金額です。正確な金額は給与明細や源泉徴収票で確認してください。',
  currency: {
    yen: '円',
  },
} as const;
