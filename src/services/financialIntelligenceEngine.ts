import { FinancialAlert, FinancialRecommendation, CashflowWeek, LedgerSummary } from '@/types/financial';

/**
 * Financial Intelligence Engine
 * 
 * This module provides reasoning and analysis capabilities for the financials module.
 * It evaluates ledger data, cashflow, tax obligations, and generates recommendations.
 * 
 * Current implementation uses hardcoded rules and mock data.
 * Future: Plug in real data from DB and optionally integrate LLM for advanced reasoning.
 */

export class FinancialIntelligenceEngine {
  /**
   * Analyze cashflow and generate alerts for low balance warnings
   */
  static analyzeCashflow(cashflowData: CashflowWeek[]): FinancialAlert[] {
    const alerts: FinancialAlert[] = [];

    cashflowData.forEach((week) => {
      if (week.closingBalance < 20000 && week.closingBalance >= 10000) {
        alerts.push({
          id: `alert-cashflow-${week.weekNumber}`,
          severity: 'warning',
          title: 'Low Cash Balance Warning',
          message: `Week ${week.weekNumber} (ending ${week.weekEnding}) projects a closing balance of £${week.closingBalance.toLocaleString()}. Consider deferring non-essential expenses.`,
          category: 'cashflow',
          date: new Date().toISOString(),
          dismissed: false,
        });
      } else if (week.closingBalance < 10000) {
        alerts.push({
          id: `alert-cashflow-critical-${week.weekNumber}`,
          severity: 'critical',
          title: 'Critical Cash Balance',
          message: `Week ${week.weekNumber} (ending ${week.weekEnding}) projects a critically low closing balance of £${week.closingBalance.toLocaleString()}. Immediate action required.`,
          category: 'cashflow',
          date: new Date().toISOString(),
          dismissed: false,
        });
      }
    });

    return alerts;
  }

  /**
   * Analyze ledger and suggest dividend opportunities
   */
  static analyzeDividendOpportunity(ledger: LedgerSummary): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    // Simple rule: If net position > £100k and VAT liability covered, suggest dividend
    const availableForDividend = ledger.netPosition - ledger.vatLiability - 50000; // Keep £50k buffer

    if (availableForDividend > 20000) {
      recommendations.push({
        id: 'rec-dividend-001',
        title: 'Dividend Opportunity Available',
        description: `Current net position allows for a dividend of up to £${availableForDividend.toLocaleString()}. Ensure this aligns with your tax planning strategy.`,
        priority: 'medium',
        category: 'dividend',
        actionRequired: 'Review with accountant and schedule dividend payment',
        date: new Date().toISOString(),
      });
    }

    return recommendations;
  }

  /**
   * Generate tax deadline reminders
   */
  static checkTaxDeadlines(deadlines: { name: string; date: string; amount?: number }[]): FinancialAlert[] {
    const alerts: FinancialAlert[] = [];
    const today = new Date();

    deadlines.forEach((deadline) => {
      const deadlineDate = new Date(deadline.date);
      const daysUntil = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil > 0 && daysUntil <= 7) {
        alerts.push({
          id: `alert-tax-${deadline.name}`,
          severity: 'critical',
          title: `Tax Deadline Approaching: ${deadline.name}`,
          message: `${deadline.name} is due in ${daysUntil} days (${deadline.date}). ${deadline.amount ? `Estimated amount: £${deadline.amount.toLocaleString()}` : ''}`,
          category: 'tax',
          date: new Date().toISOString(),
          dismissed: false,
        });
      } else if (daysUntil > 7 && daysUntil <= 30) {
        alerts.push({
          id: `alert-tax-upcoming-${deadline.name}`,
          severity: 'warning',
          title: `Upcoming: ${deadline.name}`,
          message: `${deadline.name} due on ${deadline.date} (${daysUntil} days). ${deadline.amount ? `Estimated amount: £${deadline.amount.toLocaleString()}` : ''}`,
          category: 'tax',
          date: new Date().toISOString(),
          dismissed: false,
        });
      }
    });

    return alerts;
  }

  /**
   * Analyze DLA balance and suggest reimbursement timing
   */
  static analyzeDLA(dlaBalance: number): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    if (Math.abs(dlaBalance) > 5000) {
      const isOwed = dlaBalance > 0;
      recommendations.push({
        id: 'rec-dla-001',
        title: `DLA ${isOwed ? 'Reimbursement' : 'Repayment'} Recommended`,
        description: `Director's Loan Account balance is ${isOwed ? '+' : ''}£${dlaBalance.toLocaleString()}. Consider ${isOwed ? 'reimbursing the director' : 'repaying the loan'} to maintain clean accounts.`,
        priority: 'low',
        category: 'tax_planning',
        actionRequired: `Schedule ${isOwed ? 'reimbursement payment' : 'loan repayment'}`,
        date: new Date().toISOString(),
      });
    }

    return recommendations;
  }

  /**
   * Salary vs Dividend optimization suggestion
   */
  static optimizeSalaryDividendMix(
    currentSalary: number,
    netProfit: number
  ): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    // Simple rule: If salary < £12,570 (tax-free allowance), suggest increasing
    if (currentSalary < 12570) {
      recommendations.push({
        id: 'rec-salary-001',
        title: 'Salary Below Tax-Free Allowance',
        description: `Current annual salary of £${currentSalary.toLocaleString()} is below the personal allowance (£12,570). Consider increasing salary to utilize the full tax-free amount.`,
        priority: 'medium',
        category: 'salary',
        actionRequired: 'Discuss with accountant for tax efficiency',
        date: new Date().toISOString(),
      });
    }

    return recommendations;
  }

  /**
   * Main analysis method: Run all checks and return consolidated insights
   */
  static runFullAnalysis(data: {
    cashflow: CashflowWeek[];
    ledger: LedgerSummary;
    taxDeadlines: { name: string; date: string; amount?: number }[];
    currentSalary: number;
  }): {
    alerts: FinancialAlert[];
    recommendations: FinancialRecommendation[];
  } {
    const alerts: FinancialAlert[] = [];
    const recommendations: FinancialRecommendation[] = [];

    // Run all analysis modules
    alerts.push(...this.analyzeCashflow(data.cashflow));
    alerts.push(...this.checkTaxDeadlines(data.taxDeadlines));

    recommendations.push(...this.analyzeDividendOpportunity(data.ledger));
    recommendations.push(...this.analyzeDLA(data.ledger.dlaBalance));
    recommendations.push(...this.optimizeSalaryDividendMix(data.currentSalary, data.ledger.netPosition));

    return { alerts, recommendations };
  }
}
