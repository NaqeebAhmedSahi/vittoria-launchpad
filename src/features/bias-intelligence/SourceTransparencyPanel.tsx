import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSourceAttributions } from '@/mocks/biasIntelligence';

interface SourceTransparencyPanelProps {
  insightId: string;
  insightTitle: string;
  onClose: () => void;
}

export function SourceTransparencyPanel({ insightId, insightTitle, onClose }: SourceTransparencyPanelProps) {
  const sources = getSourceAttributions(insightId);

  const getReasoningBadgeColor = (basis: string) => {
    switch (basis) {
      case 'expertise-led': return 'bg-green-100 text-green-800 border-green-200';
      case 'mixed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'similarity-heavy': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'cv': return '📄';
      case 'notes': return '📝';
      case 'voice': return '🎤';
      case 'market': return '📊';
      default: return '📋';
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Source Transparency</CardTitle>
              <CardDescription className="mt-1">{insightTitle}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This insight was generated from the following data sources. Review the reasoning basis 
              to understand whether expertise or similarity factors dominated.
            </p>

            <div className="space-y-3">
              {sources.map((source) => (
                <div key={source.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getSourceTypeIcon(source.type)}</span>
                      <div>
                        <div className="font-medium">{source.label}</div>
                        <div className="text-xs text-muted-foreground capitalize">{source.type}</div>
                      </div>
                    </div>
                    <Badge className={getReasoningBadgeColor(source.reasoningBasis)}>
                      {source.reasoningBasis}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Expertise Score</div>
                      <div className="bg-blue-100 h-5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full"
                          style={{ width: `${source.expertiseScore}%` }}
                        />
                      </div>
                      <div className="text-xs text-right mt-0.5">{source.expertiseScore}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Similarity Score</div>
                      <div className="bg-purple-100 h-5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full"
                          style={{ width: `${source.similarityScore}%` }}
                        />
                      </div>
                      <div className="text-xs text-right mt-0.5">{source.similarityScore}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Reliability Score</div>
                      <div className="bg-green-100 h-5 rounded-full overflow-hidden">
                        <div
                          className="bg-green-600 h-full"
                          style={{ width: `${source.reliabilityScore}%` }}
                        />
                      </div>
                      <div className="text-xs text-right mt-0.5">{source.reliabilityScore}</div>
                    </div>
                  </div>

                  {source.reasoningBasis === 'similarity-heavy' && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-800">
                        Heavy similarity influence. Check for bias before treating this as a strong signal.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Understanding Reasoning Basis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge className="bg-green-100 text-green-800 border-green-200 mt-0.5">expertise-led</Badge>
                  <p className="text-muted-foreground">
                    Source prioritizes domain expertise, technical skills, and objective qualifications
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 mt-0.5">mixed</Badge>
                  <p className="text-muted-foreground">
                    Source balances expertise with contextual factors like market patterns
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 mt-0.5">similarity-heavy</Badge>
                  <p className="text-muted-foreground">
                    Source emphasizes relationships, shared backgrounds, and prior connections
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
