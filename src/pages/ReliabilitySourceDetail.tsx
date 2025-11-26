import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/StatusChip";
import type { SourceReliabilityDetailResponse } from "@/types/reliability";
import { useToast } from "@/hooks/use-toast";

const formatPercent = (value?: number) => (value !== undefined ? `${(value * 100).toFixed(0)}%` : "—");

const DetailSkeleton = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export default function ReliabilitySourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [detail, setDetail] = useState<SourceReliabilityDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    const sourceId = id ? Number(id) : null;
    if (!sourceId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        const response = await window.api.reliability.getSourceDetail(sourceId);
        if (!mounted) return;
        if (response.success && response.detail) {
          setDetail(response.detail);
        } else {
          setNotFound(true);
        }
      } catch (error: any) {
        console.error("Failed to load reliability detail", error);
        toast({
          title: "Unable to load reliability detail",
          description: error?.message || "Check your database connection and try again.",
          variant: "destructive",
        });
        setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      mounted = false;
    };
  }, [id, toast]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (notFound || !detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/reliability")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to overview
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Source not found</CardContent>
        </Card>
      </div>
    );
  }

  const { source, reliability_profile, recent_recommendations } = detail;

  if (!reliability_profile) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/reliability")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to overview
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{source.name}</CardTitle>
            <CardDescription>No recommendations logged for this source yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/reliability")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to overview
      </Button>

      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source detail</p>
          <h1 className="text-2xl font-semibold text-foreground">{source.name}</h1>
          <p className="text-sm text-muted-foreground">
            {source.role} • {source.organisation}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {source.sectors.map((sector) => (
              <Badge key={sector} variant="outline">
                {sector}
              </Badge>
            ))}
            {source.geographies.map((geo) => (
              <Badge key={geo} variant="secondary">
                {geo}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Last calculated</p>
          <p className="font-medium">{new Date(reliability_profile.last_calculated_at).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {reliability_profile.evaluated_recommendations} evaluated recommendations
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Reliability score</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(reliability_profile.reliability_score)}</CardTitle>
            <StatusChip
              status="Composite"
              variant={
                reliability_profile.reliability_score >= 0.8
                  ? "success"
                  : reliability_profile.reliability_score >= 0.6
                    ? "warning"
                    : "destructive"
              }
            />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Accuracy</CardDescription>
            <CardTitle className="text-2xl">{formatPercent(reliability_profile.components.accuracy)}</CardTitle>
            <p className="text-xs text-muted-foreground">correct ÷ total</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Consistency</CardDescription>
            <CardTitle className="text-2xl">{formatPercent(reliability_profile.components.consistency)}</CardTitle>
            <p className="text-xs text-muted-foreground">1 − contradictions ÷ total</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Impact</CardDescription>
            <CardTitle className="text-2xl">{formatPercent(reliability_profile.components.impact)}</CardTitle>
            <p className="text-xs text-muted-foreground">material influence ratio</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent recommendation trail</CardTitle>
          <CardDescription>Recommendation strength joined with observed outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recent_recommendations.length === 0 && (
            <div className="text-sm text-muted-foreground">No recommendations recorded for this source yet.</div>
          )}
          {recent_recommendations.map(({ recommendation, candidate, outcome_summary }) => (
            <div
              key={recommendation.id}
              className="rounded-lg border p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{candidate.name}</p>
                  <p className="text-xs text-muted-foreground">{candidate.current_role}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {recommendation.strength}
                </Badge>
              </div>
              {recommendation.comment && (
                <p className="mt-3 text-sm text-muted-foreground">“{recommendation.comment}”</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Outcome: {outcome_summary}</span>
                <span>{new Date(recommendation.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

