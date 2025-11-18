import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
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
import SignIn from "./pages/SignIn";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("authUser");

        if (storedToken && storedUser) {
          // Validate session with backend
          const result = await window.api.auth.validateSession(storedToken);
          
          if (result.valid && result.user) {
            setIsAuthenticated(true);
            setAuthToken(storedToken);
            setCurrentUser(result.user);
          } else {
            // Session invalid, clear storage
            localStorage.removeItem("authToken");
            localStorage.removeItem("authUser");
          }
        }
      } catch (error) {
        console.error("Session validation error:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  const handleSignIn = (token: string, user: any) => {
    setAuthToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleSignOut = async () => {
    if (authToken) {
      await window.api.auth.logout(authToken);
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Show loading spinner while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page if not authenticated
  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SignIn onSignIn={handleSignIn} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show main app if authenticated
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout onSignOut={handleSignOut} currentUser={currentUser}>
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
};

export default App;
