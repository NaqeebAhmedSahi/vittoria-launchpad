import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import type { IntelligenceOpportunity, MandateRiskAlert } from "@/types/intelligence";

export default function IntelligenceHub() {
  const [opportunities, setOpportunities] = useState<IntelligenceOpportunity[]>([]);
  const [alerts, setAlerts] = useState<MandateRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [opps, risks] = await Promise.all([
        (window as any).electron.invoke("intelligence:get-top-opportunities"),
        (window as any).electron.invoke("intelligence:get-mandate-risk-alerts")
      ]);
      setOpportunities(opps);
      setAlerts(risks);
    } catch (error) {
      console.error("Failed to load intelligence data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-semibold">Loading...</h1></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Intelligence Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered insights and market intelligence</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Top Opportunities</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{opportunities.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Risk Alerts</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{alerts.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Market Signals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{opportunities.length + alerts.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Candidate Opportunities</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Candidate</TableHead><TableHead>Mandate</TableHead><TableHead>Firm</TableHead><TableHead className="text-right">Match Score</TableHead><TableHead className="text-right">Confidence</TableHead></TableRow></TableHeader>
            <TableBody>
              {opportunities.slice(0, 10).map((opp, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{opp.candidate_name}</TableCell>
                  <TableCell>{opp.mandate_title}</TableCell>
                  <TableCell className="text-muted-foreground">{opp.firm_name}</TableCell>
                  <TableCell className="text-right"><Badge variant="default">{opp.match_score}%</Badge></TableCell>
                  <TableCell className="text-right">{opp.confidence}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mandate Risk Alerts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Alert</TableHead><TableHead>Mandate</TableHead><TableHead>Firm</TableHead><TableHead>Module</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
            <TableBody>
              {alerts.map((alert, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{alert.alert_type}</TableCell>
                  <TableCell>{alert.mandate_title}</TableCell>
                  <TableCell className="text-muted-foreground">{alert.firm_name}</TableCell>
                  <TableCell className="text-xs">{alert.module}</TableCell>
                  <TableCell><Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>{alert.severity}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
