import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sampleVATReturns, sampleTaxDeadlines } from "@/data/sampleFinancials";

export default function VATAndTax() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/finance/business')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">VAT & Tax Timeline</h1>
          <p className="text-sm text-muted-foreground mt-1">VAT returns and tax deadlines</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">VAT Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sampleVATReturns.map((vat) => (
                <div key={vat.id} className="p-3 rounded-md border">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">{vat.id}</span>
                    <Badge variant={vat.status === 'paid' ? 'default' : 'outline'}>
                      {vat.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Period: {new Date(vat.periodStart).toLocaleDateString()} - {new Date(vat.periodEnd).toLocaleDateString()}</div>
                    <div>Due: {new Date(vat.dueDate).toLocaleDateString()}</div>
                    <div className="font-bold text-foreground mt-2">Net VAT: £{vat.netVAT.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tax Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleTaxDeadlines.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="text-sm">{tax.name}</TableCell>
                      <TableCell className="text-sm">{new Date(tax.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        {tax.estimatedAmount ? `£${tax.estimatedAmount.toLocaleString()}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
