financial_intelligence_overviewfinancial_intelligence_overview# Financial Intelligence Layer - Architecture Overview

## Purpose
The Financial Intelligence Engine provides automated reasoning and analysis for Vittoria's financials module. It evaluates ledger data, cashflow, tax obligations, and generates recommendations.

## Current Implementation
- **Location**: `src/services/financialIntelligenceEngine.ts`
- **Status**: ✅ **Active** - Mock implementation with hardcoded rules
- **Data Source**: Sample fixtures in `src/data/sampleFinancials.ts`
- **UI Integration**: ✅ **Complete** - Visible in TopBar and Business Financials page

## UI Visibility

### 1. TopBar Bell Icon Dropdown 🔔
- **Location**: Top navigation bar (right side)
- **Component**: `src/components/FinancialIntelligenceDropdown.tsx`
- **Features**:
  - Red notification dot when alerts exist
  - Tabbed interface: Alerts | Insights
  - Real-time alert count display
  - Dismissible alerts and recommendations
  - Color-coded severity (critical/warning/info)
  - Priority badges (high/medium/low)

### 2. Business Financials Dashboard 📊
- **Route**: `/finance/business`
- **Component**: `src/pages/financials/business/BusinessFinancialsDashboard.tsx`
- **Access**: Sidebar → Finance → Business Financials
- **Features**:
  - `AlertBanner` component for critical/warning alerts
  - `InsightsPanel` component for recommendations
  - Full financial dashboard with ledger summaries
  - Tax deadlines, dividend schedules, salary info

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

### Current Implementation (✅ Live)
1. **TopBar Bell Icon**
   - Component: `src/components/FinancialIntelligenceDropdown.tsx`
   - Shows real-time alerts and recommendations
   - Accessible from any page via top navigation
   
2. **Business Financials Dashboard**
   - Route: `/finance/business`
   - Components: `AlertBanner` and `InsightsPanel`
   - Dedicated page for comprehensive financial intelligence
   
3. **Sidebar Navigation**
   - Component: `src/components/AppSidebar.tsx`
   - Expandable Finance menu with "Business Financials" link

### How to Access
1. **Bell Icon**: Click the bell 🔔 in the top-right corner (next to user profile)
2. **Sidebar**: Click "Finance" → "Business Financials"
3. **Direct URL**: Navigate to `/finance/business`

## Extension
Add new rules in `src/services/financialRules.ts` and call from `runFullAnalysis()`
