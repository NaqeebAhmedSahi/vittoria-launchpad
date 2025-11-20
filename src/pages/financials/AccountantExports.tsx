import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  sampleTrialBalance,
  sampleVATWorkings,
  sampleBankTransactions,
  sampleDividendPayrollNotes,
} from "@/data/sampleFinancials";

export default function AccountantExports() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleExport = (type: string, format: string) => {
    toast({
      title: "Export Generated",
      description: `${type} has been exported as ${format.toUpperCase()}`,
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
            onClick={() => navigate('/finance/business')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Accountant Exports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Export financial data for your accountant
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Select Period
          </Button>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <Badge variant="outline">CSV</Badge>
            </div>
            <CardTitle className="text-base mt-2">Trial Balance</CardTitle>
            <CardDescription className="text-xs">
              Complete trial balance export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleExport("Trial Balance", "csv")}
            >
              <Download className="h-3 w-3 mr-2" />
              Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-primary" />
              <Badge variant="outline">Excel</Badge>
            </div>
            <CardTitle className="text-base mt-2">VAT Workings</CardTitle>
            <CardDescription className="text-xs">
              VAT calculations and reconciliation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleExport("VAT Workings", "xlsx")}
            >
              <Download className="h-3 w-3 mr-2" />
              Download Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <Badge variant="outline">CSV</Badge>
            </div>
            <CardTitle className="text-base mt-2">Bank Transactions</CardTitle>
            <CardDescription className="text-xs">
              Complete transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleExport("Bank Transactions", "csv")}
            >
              <Download className="h-3 w-3 mr-2" />
              Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-primary" />
              <Badge variant="outline">PDF</Badge>
            </div>
            <CardTitle className="text-base mt-2">Dividend Notes</CardTitle>
            <CardDescription className="text-xs">
              Dividend and payroll documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleExport("Dividend Notes", "pdf")}
            >
              <Download className="h-3 w-3 mr-2" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Exports */}
      <Tabs defaultValue="trial-balance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="vat-workings">VAT Workings</TabsTrigger>
          <TabsTrigger value="bank-transactions">Bank Transactions</TabsTrigger>
          <TabsTrigger value="dividend-notes">Dividend Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trial Balance Preview</CardTitle>
                  <CardDescription>Review before exporting to your accountant</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("Trial Balance", "csv")}>
                    <Download className="h-3 w-3 mr-2" />
                    CSV
                  </Button>
                  <Button size="sm" onClick={() => handleExport("Trial Balance", "xlsx")}>
                    <Download className="h-3 w-3 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleTrialBalance.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{row.accountCode}</TableCell>
                      <TableCell>{row.accountName}</TableCell>
                      <TableCell className="text-right">
                        {row.debit > 0 ? `£${row.debit.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.credit > 0 ? `£${row.credit.toLocaleString()}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vat-workings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>VAT Workings Preview</CardTitle>
                  <CardDescription>VAT calculations and reconciliation details</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("VAT Workings", "csv")}>
                    <Download className="h-3 w-3 mr-2" />
                    CSV
                  </Button>
                  <Button size="sm" onClick={() => handleExport("VAT Workings", "xlsx")}>
                    <Download className="h-3 w-3 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleVATWorkings.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="font-mono text-sm">{row.reference}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="text-right">£{row.netAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">£{row.vatAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={row.type === 'sales' ? 'default' : 'secondary'}>
                          {row.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Transactions Preview</CardTitle>
                  <CardDescription>Complete transaction history for reconciliation</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("Bank Transactions", "csv")}>
                    <Download className="h-3 w-3 mr-2" />
                    CSV
                  </Button>
                  <Button size="sm" onClick={() => handleExport("Bank Transactions", "qif")}>
                    <Download className="h-3 w-3 mr-2" />
                    QIF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleBankTransactions.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="font-mono text-sm">{row.reference}</TableCell>
                      <TableCell className="text-right">
                        {row.debit > 0 ? `£${row.debit.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.credit > 0 ? `£${row.credit.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        £{row.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dividend-notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dividend & Payroll Notes Preview</CardTitle>
                  <CardDescription>Documentation for dividend payments and payroll</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("Dividend Notes", "csv")}>
                    <Download className="h-3 w-3 mr-2" />
                    CSV
                  </Button>
                  <Button size="sm" onClick={() => handleExport("Dividend Notes", "pdf")}>
                    <Download className="h-3 w-3 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleDividendPayrollNotes.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>
                        <Badge variant={row.type === 'dividend' ? 'default' : 'secondary'}>
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.recipient}</TableCell>
                      <TableCell className="text-right">£{row.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
