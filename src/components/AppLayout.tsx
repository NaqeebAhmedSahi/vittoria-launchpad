import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
  onSignOut?: () => void;
  currentUser?: any;
}

export function AppLayout({ children, onSignOut, currentUser }: AppLayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <TopBar onSignOut={onSignOut} currentUser={currentUser} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
