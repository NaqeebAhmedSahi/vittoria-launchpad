import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { TalentIntelligenceEngine, IntelligenceOutput, IntelligenceScope } from "@/services/talentIntelligenceEngine";
import { useState } from "react";

interface IntelligencePanelProps {
  scope: IntelligenceScope;
  entityId?: string;
  className?: string;
}

export function IntelligencePanel({ scope, entityId, className }: IntelligencePanelProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  // Get intelligence based on scope
  const getIntelligence = (): IntelligenceOutput[] => {
    switch (scope) {
      case 'candidate':
        return entityId ? TalentIntelligenceEngine.getCandidateIntelligence(entityId) : [];
      case 'mandate':
        return entityId ? TalentIntelligenceEngine.getMandateIntelligence(entityId) : [];
      case 'firm':
        return entityId ? TalentIntelligenceEngine.getFirmIntelligence(entityId) : [];
      case 'desk':
        return entityId ? TalentIntelligenceEngine.getDeskIntelligence(entityId) : [];
      case 'market':
        return TalentIntelligenceEngine.getMarketIntelligence();
      default:
        return [];
    }
  };

  const insights = getIntelligence();
  const filteredInsights = selectedModule
    ? insights.filter(i => i.moduleName === selectedModule)
    : insights;

  const availableModules = Array.from(new Set(insights.map(i => i.moduleName)));

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-status-error" />;
      case 'medium': return <Info className="h-4 w-4 text-status-warning" />;
      case 'low': return <TrendingUp className="h-4 w-4 text-status-success" />;
      default: return <Brain className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Intelligence</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredInsights.length} insights
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Module Filter */}
        {availableModules.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedModule === null ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedModule(null)}
            >
              All
            </Button>
            {availableModules.map(module => (
              <Button
                key={module}
                variant={selectedModule === module ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedModule(module)}
              >
                {module.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        )}

        {/* Insights List */}
        <div className="space-y-3">
          {filteredInsights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No intelligence insights available
            </div>
          ) : (
            filteredInsights.map(insight => (
              <div
                key={insight.id}
                className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getSeverityIcon(insight.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">
                        {insight.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {insight.summary}
                      </p>
                    </div>
                  </div>
                  {insight.score !== undefined && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        {insight.score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        score
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {insight.severity && (
                      <Badge variant={getSeverityColor(insight.severity) as any} className="text-xs">
                        {insight.severity}
                      </Badge>
                    )}
                    {insight.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {insight.confidence && (
                    <span className="text-xs text-muted-foreground">
                      {insight.confidence}% confidence
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* TODO: Add "View full report" button that opens IntelligenceDetailModal */}
      </CardContent>
    </Card>
  );
}
