import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sample13WeekCashflow, sample12MonthCashflow } from "@/data/sampleFinancials";

export default function BusinessCashflow() {
  const navigate = useNavigate();

  // TODO: Replace with window.api.financial.getCashflow({ entity: 'business', period: '13weeks' })
  const weeklyForecast = sample13WeekCashflow;
  const monthlyForecast = sample12MonthCashflow;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'safe':
        return <Badge variant="default" className="bg-status-success text-status-success-foreground">Safe</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-status-warning text-status-warning-foreground">Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return null;
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Export cashflow forecast");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/finance/business')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Cashflow Forecast</h1>
            <p className="text-sm text-muted-foreground mt-1">
              13-week rolling and 12-month projections
            </p>
          </div>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Forecast
        </Button>
      </div>

      {/* Warnings */}
      {weeklyForecast.some((w) => w.status !== 'safe') && (
        <Card className="border-status-warning bg-status-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-status-warning-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-sm">Cashflow Warning</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Some weeks show low or critical balance levels. Review and plan accordingly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="13week" className="space-y-4">
        <TabsList>
          <TabsTrigger value="13week">13-Week Forecast</TabsTrigger>
          <TabsTrigger value="12month">12-Month Projection</TabsTrigger>
        </TabsList>

        <TabsContent value="13week">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">13-Week Rolling Cashflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Week Ending</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyForecast.map((week) => (
                      <TableRow key={week.weekNumber}>
                        <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(week.weekEnding).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          £{Math.round(week.openingBalance).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-status-success">
                          +£{Math.round(week.income).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          -£{Math.round(week.expenses).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          £{Math.round(week.closingBalance).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(week.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-4 rounded-md bg-muted">
                <h4 className="text-sm font-medium mb-2">Assumptions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Income based on expected placement fees (conservative estimate)</li>
                  <li>• Expenses include fixed costs + variable operational spend</li>
                  <li>• VAT payments scheduled based on quarterly returns</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="12month">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">12-Month Cashflow Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Cashflow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyForecast.map((month) => (
                      <TableRow key={`${month.month}-${month.year}`}>
                        <TableCell className="font-medium">
                          {month.month} {month.year}
                        </TableCell>
                        <TableCell className="text-right text-status-success">
                          £{month.income.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          £{month.expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          £{month.netCashflow.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        £{monthlyForecast.reduce((sum, m) => sum + m.income, 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        £{monthlyForecast.reduce((sum, m) => sum + m.expenses, 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        £{monthlyForecast.reduce((sum, m) => sum + m.netCashflow, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-4 rounded-md bg-muted">
                <h4 className="text-sm font-medium mb-2">Projection Methodology</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Based on historical placement patterns and pipeline analysis</li>
                  <li>• Includes seasonal variations (Q1/Q4 typically stronger)</li>
                  <li>• Conservative estimates with 20% contingency buffer</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
