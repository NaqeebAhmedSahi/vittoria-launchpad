import { LayoutDashboard, Upload, Users, Building2, UsersRound, Briefcase, HandshakeIcon, DollarSign, FileText, Shield, Settings, ChevronRight, ChevronDown, TrendingUp, Receipt, User, Brain, Mic, Target, Calendar, BarChart, AlertTriangle, Wand2, Network, GitBranch, Database } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useLocation } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Intake", path: "/intake", icon: Upload },
  { name: "Candidates", path: "/candidates", icon: Users },
  { name: "Firms", path: "/firms", icon: Building2 },
  { name: "Teams", path: "/teams", icon: UsersRound },
  { name: "Mandates", path: "/mandates", icon: Briefcase },
  { name: "Deals", path: "/deals", icon: HandshakeIcon },
  { 
    name: "Finance", 
    path: "/finance", 
    icon: DollarSign,
    submenu: [
      { name: "Invoices & P&L", path: "/finance", icon: Receipt },
      { name: "Business Financials", path: "/finance/business", icon: TrendingUp },
      { name: "Personal Financials", path: "/finance/personal", icon: User },
      { name: "Personal Ledger", path: "/finance/personal/ledger", icon: FileText },
    ]
  },
  { 
    name: "Intelligence", 
    path: "/intelligence", 
    icon: Brain,
    submenu: [
      { name: "Overview", path: "/intelligence", icon: Brain },
      { name: "Bias Watch", path: "/intelligence/bias-watch", icon: AlertTriangle },
      { name: "Bias Demo", path: "/intelligence/bias-demo", icon: Shield },
      { name: "Scoring Demo", path: "/intelligence/scoring-demo", icon: TrendingUp },
      { name: "Integrated Demo", path: "/intelligence/integrated-demo", icon: Users },
      { name: "Bias Wizard", path: "/intelligence/bias-wizard", icon: Wand2 },
    ]
  },
  { 
    name: "Sources", 
    path: "/admin/sources", 
    icon: Network,
    submenu: [
      { name: "Source Directory", path: "/admin/sources", icon: Users },
      { name: "Add Source", path: "/admin/sources/manage", icon: User },
      { name: "Bulk Tagging", path: "/admin/sources/tagging", icon: GitBranch },
      { name: "Org Pattern", path: "/admin/similarity/org-pattern", icon: TrendingUp },
      { name: "Import History", path: "/admin/similarity/import-history", icon: Database },
      { name: "Reliability", path: "/admin/reliability", icon: Shield },  // Added Reliability Page
    ]
  },
  { name: "Voice Notes", path: "/voice", icon: Mic },
  { name: "Templates", path: "/templates", icon: FileText },
  { 
    name: "Edge Control", 
    path: "/edge-control", 
    icon: Shield,
    submenu: [
      { name: "Overview", path: "/edge-control", icon: Shield },
      { name: "Deal Heat Index", path: "/edge/deal-heat", icon: TrendingUp },
      { name: "Talent Ecosystem", path: "/edge/talent-ecosystem", icon: Users },
      { name: "Strategic Themes", path: "/edge/strategic-themes", icon: Target },
      { name: "Hiring Window", path: "/edge/hiring-window", icon: Calendar },
      { name: "Deal Structure", path: "/edge/deal-structure", icon: BarChart },
      { name: "Firm Archetypes", path: "/edge/firm-archetypes", icon: Building2 },
    ]
  },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/finance", "/edge-control", "/intelligence", "/admin/sources"]);

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-56 border-r bg-card top-0 overflow-y-auto">
      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => (
          <div key={item.path}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleExpand(item.path)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </div>
                  {expandedItems.includes(item.path) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                {expandedItems.includes(item.path) && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.submenu.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        end={subItem.path === item.path}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <subItem.icon className="h-4 w-4" />
                        {subItem.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors"
                activeClassName="bg-muted text-primary font-medium"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
