import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Users, TrendingUp } from "lucide-react";
import {
  getMockMandateSimilarityContext,
  formatSimilarityScore,
  getSimilarityScoreBadgeColor,
} from "@/mocks/similarityData";

export default function MandateSimilarityDebug() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const context = id ? getMockMandateSimilarityContext(id) : null;

  if (!context) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const avgSimilarity =
    context.sources.reduce((sum, s) => sum + s.similarity_profile.similarity_score, 0) /
    context.sources.length;

  const sourcesInShortlist = context.sources.filter((s) => s.used_in_shortlist).length;
  const sourcesInFinal = context.sources.filter((s) => s.used_in_final_decision).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/mandates")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Mandates
      </Button>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mandate Similarity Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">{context.mandate_title}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{context.sources.length}</div>
            <p className="text-xs text-muted-foreground">Contributing sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Similarity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSimilarityScore(avgSimilarity)}</div>
            <p className="text-xs text-muted-foreground">Average score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Shortlist</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sourcesInShortlist}</div>
            <p className="text-xs text-muted-foreground">Used in shortlist</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Final Decision</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sourcesInFinal}</div>
            <p className="text-xs text-muted-foreground">Final decision</p>
          </CardContent>
        </Card>
      </div>

      {/* Source List */}
      <Card>
        <CardHeader>
          <CardTitle>Sources Contributing to This Mandate</CardTitle>
          <CardDescription>
            Detailed similarity breakdown for each source involved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {context.sources.map((item) => (
              <div
                key={item.source.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/admin/sources/${item.source.id}`)}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">{item.source.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {item.source.role} at {item.source.organisation}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.source.sectors.slice(0, 3).map((sector) => (
                        <Badge key={sector} variant="secondary" className="text-xs">
                          {sector}
                        </Badge>
                      ))}
                      {item.used_in_final_decision && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          Final Decision
                        </Badge>
                      )}
                      {item.used_in_shortlist && !item.used_in_final_decision && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                          Shortlist
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${getSimilarityScoreBadgeColor(item.similarity_profile.similarity_score)} text-lg font-bold px-4 py-2`}
                  >
                    {formatSimilarityScore(item.similarity_profile.similarity_score)}
                  </Badge>
                </div>

                {/* Similarity Components */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Role Similarity</span>
                        <span className="font-medium">
                          {formatSimilarityScore(item.similarity_profile.components.role_similarity)}
                        </span>
                      </div>
                      <Progress value={item.similarity_profile.components.role_similarity * 100} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Industry</span>
                        <span className="font-medium">
                          {formatSimilarityScore(item.similarity_profile.components.industry_similarity)}
                        </span>
                      </div>
                      <Progress value={item.similarity_profile.components.industry_similarity * 100} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Pattern</span>
                        <span className="font-medium">
                          {formatSimilarityScore(item.similarity_profile.components.pattern_similarity)}
                        </span>
                      </div>
                      <Progress value={item.similarity_profile.components.pattern_similarity * 100} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Interaction</span>
                        <span className="font-medium">
                          {formatSimilarityScore(item.similarity_profile.components.interaction_similarity)}
                        </span>
                      </div>
                      <Progress value={item.similarity_profile.components.interaction_similarity * 100} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Mandate ID: {context.mandate_id}</span>
            <span>Created: {formatDate(context.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
