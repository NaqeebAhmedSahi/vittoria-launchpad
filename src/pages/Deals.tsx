import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign } from "lucide-react";
import { useState } from "react";
import { DealFormDialog } from "@/components/DealFormDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const dealsData = [
  {
    id: 1,
    deal: "BWS001 - MD ECM Placement",
    firm: "Goldman Sachs",
    team: "ECM London",
    mandate: "ECM – Global Bank – London",
    amount: "£180,000",
    status: "Closed",
  },
  {
    id: 2,
    deal: "BWS002 - Infrastructure Partner",
    firm: "Brookfield",
    team: "Infrastructure",
    mandate: "Infrastructure PE Partner",
    amount: "£120,000",
    status: "In Progress",
  },
  {
    id: 3,
    deal: "BWS003 - M&A Director",
    firm: "JP Morgan",
    team: "M&A Frankfurt",
    mandate: "M&A – Investment Bank – Frankfurt",
    amount: "£150,000",
    status: "Closed",
  },
  {
    id: 4,
    deal: "BWS004 - PE Associate",
    firm: "KKR",
    team: "Private Equity",
    mandate: "PE – Asset Manager – NY",
    amount: "£95,000",
    status: "In Progress",
  },
  {
    id: 5,
    deal: "BWS005 - ECM VP",
    firm: "Morgan Stanley",
    team: "Investment Banking NY",
    mandate: "ECM VP – New York",
    amount: "£140,000",
    status: "Closed",
  },
];

export default function Deals() {
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [firmFilter, setFirmFilter] = useState("all");
  const { toast } = useToast();

  const selectedDealData = dealsData.find((d) => d.id === selectedDeal);

  const statuses = Array.from(new Set(dealsData.map((d) => d.status))).sort();
  const firms = Array.from(new Set(dealsData.map((d) => d.firm))).sort();

  const filteredDeals = dealsData.filter((deal) => {
    const matchesSearch =
      searchQuery === "" ||
      deal.deal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.firm.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || deal.status === statusFilter;

    const matchesFirm = firmFilter === "all" || deal.firm === firmFilter;

    return matchesSearch && matchesStatus && matchesFirm;
  });

  const handleAddDeal = (data: any) => {
    toast({
      title: "Deal created",
      description: `${data.name} has been added successfully.`,
    });
  };

  const computeNetContribution = (amount: string) => {
    const numeric = parseInt(amount.replace(/[£,]/g, ""), 10);
    const net = numeric - 2500;
    return `£${net.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground">
            Track placement fees and commercial performance
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <DollarSign className="h-4 w-4" />
          Add Deal
        </Button>
      </div>

      <DealFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddDeal}
      />

      <div className="flex gap-6">
        {/* Left: table + filters */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search deals by ID, name, or firm..."
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Firm filter */}
              <Select value={firmFilter} onValueChange={setFirmFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Client firm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All firms</SelectItem>
                  {firms.map((firm) => (
                    <SelectItem key={firm} value={firm}>
                      {firm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setFirmFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
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
                  {filteredDeals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDeal(deal.id)}
                    >
                      <TableCell className="font-medium">
                        {deal.deal}
                      </TableCell>
                      <TableCell>{deal.firm}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deal.team}
                      </TableCell>
                      <TableCell className="text-sm">
                        {deal.mandate}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {deal.amount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            deal.status === "Closed" ? "default" : "secondary"
                          }
                        >
                          {deal.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDeals.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No deals found with the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: detail card, same pattern as Firms side panel */}
        {selectedDeal && selectedDealData && (
          <Card className="w-96">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {selectedDealData.deal}
                  </CardTitle>
                  <Badge
                    className="mt-2"
                    variant={
                      selectedDealData.status === "Closed"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedDealData.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDeal(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Client Firm
                </div>
                <div className="font-medium">{selectedDealData.firm}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Team
                </div>
                <div className="font-medium">{selectedDealData.team}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Mandate
                </div>
                <div className="font-medium">
                  {selectedDealData.mandate}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Deal Amount
                </div>
                <div className="text-2xl font-semibold">
                  {selectedDealData.amount}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">
                  P&L Contribution
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Fee</span>
                    <span className="font-medium">
                      {selectedDealData.amount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="font-medium">£2,500</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Net Contribution</span>
                    <span className="font-semibold">
                      {computeNetContribution(selectedDealData.amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Linked People</div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">
                    Lead: James Patterson
                  </div>
                  <div className="text-muted-foreground">
                    Support: Sarah Chen
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
