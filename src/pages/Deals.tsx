import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign } from "lucide-react";
import { useState } from "react";

const dealsData = [
  { id: 1, deal: "BWS001 - MD ECM Placement", firm: "Goldman Sachs", team: "ECM London", mandate: "ECM – Global Bank – London", amount: "£180,000", status: "Closed" },
  { id: 2, deal: "BWS002 - Infrastructure Partner", firm: "Brookfield", team: "Infrastructure", mandate: "Infrastructure PE Partner", amount: "£120,000", status: "In Progress" },
  { id: 3, deal: "BWS003 - M&A Director", firm: "JP Morgan", team: "M&A Frankfurt", mandate: "M&A – Investment Bank – Frankfurt", amount: "£150,000", status: "Closed" },
  { id: 4, deal: "BWS004 - PE Associate", firm: "KKR", team: "Private Equity", mandate: "PE – Asset Manager – NY", amount: "£95,000", status: "In Progress" },
  { id: 5, deal: "BWS005 - ECM VP", firm: "Morgan Stanley", team: "Investment Banking NY", mandate: "ECM VP – New York", amount: "£140,000", status: "Closed" },
];

export default function Deals() {
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);
  const selectedDealData = dealsData.find(d => d.id === selectedDeal);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Deals</h1>
        <Button>
          <DollarSign className="h-4 w-4" />
          Add Deal
        </Button>
      </div>

      <div className="flex gap-6">
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deals..." className="pl-9" />
              </div>
              <Button variant="outline">Filter by Status</Button>
              <Button variant="outline">Filter by Firm</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID / Name</TableHead>
                  <TableHead>Client Firm</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Mandate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealsData.map((deal) => (
                  <TableRow 
                    key={deal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedDeal(deal.id)}
                  >
                    <TableCell className="font-medium">{deal.deal}</TableCell>
                    <TableCell>{deal.firm}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{deal.team}</TableCell>
                    <TableCell className="text-sm">{deal.mandate}</TableCell>
                    <TableCell className="text-right font-medium">{deal.amount}</TableCell>
                    <TableCell>
                      <Badge variant={deal.status === "Closed" ? "default" : "secondary"}>
                        {deal.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedDeal && selectedDealData && (
          <Card className="w-96">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{selectedDealData.deal}</CardTitle>
                  <Badge className="mt-2" variant={selectedDealData.status === "Closed" ? "default" : "secondary"}>
                    {selectedDealData.status}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDeal(null)}>×</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client Firm</div>
                <div className="font-medium">{selectedDealData.firm}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Team</div>
                <div className="font-medium">{selectedDealData.team}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mandate</div>
                <div className="font-medium">{selectedDealData.mandate}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Deal Amount</div>
                <div className="text-2xl font-semibold">{selectedDealData.amount}</div>
              </div>
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">P&L Contribution</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Fee</span>
                    <span className="font-medium">{selectedDealData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="font-medium">£2,500</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Net Contribution</span>
                    <span className="font-semibold">£{(parseInt(selectedDealData.amount.replace(/[£,]/g, '')) - 2500).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Linked People</div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Lead: James Patterson</div>
                  <div className="text-muted-foreground">Support: Sarah Chen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
