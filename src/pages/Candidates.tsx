import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { CandidateFormDialog } from "@/components/CandidateFormDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UICandidate = {
  id: number;
  name: string;
  title: string;
  firm: string;
  location: string;
  status?: string;
  sectors: string[];
  functions: string[];
  mandates: number;
  lastUpdated: string;
};

// Helper: map DB row → UI candidate, with cleanup so Select never sees empty values
function mapDbCandidateToUi(row: any): UICandidate {
  const rawSectors = Array.isArray(row.sectors)
    ? row.sectors
    : JSON.parse(row.sectors || "[]");

  const rawFunctions = Array.isArray(row.functions)
    ? row.functions
    : JSON.parse(row.functions || "[]");

  const sectors = rawSectors
    .map((s: any) => (typeof s === "string" ? s.trim() : ""))
    .filter((s: string) => s.length > 0);

  const functions = rawFunctions
    .map((s: any) => (typeof s === "string" ? s.trim() : ""))
    .filter((s: string) => s.length > 0);

  const location = (row.location || "").toString().trim();
  const firm = (row.current_firm || "").toString().trim();

  const updated =
    (row.updated_at && row.updated_at.split("T")[0]) ||
    (row.created_at && row.created_at.split("T")[0]) ||
    "";

  // Parse mandate_ids array to get count of active mandates
  const mandateIds = Array.isArray(row.mandate_ids)
    ? row.mandate_ids
    : JSON.parse(row.mandate_ids || "[]");

  return {
    id: row.id,
    name: row.name || "",
    title: row.current_title || "",
    firm,
    location,
    status: row.status || 'active',
    sectors,
    functions,
    mandates: mandateIds.length,
    lastUpdated: updated,
  };
}

// Small helper to dedupe + drop empty / whitespace-only strings
const uniqueNonEmpty = (arr: (string | undefined | null)[]) =>
  Array.from(
    new Set(
      arr
        .map((v) => (v ?? "").toString().trim())
        .filter((v) => v.length > 0)
    )
  ).sort();

export default function Candidates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<UICandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [locationFilter, setLocationFilter] = useState("all");
  const [firmFilter, setFirmFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [functionFilter, setFunctionFilter] = useState("all");

  // Detail panel
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
  const selectedCandidateData = data.find(
    (c) => c.id === selectedCandidate
  );

  const { toast } = useToast();
  const api = window.api;

  // Load candidates from DB
  const loadCandidates = async () => {
    if (!api?.candidate?.list) {
      setError("Electron API not available");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // status = null → list all candidates
      const rows = await api.candidate.list(null);
      const mapped: UICandidate[] = rows.map(mapDbCandidateToUi);
      setData(mapped);
    } catch (err) {
      console.error("Failed to load candidates:", err);
      setError("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create candidate in DB via IPC
  const handleSubmit = async (formData: any) => {
    if (!api?.candidate?.create) {
      toast({
        title: "Error",
        description: "Electron API not available – cannot create candidate.",
        variant: "destructive",
      });
      return;
    }

    try {
      const createdRow = await api.candidate.create({
        name: formData.name,
        current_title: formData.title,
        current_firm: formData.firm,
        location: formData.location,
        // sectors/functions etc. can be added later
      });

      const uiCandidate = mapDbCandidateToUi(createdRow);
      setData((prev) => [uiCandidate, ...prev]);

      toast({
        title: "Candidate created",
        description: `${formData.name} has been added successfully`,
      });
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to create candidate:", err);
      toast({
        title: "Error",
        description: "Failed to create candidate",
        variant: "destructive",
      });
    }
  };

  // Build filter options from clean data (no empty values)
  const locations = uniqueNonEmpty(data.map((c) => c.location));
  const firms = uniqueNonEmpty(data.map((c) => c.firm));
  const sectors = uniqueNonEmpty(data.flatMap((c) => c.sectors || []));
  const functions = uniqueNonEmpty(data.flatMap((c) => c.functions || []));

  const filteredData = data.filter((candidate) => {
    const matchesSearch =
      searchQuery === "" ||
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.firm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      locationFilter === "all" || candidate.location === locationFilter;

    const matchesFirm = firmFilter === "all" || candidate.firm === firmFilter;

    const matchesSector =
      sectorFilter === "all" || candidate.sectors.includes(sectorFilter);

    const matchesFunction =
      functionFilter === "all" || candidate.functions.includes(functionFilter);

    return (
      matchesSearch &&
      matchesLocation &&
      matchesFirm &&
      matchesSector &&
      matchesFunction
    );
  });

  const clearFilters = () => {
    setLocationFilter("all");
    setFirmFilter("all");
    setSectorFilter("all");
    setFunctionFilter("all");
  };

  return (
    <>
      <CandidateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            Candidates
          </h1>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <span>+ New Candidate</span>
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Left: list + filters */}
          <Card className="flex-1">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Select
                  value={locationFilter}
                  onValueChange={setLocationFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={firmFilter} onValueChange={setFirmFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Firm" />
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
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Select
                  value={sectorFilter}
                  onValueChange={setSectorFilter}
                >
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sectors</SelectItem>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={functionFilter}
                  onValueChange={setFunctionFilter}
                >
                  <SelectTrigger className="h-8 w-[170px]">
                    <SelectValue placeholder="Function" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All functions</SelectItem>
                    {functions.map((fn) => (
                      <SelectItem key={fn} value={fn}>
                        {fn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              </div>

              {loading && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Loading candidates…
                </div>
              )}
              {error && (
                <div className="mt-3 text-xs text-red-500">{error}</div>
              )}
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Current Title</TableHead>
                    <TableHead>Current Firm</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">
                      Active Mandates
                    </TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCandidate(candidate.id)}
                    >
                      <TableCell className="font-medium">
                        {candidate.name}
                      </TableCell>
                      <TableCell>{candidate.title}</TableCell>
                      <TableCell>{candidate.firm}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {candidate.location}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={candidate.status === 'active' ? 'default' : 'secondary'}
                          className={`text-xs capitalize ${
                            candidate.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                            candidate.status === 'placed' ? 'bg-purple-500 hover:bg-purple-600' :
                            candidate.status === 'withdrawn' ? 'bg-red-500 hover:bg-red-600' :
                            'bg-gray-500 hover:bg-gray-600'
                          }`}
                        >
                          {candidate.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {[...candidate.sectors, ...candidate.functions]
                            .slice(0, 3)
                            .map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs bg-secondary/20 text-secondary hover:bg-secondary/30"
                              >
                                {tag}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {candidate.mandates}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {candidate.lastUpdated}
                      </TableCell>
                    </TableRow>
                  ))}

                  {!loading && filteredData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No candidates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Right: detail panel */}
          {selectedCandidate && selectedCandidateData && (
            <Card className="w-96">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedCandidateData.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {selectedCandidateData.title}
                      </Badge>
                      <Badge variant="outline">
                        {selectedCandidateData.firm}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedCandidate(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Location
                  </div>
                  <div className="font-medium">
                    {selectedCandidateData.location}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      ...selectedCandidateData.sectors,
                      ...selectedCandidateData.functions,
                    ].map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-secondary/20 text-secondary"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Active Mandates
                    </div>
                    <div className="text-xl font-semibold">
                      {selectedCandidateData.mandates}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Last Updated
                    </div>
                    <div className="text-sm font-medium">
                      {selectedCandidateData.lastUpdated}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Notes
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add narrative notes, interview feedback, and internal
                    commentary here once the notes feature is wired up.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}