import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  Shield,
  ArrowUpDown,
  FileText,
  Sparkles
} from "lucide-react";
import {
  buildExpertiseRanking,
  buildSimilarityRanking,
  compareRankings,
  buildCounterfactualExplanation,
  buildSourceAttributionTags,
  buildBiasWatchSummary,
  exportBiasSummaryAsJson,
  generateMockCandidates,
  generateMockWeeklyDecisions,
  mockMandateLookup,
  type CandidateWithSources,
  type RankingResult,
  type BiasRankingComparison,
  type CounterfactualExplanation,
  type BiasWatchSummary,
} from "@/services/biasAwareReasoningEngine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BiasAwareDemo() {
  const [selectedMandate, setSelectedMandate] = useState("mandate-1");

  // Generate mock data
  const mockCandidates = useMemo(
    () => generateMockCandidates(selectedMandate, 10),
    [selectedMandate]
  );

  const expertiseRanking = useMemo(
    () => buildExpertiseRanking(mockCandidates),
    [mockCandidates]
  );

  const similarityRanking = useMemo(
    () => buildSimilarityRanking(mockCandidates),
    [mockCandidates]
  );

  const comparison = useMemo(
    () => compareRankings(expertiseRanking, similarityRanking),
    [expertiseRanking, similarityRanking]
  );

  const counterfactual = useMemo(
    () => buildCounterfactualExplanation(selectedMandate, mockCandidates, 5),
    [selectedMandate, mockCandidates]
  );

  const weeklyDecisions = useMemo(
    () => generateMockWeeklyDecisions("2025-W47", 8),
    []
  );

  const biasSummary = useMemo(
    () => buildBiasWatchSummary("2025-W47", weeklyDecisions, mockMandateLookup),
    [weeklyDecisions]
  );

  const handleExportSummary = () => {
    exportBiasSummaryAsJson(biasSummary);
  };

  const getBiasRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getRankDifference = (candidateId: string): number => {
    const expertiseRank = expertiseRanking.find(r => r.candidateId === candidateId)?.rank || 0;
    const similarityRank = similarityRanking.find(r => r.candidateId === candidateId)?.rank || 0;
    return similarityRank - expertiseRank;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Bias-Aware Intelligence Engine
          </h1>
          <p className="text-muted-foreground mt-2">
            Transparent, expertise-led candidate ranking with similarity bias detection
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Demo Mode
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Divergence Score</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comparison.divergenceScore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {comparison.divergenceScore < 1 ? "Low bias risk" : comparison.divergenceScore < 2 ? "Moderate risk" : "High risk"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates Analyzed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCandidates.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockCandidates.filter(c => c.sources.length >= 3).length} with 3+ sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Bias Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{biasSummary.highBiasEventCount}</div>
            <p className="text-xs text-muted-foreground">This week (W47)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Divergence</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{biasSummary.avgDivergenceScore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across all mandates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings">Candidate Rankings</TabsTrigger>
          <TabsTrigger value="counterfactual">Counterfactual Analysis</TabsTrigger>
          <TabsTrigger value="sources">Source Attribution</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Bias Watch</TabsTrigger>
        </TabsList>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Expertise-led ranking</strong> prioritizes demonstrable skills and experience.
              <strong> Similarity ranking</strong> shows what would happen if we ranked by affinity/familiarity alone.
              The divergence score measures how different these two approaches are.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Expertise Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Expertise-Led Ranking
                </CardTitle>
                <CardDescription>
                  Our recommended ranking based on expertise, reliability, and controlled similarity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Bias Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expertiseRanking.slice(0, 10).map((result) => {
                      const candidate = mockCandidates.find(c => c.id === result.candidateId);
                      const rankDiff = getRankDifference(result.candidateId);
                      return (
                        <TableRow key={result.candidateId}>
                          <TableCell className="font-medium">
                            #{result.rank}
                            {Math.abs(rankDiff) > 2 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="ml-1 text-xs">
                                      {rankDiff > 0 ? `+${rankDiff}` : rankDiff}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Rank difference vs similarity ranking
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell>{candidate?.name || "Unknown"}</TableCell>
                          <TableCell className="text-right">
                            {(result.compositeScore * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge className={getBiasRiskColor(result.biasRiskLevel)}>
                              {result.biasRiskLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Similarity Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Similarity-Led Ranking
                </CardTitle>
                <CardDescription>
                  How rankings would change if we prioritized affinity/familiarity signals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead className="text-right">Similarity</TableHead>
                      <TableHead>Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {similarityRanking.slice(0, 10).map((result) => {
                      const candidate = mockCandidates.find(c => c.id === result.candidateId);
                      const rankDiff = -getRankDifference(result.candidateId);
                      return (
                        <TableRow key={result.candidateId}>
                          <TableCell className="font-medium">#{result.rank}</TableCell>
                          <TableCell>{candidate?.name || "Unknown"}</TableCell>
                          <TableCell className="text-right">
                            {(result.similarityScore * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            {rankDiff === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : rankDiff > 0 ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                ↑ {rankDiff}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                ↓ {Math.abs(rankDiff)}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Counterfactual Tab */}
        <TabsContent value="counterfactual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Counterfactual Explanation</CardTitle>
              <CardDescription>
                Understanding how similarity bias could change decision-making
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">AI-Generated Explanation:</div>
                  <p className="text-sm">{counterfactual.explanation}</p>
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Top 5 (Expertise-Led)</h3>
                  <div className="space-y-2">
                    {counterfactual.expertiseTop.map((result, idx) => {
                      const candidate = mockCandidates.find(c => c.id === result.candidateId);
                      return (
                        <div
                          key={result.candidateId}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-lg">#{idx + 1}</div>
                            <div>
                              <div className="font-medium">{candidate?.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Score: {(result.compositeScore * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <Badge className={getBiasRiskColor(result.biasRiskLevel)}>
                            {result.biasRiskLevel}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Top 5 (Similarity-Led)</h3>
                  <div className="space-y-2">
                    {counterfactual.similarityTop.map((result, idx) => {
                      const candidate = mockCandidates.find(c => c.id === result.candidateId);
                      return (
                        <div
                          key={result.candidateId}
                          className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-lg">#{idx + 1}</div>
                            <div>
                              <div className="font-medium">{candidate?.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Similarity: {(result.similarityScore * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Attribution Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source Attribution & Transparency</CardTitle>
              <CardDescription>
                See which sources contributed to each candidate's scores and their reasoning basis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCandidates.slice(0, 5).map((candidate) => {
                  const tags = buildSourceAttributionTags(candidate);
                  return (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{candidate.name}</h3>
                        <Badge variant="outline">
                          {tags.length} source{tags.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <TooltipProvider key={tag.sourceId}>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  variant="outline"
                                  className={
                                    tag.reasoningBasis === "expertise-led"
                                      ? "bg-green-50 border-green-200"
                                      : tag.reasoningBasis === "mixed"
                                      ? "bg-blue-50 border-blue-200"
                                      : "bg-yellow-50 border-yellow-200"
                                  }
                                >
                                  {tag.label}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <div className="font-semibold">
                                    Reasoning: {tag.reasoningBasis}
                                  </div>
                                  <div className="text-xs space-y-0.5">
                                    <div>Expertise: {(tag.expertiseScore * 100).toFixed(0)}%</div>
                                    <div>Similarity: {(tag.similarityScore * 100).toFixed(0)}%</div>
                                    <div>Reliability: {(tag.reliabilityScore * 100).toFixed(0)}%</div>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Bias Watch Tab */}
        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Bias Watch - {biasSummary.weekId}</CardTitle>
                  <CardDescription>
                    Aggregated bias metrics and actionable insights across all mandates
                  </CardDescription>
                </div>
                <Button onClick={handleExportSummary} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Most Affected Mandates */}
              <div>
                <h3 className="font-semibold mb-3">Most Affected Mandates</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mandate</TableHead>
                      <TableHead className="text-right">High Bias Events</TableHead>
                      <TableHead className="text-right">Avg Divergence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {biasSummary.mostAffectedMandates.map((mandate) => (
                      <TableRow key={mandate.mandateId}>
                        <TableCell className="font-medium">{mandate.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{mandate.highBiasEvents}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {mandate.avgDivergence.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Source Type Stats */}
              <div>
                <h3 className="font-semibold mb-3">Source Type Analysis</h3>
                <div className="space-y-3">
                  {biasSummary.sourceTypeStats.map((stat) => (
                    <Alert key={stat.sourceType}>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">
                            {stat.sourceType.replace("_", " ")}
                          </span>
                          <Badge variant="outline">
                            {stat.similarityHeavyCount} similarity-heavy
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{stat.comment}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
