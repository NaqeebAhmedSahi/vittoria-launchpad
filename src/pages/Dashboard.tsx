import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Briefcase, Users, DollarSign } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";

const recentCVs = [
  { fileName: "CV_FMB 2025.pdf", candidate: "Francesco Vignola", status: "Parsed", variant: "info" as const },
  { fileName: "Tamim Ahmad CV.pdf", candidate: "Tamim Ahmad", status: "Approved", variant: "success" as const },
  { fileName: "Holly Ha CV.pdf", candidate: "Holly Ha", status: "Needs review", variant: "warning" as const },
  { fileName: "Edward Berwin CV.pdf", candidate: "Edward Berwin", status: "Parsed", variant: "info" as const },
];

const recentMandates = [
  { name: "ECM - Global Bank - London", firm: "Morgan Stanley", status: "Shortlist", stage: "5 candidates" },
  { name: "Private Credit - Asset Manager", firm: "KKR", status: "Research", stage: "2 candidates" },
  { name: "Infrastructure PE Partner", firm: "Brookfield", status: "Interview", stage: "3 candidates" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">High-level view of your executive search pipeline</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="New CVs this week" value={8} subtext="+3 vs last week" icon={FileText} trend="up" />
        <StatCard title="Active mandates" value={12} subtext="5 in Shortlist, 3 in Interview" icon={Briefcase} />
        <StatCard title="Candidates in process" value={47} subtext="Across all active mandates" icon={Users} />
        <StatCard
          title="Invoices due"
          value="£260k"
          subtext="3 invoices outstanding"
          icon={DollarSign}
          trend="neutral"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Mandates by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: "Research", count: 2, color: "bg-status-info" },
                { stage: "Shortlist", count: 5, color: "bg-primary" },
                { stage: "Interview", count: 3, color: "bg-secondary" },
                { stage: "Offer", count: 0, color: "bg-status-warning" },
                { stage: "Placed", count: 2, color: "bg-status-success" },
              ].map((item) => (
                <div key={item.stage} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-muted-foreground">{item.stage}</div>
                  <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                    <div
                      className={`${item.color} h-full flex items-center px-3 text-xs font-medium text-white`}
                      style={{ width: `${(item.count / 12) * 100}%` }}
                    >
                      {item.count > 0 && item.count}
                    </div>
                  </div>
                  <div className="w-12 text-sm text-foreground font-medium text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fees by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { team: "ECM", fees: "£420k", percentage: 35 },
                { team: "Private Equity", fees: "£380k", percentage: 32 },
                { team: "Infrastructure", fees: "£260k", percentage: 22 },
                { team: "Real Estate", fees: "£140k", percentage: 11 },
              ].map((item) => (
                <div key={item.team} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-muted-foreground">{item.team}</div>
                  <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-secondary h-full flex items-center px-3 text-xs font-medium text-white"
                      style={{ width: `${item.percentage}%` }}
                    >
                      {item.fees}
                    </div>
                  </div>
                  <div className="w-16 text-sm text-foreground font-medium text-right">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recently Ingested CVs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCVs.map((cv, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{cv.fileName}</p>
                      <p className="text-xs text-muted-foreground">{cv.candidate}</p>
                    </div>
                  </div>
                  <StatusChip status={cv.status} variant={cv.variant} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recently Updated Mandates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMandates.map((mandate, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{mandate.name}</p>
                    <p className="text-xs text-muted-foreground">{mandate.firm}</p>
                  </div>
                  <div className="text-right">
                    <StatusChip status={mandate.status} variant="info" className="mb-1" />
                    <p className="text-xs text-muted-foreground">{mandate.stage}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
