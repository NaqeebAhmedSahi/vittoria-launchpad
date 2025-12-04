import {
  LayoutDashboard,
  Upload,
  Users,
  Building2,
  UsersRound,
  Briefcase,
  HandshakeIcon,
  DollarSign,
  FileText,
  Shield,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  TrendingUp,
  Receipt,
  User,
  Brain,
  Mic,
  Target,
  Calendar,
  BarChart,
  AlertTriangle,
  Wand2,
  Network,
  GitBranch,
  Database,
  CheckCircle,
  Mail,
  Contact,
  FolderTree,
  Briefcase as OperationsIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useLocation } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
    {
    name: "Operations",
    path: "/operations",
    icon: OperationsIcon,
    submenu: [
      { name: "Email Management", path: "/operations/email", icon: Mail },
      { name: "Calendar", path: "/operations/calendar", icon: Calendar },
      { name: "Contacts", path: "/operations/contacts", icon: Contact },
      { name: "Intake Folders", path: "/operations/intake-folders", icon: FolderTree },
      { name: "Settings", path: "/operations/settings", icon: Settings },
    ]
  },
  { name: "Intake", path: "/intake", icon: Upload },
  { name: "Approvals", path: "/approvals", icon: CheckCircle },
  { name: "Candidates", path: "/candidates", icon: Users },
  { name: "Firms", path: "/firms", icon: Building2 },
  { name: "Teams", path: "/teams", icon: UsersRound },
  { name: "People", path: "/people", icon: User },
  { name: "Mandates", path: "/mandates", icon: Briefcase },
  { name: "Deals", path: "/deals", icon: HandshakeIcon },
  { name: "Documents", path: "/documents", icon: FileText },
  {
    name: "Finance",
    path: "/finance",
    icon: DollarSign,
    submenu: [
      { name: "Transactions", path: "/finance/transactions", icon: DollarSign },
      { name: "Business Financials", path: "/finance/business", icon: TrendingUp },
      { name: "Personal Financials", path: "/finance/personal", icon: User },
      { name: "Personal Ledger", path: "/finance/personal/ledger", icon: FileText },
      { name: "Invoices & P&L", path: "/finance", icon: Receipt },
    ]
  },
  { name: "Audit Log", path: "/audit", icon: Shield },
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

  // { name: "Audit Log", path: "/audit", icon: Shield },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/finance", "/edge-control", "/intelligence", "/admin/sources", "/operations"]);
  const [collapsed, setCollapsed] = useState(false);

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

  const itemPadding = collapsed ? "px-2" : "px-3";

  return (
    <aside
      className={`border-r bg-card top-0 transition-all duration-300 ${
        collapsed ? "w-16 overflow-y-auto overflow-x-hidden" : "w-56 overflow-y-auto"
      }`}
    >
      <div className="p-2">
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className="w-full flex items-center justify-center rounded-md border text-sm py-1 text-muted-foreground hover:bg-muted transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className={`space-y-0.5 ${collapsed ? "px-1" : "p-2"}`}>
        {navItems.map((item) => (
          <div key={item.path}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleExpand(item.path)}
                  className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3 ${itemPadding} py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors`}
                  title={collapsed ? item.name : undefined}
                >
                  <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                    <item.icon className="h-4 w-4" />
                    <span className={collapsed ? "sr-only" : "inline"}>{item.name}</span>
                  </div>
                  {!collapsed && (
                    <>
                      {expandedItems.includes(item.path) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </>
                  )}
                </button>
                {expandedItems.includes(item.path) && (
                  <div className={`${collapsed ? "ml-0" : "ml-4"} mt-0.5 space-y-0.5`}>
                    {item.submenu.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        end={subItem.path === item.path}
                        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} ${itemPadding} py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors`}
                        activeClassName="bg-muted text-primary font-medium"
                        title={collapsed ? subItem.name : undefined}
                      >
                        <subItem.icon className="h-4 w-4" />
                        <span className={collapsed ? "sr-only" : "inline"}>{subItem.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} ${itemPadding} py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors`}
                activeClassName="bg-muted text-primary font-medium"
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4" />
                <span className={collapsed ? "sr-only" : "inline"}>{item.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
