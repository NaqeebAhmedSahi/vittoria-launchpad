import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/StatusChip";
import { Search, Filter, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { MandateFormDialog } from "@/components/MandateFormDialog";
import { useToast } from "@/hooks/use-toast";

const mandatesData = [
  {
    id: 1,
    name: "ECM - Global Bank - London",
    firm: "Morgan Stanley",
    role: "Managing Director",
    status: "Shortlist",
    variant: "info" as const,
    candidates: 5,
    lead: "Jane Smith",
    opened: "2024-11-15",
  },
  {
    id: 2,
    name: "Private Credit - Asset Manager",
    firm: "KKR",
    role: "Partner",
    status: "Research",
    variant: "neutral" as const,
    candidates: 2,
    lead: "John Doe",
    opened: "2025-01-05",
  },
  {
    id: 3,
    name: "Infrastructure PE Partner",
    firm: "Brookfield",
    role: "Partner",
    status: "Interview",
    variant: "warning" as const,
    candidates: 3,
    lead: "Sarah Connor",
    opened: "2024-12-01",
  },
  {
    id: 4,
    name: "Real Estate Principal",
    firm: "Blackstone",
    role: "Principal",
    status: "Offer",
    variant: "success" as const,
    candidates: 1,
    lead: "Mike Johnson",
    opened: "2024-10-20",
  },
];

export default function Mandates() {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState(mandatesData);
  const { toast } = useToast();

  const handleSubmit = (formData: any) => {
    const newMandate = {
      id: data.length + 1,
      name: formData.name,
      firm: formData.firm,
      role: formData.role,
      status: "Research",
      variant: "neutral" as const,
      candidates: 0,
      lead: formData.lead,
      opened: new Date().toISOString().split('T')[0],
    };
    setData([...data, newMandate]);
    toast({
      title: "Mandate created",
      description: `${formData.name} has been added successfully`,
    });
  };

  const filteredData = data.filter(mandate => {
    if (searchQuery === "") return true;
    return mandate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           mandate.firm.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <MandateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Mandates / Projects</h1>
            <p className="text-sm text-muted-foreground">Manage your active search mandates</p>
          </div>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <span>+ New Mandate</span>
          </Button>
        </div>

      <Card>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search mandates by name or firm..."
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Button size="sm" variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>

            <div className="flex gap-1 border border-border rounded-md p-0.5">
              <Button
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                onClick={() => setViewMode("table")}
                className="h-7 px-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                onClick={() => setViewMode("kanban")}
                className="h-7 px-2"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Mandate Name
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Client Firm
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Role Type
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Candidates
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Lead
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Opened
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((mandate) => (
                    <tr
                      key={mandate.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <span className="text-sm font-medium text-foreground">{mandate.name}</span>
                      </td>
                      <td className="p-3 text-sm text-foreground">{mandate.firm}</td>
                      <td className="p-3 text-sm text-muted-foreground">{mandate.role}</td>
                      <td className="p-3">
                        <StatusChip status={mandate.status} variant={mandate.variant} />
                      </td>
                      <td className="p-3 text-sm text-foreground text-center">{mandate.candidates}</td>
                      <td className="p-3 text-sm text-muted-foreground">{mandate.lead}</td>
                      <td className="p-3 text-sm text-muted-foreground">{mandate.opened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kanban View */}
          {viewMode === "kanban" && (
            <div className="p-4">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {["Research", "Shortlist", "Interview", "Offer", "Placed"].map((stage) => (
                  <div key={stage} className="flex-shrink-0 w-72">
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <h3 className="text-sm font-semibold text-foreground">{stage}</h3>
                      <span className="text-xs text-muted-foreground">
                        {filteredData.filter(m => m.status === stage).length} mandates
                      </span>
                    </div>
                    <div className="space-y-3">
                      {filteredData
                        .filter(m => m.status === stage)
                        .map((mandate) => (
                          <Card key={mandate.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-3">
                              <h4 className="text-sm font-medium text-foreground mb-2">{mandate.name}</h4>
                              <p className="text-xs text-muted-foreground mb-2">{mandate.firm}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{mandate.candidates} candidates</span>
                                <span className="text-muted-foreground">{mandate.lead}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
