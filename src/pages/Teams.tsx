import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UsersRound } from "lucide-react";
import { useState } from "react";
import { TeamFormDialog } from "@/components/TeamFormDialog";
import { useToast } from "@/hooks/use-toast";

const teamsData = [
  { id: 1, name: "ECM London", firm: "Goldman Sachs", region: "EMEA", head: "James Patterson", size: 12, mandates: 2, revenue: "£420K" },
  { id: 2, name: "Investment Banking NY", firm: "Morgan Stanley", region: "Americas", head: "Sarah Chen", size: 18, mandates: 3, revenue: "£680K" },
  { id: 3, name: "M&A Frankfurt", firm: "JP Morgan", region: "EMEA", head: "Klaus Schmidt", size: 8, mandates: 1, revenue: "£240K" },
  { id: 4, name: "Private Equity", firm: "KKR", region: "Global", head: "David Morrison", size: 15, mandates: 4, revenue: "£920K" },
  { id: 5, name: "Infrastructure", firm: "Brookfield", region: "Americas", head: "Emma Rodriguez", size: 10, mandates: 2, revenue: "£380K" },
];

export default function Teams() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [firmFilter, setFirmFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const { toast } = useToast();

  const filteredTeams = teamsData.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         team.firm.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFirm = !firmFilter || team.firm.toLowerCase().includes(firmFilter.toLowerCase());
    const matchesRegion = !regionFilter || team.region.toLowerCase().includes(regionFilter.toLowerCase());
    return matchesSearch && matchesFirm && matchesRegion;
  });

  const handleAddTeam = (data: any) => {
    toast({
      title: "Team created",
      description: `${data.name} has been added successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Teams</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UsersRound className="h-4 w-4" />
          Add Team
        </Button>
      </div>

      <TeamFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddTeam}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search teams..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Input 
              placeholder="Filter by Firm" 
              className="w-48"
              value={firmFilter}
              onChange={(e) => setFirmFilter(e.target.value)}
            />
            <Input 
              placeholder="Filter by Region" 
              className="w-48"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Active Mandates</TableHead>
                <TableHead className="text-right">Revenue YTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.firm}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{team.region}</Badge>
                  </TableCell>
                  <TableCell>{team.head}</TableCell>
                  <TableCell className="text-right">{team.size}</TableCell>
                  <TableCell className="text-right">{team.mandates}</TableCell>
                  <TableCell className="text-right font-medium">{team.revenue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
