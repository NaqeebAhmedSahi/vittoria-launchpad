import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, DollarSign } from "lucide-react";
import { useState } from "react";

const invoicesData = [
  { id: 1, number: "BWS0008", firm: "Brookfield", mandate: "Infrastructure PE Partner", amount: "£120,000", vat: "£24,000", total: "£144,000", status: "Issued", deal: "BWS002" },
  { id: 2, number: "BWS0010", firm: "Goldman Sachs", mandate: "ECM MD", amount: "£180,000", vat: "£36,000", total: "£216,000", status: "Paid", deal: "BWS001" },
  { id: 3, number: "BWS0012", firm: "JP Morgan", mandate: "M&A Director", amount: "£150,000", vat: "£30,000", total: "£180,000", status: "Paid", deal: "BWS003" },
  { id: 4, number: "BWS0015", firm: "KKR", mandate: "PE Associate", amount: "£95,000", vat: "£19,000", total: "£114,000", status: "Draft", deal: "BWS004" },
  { id: 5, number: "BWS0018", firm: "Morgan Stanley", mandate: "ECM VP", amount: "£140,000", vat: "£28,000", total: "£168,000", status: "Overdue", deal: "BWS005" },
];

const plByPersonData = [
  { name: "James Patterson", mandates: 5, revenue: "£420,000", expenses: "£12,000", net: "£408,000" },
  { name: "Sarah Chen", mandates: 4, revenue: "£380,000", expenses: "£9,500", net: "£370,500" },
  { name: "Klaus Schmidt", mandates: 3, revenue: "£290,000", expenses: "£8,200", net: "£281,800" },
  { name: "David Morrison", mandates: 6, revenue: "£520,000", expenses: "£15,000", net: "£505,000" },
];

const plByTeamData = [
  { team: "ECM London", revenue: "£720,000", expenses: "£22,000", net: "£698,000" },
  { team: "Investment Banking NY", revenue: "£680,000", expenses: "£19,500", net: "£660,500" },
  { team: "M&A Frankfurt", revenue: "£420,000", expenses: "£13,200", net: "£406,800" },
  { team: "Private Equity", revenue: "£920,000", expenses: "£28,000", net: "£892,000" },
];

export default function Finance() {
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const selectedInvoiceData = invoicesData.find(i => i.id === selectedInvoice);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
        <Button>
          <DollarSign className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="pl">P&L</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex gap-6">
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search invoices..." className="pl-9" />
                  </div>
                  <Button variant="outline">Filter by Status</Button>
                  <Button variant="outline">Filter by Firm</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client Firm</TableHead>
                      <TableHead>Mandate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesData.map((invoice) => (
                      <TableRow 
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedInvoice(invoice.id)}
                      >
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{invoice.firm}</TableCell>
                        <TableCell className="text-sm">{invoice.mandate}</TableCell>
                        <TableCell className="text-right">{invoice.amount}</TableCell>
                        <TableCell className="text-right">{invoice.vat}</TableCell>
                        <TableCell className="text-right font-medium">{invoice.total}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              invoice.status === "Paid" ? "default" : 
                              invoice.status === "Overdue" ? "destructive" : 
                              "secondary"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedInvoice && selectedInvoiceData && (
              <Card className="w-96">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{selectedInvoiceData.number}</CardTitle>
                      <Badge className="mt-2" variant={
                        selectedInvoiceData.status === "Paid" ? "default" : 
                        selectedInvoiceData.status === "Overdue" ? "destructive" : 
                        "secondary"
                      }>
                        {selectedInvoiceData.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(null)}>×</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client Firm</div>
                    <div className="font-medium">{selectedInvoiceData.firm}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mandate</div>
                    <div className="font-medium">{selectedInvoiceData.mandate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Linked Deal</div>
                    <div className="font-medium">{selectedInvoiceData.deal}</div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{selectedInvoiceData.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT (20%)</span>
                        <span className="font-medium">{selectedInvoiceData.vat}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Total</span>
                        <span className="text-lg font-semibold">{selectedInvoiceData.total}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <Button className="w-full" variant="outline">
                      <Download className="h-4 w-4" />
                      Download Invoice
                    </Button>
                    {selectedInvoiceData.status !== "Paid" && (
                      <Button className="w-full">Mark as Paid</Button>
                    )}
                    <Button className="w-full" variant="outline">Edit Allocations</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pl" className="space-y-6">
          <div className="flex gap-4 mb-4">
            <Input type="date" className="w-40" />
            <span className="flex items-center text-muted-foreground">to</span>
            <Input type="date" className="w-40" />
            <Button variant="outline">Filter by Team</Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>P&L by Person</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Mandates</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plByPersonData.map((person, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell className="text-right">{person.mandates}</TableCell>
                        <TableCell className="text-right">{person.revenue}</TableCell>
                        <TableCell className="text-right font-medium text-status-success">{person.net}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>P&L by Team</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plByTeamData.map((team, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{team.team}</TableCell>
                        <TableCell className="text-right">{team.revenue}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{team.expenses}</TableCell>
                        <TableCell className="text-right font-medium text-status-success">{team.net}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
