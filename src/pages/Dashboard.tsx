import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Users, Briefcase, Building2, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your recruitment pipeline
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Candidates"
          value="248"
          icon={Users}
          trend="up"
          subtext="+12% vs last month"
        />
        <StatCard
          title="Open Mandates"
          value="18"
          icon={Briefcase}
          trend="up"
          subtext="+3 vs last month"
        />
        <StatCard
          title="Active Firms"
          value="42"
          icon={Building2}
          trend="up"
          subtext="+5 vs last month"
        />
        <StatCard
          title="Placements MTD"
          value="7"
          icon={TrendingUp}
          trend="up"
          subtext="+2 vs last month"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New candidate", name: "Sarah Mitchell", time: "2 hours ago" },
                { action: "Mandate updated", name: "Senior PM - TechCorp", time: "4 hours ago" },
                { action: "Interview scheduled", name: "John Davis", time: "5 hours ago" },
                { action: "CV imported", name: "Emma Thompson", time: "6 hours ago" },
                { action: "Placement confirmed", name: "Michael Chen", time: "1 day ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { task: "Follow up with candidate", candidate: "Alice Johnson", due: "Today" },
                { task: "Client presentation", firm: "GlobalTech Inc", due: "Tomorrow" },
                { task: "Reference check", candidate: "Robert Lee", due: "Tomorrow" },
                { task: "Contract review", mandate: "CFO - FinServe", due: "In 2 days" },
                { task: "Quarterly review", firm: "InnovateCo", due: "In 3 days" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-input" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.task}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.candidate || item.firm || item.mandate}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.due}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              { stage: "Applied", count: 45, color: "bg-blue-500" },
              { stage: "Screened", count: 32, color: "bg-indigo-500" },
              { stage: "Shortlist", count: 18, color: "bg-purple-500" },
              { stage: "Interview", count: 12, color: "bg-pink-500" },
              { stage: "Offer", count: 5, color: "bg-green-500" },
            ].map((item) => (
              <div key={item.stage} className="text-center space-y-2">
                <div className={`h-2 rounded-full ${item.color}`} />
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-sm text-muted-foreground">{item.stage}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
