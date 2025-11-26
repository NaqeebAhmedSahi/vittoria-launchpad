import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import type {
  MandateOutcomeLogResponse,
  OutcomeEvent,
} from "@/types/reliability";

const stageOptions = [
  "round 1",
  "round 2",
  "final",
  "offer",
  "selected",
  "rejected",
] as const;

const resultOptions = ["pass", "fail", "selected", "rejected"] as const;

const formatLabel = (label: string) =>
  label.replace(/\b\w/g, (char) => char.toUpperCase());

const resultColors: Record<string, string> = {
  selected: "bg-emerald-50 text-emerald-700",
  pass: "bg-emerald-50 text-emerald-700",
  fail: "bg-rose-50 text-rose-700",
  rejected: "bg-rose-50 text-rose-700",
  default: "bg-muted text-muted-foreground",
};

export default function MandateOutcomeLog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [data, setData] = useState<MandateOutcomeLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<"all" | OutcomeEvent["stage"]>(
    "all"
  );
  const [resultFilter, setResultFilter] = useState<
    "all" | OutcomeEvent["result"]
  >("all");
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<{
    candidate_id: string;
    stage: OutcomeEvent["stage"];
    result: OutcomeEvent["result"];
    notes: string;
  }>({
    candidate_id: "",
    stage: "round 1",
    result: "pass",
    notes: "",
  });

  const mandateId = Number(id);

  const fetchOutcomeLog = useCallback(async () => {
    if (!mandateId) {
      setError("Invalid mandate id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await window.api.outcome.listByMandate(mandateId);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || "Unable to load mandate outcomes");
      }
    } catch (err) {
      console.error("[MandateOutcomeLog] Failed to load data", err);
      setError("Unable to load mandate outcomes");
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    fetchOutcomeLog();
  }, [fetchOutcomeLog]);

  const candidateMap = useMemo(() => {
    const map = new Map<number, MandateOutcomeLogResponse["candidates"][number]>();
    data?.candidates.forEach((candidate) => {
      map.set(candidate.id, candidate);
    });
    return map;
  }, [data]);

  const filteredOutcomes = useMemo(() => {
    if (!data?.outcomes) return [];
    return data.outcomes
      .filter((outcome) => {
        const matchesStage =
          stageFilter === "all" ? true : outcome.stage === stageFilter;
        const matchesResult =
          resultFilter === "all" ? true : outcome.result === resultFilter;
        return matchesStage && matchesResult;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [data, stageFilter, resultFilter]);

  const totalCandidates = data?.candidates.length ?? 0;
  const totalOutcomes = data?.outcomes.length ?? 0;
  const successCount =
    data?.outcomes.filter(
      (outcome) => outcome.result === "selected" || outcome.result === "pass"
    ).length ?? 0;
  const failCount =
    data?.outcomes.filter(
      (outcome) => outcome.result === "fail" || outcome.result === "rejected"
    ).length ?? 0;
  const successRate =
    totalOutcomes === 0 ? 0 : Math.round((successCount / totalOutcomes) * 100);

  const candidateProgress = useMemo(() => {
    if (!data) return [];
    return data.candidates.map((candidate) => {
      const events = data.outcomes
        .filter((outcome) => outcome.candidate_id === candidate.id)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      return { candidate, events };
    });
  }, [data]);

  const handleRefresh = () => {
    fetchOutcomeLog();
  };

  const handleOpenLogDialog = () => {
    if (!data || data.candidates.length === 0) {
      toast({
        title: "No candidates available",
        description: "Add candidates to this mandate before logging outcomes.",
        variant: "destructive",
      });
      return;
    }

    setFormValues({
      candidate_id: data?.candidates[0]?.id?.toString() || "",
      stage: "round 1",
      result: "pass",
      notes: "",
    });
    setLogDialogOpen(true);
  };

  const handleSaveOutcome = async () => {
    if (!mandateId || !formValues.candidate_id) {
      toast({
        title: "Missing information",
        description: "Please select a candidate to log an outcome.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        candidate_id: Number(formValues.candidate_id),
        mandate_id: mandateId,
        stage: formValues.stage,
        result: formValues.result,
        notes: formValues.notes?.trim() || undefined,
      };
      const response = await window.api.outcome.create(payload);
      if (!response.success) {
        throw new Error(response.error || "Failed to log outcome");
      }
      toast({
        title: "Outcome recorded",
        description: "Candidate progression has been updated.",
      });
      setLogDialogOpen(false);
      setFormValues({
        candidate_id: data?.candidates[0]?.id?.toString() || "",
        stage: "round 1",
        result: "pass",
        notes: "",
      });
      fetchOutcomeLog();
    } catch (err) {
      console.error("[MandateOutcomeLog] Unable to save outcome", err);
      toast({
        title: "Error recording outcome",
        description:
          err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-muted-foreground">Loading mandate outcomes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3 text-center">
        <p className="text-lg font-medium text-destructive">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No outcome data found for this mandate.
        </p>
        <Button variant="ghost" onClick={() => navigate("/mandates")}>
          Back to mandates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/mandates")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to mandates
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {data.mandate.title || `Mandate #${data.mandate.id}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Outcome log · {data.mandate.location} · Created{" "}
              {new Date(data.mandate.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            className="gap-2"
            onClick={handleOpenLogDialog}
            disabled={!data || data.candidates.length === 0}
          >
            <Plus className="h-4 w-4" />
            Log outcome
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Candidates engaged</CardDescription>
            <CardTitle className="text-3xl">{totalCandidates}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Candidates with at least one recorded outcome.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total outcomes logged</CardDescription>
            <CardTitle className="text-3xl">{totalOutcomes}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Interviews, offers, or decisions recorded for this search.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success rate</CardDescription>
            <CardTitle className="text-3xl">{successRate}%</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Percentage of outcomes marked as pass or selected.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pass / Fail</CardDescription>
            <CardTitle className="text-3xl">
              {successCount}/{failCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Successful vs unsuccessful outcomes logged to date.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate progression</CardTitle>
          <CardDescription>
            Each candidate&apos;s interview journey and final outcome.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidateProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidates have recorded outcomes yet.
            </p>
          ) : (
            candidateProgress.map(({ candidate, events }) => (
              <div
                key={candidate.id}
                className="rounded-lg border border-dashed border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{candidate.name}</p>
                    {candidate.current_role && (
                      <p className="text-xs text-muted-foreground">
                        {candidate.current_role}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {events.length} {events.length === 1 ? "event" : "events"}
                  </Badge>
                </div>
                {events.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No outcomes logged yet.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {events.map((event) => {
                      const resultClass =
                        resultColors[event.result] || resultColors.default;
                      return (
                        <div
                          key={event.id}
                          className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
                        >
                          <p className="font-medium">
                            {formatLabel(event.stage)}
                          </p>
                          <p
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${resultClass}`}
                          >
                            {formatLabel(event.result)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(event.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 flex-col">
              <CardTitle>Outcome timeline</CardTitle>
              <CardDescription>
                Track every decision point recorded for this mandate.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={stageFilter}
                onValueChange={(value) =>
                  setStageFilter(value as typeof stageFilter)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {formatLabel(stage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={resultFilter}
                onValueChange={(value) =>
                  setResultFilter(value as typeof resultFilter)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  {resultOptions.map((result) => (
                    <SelectItem key={result} value={result}>
                      {formatLabel(result)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredOutcomes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No outcomes recorded yet with the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutcomes.map((outcome) => {
                    const candidate = candidateMap.get(outcome.candidate_id);
                    const resultClass =
                      resultColors[outcome.result] || resultColors.default;

                    return (
                      <TableRow key={outcome.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(outcome.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {candidate?.name || `Candidate ${outcome.candidate_id}`}
                          </div>
                          {candidate?.current_role && (
                            <div className="text-xs text-muted-foreground">
                              {candidate.current_role}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatLabel(outcome.stage)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultClass}`}
                          >
                            {formatLabel(outcome.result)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md text-sm text-muted-foreground">
                          {outcome.notes || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log outcome event</DialogTitle>
            <DialogDescription>
              Capture interview progress, pass/fail decisions, or final selections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate</Label>
              <Select
                value={formValues.candidate_id}
                onValueChange={(val) =>
                  setFormValues((prev) => ({ ...prev, candidate_id: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {data?.candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id.toString()}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={formValues.stage}
                  onValueChange={(val) =>
                    setFormValues((prev) => ({
                      ...prev,
                      stage: val as OutcomeEvent["stage"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {formatLabel(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Result</Label>
                <Select
                  value={formValues.result}
                  onValueChange={(val) =>
                    setFormValues((prev) => ({
                      ...prev,
                      result: val as OutcomeEvent["result"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                  <SelectContent>
                    {resultOptions.map((result) => (
                      <SelectItem key={result} value={result}>
                        {formatLabel(result)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome-notes">Notes (optional)</Label>
              <Textarea
                id="outcome-notes"
                placeholder="Add context, interviewer feedback, or next steps..."
                value={formValues.notes}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setLogDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveOutcome} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


