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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Intake", path: "/intake", icon: Upload },
  { name: "Candidates", path: "/candidates", icon: Users },
  { name: "Firms", path: "/firms", icon: Building2 },
  { name: "Teams", path: "/teams", icon: UsersRound },
  { name: "Mandates", path: "/mandates", icon: Briefcase },
  { name: "Deals", path: "/deals", icon: HandshakeIcon },
  { name: "Finance", path: "/finance", icon: DollarSign },
  { name: "Templates", path: "/templates", icon: FileText },
  { name: "Edge Control", path: "/edge-control", icon: Shield },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="w-56 border-r bg-card">
      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
