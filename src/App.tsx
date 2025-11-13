import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Intake from "./pages/Intake";
import Candidates from "./pages/Candidates";
import Mandates from "./pages/Mandates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/mandates" element={<Mandates />} />
            <Route path="/firms" element={<div className="text-center py-12 text-muted-foreground">Firms module coming soon</div>} />
            <Route path="/teams" element={<div className="text-center py-12 text-muted-foreground">Teams module coming soon</div>} />
            <Route path="/deals" element={<div className="text-center py-12 text-muted-foreground">Deals module coming soon</div>} />
            <Route path="/finance" element={<div className="text-center py-12 text-muted-foreground">Finance module coming soon</div>} />
            <Route path="/templates" element={<div className="text-center py-12 text-muted-foreground">Templates module coming soon</div>} />
            <Route path="/edge-control" element={<div className="text-center py-12 text-muted-foreground">Edge Control module coming soon</div>} />
            <Route path="/settings" element={<div className="text-center py-12 text-muted-foreground">Settings module coming soon</div>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
