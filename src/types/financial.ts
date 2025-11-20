// Financial module type definitions

export type EntityType = 'business' | 'personal';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  vatAmount?: number;
  vatRate?: number;
  entity: EntityType;
  reference?: string;
  reconciled: boolean;
  dlaRelated?: boolean; // Director's Loan Account
}

export interface LedgerSummary {
  entity: EntityType;
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  vatLiability: number;
  dlaBalance: number;
  lastUpdated: string;
}

export interface CashflowWeek {
  weekNumber: number;
  weekEnding: string;
  openingBalance: number;
  income: number;
  expenses: number;
  closingBalance: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface CashflowMonth {
  month: string;
  year: number;
  income: number;
  expenses: number;
  netCashflow: number;
}

export interface DividendSchedule {
  id: string;
  date: string;
  amount: number;
  shareClass: string;
  status: 'scheduled' | 'paid' | 'cancelled';
  notes?: string;
}

export interface SalarySchedule {
  id: string;
  month: string;
  year: number;
  grossAmount: number;
  netAmount: number;
  tax: number;
  ni: number;
  pension?: number;
  status: 'scheduled' | 'paid';
}

export interface VATReturn {
  id: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  vatOnSales: number;
  vatOnPurchases: number;
  netVAT: number;
  status: 'draft' | 'submitted' | 'paid';
}

export interface TaxDeadline {
  id: string;
  name: string;
  date: string;
  type: 'vat' | 'corporation_tax' | 'paye' | 'self_assessment';
  estimatedAmount?: number;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
}

export interface Expense {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  entity: EntityType;
  reimbursable: boolean; // Goes to DLA if true
  receipt?: {
    fileName: string;
    filePath: string;
    uploadedAt: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface FolderWatcher {
  id: string;
  name: string;
  path: string;
  entity: EntityType;
  enabled: boolean;
  lastChecked?: string;
}

export interface FinancialAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  category: 'cashflow' | 'tax' | 'dividend' | 'general';
  date: string;
  dismissed: boolean;
}

export interface FinancialRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: 'dividend' | 'salary' | 'tax_planning' | 'cashflow';
  actionRequired?: string;
  date: string;
}

// Accountant Export Schemas
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface VATWorkingsRow {
  date: string;
  reference: string;
  description: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  type: 'sales' | 'purchases';
}

export interface BankTransactionRow {
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface DividendPayrollNote {
  type: 'dividend' | 'payroll';
  date: string;
  amount: number;
  recipient: string;
  shareClass?: string;
  taxWithheld?: number;
  notes?: string;
}

export interface AccountantExport {
  name: string;
  description: string;
  lastGenerated?: string;
  rowCount?: number;
}
