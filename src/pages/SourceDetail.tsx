import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mail, Building2, MapPin, Calendar, Loader2 } from "lucide-react";
import {
  formatSimilarityScore,
  getSimilarityScoreBadgeColor,
} from "@/mocks/similarityData";

export default function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sourceDetail, setSourceDetail] = useState<any>(null);

  useEffect(() => {
    const fetchSource = async () => {
      if (!id) return;
      
      try {
        const result = await window.api.source.getById(parseInt(id));
        if (result.success && result.source) {
          // Parse JSON fields
          const source = {
            ...result.source,
            sectors: Array.isArray(result.source.sectors) 
              ? result.source.sectors 
              : JSON.parse(result.source.sectors || '[]'),
            geographies: Array.isArray(result.source.geographies)
              ? result.source.geographies
              : JSON.parse(result.source.geographies || '[]')
          };
          
          setSourceDetail({
            source,
            similarity_profile: null, // Will be calculated in future
            org_pattern: result.org_pattern,
            interaction_history: [] // Will be added when we implement recommendation tracking
          });
        }
      } catch (error) {
        console.error("Error fetching source:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSource();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sourceDetail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/sources")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sources
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Source not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { source, similarity_profile, org_pattern, interaction_history } = sourceDetail;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case "insight_viewed":
        return "Insight Viewed";
      case "used_in_shortlist":
        return "Used in Shortlist";
      case "used_in_final_decision":
        return "Final Decision";
      default:
        return eventType;
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case "insight_viewed":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "used_in_shortlist":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
      case "used_in_final_decision":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/sources")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sources
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Source Info */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{source.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  {source.organisation}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Role
                </div>
                <Badge variant="outline">{source.role}</Badge>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Seniority Level
                </div>
                <Badge variant="secondary">{source.seniority_level}</Badge>
              </div>

              {source.email && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Contact
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${source.email}`} className="text-blue-600 hover:underline">
                      {source.email}
                    </a>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Sectors
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {source.sectors.map((sector) => (
                    <Badge key={sector} variant="secondary" className="text-xs">
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Geographies
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {source.geographies.map((geo) => (
                    <Badge key={geo} variant="outline" className="text-xs">
                      {geo}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Added {formatDate(source.created_at)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Similarity & History */}
        <div className="md:col-span-2 space-y-6">
          {/* Similarity Score */}
          {similarity_profile && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Similarity Score</CardTitle>
                  <Badge
                    variant="outline"
                    className={`${getSimilarityScoreBadgeColor(similarity_profile.similarity_score)} text-lg font-bold px-4 py-1`}
                  >
                    {formatSimilarityScore(similarity_profile.similarity_score)}
                  </Badge>
                </div>
                <CardDescription>
                  How well this source aligns with your organization's historical pattern
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Component Breakdown */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Role Similarity</span>
                      <span className="text-muted-foreground">
                        {formatSimilarityScore(similarity_profile.components.role_similarity)}
                      </span>
                    </div>
                    <Progress value={similarity_profile.components.role_similarity * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Industry Similarity</span>
                      <span className="text-muted-foreground">
                        {formatSimilarityScore(similarity_profile.components.industry_similarity)}
                      </span>
                    </div>
                    <Progress value={similarity_profile.components.industry_similarity * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Pattern Similarity</span>
                      <span className="text-muted-foreground">
                        {formatSimilarityScore(similarity_profile.components.pattern_similarity)}
                      </span>
                    </div>
                    <Progress value={similarity_profile.components.pattern_similarity * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Interaction Similarity</span>
                      <span className="text-muted-foreground">
                        {formatSimilarityScore(similarity_profile.components.interaction_similarity)}
                      </span>
                    </div>
                    <Progress value={similarity_profile.components.interaction_similarity * 100} className="h-2" />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Last calculated {formatDate(similarity_profile.last_calculated_at)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Interaction History</CardTitle>
              <CardDescription>
                {interaction_history.length > 0
                  ? `${interaction_history.length} interactions recorded`
                  : "No interactions recorded yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interaction_history.length > 0 ? (
                <div className="space-y-3">
                  {interaction_history.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/admin/mandates/${interaction.mandate_id}/similarity`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1 truncate">
                            {interaction.mandate_title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(interaction.timestamp)}
                          </div>
                        </div>
                        <Badge variant="outline" className={`${getEventTypeBadge(interaction.event_type)} text-xs whitespace-nowrap`}>
                          {getEventTypeLabel(interaction.event_type)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No interactions recorded yet. This source's similarity score will improve as they
                  contribute to mandates.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Org Pattern Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Pattern Context</CardTitle>
              <CardDescription>
                How this source compares to your organization's typical profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Total Sources</div>
                  <div className="text-2xl font-semibold">
                    {org_pattern.interaction_stats.total_sources}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Total Interactions</div>
                  <div className="text-2xl font-semibold">
                    {org_pattern.interaction_stats.total_interactions}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/admin/similarity/org-pattern")}
              >
                View Full Organization Pattern
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
