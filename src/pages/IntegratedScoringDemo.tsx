import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getScoredCandidatesForMandate,
  getCandidateScoreDetails,
  generateMockCandidateData,
  generateMockMandateData,
  generateMockMatchScoreData,
  type CandidateData,
  type MandateData,
  type MatchScoreData,
} from "@/services/candidateScoringIntegration";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CandidateScoreSummary } from "@/services/biasAwareScoringFlow";

export default function IntegratedScoringDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMandateId] = useState(1);
  
  // Mock data (in real app, this comes from API)
  const [mandate] = useState<MandateData>(() => generateMockMandateData(1));
  const [candidates] = useState<CandidateData[]>(() => 
    Array.from({ length: 10 }, (_, i) => generateMockCandidateData(i + 1))
  );
  const [matchScores] = useState<Map<number, MatchScoreData>>(() => {
    const map = new Map();
    candidates.forEach(c => {
      map.set(c.id, generateMockMatchScoreData(c.id, selectedMandateId));
    });
    return map;
  });

  const [rankings, setRankings] = useState<{
    expertiseLed: CandidateScoreSummary[];
    similarityLed: CandidateScoreSummary[];
    biasRisk: "low" | "medium" | "high";
    avgDivergence: number;
  } | null>(null);

  const [selectedCandidate, setSelectedCandidate] = useState<CandidateData | null>(null);
  const [scoreDetails, setScoreDetails] = useState<any>(null);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    setIsLoading(true);
    try {
      const result = await getScoredCandidatesForMandate(
        selectedMandateId.toString(),
        candidates,
        mandate,
        matchScores
      );
      setRankings(result);
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCandidateClick = (candidateId: string) => {
    const candidate = candidates.find(c => c.id.toString() === candidateId);
    if (!candidate) return;

    setSelectedCandidate(candidate);
    const matchScore = matchScores.get(candidate.id);
    if (matchScore) {
      const details = getCandidateScoreDetails(candidate, mandate, matchScore);
      setScoreDetails(details);
    }
  };

  const getBiasRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const getBiasRiskIcon = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return <CheckCircle className="h-4 w-4" />;
      case "medium":
        return <Info className="h-4 w-4" />;
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading || !rankings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bias-aware rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Integrated Candidate Scoring
        </h1>
        <p className="text-muted-foreground mt-2">
          Real candidate data with bias-aware three-score analysis
        </p>
      </div>

      {/* Mandate Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{mandate.title}</span>
            <Badge className={getBiasRiskColor(rankings.biasRisk)}>
              {getBiasRiskIcon(rankings.biasRisk)}
              {rankings.biasRisk.toUpperCase()} Bias Risk
            </Badge>
          </CardTitle>
          <CardDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {mandate.sectors?.map(s => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
              {mandate.functions?.map(f => (
                <Badge key={f} variant="outline">{f}</Badge>
              ))}
              {mandate.geographies?.map(g => (
                <Badge key={g} variant="outline">{g}</Badge>
              ))}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Bias Detection:</strong> Average rank divergence is {rankings.avgDivergence.toFixed(2)} positions
              between expertise-led and similarity-led rankings.
              {rankings.biasRisk === "high" && " ⚠️ High divergence detected - review recommendations carefully."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expertise-Led Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Recommended Ranking
            </CardTitle>
            <CardDescription>
              Expertise-led composite score (use this for decisions)
            </CardDescription>
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
                {rankings.expertiseLed.map((summary, idx) => {
                  const candidate = candidates.find(c => c.id.toString() === summary.candidateId);
                  const biasRisk = summary.avgSimilarityScore - summary.avgExpertiseScore > 0.15 ? "high" :
                                   summary.avgSimilarityScore - summary.avgExpertiseScore > 0.05 ? "medium" : "low";
                  
                  return (
                    <TableRow 
                      key={summary.candidateId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCandidateClick(summary.candidateId)}
                    >
                      <TableCell className="font-medium">#{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{summary.name}</div>
                        {candidate && (
                          <div className="text-xs text-muted-foreground">
                            {candidate.current_title} @ {candidate.current_firm}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="font-medium">
                                {(summary.compositeScore * 100).toFixed(0)}%
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <div>Expertise: {(summary.avgExpertiseScore * 100).toFixed(0)}%</div>
                                <div>Similarity: {(summary.avgSimilarityScore * 100).toFixed(0)}%</div>
                                <div>Reliability: {(summary.avgReliabilityScore * 100).toFixed(0)}%</div>
                                <div>Base Match: {(summary.baseMatchScore * 100).toFixed(0)}%</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {biasRisk !== "low" && (
                          <Badge variant="outline" className={
                            biasRisk === "high" ? "border-red-300 text-red-700" : "border-yellow-300 text-yellow-700"
                          }>
                            {biasRisk}
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

        {/* Score Breakdown Panel */}
        {selectedCandidate && scoreDetails ? (
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
              <CardDescription>
                {selectedCandidate.name} - Detailed Analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Composite Score</span>
                  <span className="text-2xl font-bold">
                    {(scoreDetails.summary.compositeScore * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={scoreDetails.summary.compositeScore * 100} className="h-3" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Expertise Score</span>
                    <span className="text-sm font-medium">
                      {(scoreDetails.summary.avgExpertiseScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={scoreDetails.summary.avgExpertiseScore * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Domain expertise match with mandate requirements
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Similarity Score</span>
                    <span className="text-sm font-medium">
                      {(scoreDetails.summary.avgSimilarityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={scoreDetails.summary.avgSimilarityScore * 100} 
                    className="h-2 [&>div]:bg-yellow-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Affinity signals (shared background, connections)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Reliability Score</span>
                    <span className="text-sm font-medium">
                      {(scoreDetails.summary.avgReliabilityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={scoreDetails.summary.avgReliabilityScore * 100} 
                    className="h-2 [&>div]:bg-blue-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Source trustworthiness based on history
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Sources</h4>
                <div className="space-y-2">
                  {scoreDetails.profiles.map((profile: any) => (
                    <div key={profile.id} className="text-xs space-y-1 p-2 bg-muted rounded">
                      <div className="font-medium">{profile.label}</div>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <div>E: {(profile.expertiseScore * 100).toFixed(0)}%</div>
                        <div>S: {(profile.similarityScore * 100).toFixed(0)}%</div>
                        <div>R: {(profile.reliabilityScore * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Candidate Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedCandidate.sectors?.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                  {selectedCandidate.functions?.map(f => (
                    <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setSelectedCandidate(null)}
              >
                Close Details
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Similarity-Only Ranking</CardTitle>
              <CardDescription>
                For comparison only (shows potential bias)
              </CardDescription>
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
                  {rankings.similarityLed.slice(0, 10).map((summary, idx) => {
                    const expertiseRank = rankings.expertiseLed.findIndex(
                      c => c.candidateId === summary.candidateId
                    ) + 1;
                    const rankChange = expertiseRank - (idx + 1);
                    
                    return (
                      <TableRow key={summary.candidateId}>
                        <TableCell className="font-medium">#{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{summary.name}</div>
                          {Math.abs(rankChange) > 2 && (
                            <div className="text-xs text-yellow-600">
                              Was #{expertiseRank} in recommended
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(summary.avgSimilarityScore * 100).toFixed(0)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Expertise</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(rankings.expertiseLed.reduce((sum, c) => sum + c.avgExpertiseScore, 0) / rankings.expertiseLed.length * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all candidates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Similarity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(rankings.expertiseLed.reduce((sum, c) => sum + c.avgSimilarityScore, 0) / rankings.expertiseLed.length * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Affinity signals detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Reliability</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(rankings.expertiseLed.reduce((sum, c) => sum + c.avgReliabilityScore, 0) / rankings.expertiseLed.length * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Source trustworthiness
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
