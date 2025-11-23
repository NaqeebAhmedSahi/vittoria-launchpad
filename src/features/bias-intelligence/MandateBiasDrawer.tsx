import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBiasScoredCandidates, getRankingDivergence } from '@/mocks/biasIntelligence';
import { BiasScoredCandidate } from '@/types/biasIntelligence';

interface MandateBiasDrawerProps {
  mandateId: string;
  mandateName: string;
  onClose: () => void;
}

export function MandateBiasDrawer({ mandateId, mandateName, onClose }: MandateBiasDrawerProps) {
  const candidates = getBiasScoredCandidates(mandateId);
  const divergences = getRankingDivergence(candidates);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const getBiasRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const largestDivergence = divergences[0];

  return (
    <div className="fixed inset-y-0 right-0 w-[800px] bg-background border-l shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Bias Aware Scoring</h2>
          <p className="text-sm text-muted-foreground mt-1">{mandateName}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Candidate List with Expertise Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Expertise-Led Candidate Ranking</CardTitle>
            <CardDescription>
              Candidates ranked by expertise composite score (used for client recommendations)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                      <div className="col-span-2 font-medium">{candidate.name}</div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Overall</div>
                        <div className="font-semibold">{candidate.overallScore}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Expertise</div>
                        <div className="font-semibold">{candidate.expertiseScore}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Similarity</div>
                        <div className="font-semibold">{candidate.similarityScore}</div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Badge className={`${getBiasRiskColor(candidate.biasRisk)} uppercase`}>
                          {candidate.biasRisk.charAt(0)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedCandidate(
                            expandedCandidate === candidate.id ? null : candidate.id
                          )}
                        >
                          View reasoning
                          {expandedCandidate === candidate.id ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Reasoning Panel */}
                  {expandedCandidate === candidate.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Expertise Score</div>
                          <div className="bg-blue-100 h-6 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full flex items-center justify-end pr-2"
                              style={{ width: `${candidate.expertiseScore}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {candidate.expertiseScore}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Similarity Score</div>
                          <div className="bg-purple-100 h-6 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-600 h-full flex items-center justify-end pr-2"
                              style={{ width: `${candidate.similarityScore}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {candidate.similarityScore}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Reliability Score</div>
                          <div className="bg-green-100 h-6 rounded-full overflow-hidden">
                            <div
                              className="bg-green-600 h-full flex items-center justify-end pr-2"
                              style={{ width: `${candidate.reliabilityScore}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {candidate.reliabilityScore}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm">{candidate.reasoning}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Parallel Rankings */}
        <Card>
          <CardHeader>
            <CardTitle>Parallel Ranking Comparison</CardTitle>
            <CardDescription>
              Compare expertise-led vs similarity-based rankings (internal view only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="expertise">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expertise">Expertise Ranking</TabsTrigger>
                <TabsTrigger value="similarity">Similarity Ranking</TabsTrigger>
              </TabsList>

              <TabsContent value="expertise" className="space-y-2 mt-4">
                {[...candidates].sort((a, b) => a.expertiseRank - b.expertiseRank).map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Score: {c.expertiseScore}
                    </span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="similarity" className="space-y-2 mt-4">
                {[...candidates].sort((a, b) => a.similarityRank - b.similarityRank).map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Score: {c.similarityScore}
                    </span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {/* Divergence Summary */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-900">Divergence Summary</p>
                  <p className="text-sm text-yellow-800">
                    {divergences.filter(d => d.movement !== 0).length} candidates changed position between the two rankings.
                  </p>
                  {largestDivergence && largestDivergence.movement !== 0 && (
                    <p className="text-sm text-yellow-800">
                      Largest movement was <strong>{largestDivergence.candidateName}</strong>, 
                      which moved from rank {largestDivergence.expertiseRank} to rank {largestDivergence.similarityRank} in the similarity view.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
