import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { User, MapPin, Briefcase, TrendingUp, Loader2, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: number;
  name: string;
  current_title: string | null;
  current_firm: string | null;
  location: string | null;
  sectors: string[];
  functions: string[];
  asset_classes: string[];
  geographies: string[];
  seniority: string | null;
  status: string;
}

interface FitScore {
  finalScore: number;
  dimensionScores: {
    sector: number;
    function: number;
    assetClass: number;
    geography: number;
    seniority: number;
  };
}

interface CandidateMatchModalProps {
  open: boolean;
  onClose: () => void;
  mandateId: number;
  mandateName: string;
}

export function CandidateMatchModal({
  open,
  onClose,
  mandateId,
  mandateName,
}: CandidateMatchModalProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [fitScore, setFitScore] = useState<FitScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [addingToMandate, setAddingToMandate] = useState(false);
  const [mandateCandidateIds, setMandateCandidateIds] = useState<number[]>([]);

  const api = (window as any).api;
  const { toast } = useToast();

  // Load all candidates when modal opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      
      // Load candidates
      api.candidate
        .list("ACTIVE")
        .then((rows: any[]) => {
          const mapped = rows.map((row: any) => ({
            id: row.id,
            name: row.name || "",
            current_title: row.current_title,
            current_firm: row.current_firm,
            location: row.location,
            sectors: Array.isArray(row.sectors) 
              ? row.sectors 
              : (typeof row.sectors === 'string' && row.sectors.trim() !== '' 
                ? JSON.parse(row.sectors) 
                : []),
            functions: Array.isArray(row.functions) 
              ? row.functions 
              : (typeof row.functions === 'string' && row.functions.trim() !== '' 
                ? JSON.parse(row.functions) 
                : []),
            asset_classes: Array.isArray(row.asset_classes) 
              ? row.asset_classes 
              : (typeof row.asset_classes === 'string' && row.asset_classes.trim() !== '' 
                ? JSON.parse(row.asset_classes) 
                : []),
            geographies: Array.isArray(row.geographies) 
              ? row.geographies 
              : (typeof row.geographies === 'string' && row.geographies.trim() !== '' 
                ? JSON.parse(row.geographies) 
                : []),
            seniority: row.seniority,
            status: row.status || "active",
          }));
          setCandidates(mapped);
        })
        .catch((err: any) => console.error("Failed to load candidates:", err))
        .finally(() => setLoading(false));

      // Load current mandate's candidate IDs
      api.mandate
        .getCandidates(mandateId)
        .then((response: any) => {
          if (response.success) {
            setMandateCandidateIds(response.candidateIds || []);
          }
        })
        .catch((err: any) => console.error("Failed to load mandate candidates:", err));
    } else {
      // Reset state when modal closes
      setSelectedCandidate(null);
      setFitScore(null);
      setMandateCandidateIds([]);
    }
  }, [open, mandateId]);

  const handleAddToMandate = async (candidateId: number) => {
    setAddingToMandate(true);
    try {
      const response = await api.mandate.addCandidate({ 
        mandateId, 
        candidateId 
      });

      if (response.success) {
        setMandateCandidateIds(response.candidateIds || []);
        toast({
          title: "Success",
          description: "Candidate added to mandate",
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to add candidate",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add candidate to mandate:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setAddingToMandate(false);
    }
  };

  const handleCandidateClick = async (candidateId: number) => {
    setSelectedCandidate(candidateId);
    setCalculating(true);
    setFitScore(null);

    try {
      // Call backend to calculate fit score
      const response = await api.scoring.runFitAgainstMandate(
        candidateId,
        mandateId
      );

      if (response.success && response.result) {
        setFitScore({
          finalScore: response.result.finalScore,
          dimensionScores: response.result.dimensionScores,
        });
      } else {
        console.error("Failed to calculate fit score:", response.error);
      }
    } catch (err) {
      console.error("Failed to calculate fit score:", err);
    } finally {
      setCalculating(false);
    }
  };

  const getFitScoreBadge = (score: number) => {
    if (score >= 75) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          {score.toFixed(1)}% Strong Match
        </Badge>
      );
    } else if (score >= 50) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600">
          {score.toFixed(1)}% Good Match
        </Badge>
      );
    } else if (score >= 25) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600">
          {score.toFixed(1)}% Moderate
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {score.toFixed(1)}% Low Match
        </Badge>
      );
    }
  };

  const selectedCandidateData = candidates.find((c) => c.id === selectedCandidate);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Find Candidates for Mandate</DialogTitle>
          <DialogDescription>
            {mandateName} - Click on a candidate to calculate fit score
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left: Candidates List */}
          <div className="w-1/2 flex flex-col">
            <h3 className="text-sm font-semibold mb-2 text-foreground">
              All Candidates ({candidates.length})
            </h3>
            <ScrollArea className="flex-1 border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {candidates.map((candidate) => (
                    <Card
                      key={candidate.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedCandidate === candidate.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleCandidateClick(candidate.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">
                                {candidate.name}
                              </span>
                              <Badge
                                variant={candidate.status === "active" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {candidate.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {candidate.current_title && (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {candidate.current_title}
                                  {candidate.current_firm && ` at ${candidate.current_firm}`}
                                </div>
                              )}
                              {candidate.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {candidate.location}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {candidate.sectors.slice(0, 2).map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-start">
                            {mandateCandidateIds.includes(candidate.id) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="gap-1 text-xs"
                              >
                                <Check className="h-3 w-3" />
                                Added
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={addingToMandate}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToMandate(candidate.id);
                                }}
                                className="gap-1 text-xs"
                              >
                                <Plus className="h-3 w-3" />
                                Add to Project
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Fit Score Details */}
          <div className="w-1/2 flex flex-col">
            <h3 className="text-sm font-semibold mb-2 text-foreground">
              Fit Score Analysis
            </h3>
            <div className="flex-1 border rounded-md p-4">
              {!selectedCandidate ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Select a candidate to see fit score
                </div>
              ) : calculating ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : fitScore && selectedCandidateData ? (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {/* Candidate Header */}
                    <div className="pb-3 border-b">
                      <h4 className="font-semibold text-lg">{selectedCandidateData.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedCandidateData.current_title}
                        {selectedCandidateData.current_firm && ` at ${selectedCandidateData.current_firm}`}
                      </p>
                    </div>

                    {/* Final Score */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Final Fit Score</span>
                      </div>
                      {getFitScoreBadge(fitScore.finalScore)}
                    </div>

                    {/* Dimension Breakdown */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Dimension Breakdown
                      </h5>
                      
                      {Object.entries(fitScore.dimensionScores).map(([key, value]) => {
                        const percentage = value * 100;
                        const weights: Record<string, number> = {
                          sector: 40,
                          function: 25,
                          assetClass: 15,
                          geography: 10,
                          seniority: 10,
                        };
                        const weight = weights[key] || 0;
                        const contribution = (value * weight).toFixed(2);

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize font-medium">{key}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  Weight: {weight}%
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {percentage.toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    percentage >= 75
                                      ? "bg-green-500"
                                      : percentage >= 50
                                      ? "bg-blue-500"
                                      : percentage >= 25
                                      ? "bg-yellow-500"
                                      : "bg-gray-400"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                                +{contribution} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Candidate Details */}
                    <div className="space-y-3 pt-3 border-t">
                      <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Candidate Profile
                      </h5>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Sectors:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedCandidateData.sectors.map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Functions:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedCandidateData.functions.map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Asset Classes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedCandidateData.asset_classes.map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Geographies:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedCandidateData.geographies.map((g, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {g}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
