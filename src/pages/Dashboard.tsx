import { Card } from "@/components/ui/card";
import { TrendingUp, Briefcase, Users, FileText, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const tiles = [
    {
      label: "New CVs this week",
      value: "8",
      subtext: "+3 vs last week",
      icon: FileText,
      color: "text-secondary",
    },
    {
      label: "Active mandates",
      value: "12",
      subtext: "5 in Shortlist, 3 in Interview",
      icon: Briefcase,
      color: "text-primary",
    },
    {
      label: "Candidates in process",
      value: "47",
      subtext: "Across 12 mandates",
      icon: Users,
      color: "text-secondary",
    },
    {
      label: "Invoices due",
      value: "3",
      subtext: "Total £260k",
      icon: DollarSign,
      color: "text-warning",
    },
  ];

  const recentCVs = [
    { file: "CV_FMB 2025.pdf", candidate: "Francesco Vignola", status: "Parsed" },
    { file: "Tamim Ahmad CV.pdf", candidate: "Tamim Ahmad", status: "Approved" },
    { file: "Holly Ha CV.pdf", candidate: "Holly Ha", status: "Needs review" },
    { file: "Edward Berwin CV.pdf", candidate: "Edward Berwin", status: "Parsed" },
    { file: "Sarah Chen Resume.pdf", candidate: "Sarah Chen", status: "New" },
  ];

  const recentMandates = [
    {
      name: "ECM – Global Bank – London",
      firm: "Morgan Stanley",
      status: "Shortlist",
      updated: "2 hours ago",
    },
    {
      name: "Private Credit – Asset Manager",
      firm: "KKR",
      status: "Research",
      updated: "5 hours ago",
    },
    {
      name: "Infrastructure PE Partner",
      firm: "Brookfield",
      status: "Interview",
      updated: "1 day ago",
    },
    {
      name: "FIG M&A MD",
      firm: "Goldman Sachs",
      status: "Offer",
      updated: "2 days ago",
    },
  ];

  const mandateStages = [
    { stage: "Research", count: 2, color: "bg-muted" },
    { stage: "Shortlist", count: 5, color: "bg-info" },
    { stage: "Interview", count: 3, color: "bg-secondary/20" },
    { stage: "Offer", count: 2, color: "bg-success/20" },
  ];

  const teamFees = [
    { team: "ECM Team", fees: 680000, color: "bg-primary" },
    { team: "PE Team", fees: 420000, color: "bg-secondary" },
    { team: "Credit Team", fees: 280000, color: "bg-accent" },
    { team: "FIG Team", fees: 180000, color: "bg-muted" },
  ];

  const maxFees = Math.max(...teamFees.map((t) => t.fees));

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-info text-primary";
      case "parsed":
        return "bg-success/20 text-success";
      case "approved":
        return "bg-success text-white";
      case "needs review":
        return "bg-warning/20 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMandateStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "research":
        return "bg-muted text-muted-foreground";
      case "shortlist":
        return "bg-info text-primary";
      case "interview":
        return "bg-secondary/20 text-secondary";
      case "offer":
        return "bg-success/20 text-success";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your executive search operations</p>
      </div>

      {/* Top Tiles */}
      <div className="grid grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${tile.color}`}>
                <tile.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-semibold text-foreground">{tile.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{tile.label}</div>
              <div className="text-xs text-muted-foreground pt-1">{tile.subtext}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mandates by Stage */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Mandates by Stage</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {mandateStages.map((item) => (
              <div key={item.stage}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground">{item.stage}</span>
                  <span className="text-sm font-medium text-foreground">{item.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${(item.count / 12) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fees by Team */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Fees by Team (YTD)</h3>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {teamFees.map((item) => (
              <div key={item.team}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground">{item.team}</span>
                  <span className="text-sm font-medium text-foreground">£{(item.fees / 1000).toFixed(0)}k</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${(item.fees / maxFees) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recently Ingested CVs */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Recently Ingested CVs</h3>
          <div className="space-y-2">
            {recentCVs.map((cv, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{cv.file}</div>
                  <div className="text-xs text-muted-foreground">{cv.candidate}</div>
                </div>
                <Badge className={`ml-2 text-xs ${getStatusColor(cv.status)}`}>{cv.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recently Updated Mandates */}
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Recently Updated Mandates</h3>
          <div className="space-y-2">
            {recentMandates.map((mandate, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-2.5 rounded border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{mandate.name}</div>
                  <div className="text-xs text-muted-foreground">{mandate.firm}</div>
                </div>
                <div className="ml-2 text-right flex-shrink-0">
                  <Badge className={`text-xs mb-1 ${getMandateStatusColor(mandate.status)}`}>{mandate.status}</Badge>
                  <div className="text-xs text-muted-foreground">{mandate.updated}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
