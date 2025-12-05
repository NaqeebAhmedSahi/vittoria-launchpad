import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { getCandidateScoreDetails } from "@/services/candidateScoringIntegration";

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
  bio?: string | null;
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

  const formatDate = (d: any) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const updated = formatDate(row.updated_at) || formatDate(row.created_at);


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
    bio: row.bio || null,
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
  const [candidateMandates, setCandidateMandates] = useState<any[]>([]);
  const [loadingMandates, setLoadingMandates] = useState(false);
  const [candidateScores, setCandidateScores] = useState<Map<number, any>>(new Map());
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

  // Compute bias-aware scores for visible candidates
  useEffect(() => {
    const computeScores = async () => {
      const scores = new Map();
      for (const candidate of data) {
        try {
          // Build mock context for scoring (in production, fetch from DB)
          const candidateData = {
            id: candidate.id,
            name: candidate.name,
            sectors: candidate.sectors,
            functions: candidate.functions,
            firms: candidate.firm ? [candidate.firm] : [],
            schools: [],
            location: candidate.location,
            skills: [],
          };
          
          // Mock mandate (in production, compute for each active mandate)
          const mockMandate = {
            id: 1,
            title: 'Mock Mandate',
            requiredSectors: candidate.sectors.slice(0, 2),
            requiredFunctions: candidate.functions.slice(0, 2),
            requiredSkills: [],
          };

          // Mock match score (in production, fetch from candidate_mandates)
          const mockMatchScore = {
            candidate_id: candidate.id,
            mandate_id: 1,
            final_score: 0.7, // Mock base score
            sector_score: 0.8,
            function_score: 0.75,
            asset_class_score: 0.7,
            geography_score: 0.65,
            seniority_score: 0.7,
          };

          const scoreDetail = getCandidateScoreDetails(candidateData, mockMandate, mockMatchScore);
          
          // Extract summary for display
          const { summary } = scoreDetail;
          
          // Determine bias risk based on divergence
          const divergence = Math.abs(summary.avgSimilarityScore - summary.avgExpertiseScore);
          const biasRisk: 'high' | 'medium' | 'low' = 
            divergence > 0.3 ? 'high' : 
            divergence > 0.15 ? 'medium' : 
            'low';

          scores.set(candidate.id, {
            expertiseScore: summary.avgExpertiseScore,
            similarityScore: summary.avgSimilarityScore,
            reliabilityScore: summary.avgReliabilityScore,
            compositeScore: summary.compositeScore,
            biasRisk: biasRisk,
          });
        } catch (error) {
          console.error(`Failed to compute score for candidate ${candidate.id}:`, error);
        }
      }
      setCandidateScores(scores);
    };

    if (data.length > 0) {
      computeScores();
    }
  }, [data]);

  // Load mandates for selected candidate
  useEffect(() => {
    if (!selectedCandidate || !api?.candidate?.getMandates) {
      setCandidateMandates([]);
      return;
    }

    const loadMandates = async () => {
      setLoadingMandates(true);
      try {
        const response = await api.candidate.getMandates(selectedCandidate);
        if (response.success && response.mandateIds && response.mandateIds.length > 0) {
          // Load full mandate details
          const mandateDetails = await Promise.all(
            response.mandateIds.map(async (mandateId: number) => {
              try {
                const mandateResponse = await api.mandate.getById(mandateId);
                return mandateResponse.success ? mandateResponse.mandate : null;
              } catch (err) {
                console.error(`Failed to load mandate ${mandateId}:`, err);
                return null;
              }
            })
          );
          setCandidateMandates(mandateDetails.filter(Boolean));
        } else {
          setCandidateMandates([]);
        }
      } catch (err) {
        console.error("Failed to load candidate mandates:", err);
        setCandidateMandates([]);
      } finally {
        setLoadingMandates(false);
      }
    };

    loadMandates();
  }, [selectedCandidate, api]);

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
          {/* <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <span>+ New Candidate</span>
          </Button> */}
        </div>

        <div className="flex gap-6">
          {/* Left: list + filters */}
          <Card className="flex-1">
            <CardHeader>
              {/* High bias risk alert */}
              {Array.from(candidateScores.values()).some(score => score?.biasRisk === "high") && (
                <Alert className="border-amber-500/30 bg-amber-500/10 mb-4">
                  <AlertDescription className="text-amber-600 dark:text-amber-400">
                    ⚠️ <strong>Bias Alert:</strong> Some candidates have high similarity scores that may be 
                    influencing their rankings. Hover over candidate names to see detailed score breakdowns 
                    and ensure decisions are based on expertise match rather than affinity bias.
                  </AlertDescription>
                </Alert>
              )}

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
                    <TableHead>Bias Risk</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">
                      Active Mandates
                    </TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((candidate) => {
                    const scoreDetail = candidateScores.get(candidate.id);
                    const biasRisk = scoreDetail?.biasRisk || "low";
                    const expertise = scoreDetail?.expertiseScore || 0;
                    const similarity = scoreDetail?.similarityScore || 0;
                    const reliability = scoreDetail?.reliabilityScore || 0;

                    return (
                    <TableRow
                      key={candidate.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCandidate(candidate.id)}
                    >
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{candidate.name}</span>
                            </TooltipTrigger>
                            <TooltipContent className="w-64">
                              <div className="space-y-2">
                                <div className="font-semibold text-sm border-b pb-1">Score Breakdown</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Expertise Match:</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500" 
                                          style={{ width: `${expertise * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-medium w-8 text-right">{(expertise * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Similarity Match:</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-amber-500" 
                                          style={{ width: `${similarity * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-medium w-8 text-right">{(similarity * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Source Reliability:</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-green-500" 
                                          style={{ width: `${reliability * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-medium w-8 text-right">{(reliability * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                </div>
                                {biasRisk === "high" && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 pt-2 border-t">
                                    ⚠️ High similarity may be influencing ranking
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <Badge
                          variant="outline"
                          className={`text-xs uppercase ${
                            biasRisk === "high"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : biasRisk === "medium"
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                              : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                          }`}
                        >
                          {biasRisk.charAt(0)}
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
                  );
                  })}

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
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="break-words pr-2">{selectedCandidateData.name}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {selectedCandidateData.title}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedCandidateData.firm}
                      </Badge>
                      {candidateScores.get(selectedCandidate) && (
                        <Badge
                          variant="outline"
                          className={`text-xs uppercase ${
                            candidateScores.get(selectedCandidate)?.biasRisk === "high"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : candidateScores.get(selectedCandidate)?.biasRisk === "medium"
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                              : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                          }`}
                        >
                          {candidateScores.get(selectedCandidate)?.biasRisk?.charAt(0)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedCandidate(null)}
                    className="shrink-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                {/* Bias-aware score breakdown */}
                {candidateScores.get(selectedCandidate) && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Match Score Breakdown
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Expertise Match</span>
                          <span className="font-medium">
                            {(candidateScores.get(selectedCandidate)!.expertiseScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${candidateScores.get(selectedCandidate)!.expertiseScore * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Similarity Match</span>
                          <span className="font-medium">
                            {(candidateScores.get(selectedCandidate)!.similarityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${candidateScores.get(selectedCandidate)!.similarityScore * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Source Reliability</span>
                          <span className="font-medium">
                            {(candidateScores.get(selectedCandidate)!.reliabilityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${candidateScores.get(selectedCandidate)!.reliabilityScore * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {candidateScores.get(selectedCandidate)?.biasRisk === "high" && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-3 pt-3 border-t leading-relaxed">
                        ⚠️ Similarity score is unusually high relative to expertise. 
                        Ensure ranking decisions prioritize domain fit over affinity signals.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Location
                  </div>
                  <div className="font-medium">
                    {selectedCandidateData.location}
                  </div>
                </div>

                {/* Bio Section */}
                {selectedCandidateData.bio && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Professional Bio
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {selectedCandidateData.bio}
                    </p>
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
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
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                      Active Mandates
                    </div>
                    <div className="text-xl font-semibold">
                      {selectedCandidateData.mandates}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                      Last Updated
                    </div>
                    <div className="text-sm font-medium">
                      {selectedCandidateData.lastUpdated}
                    </div>
                  </div>
                </div>

                {/* Mandates List */}
                {selectedCandidateData.mandates > 0 && (
                  <div className="border-t pt-5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                      Associated Mandates
                    </div>
                    {loadingMandates ? (
                      <div className="text-sm text-muted-foreground">Loading mandates...</div>
                    ) : candidateMandates.length > 0 ? (
                      <div className="space-y-2.5">
                        {candidateMandates.map((mandate: any) => (
                          <div key={mandate.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="font-medium text-sm leading-relaxed break-words">{mandate.name}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {mandate.primary_sector && (
                                <Badge variant="secondary" className="text-xs">
                                  {mandate.primary_sector}
                                </Badge>
                              )}
                              {mandate.location && (
                                <Badge variant="outline" className="text-xs">
                                  {mandate.location}
                                </Badge>
                              )}
                              <Badge 
                                variant={
                                  mandate.status === 'OPEN' ? 'default' : 
                                  mandate.status === 'CLOSED' ? 'secondary' : 
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {mandate.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No mandate details available</div>
                    )}
                  </div>
                )}

                <div className="border-t pt-5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Notes
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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