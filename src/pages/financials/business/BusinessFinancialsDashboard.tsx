import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertBanner } from "@/components/financials/AlertBanner";
import { InsightsPanel } from "@/components/financials/InsightsPanel";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  AlertCircle,
  Calendar,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  sampleBusinessLedgerSummary,
  sample13WeekCashflow,
  sampleTaxDeadlines,
  sampleDividendSchedule,
  sampleSalarySchedule,
} from "@/data/sampleFinancials";
import { FinancialIntelligenceEngine } from "@/services/financialIntelligenceEngine";
import { FinancialAlert, FinancialRecommendation } from "@/types/financial";

export default function BusinessFinancialsDashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [recommendations, setRecommendations] = useState<FinancialRecommendation[]>([]);

  useEffect(() => {
    // Run financial intelligence analysis
    // TODO: Replace with window.api.financial.runAnalysis() when DB is connected
    const analysis = FinancialIntelligenceEngine.runFullAnalysis({
      cashflow: sample13WeekCashflow,
      ledger: sampleBusinessLedgerSummary,
      taxDeadlines: sampleTaxDeadlines.map((t) => ({
        name: t.name,
        date: t.date,
        amount: t.estimatedAmount,
      })),
      currentSalary: 9600 * 12, // Annual
    });

    setAlerts(analysis.alerts);
    setRecommendations(analysis.recommendations);
  }, []);

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  };

  const handleDismissRecommendation = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  const ledger = sampleBusinessLedgerSummary;

  const upcomingTaxes = sampleTaxDeadlines.filter(
    (t) => t.status === 'upcoming' || t.status === 'due_soon'
  );

  const nextDividend = sampleDividendSchedule.find((d) => d.status === 'scheduled');
  const nextSalary = sampleSalarySchedule.find((s) => s.status === 'scheduled');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Business Financials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ledger, cashflow, VAT, and tax management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/finance/expenses/business')}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Manage Expenses
          </Button>
          <Button onClick={() => navigate('/finance/exports')}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Accountant Exports
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.some((a) => !a.dismissed) && (
        <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              £{ledger.totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Year to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              £{ledger.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Year to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Position
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              £{ledger.netPosition.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VAT Liability
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-status-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              £{ledger.vatLiability.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      {recommendations.length > 0 && (
        <InsightsPanel
          recommendations={recommendations}
          onDismiss={handleDismissRecommendation}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
          <TabsTrigger value="dividends">Dividends & Salary</TabsTrigger>
          <TabsTrigger value="tax">VAT & Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Activity Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleBusinessLedgerSummary && (
                    <p className="text-sm text-muted-foreground">
                      View full ledger for detailed transaction history
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/finance/business/ledger')}
                  >
                    View Full Ledger
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Obligations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming Obligations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingTaxes.slice(0, 3).map((tax) => (
                    <div
                      key={tax.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div>
                        <div className="text-sm font-medium">{tax.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {new Date(tax.date).toLocaleDateString()}
                        </div>
                      </div>
                      {tax.estimatedAmount && (
                        <div className="text-sm font-medium">
                          £{tax.estimatedAmount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DLA Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Director's Loan Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    £{Math.abs(ledger.dlaBalance).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-sm font-medium mt-1">
                    {ledger.dlaBalance > 0
                      ? 'Director is owed'
                      : ledger.dlaBalance < 0
                      ? 'Business is owed'
                      : 'Balanced'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cashflow Forecast</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/finance/business/cashflow')}
                >
                  View Detailed Forecast
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                13-week and 12-month cashflow projections available in detailed view
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    £{sample13WeekCashflow[0].openingBalance.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Week 6 Projection</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    £{sample13WeekCashflow[5].closingBalance.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Week 13 Projection</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    £{sample13WeekCashflow[12].closingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dividends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next Dividend</CardTitle>
              </CardHeader>
              <CardContent>
                {nextDividend ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm font-medium">
                        {new Date(nextDividend.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold">
                        £{nextDividend.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Share Class</span>
                      <span className="text-sm font-medium">{nextDividend.shareClass}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming dividends scheduled</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next Salary</CardTitle>
              </CardHeader>
              <CardContent>
                {nextSalary ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Period</span>
                      <span className="text-sm font-medium">
                        {nextSalary.month} {nextSalary.year}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Gross</span>
                      <span className="text-lg font-bold">
                        £{nextSalary.grossAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Net</span>
                      <span className="text-sm font-medium">
                        £{nextSalary.netAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming salary scheduled</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/finance/business/dividends-salary')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Full Schedule & Planning
          </Button>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax & VAT Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTaxes.map((tax) => (
                  <div
                    key={tax.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <div className="font-medium text-sm">{tax.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(tax.date).toLocaleDateString()}
                      </div>
                    </div>
                    {tax.estimatedAmount && (
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          £{tax.estimatedAmount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => navigate('/finance/business/vat-tax')}
              >
                View VAT Returns & Full Tax Calendar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
