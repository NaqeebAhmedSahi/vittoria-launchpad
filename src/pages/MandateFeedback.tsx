import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecommendationStrength } from "@/types/similarity";

type CandidateFeedbackDraft = {
  sourceId: number | null;
  strength: RecommendationStrength;
  comment: string;
};

type RecordedFeedback = {
  id: number;
  candidate_id: number;
  source_id: number;
  source_name: string;
  mandate_id: number;
  strength: RecommendationStrength;
  comment?: string;
  created_at: string;
};

export default function MandateFeedback() {
  const { id } = useParams<{ id: string }>();
  const mandateId = id ? parseInt(id) : null;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [mandate, setMandate] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<number, CandidateFeedbackDraft>>({});
  const [records, setRecords] = useState<RecordedFeedback[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!mandateId) return;

      try {
        // Fetch mandate details
        const mandateResult = await window.api.mandate.getById(mandateId);
        if (mandateResult.success && mandateResult.mandate) {
          setMandate(mandateResult.mandate);

          // Parse candidate_ids from mandate
          const candidateIds = Array.isArray(mandateResult.mandate.candidate_ids)
            ? mandateResult.mandate.candidate_ids
            : JSON.parse(mandateResult.mandate.candidate_ids || '[]');

          // Fetch candidates
          if (candidateIds.length > 0) {
            const candidatePromises = candidateIds.map((cid: number) => 
              window.api.candidate.getById(cid)
            );
            const candidateResults = await Promise.all(candidatePromises);
            const fetchedCandidates = candidateResults
              .filter(r => r !== null)
              .map(c => c);
            
            setCandidates(fetchedCandidates);

            // Initialize drafts
            const initialDrafts: Record<number, CandidateFeedbackDraft> = {};
            fetchedCandidates.forEach(c => {
              initialDrafts[c.id] = { sourceId: null, strength: "neutral", comment: "" };
            });
            setDrafts(initialDrafts);
          }
        }

        // Fetch sources
        const sourcesResult = await window.api.source.list();
        if (sourcesResult.success) {
          const parsed = sourcesResult.sources.map((s: any) => ({
            ...s,
            sectors: Array.isArray(s.sectors) ? s.sectors : JSON.parse(s.sectors || '[]'),
            geographies: Array.isArray(s.geographies) ? s.geographies : JSON.parse(s.geographies || '[]')
          }));
          setSources(parsed);
        }

        // Fetch existing recommendations
        const recommendationsResult = await window.api.recommendation.listByMandate(mandateId);
        if (recommendationsResult.success) {
          setRecords(recommendationsResult.recommendations);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mandateId, toast]);

  const updateDraft = (candidateId: number, patch: Partial<CandidateFeedbackDraft>) => {
    setDrafts((prev) => ({ ...prev, [candidateId]: { ...prev[candidateId], ...patch } }));
  };

  const addFeedback = async (candidateId: number) => {
    if (!mandateId) return;
    
    const draft = drafts[candidateId];
    if (!draft?.sourceId) {
      toast({ title: "Select a source", description: "Please choose a source to attribute.", variant: "destructive" });
      return;
    }

    try {
      const result = await window.api.recommendation.create({
        source_id: draft.sourceId,
        candidate_id: candidateId,
        mandate_id: mandateId,
        strength: draft.strength,
        comment: draft.comment?.trim() || undefined
      });

      if (result.success) {
        // Refresh recommendations
        const recommendationsResult = await window.api.recommendation.listByMandate(mandateId);
        if (recommendationsResult.success) {
          setRecords(recommendationsResult.recommendations);
        }

        // Reset draft (keep last selected source for convenience)
        setDrafts((prev) => ({
          ...prev,
          [candidateId]: { sourceId: draft.sourceId, strength: "neutral", comment: "" },
        }));

        toast({ title: "Feedback added", description: "Source recommendation recorded for this candidate." });
      } else {
        toast({ title: "Error", description: result.error || "Failed to add feedback", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add feedback", variant: "destructive" });
    }
  };

  const getStrengthBadge = (str: RecommendationStrength) => {
    switch (str) {
      case "strong":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "neutral":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "weak":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mandate) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/mandates")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mandates
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Mandate not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/mandates")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mandates
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mandate Feedback / Source Attribution</h1>
          <p className="text-sm text-muted-foreground mt-1">{mandate.name}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No candidates added to this mandate yet.</p>
            <Button className="mt-4" onClick={() => navigate("/mandates")}>
              Go to Mandates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/mandates")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Mandates
      </Button>

      {/* Mandate Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mandate Feedback / Source Attribution</h1>
        <p className="text-sm text-muted-foreground mt-1">{mandate.name}</p>
      </div>

      {/* Candidate list with per-candidate feedback forms */}
      <div className="space-y-4">
        {candidates.map((cand) => {
          const draft = drafts[cand.id];
          const source = sources.find((s) => s.id === draft?.sourceId);
          const candidateRecords = records.filter((r) => r.candidate_id === cand.id);

          return (
            <Card key={cand.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{cand.name}</CardTitle>
                    <CardDescription>
                      {cand.title} {cand.firm ? `• ${cand.firm}` : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feedback controls */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Source select */}
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={draft?.sourceId ? String(draft.sourceId) : ""}
                      onValueChange={(val) => updateDraft(cand.id, { sourceId: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            <div className="flex items-center gap-2">
                              <span>{s.name}</span>
                              <span className="text-xs text-muted-foreground">• {s.role} at {s.organisation}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {source && (
                      <div className="text-xs text-muted-foreground">
                        Selected: {source.name} ({source.role})
                      </div>
                    )}
                  </div>

                  {/* Strength selector */}
                  <div className="space-y-2">
                    <Label>Strength</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["strong", "neutral", "weak"] as RecommendationStrength[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateDraft(cand.id, { strength: s })}
                          className={`p-3 rounded-md border text-sm ${
                            draft?.strength === s ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Badge variant="outline" className={`${getStrengthBadge(s)} mb-1`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Badge>
                          <div className="text-[11px] text-muted-foreground">
                            {s === "strong" && "Highly recommended"}
                            {s === "neutral" && "Solid recommendation"}
                            {s === "weak" && "Some reservations"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-2 md:col-span-1">
                    <Label>Comment (optional)</Label>
                    <Textarea
                      rows={3}
                      placeholder="Add context for this recommendation..."
                      value={draft?.comment || ""}
                      onChange={(e) => updateDraft(cand.id, { comment: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => addFeedback(cand.id)}>
                    <Save className="h-4 w-4 mr-2" />
                    Add feedback
                  </Button>
                </div>

                {/* Existing feedback list for this candidate */}
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Feedback / Recommendations
                  </div>
                  {candidateRecords.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No feedback recorded yet</div>
                  ) : (
                    <div className="space-y-2">
                      {candidateRecords.map((r) => {
                        return (
                          <div key={r.id} className="p-3 rounded-lg bg-muted/50 flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-muted-foreground mt-1">Date: {formatDate(r.created_at)}</div>
                              <div className="text-sm font-medium">Source: {r.source_name}</div>
                              {r.comment && (
                                <div className="text-sm text-muted-foreground mt-1 break-words">
                                  Comment: {r.comment}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline" className={`${getStrengthBadge(r.strength)} text-xs whitespace-nowrap`}>
                                {r.strength.charAt(0).toUpperCase() + r.strength.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
