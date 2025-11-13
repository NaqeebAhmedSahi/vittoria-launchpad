import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import { CandidateFormDialog } from "@/components/CandidateFormDialog";
import { useToast } from "@/hooks/use-toast";

const candidatesData = [
  {
    id: 1,
    name: "Francesco Vignola",
    title: "Executive Director, ECM",
    firm: "Goldman Sachs",
    location: "London",
    sectors: ["ECM", "FIG"],
    functions: ["Capital Markets", "IPO"],
    mandates: 2,
    lastUpdated: "2025-01-10",
  },
  {
    id: 2,
    name: "Holly Ha",
    title: "Director, Private Equity",
    firm: "Brookfield",
    location: "New York",
    sectors: ["Infrastructure", "PE"],
    functions: ["Fundraising", "Origination"],
    mandates: 1,
    lastUpdated: "2025-01-09",
  },
  {
    id: 3,
    name: "Tamim Ahmad",
    title: "Managing Director",
    firm: "KKR",
    location: "Dubai",
    sectors: ["Private Credit", "Real Estate"],
    functions: ["Investment", "Portfolio Management"],
    mandates: 3,
    lastUpdated: "2025-01-08",
  },
  {
    id: 4,
    name: "Edward Berwin",
    title: "Partner",
    firm: "Blackstone",
    location: "London",
    sectors: ["Real Estate", "PE"],
    functions: ["Acquisitions", "Asset Management"],
    mandates: 1,
    lastUpdated: "2025-01-07",
  },
];

export default function Candidates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState(candidatesData);
  const { toast } = useToast();

  const handleSubmit = (formData: any) => {
    const newCandidate = {
      id: data.length + 1,
      name: formData.name,
      title: formData.title,
      firm: formData.firm,
      location: formData.location,
      sectors: [],
      functions: [],
      mandates: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setData([...data, newCandidate]);
    toast({
      title: "Candidate created",
      description: `${formData.name} has been added successfully`,
    });
  };

  const filteredData = data.filter(candidate => {
    if (searchQuery === "") return true;
    return candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           candidate.firm.toLowerCase().includes(searchQuery.toLowerCase()) ||
           candidate.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <CandidateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">Candidates</h1>
            <p className="text-sm text-muted-foreground">Manage your candidate database</p>
          </div>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <span>+ New Candidate</span>
          </Button>
        </div>

      <Card>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search candidates by name, firm, or skills..."
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
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Candidate Name
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Title
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Firm
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Location
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tags
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Active Mandates
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <span className="text-sm font-medium text-foreground">{candidate.name}</span>
                    </td>
                    <td className="p-3 text-sm text-foreground">{candidate.title}</td>
                    <td className="p-3 text-sm text-foreground">{candidate.firm}</td>
                    <td className="p-3 text-sm text-muted-foreground">{candidate.location}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {[...candidate.sectors, ...candidate.functions].slice(0, 3).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs bg-secondary/20 text-secondary hover:bg-secondary/30"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-foreground text-center">{candidate.mandates}</td>
                    <td className="p-3 text-sm text-muted-foreground">{candidate.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
