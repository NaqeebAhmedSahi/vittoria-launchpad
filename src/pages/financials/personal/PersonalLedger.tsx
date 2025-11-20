import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Upload, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { BankImportWizard } from "@/components/finance/BankImportWizard";
import { samplePersonalTransactions, samplePersonalLedgerSummary } from "@/data/sampleFinancials";
import { generateTransactionsCSV } from "@/utils/csvGenerator";
import { useToast } from "@/hooks/use-toast";

export default function PersonalLedger() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isImportOpen, setIsImportOpen] = useState(false);

  // TODO: Replace with real data from hook/context
  const ledger = samplePersonalLedgerSummary;
  const transactions = samplePersonalTransactions;

  const handleExportCSV = () => {
    const csv = generateTransactionsCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Exported",
      description: "Personal ledger exported to CSV",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/finance/personal')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Personal Ledger</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Completely separate from business financials
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <BankImportWizard
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="personal"
      />

      {/* Summary Cards */}
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

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Reimbursable</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="text-sm">{txn.date}</TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{txn.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={txn.type === 'income' ? 'text-status-success' : 'text-foreground'}>
                      {txn.type === 'income' ? '+' : '-'}£{Math.abs(txn.amount).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {txn.dlaRelated ? (
                      <Badge variant="secondary" className="text-xs">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {txn.reconciled ? (
                      <Badge variant="default" className="text-xs">Reconciled</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
