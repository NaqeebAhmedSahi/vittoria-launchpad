import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, Target, BarChart } from "lucide-react";
import { TalentIntelligenceEngine } from "@/services/talentIntelligenceEngine";

export default function IntelligenceHub() {
  const topOpportunities = TalentIntelligenceEngine.getTopCandidateOpportunities(5);
  const topRisks = TalentIntelligenceEngine.getTopMandateRisks(5);
  const marketInsights = TalentIntelligenceEngine.getMarketIntelligence();

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
              <CardTitle className="text-base">Top Candidate Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insight</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOpportunities.map((insight) => (
                    <TableRow key={insight.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(insight.severity)}
                          <div>
                            <div className="font-medium text-sm">{insight.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{insight.summary}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {insight.moduleName.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{insight.score}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{insight.confidence}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Risks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mandate Risk Alerts</CardTitle>
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
                  {topRisks.map((insight) => (
                    <TableRow key={insight.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(insight.severity)}
                          <div>
                            <div className="font-medium text-sm">{insight.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{insight.summary}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {insight.moduleName.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={insight.severity === 'high' ? 'destructive' : 'secondary'}>
                          {insight.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{insight.confidence}%</TableCell>
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
              <p className="text-sm text-muted-foreground">
                Select a candidate from the Candidates page to view detailed intelligence insights.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mandates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mandate Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Select a mandate from the Mandates page to view detailed intelligence insights.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketInsights.map((insight) => (
                  <div key={insight.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2 flex-1">
                        {getSeverityIcon(insight.severity)}
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{insight.title}</div>
                          <p className="text-sm text-muted-foreground mt-1">{insight.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {insight.tags?.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      {insight.score !== undefined && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{insight.score}</div>
                          <div className="text-xs text-muted-foreground">{insight.confidence}% confidence</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
