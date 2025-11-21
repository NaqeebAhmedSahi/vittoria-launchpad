import { useState } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getWeeklyBiasSummary } from '@/mocks/biasIntelligence';
import { toast } from '@/hooks/use-toast';

export default function BiasWatch() {
  const [selectedWeek, setSelectedWeek] = useState('week-current');
  const summary = getWeeklyBiasSummary(selectedWeek);
  const [selectedMandate, setSelectedMandate] = useState<string | null>(null);

  const handleDownload = () => {
    const jsonData = JSON.stringify(summary, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bias-summary-${summary.weekId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Bias summary downloaded',
      description: 'The JSON file has been saved to your downloads folder.',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Weekly Bias Watch</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and analyze bias patterns across mandates and sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week-current">Current week</SelectItem>
              <SelectItem value="week-last">Last week</SelectItem>
              <SelectItem value="week-two-ago">Two weeks ago</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Summary (JSON)
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High Risk Decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.highRiskDecisions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Decisions flagged with high bias risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Mandates Affected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.affectedMandates}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique mandates with bias events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top Similarity Driver</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{summary.topSimilarityDriver}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Most common bias factor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Divergence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.avgDivergence}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mean ranking position change
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Mandate Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bias Events by Mandate</CardTitle>
          <CardDescription>
            Mandates with the highest bias risk activity this period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {summary.mandateBreakdown.map((mandate) => (
              <div key={mandate.mandateId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{mandate.mandateName}</div>
                    <div className="text-sm text-muted-foreground">{mandate.sector}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">High Bias Events</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {mandate.highBiasEvents}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Avg Divergence</div>
                      <div className="text-2xl font-bold">{mandate.avgDivergence}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMandate(
                        selectedMandate === mandate.mandateId ? null : mandate.mandateId
                      )}
                    >
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Details Drawer */}
                {selectedMandate === mandate.mandateId && (
                  <div className="mt-4 pt-4 border-t bg-muted/30 rounded-md p-4">
                    <h4 className="font-medium mb-3">Bias Event Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <p>
                          <strong>{mandate.highBiasEvents} high-risk decisions</strong> detected where 
                          similarity factors significantly influenced candidate rankings.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <p>
                          Average divergence of <strong>{mandate.avgDivergence}</strong> positions between 
                          expertise-led and similarity-led rankings.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <p>
                          Primary similarity drivers: shared firm backgrounds and prior team connections 
                          in the {mandate.sector} sector.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toast({ title: 'Would navigate to mandate detail' })}>
                        View Mandate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toast({ title: 'Would open bias scoring drawer' })}>
                        Open Bias Intelligence
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Source Type Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bias Events by Source Type</CardTitle>
          <CardDescription>
            Which data sources are introducing the most similarity-heavy signals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.sourceTypeBreakdown.map((source, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{source.sourceType}</div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {source.similarityHeavyCount} similarity-heavy
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{source.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
