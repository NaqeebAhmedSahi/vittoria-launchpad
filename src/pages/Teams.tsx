import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UsersRound } from "lucide-react";

const teamsData = [
  { id: 1, name: "ECM London", firm: "Goldman Sachs", region: "EMEA", head: "James Patterson", size: 12, mandates: 2, revenue: "£420K" },
  { id: 2, name: "Investment Banking NY", firm: "Morgan Stanley", region: "Americas", head: "Sarah Chen", size: 18, mandates: 3, revenue: "£680K" },
  { id: 3, name: "M&A Frankfurt", firm: "JP Morgan", region: "EMEA", head: "Klaus Schmidt", size: 8, mandates: 1, revenue: "£240K" },
  { id: 4, name: "Private Equity", firm: "KKR", region: "Global", head: "David Morrison", size: 15, mandates: 4, revenue: "£920K" },
  { id: 5, name: "Infrastructure", firm: "Brookfield", region: "Americas", head: "Emma Rodriguez", size: 10, mandates: 2, revenue: "£380K" },
];

export default function Teams() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Teams</h1>
        <Button>
          <UsersRound className="h-4 w-4" />
          Add Team
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search teams..." className="pl-9" />
            </div>
            <Button variant="outline">Filter by Firm</Button>
            <Button variant="outline">Filter by Region</Button>
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
              {teamsData.map((team) => (
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
