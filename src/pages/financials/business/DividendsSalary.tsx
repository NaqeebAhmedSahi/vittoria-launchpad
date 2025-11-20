import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sampleDividendSchedule, sampleSalarySchedule } from "@/data/sampleFinancials";

export default function DividendsSalary() {
  const navigate = useNavigate();

  // TODO: Replace with window.api.financial.getDividends() and getSalary()
  const dividends = sampleDividendSchedule;
  const salaries = sampleSalarySchedule;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-status-success text-status-success-foreground">Paid</Badge>;
      case 'scheduled':
        return <Badge variant="default">Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      default:
        return null;
    }
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
            <h1 className="text-2xl font-semibold text-foreground">Dividends & Salary</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Payment scheduling and tax-efficient planning
            </p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Annual Salary</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              £{(salaries[0]?.grossAmount * 12 || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Gross amount
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">YTD Dividends</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              £{dividends.filter(d => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Paid to date
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Scheduled</div>
            <div className="text-2xl font-bold text-primary mt-1">
              £{dividends.filter(d => d.status === 'scheduled').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Upcoming dividends
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dividends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="planning">Tax Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="dividends">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dividend Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Share Class</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dividends.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No dividends scheduled
                        </TableCell>
                      </TableRow>
                    ) : (
                      dividends.map((div) => (
                        <TableRow key={div.id}>
                          <TableCell className="font-medium">
                            {new Date(div.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-bold">
                            £{div.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="secondary">{div.shareClass}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {div.notes || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(div.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-4 rounded-md bg-muted">
                <h4 className="text-sm font-medium mb-2">Dividend Notes</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ensure sufficient distributable reserves before declaring</li>
                  <li>• Board minutes required for each dividend payment</li>
                  <li>• Consider personal tax bands when planning amounts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salary Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">NI</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No salary schedule
                        </TableCell>
                      </TableRow>
                    ) : (
                      salaries.map((sal) => (
                        <TableRow key={sal.id}>
                          <TableCell className="font-medium">
                            {sal.month} {sal.year}
                          </TableCell>
                          <TableCell className="text-right">
                            £{sal.grossAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            £{sal.tax.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            £{sal.ni.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            £{sal.netAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(sal.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-4 rounded-md bg-muted">
                <h4 className="text-sm font-medium mb-2">PAYE Reminders</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• PAYE payment due by 22nd of following month</li>
                  <li>• RTI submission required on or before each payment</li>
                  <li>• Year-end P60s due by 31st May</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax-Efficient Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-md border">
                <h4 className="font-medium text-sm mb-2">Optimal Salary Level</h4>
                <p className="text-sm text-muted-foreground">
                  Current annual salary: £{(salaries[0]?.grossAmount * 12 || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Consider raising to £12,570 (personal allowance) to maximize tax-free income
                </p>
              </div>

              <div className="p-4 rounded-md border">
                <h4 className="font-medium text-sm mb-2">Dividend Allowance</h4>
                <p className="text-sm text-muted-foreground">
                  Current tax year allowance: £500 (2025/26)
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  YTD dividends paid: £{dividends.filter(d => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-md border">
                <h4 className="font-medium text-sm mb-2">Share Class Flexibility</h4>
                <p className="text-sm text-muted-foreground">
                  Current structure uses Ordinary shares only. Consider alphabet shares for income splitting if applicable.
                </p>
              </div>

              <Button variant="outline" className="w-full mt-4">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Accountant Review
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
