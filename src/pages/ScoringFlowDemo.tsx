import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  Info,
  BarChart3,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  generateTestCandidates,
  getCandidateRankingForMandate,
  getScoreBreakdownForCandidate,
  type CandidateContext,
  type CandidateScoreSummary,
} from "@/services/biasAwareScoringFlow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ScoringFlowDemo() {
  const [selectedMandate] = useState("mandate-test-1");

  // Generate test data
  const testCandidates = useMemo(
    () => generateTestCandidates(selectedMandate, 12),
    [selectedMandate]
  );

  // Get both rankings
  const { expertiseLed, similarityLed } = useMemo(
    () => getCandidateRankingForMandate(selectedMandate, testCandidates),
    [selectedMandate, testCandidates]
  );

  // Calculate divergence metrics
  const divergenceMetrics = useMemo(() => {
    const expertiseMap = new Map(expertiseLed.map((c, idx) => [c.candidateId, idx + 1]));
    const similarityMap = new Map(similarityLed.map((c, idx) => [c.candidateId, idx + 1]));

    let totalDiff = 0;
    let maxDiff = 0;
    let count = 0;

    expertiseLed.forEach((candidate) => {
      const expertiseRank = expertiseMap.get(candidate.candidateId) || 0;
      const similarityRank = similarityMap.get(candidate.candidateId) || 0;
      const diff = Math.abs(expertiseRank - similarityRank);
      totalDiff += diff;
      maxDiff = Math.max(maxDiff, diff);
      count++;
    });

    const avgDivergence = count > 0 ? totalDiff / count : 0;
    const biasRisk = avgDivergence < 1.5 ? "low" : avgDivergence < 3 ? "medium" : "high";

    return { avgDivergence, maxDiff, biasRisk };
  }, [expertiseLed, similarityLed]);

  const getRankChange = (candidateId: string): number => {
    const expertiseRank = expertiseLed.findIndex(c => c.candidateId === candidateId) + 1;
    const similarityRank = similarityLed.findIndex(c => c.candidateId === candidateId) + 1;
    return similarityRank - expertiseRank;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getBiasRiskBadge = (expertiseScore: number, similarityScore: number) => {
    const diff = similarityScore - expertiseScore;
    if (diff <= 0.05) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Low Risk</Badge>;
    } else if (diff <= 0.15) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-200">High Risk</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Three-Score Bias-Aware Ranking
          </h1>
          <p className="text-muted-foreground mt-2">
            Expertise • Similarity • Source Reliability
          </p>
        </div>
        <Badge variant="outline" className="gap-1 px-3 py-1">
          <BarChart3 className="h-3 w-3" />
          Live Demo
        </Badge>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testCandidates.length}</div>
            <p className="text-xs text-muted-foreground">Analyzed with {testCandidates.reduce((sum, c) => sum + c.sources.length, 0)} sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Divergence</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{divergenceMetrics.avgDivergence.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Positions between rankings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Rank Jump</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{divergenceMetrics.maxDiff}</div>
            <p className="text-xs text-muted-foreground">Largest position change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bias Risk</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{divergenceMetrics.biasRisk}</div>
            <p className="text-xs text-muted-foreground">Overall assessment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings">Dual Rankings</TabsTrigger>
          <TabsTrigger value="breakdown">Score Breakdown</TabsTrigger>
          <TabsTrigger value="about">About Three Scores</TabsTrigger>
        </TabsList>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Expertise-Led</strong> (left) is our recommended ranking using all three scores with expertise dominant.
              <strong> Similarity-Only</strong> (right) shows what happens if we rank by affinity alone—this reveals potential bias.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Expertise-Led Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Expertise-Led Ranking
                </CardTitle>
                <CardDescription>Balanced composite score (recommended)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expertiseLed.map((candidate, idx) => {
                      const rankChange = getRankChange(candidate.candidateId);
                      return (
                        <TableRow key={candidate.candidateId}>
                          <TableCell className="font-medium">
                            #{idx + 1}
                          </TableCell>
                          <TableCell>
                            <div>{candidate.name}</div>
                            {Math.abs(rankChange) > 2 && (
                              <div className="text-xs text-muted-foreground">
                                {rankChange > 0 ? `↓ ${rankChange}` : `↑ ${Math.abs(rankChange)}`} vs similarity
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className={getScoreColor(candidate.compositeScore)}>
                                    {(candidate.compositeScore * 100).toFixed(0)}%
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div>Base Match: {(candidate.baseMatchScore * 100).toFixed(0)}%</div>
                                    <div>Expertise: {(candidate.avgExpertiseScore * 100).toFixed(0)}%</div>
                                    <div>Similarity: {(candidate.avgSimilarityScore * 100).toFixed(0)}%</div>
                                    <div>Reliability: {(candidate.avgReliabilityScore * 100).toFixed(0)}%</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            {getBiasRiskBadge(candidate.avgExpertiseScore, candidate.avgSimilarityScore)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Similarity-Only Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-yellow-600" />
                  Similarity-Only Ranking
                </CardTitle>
                <CardDescription>Affinity-based (for comparison only)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead className="text-right">Similarity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {similarityLed.map((candidate, idx) => {
                      const expertiseRank = expertiseLed.findIndex(c => c.candidateId === candidate.candidateId) + 1;
                      const rankChange = expertiseRank - (idx + 1);
                      return (
                        <TableRow key={candidate.candidateId}>
                          <TableCell className="font-medium">#{idx + 1}</TableCell>
                          <TableCell>
                            <div>{candidate.name}</div>
                            {Math.abs(rankChange) > 2 && (
                              <div className="text-xs text-yellow-600">
                                Was #{expertiseRank} in expertise ranking
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(candidate.avgSimilarityScore * 100).toFixed(0)}%
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

        {/* Score Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Score Breakdown</CardTitle>
              <CardDescription>
                See how each candidate's composite score is calculated from the three core scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {expertiseLed.slice(0, 5).map((summary) => {
                  const candidate = testCandidates.find(c => c.id === summary.candidateId);
                  if (!candidate) return null;
                  
                  const { profiles } = getScoreBreakdownForCandidate(candidate);

                  return (
                    <div key={summary.candidateId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{summary.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {profiles.length} source{profiles.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{(summary.compositeScore * 100).toFixed(0)}%</div>
                          <div className="text-xs text-muted-foreground">Composite Score</div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-sm font-medium mb-2">Expertise Score</div>
                          <Progress value={summary.avgExpertiseScore * 100} className="h-2 mb-1" />
                          <div className="text-xs text-muted-foreground">
                            {(summary.avgExpertiseScore * 100).toFixed(0)}% - Domain overlap
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">Similarity Score</div>
                          <Progress 
                            value={summary.avgSimilarityScore * 100} 
                            className="h-2 mb-1 [&>div]:bg-yellow-500"
                          />
                          <div className="text-xs text-muted-foreground">
                            {(summary.avgSimilarityScore * 100).toFixed(0)}% - Affinity signals
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">Reliability Score</div>
                          <Progress 
                            value={summary.avgReliabilityScore * 100}
                            className="h-2 mb-1 [&>div]:bg-blue-500"
                          />
                          <div className="text-xs text-muted-foreground">
                            {(summary.avgReliabilityScore * 100).toFixed(0)}% - Source trust
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {profiles.map((profile) => (
                          <TooltipProvider key={profile.id}>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">
                                  {profile.type.replace("_", " ")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <div className="font-semibold">{profile.label}</div>
                                  <div>Expertise: {(profile.scores.expertiseScore * 100).toFixed(0)}%</div>
                                  <div>Similarity: {(profile.scores.similarityScore * 100).toFixed(0)}%</div>
                                  <div>Reliability: {(profile.scores.sourceReliabilityScore * 100).toFixed(0)}%</div>
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

        {/* About Tab */}
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>The Three Core Scores</CardTitle>
              <CardDescription>
                Understanding the foundation of bias-aware candidate ranking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Expertise Score (0-1)
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Measures how well a source demonstrates actual domain expertise relevant to the mandate.
                  We compare domain tags (sector, function, skills) from the source with what's required by
                  the mandate and what the candidate has.
                </p>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Example:</strong> A CV showing "private equity" + "infrastructure" + "London" 
                    when the mandate requires those exact skills would score high on expertise.
                  </AlertDescription>
                </Alert>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Similarity Score (0-1)
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Measures affinity/familiarity signals that don't necessarily indicate expertise.
                  Examples: went to same school, worked at same firm, knows same people. These can be
                  useful but must not dominate the decision.
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Bias Prevention:</strong> If similarity exceeds expertise by more than 15%, 
                    we cap it to prevent affinity bias from dominating the ranking.
                  </AlertDescription>
                </Alert>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Source Reliability Score (0-1)
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Measures how trustworthy a source has been historically based on whether decisions
                  influenced by this source turned out well. Calculated as correctUses / totalUses
                  with Bayesian shrinkage for low-sample sources.
                </p>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Example:</strong> A voice note source with 3 correct out of 5 uses would
                    start at 60% but shrink towards 50% (neutral) due to low sample size.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-2">Composite Score Formula</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  composite = 0.4 × baseMatchScore<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.4 × expertiseScore<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.1 × similarityScore (capped)<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.1 × reliabilityScore
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Expertise is intentionally the dominant factor, ensuring skills and experience
                  drive decisions rather than affinity or familiarity.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
