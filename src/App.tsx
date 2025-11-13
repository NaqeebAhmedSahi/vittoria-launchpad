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
import Firms from "./pages/Firms";
import Teams from "./pages/Teams";
import Deals from "./pages/Deals";
import Finance from "./pages/Finance";
import Templates from "./pages/Templates";
import EdgeControl from "./pages/EdgeControl";
import Settings from "./pages/Settings";
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
            <Route path="/firms" element={<Firms />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/edge-control" element={<EdgeControl />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
