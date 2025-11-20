import {
  Transaction,
  LedgerSummary,
  CashflowWeek,
  CashflowMonth,
  DividendSchedule,
  SalarySchedule,
  VATReturn,
  TaxDeadline,
  TrialBalanceRow,
  VATWorkingsRow,
  BankTransactionRow,
  DividendPayrollNote,
} from '@/types/financial';

// Business Ledger Transactions
export const sampleBusinessTransactions: Transaction[] = [
  {
    id: 'txn-001',
    date: '2025-11-15',
    description: 'Placement fee - Goldman Sachs',
    amount: 180000,
    type: 'income',
    category: 'Placement Fees',
    vatAmount: 36000,
    vatRate: 20,
    entity: 'business',
    reference: 'BWS001',
    reconciled: true,
  },
  {
    id: 'txn-002',
    date: '2025-11-10',
    description: 'Placement fee - JP Morgan',
    amount: 150000,
    type: 'income',
    category: 'Placement Fees',
    vatAmount: 30000,
    vatRate: 20,
    entity: 'business',
    reference: 'BWS003',
    reconciled: true,
  },
  {
    id: 'txn-003',
    date: '2025-11-08',
    description: 'Office rent - November',
    amount: -2500,
    type: 'expense',
    category: 'Rent',
    vatAmount: -500,
    vatRate: 20,
    entity: 'business',
    reconciled: true,
  },
  {
    id: 'txn-004',
    date: '2025-11-05',
    description: 'Software subscriptions',
    amount: -850,
    type: 'expense',
    category: 'IT & Software',
    vatAmount: -170,
    vatRate: 20,
    entity: 'business',
    reconciled: true,
  },
  {
    id: 'txn-005',
    date: '2025-10-28',
    description: 'Placement fee - Brookfield',
    amount: 120000,
    type: 'income',
    category: 'Placement Fees',
    vatAmount: 24000,
    vatRate: 20,
    entity: 'business',
    reference: 'BWS002',
    reconciled: true,
  },
];

// Personal Ledger Transactions
export const samplePersonalTransactions: Transaction[] = [
  {
    id: 'txn-p001',
    date: '2025-11-01',
    description: 'Salary payment',
    amount: 8000,
    type: 'income',
    category: 'Salary',
    entity: 'personal',
    reconciled: true,
  },
  {
    id: 'txn-p002',
    date: '2025-11-12',
    description: 'Dividend payment Q4',
    amount: 15000,
    type: 'income',
    category: 'Dividends',
    entity: 'personal',
    reconciled: true,
  },
  {
    id: 'txn-p003',
    date: '2025-11-15',
    description: 'DLA reimbursement - business expenses',
    amount: 1250,
    type: 'income',
    category: 'DLA Reimbursement',
    entity: 'personal',
    dlaRelated: true,
    reconciled: true,
  },
  {
    id: 'txn-p004',
    date: '2025-11-08',
    description: 'Mortgage payment',
    amount: -2200,
    type: 'expense',
    category: 'Housing',
    entity: 'personal',
    reconciled: true,
  },
];

// Ledger Summaries
export const sampleBusinessLedgerSummary: LedgerSummary = {
  entity: 'business',
  totalIncome: 450000,
  totalExpenses: 58250,
  netPosition: 391750,
  vatLiability: 78500,
  dlaBalance: -3400, // Business owes director
  lastUpdated: '2025-11-20',
};

export const samplePersonalLedgerSummary: LedgerSummary = {
  entity: 'personal',
  totalIncome: 96000,
  totalExpenses: 42300,
  netPosition: 53700,
  vatLiability: 0,
  dlaBalance: 3400, // Director is owed by business
  lastUpdated: '2025-11-20',
};

// 13-week cashflow forecast
export const sample13WeekCashflow: CashflowWeek[] = Array.from({ length: 13 }, (_, i) => {
  const weekNumber = i + 1;
  const income = i % 3 === 0 ? 120000 + Math.random() * 30000 : 0;
  const expenses = 8000 + Math.random() * 4000;
  const openingBalance = i === 0 ? 85000 : 0; // Will be calculated
  
  return {
    weekNumber,
    weekEnding: new Date(2025, 10, 20 + i * 7).toISOString().split('T')[0],
    openingBalance,
    income,
    expenses,
    closingBalance: 0, // Will be calculated
    status: 'safe',
  };
});

// Calculate running balances
sample13WeekCashflow.forEach((week, i) => {
  if (i > 0) {
    week.openingBalance = sample13WeekCashflow[i - 1].closingBalance;
  }
  week.closingBalance = week.openingBalance + week.income - week.expenses;
  
  // Set status based on closing balance
  if (week.closingBalance < 20000) week.status = 'critical';
  else if (week.closingBalance < 50000) week.status = 'warning';
  else week.status = 'safe';
});

// 12-month cashflow projection
export const sample12MonthCashflow: CashflowMonth[] = [
  { month: 'December', year: 2025, income: 360000, expenses: 68000, netCashflow: 292000 },
  { month: 'January', year: 2026, income: 280000, expenses: 62000, netCashflow: 218000 },
  { month: 'February', year: 2026, income: 320000, expenses: 65000, netCashflow: 255000 },
  { month: 'March', year: 2026, income: 400000, expenses: 72000, netCashflow: 328000 },
  { month: 'April', year: 2026, income: 340000, expenses: 68000, netCashflow: 272000 },
  { month: 'May', year: 2026, income: 380000, expenses: 70000, netCashflow: 310000 },
  { month: 'June', year: 2026, income: 290000, expenses: 64000, netCashflow: 226000 },
  { month: 'July', year: 2026, income: 310000, expenses: 66000, netCashflow: 244000 },
  { month: 'August', year: 2026, income: 280000, expenses: 62000, netCashflow: 218000 },
  { month: 'September', year: 2026, income: 360000, expenses: 68000, netCashflow: 292000 },
  { month: 'October', year: 2026, income: 420000, expenses: 74000, netCashflow: 346000 },
  { month: 'November', year: 2026, income: 380000, expenses: 70000, netCashflow: 310000 },
];

// Dividend schedule
export const sampleDividendSchedule: DividendSchedule[] = [
  {
    id: 'div-001',
    date: '2025-12-15',
    amount: 18000,
    shareClass: 'Ordinary',
    status: 'scheduled',
    notes: 'Q4 2025 dividend',
  },
  {
    id: 'div-002',
    date: '2026-03-15',
    amount: 20000,
    shareClass: 'Ordinary',
    status: 'scheduled',
    notes: 'Q1 2026 dividend',
  },
  {
    id: 'div-003',
    date: '2025-09-15',
    amount: 15000,
    shareClass: 'Ordinary',
    status: 'paid',
    notes: 'Q3 2025 dividend',
  },
];

// Salary schedule
export const sampleSalarySchedule: SalarySchedule[] = [
  {
    id: 'sal-001',
    month: 'December',
    year: 2025,
    grossAmount: 9600,
    netAmount: 8000,
    tax: 1200,
    ni: 400,
    status: 'scheduled',
  },
  {
    id: 'sal-002',
    month: 'November',
    year: 2025,
    grossAmount: 9600,
    netAmount: 8000,
    tax: 1200,
    ni: 400,
    status: 'paid',
  },
  {
    id: 'sal-003',
    month: 'October',
    year: 2025,
    grossAmount: 9600,
    netAmount: 8000,
    tax: 1200,
    ni: 400,
    status: 'paid',
  },
];

// VAT returns
export const sampleVATReturns: VATReturn[] = [
  {
    id: 'vat-q4-2025',
    periodStart: '2025-10-01',
    periodEnd: '2025-12-31',
    dueDate: '2026-02-07',
    vatOnSales: 90000,
    vatOnPurchases: 12000,
    netVAT: 78000,
    status: 'draft',
  },
  {
    id: 'vat-q3-2025',
    periodStart: '2025-07-01',
    periodEnd: '2025-09-30',
    dueDate: '2025-11-07',
    vatOnSales: 84000,
    vatOnPurchases: 10500,
    netVAT: 73500,
    status: 'paid',
  },
];

// Tax deadlines
export const sampleTaxDeadlines: TaxDeadline[] = [
  {
    id: 'tax-001',
    name: 'VAT Return Q4 2025',
    date: '2026-02-07',
    type: 'vat',
    estimatedAmount: 78000,
    status: 'upcoming',
  },
  {
    id: 'tax-002',
    name: 'Corporation Tax Payment',
    date: '2026-04-01',
    type: 'corporation_tax',
    estimatedAmount: 42000,
    status: 'upcoming',
  },
  {
    id: 'tax-003',
    name: 'PAYE Monthly Payment',
    date: '2025-12-22',
    type: 'paye',
    estimatedAmount: 1600,
    status: 'due_soon',
  },
];

// Accountant Export Data
export const sampleTrialBalance: TrialBalanceRow[] = [
  { accountCode: '1000', accountName: 'Bank Account', debit: 185000, credit: 0, balance: 185000 },
  { accountCode: '1100', accountName: 'Accounts Receivable', debit: 96000, credit: 0, balance: 96000 },
  { accountCode: '2000', accountName: 'VAT Control Account', debit: 0, credit: 78500, balance: -78500 },
  { accountCode: '2100', accountName: 'Director\'s Loan Account', debit: 0, credit: 3400, balance: -3400 },
  { accountCode: '3000', accountName: 'Share Capital', debit: 0, credit: 100, balance: -100 },
  { accountCode: '4000', accountName: 'Placement Fee Income', debit: 0, credit: 450000, balance: -450000 },
  { accountCode: '5000', accountName: 'Operating Expenses', debit: 58250, credit: 0, balance: 58250 },
];

export const sampleVATWorkings: VATWorkingsRow[] = [
  {
    date: '2025-11-15',
    reference: 'BWS001',
    description: 'Placement fee - Goldman Sachs',
    netAmount: 180000,
    vatRate: 20,
    vatAmount: 36000,
    type: 'sales',
  },
  {
    date: '2025-11-10',
    reference: 'BWS003',
    description: 'Placement fee - JP Morgan',
    netAmount: 150000,
    vatRate: 20,
    vatAmount: 30000,
    type: 'sales',
  },
  {
    date: '2025-11-08',
    reference: 'RENT-NOV',
    description: 'Office rent - November',
    netAmount: 2500,
    vatRate: 20,
    vatAmount: 500,
    type: 'purchases',
  },
];

export const sampleBankTransactions: BankTransactionRow[] = [
  { date: '2025-11-15', description: 'Goldman Sachs - Placement', reference: 'BWS001', debit: 216000, credit: 0, balance: 485200 },
  { date: '2025-11-12', description: 'Dividend payment', reference: 'DIV-Q4', debit: 0, credit: 15000, balance: 269200 },
  { date: '2025-11-10', description: 'JP Morgan - Placement', reference: 'BWS003', debit: 180000, credit: 0, balance: 284200 },
  { date: '2025-11-08', description: 'Office rent', reference: 'RENT-NOV', debit: 0, credit: 3000, balance: 104200 },
  { date: '2025-11-05', description: 'Software subscriptions', reference: 'SW-NOV', debit: 0, credit: 1020, balance: 107200 },
];

export const sampleDividendPayrollNotes: DividendPayrollNote[] = [
  {
    type: 'dividend',
    date: '2025-11-12',
    amount: 15000,
    recipient: 'Director',
    shareClass: 'Ordinary',
    notes: 'Q4 2025 interim dividend',
  },
  {
    type: 'payroll',
    date: '2025-11-30',
    amount: 9600,
    recipient: 'Director',
    taxWithheld: 1600,
    notes: 'November 2025 salary',
  },
  {
    type: 'dividend',
    date: '2025-09-15',
    amount: 15000,
    recipient: 'Director',
    shareClass: 'Ordinary',
    notes: 'Q3 2025 interim dividend',
  },
];
