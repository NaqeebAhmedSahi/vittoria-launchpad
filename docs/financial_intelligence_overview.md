# Financial Intelligence Layer - Architecture Overview

## Purpose
The Financial Intelligence Engine provides automated reasoning and analysis for Vittoria's financials module. It evaluates ledger data, cashflow, tax obligations, and generates recommendations.

## Current Implementation
- **Location**: `src/services/financialIntelligenceEngine.ts`
- **Status**: Mock implementation with hardcoded rules
- **Data Source**: Sample fixtures in `src/data/sampleFinancials.ts`

## Core Functions

### 1. Cashflow Analysis
- Analyzes 13-week and 12-month projections
- Flags weeks with low/critical balance levels
- Generates alerts based on thresholds

### 2. Dividend Opportunity Detection
- Evaluates net position vs VAT liability
- Suggests safe dividend amounts
- Maintains cash buffer rules

### 3. Tax Deadline Reminders
- Monitors upcoming VAT and corporation tax deadlines
- Escalates alerts as deadlines approach
- Includes estimated payment amounts

### 4. DLA Balance Management
- Tracks Director's Loan Account balance
- Suggests reimbursement or repayment timing
- Maintains clean account recommendations

### 5. Salary/Dividend Optimization
- Compares current salary to tax allowances
- Suggests tax-efficient payment mix
- Identifies optimization opportunities

## Integration Points

### Current (Mock)
All data comes from `src/data/sampleFinancials.ts`

### Future (DB Integration)
Replace with:
```typescript
const ledger = await window.api.financial.getLedgerSummary({ entity: 'business' });
const cashflow = await window.api.financial.getCashflow({ entity: 'business', weeks: 13 });
const taxDeadlines = await window.api.financial.getTaxDeadlines();
```

### Future (LLM Integration)
For advanced reasoning:
```typescript
import { generateAnalysis } from '@/services/llmAdapter';

const advice = await generateAnalysis({
  context: 'financial_planning',
  data: { ledger, cashflow, taxDeadlines },
  prompt: 'Suggest optimal dividend timing...'
});
```

## UI Integration
- **InsightsPanel**: Displays recommendations
- **AlertBanner**: Shows critical/warning alerts
- Used in: BusinessFinancialsDashboard, other financial pages

## Extension
Add new rules in `src/services/financialRules.ts` and call from `runFullAnalysis()`
