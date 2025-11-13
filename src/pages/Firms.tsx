import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Users, Briefcase, TrendingUp } from "lucide-react";
import { useState } from "react";
import { FirmFormDialog } from "@/components/FirmFormDialog";
import { useToast } from "@/hooks/use-toast";

const firmsData = [
  { id: 1, name: "Goldman Sachs", sector: "Investment Bank", region: "Global", teams: 12, mandates: 3 },
  { id: 2, name: "Brookfield", sector: "Asset Manager", region: "Americas", teams: 7, mandates: 2 },
  { id: 3, name: "Morgan Stanley", sector: "Investment Bank", region: "Global", teams: 15, mandates: 5 },
  { id: 4, name: "JP Morgan", sector: "Investment Bank", region: "Global", teams: 18, mandates: 4 },
  { id: 5, name: "KKR", sector: "Private Equity", region: "Global", teams: 9, mandates: 3 },
  { id: 6, name: "Barclays", sector: "Investment Bank", region: "EMEA", teams: 11, mandates: 2 },
];

const teamsData = [
  { name: "ECM London", region: "EMEA", head: "James Patterson", size: 12, mandates: 2 },
  { name: "Investment Banking NY", region: "Americas", head: "Sarah Chen", size: 18, mandates: 3 },
  { name: "M&A Frankfurt", region: "EMEA", head: "Klaus Schmidt", size: 8, mandates: 1 },
];

const dealsData = [
  { deal: "Project Alpha", amount: "£2.5M", status: "Closed", date: "2024-11-01" },
  { deal: "Project Beta", amount: "£1.8M", status: "In Progress", date: "2024-10-15" },
  { deal: "Project Gamma", amount: "£3.2M", status: "Closed", date: "2024-09-20" },
];

export default function Firms() {
  const [selectedFirm, setSelectedFirm] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const { toast } = useToast();
  
  const selectedFirmData = firmsData.find(f => f.id === selectedFirm);

  const filteredFirms = firmsData.filter((firm) => {
    const matchesSearch = firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         firm.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === "all" || firm.sector === sectorFilter;
    const matchesRegion = regionFilter === "all" || firm.region === regionFilter;
    return matchesSearch && matchesSector && matchesRegion;
  });

  const handleAddFirm = (data: any) => {
    toast({
      title: "Firm created",
      description: `${data.name} has been added successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Firms</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Building2 className="h-4 w-4" />
          Add Firm
        </Button>
      </div>

      <FirmFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddFirm}
      />

      <div className="flex gap-6">
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search firms..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  <SelectItem value="Investment Bank">Investment Bank</SelectItem>
                  <SelectItem value="Private Equity">Private Equity</SelectItem>
                  <SelectItem value="Asset Manager">Asset Manager</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="EMEA">EMEA</SelectItem>
                  <SelectItem value="Americas">Americas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firm Name</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Teams</TableHead>
                  <TableHead className="text-right">Active Mandates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFirms.map((firm) => (
                  <TableRow 
                    key={firm.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedFirm(firm.id)}
                  >
                    <TableCell className="font-medium">{firm.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{firm.sector}</Badge>
                    </TableCell>
                    <TableCell>{firm.region}</TableCell>
                    <TableCell className="text-right">{firm.teams}</TableCell>
                    <TableCell className="text-right">{firm.mandates}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedFirm && selectedFirmData && (
          <Card className="w-96">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedFirmData.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{selectedFirmData.sector}</Badge>
                    <Badge variant="outline">{selectedFirmData.region}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedFirm(null)}>×</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
                  <TabsTrigger value="deals" className="flex-1">Deals</TabsTrigger>
                  <TabsTrigger value="orgchart" className="flex-1">Org Chart</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Teams</span>
                      </div>
                      <p className="text-2xl font-semibold">{selectedFirmData.teams}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Mandates</span>
                      </div>
                      <p className="text-2xl font-semibold">{selectedFirmData.mandates}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Revenue YTD</span>
                      </div>
                      <p className="text-2xl font-semibold">£840K</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Placements</span>
                      </div>
                      <p className="text-2xl font-semibold">7</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="teams">
                  <div className="space-y-3">
                    {teamsData.map((team, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="font-medium text-sm">{team.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {team.region} • Head: {team.head} • {team.size} people • {team.mandates} mandates
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="deals">
                  <div className="space-y-3">
                    {dealsData.map((deal, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-sm">{deal.deal}</div>
                          <Badge variant={deal.status === "Closed" ? "default" : "secondary"}>
                            {deal.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {deal.amount} • {deal.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="orgchart">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Expand Up</Button>
                      <Button variant="outline" size="sm">Expand Down</Button>
                      <Button variant="outline" size="sm">Wider</Button>
                    </div>
                    <div className="border rounded-lg p-8 bg-muted/20 text-center text-sm text-muted-foreground">
                      Org chart visualization
                      <div className="mt-4 space-y-2">
                        <div className="p-2 border rounded bg-background inline-block">Head of ECM – London</div>
                        <div className="flex justify-center gap-4 mt-2">
                          <div className="p-2 border rounded bg-background text-xs">Executive Director – ECM</div>
                          <div className="p-2 border rounded bg-background text-xs">Associate – ECM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
