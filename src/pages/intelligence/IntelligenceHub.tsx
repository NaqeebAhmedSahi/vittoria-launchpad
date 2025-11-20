import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, TrendingUp, AlertTriangle, Target, BarChart } from "lucide-react";
import { TalentIntelligenceEngine } from "@/services/talentIntelligenceEngine";
import { ModuleExplanationModal } from "@/components/intelligence/ModuleExplanationModal";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";

export default function IntelligenceHub() {
  const topOpportunities = TalentIntelligenceEngine.getTopCandidateOpportunities(5);
  const topRisks = TalentIntelligenceEngine.getTopMandateRisks(5);
  const marketInsights = TalentIntelligenceEngine.getMarketIntelligence();
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState("score");
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const sortedOpportunities = useMemo(() => {
    return [...topOpportunities].sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "confidence") return b.confidence - a.confidence;
      return 0;
    });
  }, [topOpportunities, sortBy]);

  const sortedRisks = useMemo(() => {
    return [...topRisks].sort((a, b) => {
      if (sortBy === "confidence") return b.confidence - a.confidence;
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
             (severityOrder[a.severity as keyof typeof severityOrder] || 0);
    });
  }, [topRisks, sortBy]);

  const handleCandidateClick = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleMandateClick = (mandateId: string) => {
    navigate(`/mandates/${mandateId}`);
  };

  const handleModuleClick = (module: any) => {
    setSelectedModule(module);
    setModuleModalOpen(true);
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-status-error" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-status-warning" />;
      case 'low': return <TrendingUp className="h-4 w-4 text-status-success" />;
      default: return <Brain className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Intelligence Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated insights across candidates, mandates, and market
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Opportunities</CardTitle>
            <Target className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{topOpportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">High-value candidate matches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-error" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{topRisks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Mandates requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Market Signals</CardTitle>
            <BarChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{marketInsights.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active market trends</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="mandates">Mandates</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top Opportunities */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Candidate Opportunities</CardTitle>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Sort by Score</SelectItem>
                    <SelectItem value="confidence">Sort by Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insight</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOpportunities.map((insight) => (
                    <TableRow key={insight.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(insight.severity)}
                          <span className="text-foreground">{insight.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                          onClick={() => handleCandidateClick(insight.id.split('-')[0])}
                        >
                          Candidate {insight.id.split('-')[0]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                          onClick={() => handleMandateClick('mandate-001')}
                        >
                          Mandate #001
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleModuleClick(insight)}
                        >
                          {insight.moduleName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={insight.score && insight.score >= 75 ? "default" : "secondary"}>
                          {insight.score || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{insight.confidence}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mandate Risk Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Mandate Risk Alerts</CardTitle>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity">Sort by Severity</SelectItem>
                    <SelectItem value="confidence">Sort by Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Severity</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRisks.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(risk.severity)}
                          <span 
                            className="text-foreground hover:text-primary cursor-pointer transition-colors"
                            onClick={() => handleMandateClick(risk.id.split('-')[0])}
                          >
                            {risk.title}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{risk.summary}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleModuleClick(risk)}
                        >
                          {risk.moduleName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={
                            risk.severity === 'high' ? 'destructive' :
                            risk.severity === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {risk.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{risk.confidence}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Candidate Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Insight</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOpportunities.map((insight) => (
                    <TableRow key={insight.id}>
                      <TableCell>
                        <span 
                          className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                          onClick={() => handleCandidateClick(insight.id.split('-')[0])}
                        >
                          Candidate {insight.id.split('-')[0]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{insight.title}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleModuleClick(insight)}
                        >
                          {insight.moduleName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={insight.score && insight.score >= 75 ? "default" : "secondary"}>
                          {insight.score || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{insight.confidence}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mandates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mandate Intelligence & Risks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Severity</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRisks.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell>
                        <span 
                          className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                          onClick={() => handleMandateClick(risk.id.split('-')[0])}
                        >
                          Mandate #{risk.id.split('-')[0]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{risk.title}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => handleModuleClick(risk)}
                        >
                          {risk.moduleName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={
                            risk.severity === 'high' ? 'destructive' :
                            risk.severity === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {risk.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{risk.confidence}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Intelligence Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketInsights.map((insight) => (
                  <div 
                    key={insight.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityIcon(insight.severity)}
                          <span className="font-semibold text-foreground">{insight.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{insight.summary}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => handleModuleClick(insight)}
                          >
                            {insight.moduleName}
                          </Badge>
                          {insight.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        {insight.score !== undefined && (
                          <div className="text-lg font-bold text-primary mb-1">
                            {insight.score}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {insight.confidence}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedModule && (
        <ModuleExplanationModal
          moduleName={selectedModule.moduleName}
          score={selectedModule.score}
          confidence={selectedModule.confidence}
          summary={selectedModule.summary}
          open={moduleModalOpen}
          onOpenChange={setModuleModalOpen}
        />
      )}
    </div>
  );
}
