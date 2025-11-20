import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { samplePersonalLedgerSummary } from "@/data/sampleFinancials";

export default function PersonalFinancialsDashboard() {
  const navigate = useNavigate();
  const ledger = samplePersonalLedgerSummary;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Personal Financials</h1>
          <p className="text-sm text-muted-foreground mt-1">Personal ledger and DLA tracking</p>
        </div>
        <Button onClick={() => navigate('/finance/expenses/personal')}>
          <Receipt className="h-4 w-4 mr-2" />
          Manage Expenses
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{ledger.totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{ledger.totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{ledger.netPosition.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">DLA Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{Math.abs(ledger.dlaBalance).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">You are owed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Completely separate from business financials</p>
          <div className="mt-4">
            <Button variant="outline" size="sm">View Full Personal Ledger</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
