export type AnnualOwner = 'all' | 'me' | 'family' | 'unknown';
export type AnnualCategory = 'food' | 'living' | 'housing' | 'transport' | 'other';

export type AnnualIncome = {
  month: number;
  owner: Exclude<AnnualOwner, 'all'>;
  kind: string;
  status: 'completed' | 'planned';
  payments: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  budgetAmount: number;
};

export type AnnualExpense = {
  month: number;
  owner: Exclude<AnnualOwner, 'all'>;
  category: AnnualCategory;
  amount: number;
};

export type AnnualBudget = {
  month: number;
  category: AnnualCategory;
  amount: number;
};

export const ANNUAL_OWNERS: { id: AnnualOwner; label: string }[] = [
  { id: 'all', label: '전체 구성원' },
  { id: 'me', label: '나' },
  { id: 'family', label: '가족' },
  { id: 'unknown', label: '소유자 확인 필요' }
];

export const ANNUAL_CATEGORIES: { id: AnnualCategory; name: string }[] = [
  { id: 'food', name: '식품/외식' },
  { id: 'living', name: '생활/동물' },
  { id: 'housing', name: '주거/통신' },
  { id: 'transport', name: '교통' },
  { id: 'other', name: '기타' }
];

const monthlyIncomes: AnnualIncome[] = Array.from({ length: 11 }, (_, index) => {
  const month = index + 1;
  return [
    {
      month,
      owner: 'me' as const,
      kind: '근로소득',
      status: 'completed' as const,
      payments: [{ name: '급여', amount: 3750000 }],
      deductions: [
        { name: '소득세', amount: 110000 },
        { name: '건강보험', amount: 160000 },
        { name: '국민연금', amount: 220000 },
        { name: '기타 공제', amount: 60000 }
      ],
      budgetAmount: 3200000
    },
    {
      month,
      owner: 'family' as const,
      kind: '근로소득',
      status: month === 11 ? ('planned' as const) : ('completed' as const),
      payments: [{ name: '급여', amount: 3100000 }],
      deductions: [
        { name: '소득세', amount: 90000 },
        { name: '건강보험', amount: 100000 },
        { name: '국민연금', amount: 160000 }
      ],
      budgetAmount: 2750000
    }
  ];
}).flat();

const monthlyExpenses: AnnualExpense[] = Array.from({ length: 11 }, (_, index) => {
  const month = index + 1;
  return [
    { month, owner: 'me' as const, category: 'food' as const, amount: 330000 + ((month * 73000) % 170000) },
    { month, owner: 'family' as const, category: 'food' as const, amount: 80000 + ((month * 27000) % 90000) },
    { month, owner: 'me' as const, category: 'living' as const, amount: 150000 + ((month * 39000) % 120000) },
    { month, owner: 'family' as const, category: 'housing' as const, amount: 480000 + ((month * 13000) % 70000) },
    { month, owner: 'me' as const, category: 'transport' as const, amount: 45000 + ((month * 17000) % 80000) },
    { month, owner: 'family' as const, category: 'other' as const, amount: month === 4 ? -20000 : month === 8 ? 0 : 30000 + ((month * 23000) % 100000) }
  ];
}).flat();

const monthlyBudgets: AnnualBudget[] = Array.from({ length: 11 }, (_, index) => {
  const month = index + 1;
  return [
    { month, category: 'food' as const, amount: month === 9 ? 750000 : 700000 },
    { month, category: 'living' as const, amount: 400000 },
    { month, category: 'housing' as const, amount: 600000 },
    { month, category: 'transport' as const, amount: 200000 },
    { month, category: 'other' as const, amount: 500000 }
  ];
}).flat();

export const getAnnualExample = (year: number) => {
  if (year !== 2026) {
    return { incomes: [] as AnnualIncome[], expenses: [] as AnnualExpense[], budgets: [] as AnnualBudget[], createdMonths: [] as number[], remainingAsOfMonth: year < 2026 ? 12 : null };
  }

  return {
    incomes: [
      ...monthlyIncomes,
      {
        month: 5,
        owner: 'me' as const,
        kind: '자산 처분',
        status: 'completed' as const,
        payments: [{ name: '처분대금', amount: 1000000 }],
        deductions: [{ name: '수수료', amount: 10000 }],
        budgetAmount: 200000
      }
    ],
    expenses: [
      ...monthlyExpenses,
      { month: 11, owner: 'unknown' as const, category: 'other' as const, amount: 16000 },
      { month: 12, owner: 'family' as const, category: 'other' as const, amount: 200000 }
    ],
    budgets: monthlyBudgets,
    createdMonths: Array.from({ length: 11 }, (_, index) => index + 1),
    remainingAsOfMonth: 11
  };
};

export const annualIncomeNet = (income: AnnualIncome) => income.payments.reduce((sum, payment) => sum + payment.amount, 0) - income.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);

export const annualIncomeExpenseChange = (incomes: AnnualIncome[], expenses: AnnualExpense[], throughMonth: number | null): number | null => {
  if (throughMonth === null || !Number.isInteger(throughMonth) || throughMonth < 1 || throughMonth > 12) return null;
  const includedIncomes = incomes.filter((item) => item.month >= 1 && item.month <= throughMonth);
  const includedExpenses = expenses.filter((item) => item.month >= 1 && item.month <= throughMonth);
  if (!includedIncomes.length && !includedExpenses.length) return null;
  if (
    !includedIncomes.every((item) => item.payments.every((row) => Number.isSafeInteger(row.amount)) && item.deductions.every((row) => Number.isSafeInteger(row.amount))) ||
    !includedExpenses.every((item) => Number.isSafeInteger(item.amount))
  )
    return null;
  const change = includedIncomes.reduce((total, item) => total + annualIncomeNet(item), 0) - includedExpenses.reduce((total, item) => total + item.amount, 0);
  return Number.isSafeInteger(change) ? change : null;
};
