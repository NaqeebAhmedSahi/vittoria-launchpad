import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Intake from "./pages/Intake";
import Approvals from "./pages/Approvals";
import Candidates from "./pages/Candidates";
import Mandates from "./pages/Mandates";
import Firms from "./pages/Firms";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import Deals from "./pages/Deals";
import Documents from "./pages/Documents";
import Finance from "./pages/Finance";
import FinanceTransactions from "./pages/FinanceTransactions";
import AuditLog from "./pages/AuditLog";
import BusinessFinancialsDashboard from "./pages/financials/business/BusinessFinancialsDashboard";
import BusinessLedger from "./pages/financials/business/BusinessLedger";
import BusinessCashflow from "./pages/financials/business/BusinessCashflow";
import DividendsSalary from "./pages/financials/business/DividendsSalary";
import VATAndTax from "./pages/financials/business/VATAndTax";
import ManageExpenses from "./pages/financials/business/ManageExpenses";
import ManagePersonalExpenses from "./pages/financials/personal/ManagePersonalExpenses";
import PersonalFinancialsDashboard from "./pages/financials/personal/PersonalFinancialsDashboard";
import PersonalLedger from "./pages/financials/personal/PersonalLedger";
import AccountantExports from "./pages/financials/AccountantExports";
import Templates from "./pages/Templates";
import EdgeControl from "./pages/EdgeControl";
import DealHeatIndex from "./pages/edge/DealHeatIndex";
import TalentEcosystemMap from "./pages/edge/TalentEcosystemMap";
import StrategicThemeAlignment from "./pages/edge/StrategicThemeAlignment";
import MarketHiringWindow from "./pages/edge/MarketHiringWindow";
import DealStructureOverview from "./pages/edge/DealStructureOverview";
import FirmArchetypeMap from "./pages/edge/FirmArchetypeMap";
import IntelligenceHub from "./pages/intelligence/IntelligenceHub";
import BiasWatch from "./pages/intelligence/BiasWatch";
import BiasAwareDemo from "./pages/BiasAwareDemo";
import ScoringFlowDemo from "./pages/ScoringFlowDemo";
import IntegratedScoringDemo from "./pages/IntegratedScoringDemo";
import { BiasScoringWizard } from "./components/BiasScoringWizard";
import VoiceInbox from "./pages/voice/VoiceInbox";
import VoiceNoteDetail from "./pages/voice/VoiceNoteDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";
import Setup from "./pages/Setup";
import SourceManagement from "./pages/SourceManagement";
import SourceDirectory from "./pages/SourceDirectory";
import SourceDetail from "./pages/SourceDetail";
import SourceTagging from "./pages/SourceTagging";
import HistoricalImport from "./pages/HistoricalImport";
import MandateFeedback from "./pages/MandateFeedback";
import MandateOutcomeLog from "./pages/MandateOutcomeLog";
import OrgPatternOverview from "./pages/OrgPatternOverview";
import MandateSimilarityDebug from "./pages/MandateSimilarityDebug";
import ReliabilityPage from "./pages/ReliabilityPage.tsx";
import ReliabilitySourceDetail from "./pages/ReliabilitySourceDetail.tsx";
import EmailManagementPage from "./pages/EmailManagementPage";
import CalendarPage from "./pages/CalendarPage";
import IntakeFoldersPage from "./pages/IntakeFoldersPage";
import OperationsSettingsPage from "./pages/OperationsSettingsPage";
import ContactsPage from "./pages/ContactsPage";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  // Check if setup is completed on mount (BEFORE auth check)
  useEffect(() => {
    const checkSetup = async () => {
      try {
        console.log('[App] Checking if setup is completed...');
        const result = await window.api.setup.isCompleted();
        console.log('[App] Setup check result:', result);
        
        if (!result.completed) {
          console.log('[App] Setup not completed, showing setup wizard');
          setSetupNeeded(true);
        } else {
          console.log('[App] Setup already completed');
        }
      } catch (error) {
        console.error('[App] Error checking setup:', error);
        // If there's an error checking setup, assume it's needed
        setSetupNeeded(true);
      } finally {
        setIsCheckingSetup(false);
      }
    };

    checkSetup();
  }, []);

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

  const handleSetupComplete = () => {
    console.log('[App] Setup completed, reloading application...');
    setSetupNeeded(false);
    // Reload to reinitialize with PostgreSQL
    window.location.reload();
  };

  // Show loading spinner while checking setup
  if (isCheckingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show setup wizard if setup is not completed
  if (setupNeeded) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Setup onComplete={handleSetupComplete} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

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
  const RouterComponent: any = (typeof window !== "undefined" && window.location.protocol === "file:") ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Router selection: HashRouter for file:// (packaged Electron), BrowserRouter for dev server */}
        {/* RouterComponent is declared above so we can pick the correct router at runtime */}
            <RouterComponent>
              <AppLayout onSignOut={handleSignOut} currentUser={currentUser}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/intake" element={<Intake />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/candidates" element={<Candidates />} />
              <Route path="/mandates" element={<Mandates />} />
              <Route path="/firms" element={<Firms />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/people" element={<People />} />
              <Route path="/people/:id" element={<PersonDetail />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/documents" element={<Documents />} />

              <Route path="/admin/reliability" element={<ReliabilityPage />} />

              {/* Finance Routes */}
              <Route path="/finance" element={<Finance />} />
              <Route path="/finance/transactions" element={<FinanceTransactions />} />
              <Route path="/finance/business" element={<BusinessFinancialsDashboard />} />
              <Route path="/finance/business/ledger" element={<BusinessLedger />} />
              <Route path="/finance/business/cashflow" element={<BusinessCashflow />} />
              <Route path="/finance/business/dividends-salary" element={<DividendsSalary />} />
              <Route path="/finance/business/vat-tax" element={<VATAndTax />} />
              <Route path="/finance/expenses/business" element={<ManageExpenses />} />
              <Route path="/finance/expenses/personal" element={<ManagePersonalExpenses />} />
              <Route path="/finance/personal" element={<PersonalFinancialsDashboard />} />
              <Route path="/finance/personal/ledger" element={<PersonalLedger />} />
              <Route path="/finance/exports" element={<AccountantExports />} />
              
              {/* Audit Route */}
              <Route path="/audit" element={<AuditLog />} />

              {/* Intelligence Routes */}
                  <Route path="/intelligence" element={<IntelligenceHub />} />
                  <Route path="/intelligence/bias-watch" element={<BiasWatch />} />
                  <Route path="/intelligence/bias-demo" element={<BiasAwareDemo />} />
                  <Route path="/intelligence/scoring-demo" element={<ScoringFlowDemo />} />
                  <Route path="/intelligence/integrated-demo" element={<IntegratedScoringDemo />} />
                  <Route path="/intelligence/bias-wizard" element={
                    <div className="p-6">
                      <BiasScoringWizard 
                        mandateId="demo-mandate"
                        mandateName="Demo Mandate - PE Associate"
                        candidates={[]}
                      />
                    </div>
                  } />
              
              {/* Similarity/Source Routes */}
              <Route path="/admin/sources" element={<SourceDirectory />} />
              <Route path="/admin/sources/manage" element={<SourceManagement />} />
              <Route path="/admin/sources/tagging" element={<SourceTagging />} />
              <Route path="/admin/sources/:id" element={<SourceDetail />} />
              <Route path="/admin/similarity/org-pattern" element={<OrgPatternOverview />} />
              <Route path="/admin/similarity/import-history" element={<HistoricalImport />} />
              <Route path="/mandates/:id/feedback" element={<MandateFeedback />} />
              <Route path="/mandates/:id/outcomes" element={<MandateOutcomeLog />} />
              <Route path="/admin/reliability/sources/:id" element={<ReliabilitySourceDetail />} />
              <Route path="/admin/mandates/:id/similarity" element={<MandateSimilarityDebug />} />
              
              {/* Voice Notes Routes */}
              <Route path="/voice" element={<VoiceInbox />} />
              <Route path="/voice/:noteId" element={<VoiceNoteDetail />} />
              
              <Route path="/templates" element={<Templates />} />
              
              {/* Edge Control Routes */}
              <Route path="/edge-control" element={<EdgeControl />} />
              <Route path="/edge/deal-heat" element={<DealHeatIndex />} />
              <Route path="/edge/talent-ecosystem" element={<TalentEcosystemMap />} />
              <Route path="/edge/strategic-themes" element={<StrategicThemeAlignment />} />
              <Route path="/edge/hiring-window" element={<MarketHiringWindow />} />
              <Route path="/edge/deal-structure" element={<DealStructureOverview />} />
              <Route path="/edge/firm-archetypes" element={<FirmArchetypeMap />} />
              
              {/* Operations Routes */}
              <Route path="/operations/email" element={<EmailManagementPage />} />
              <Route path="/operations/calendar" element={<CalendarPage />} />
              <Route path="/operations/intake-folders" element={<IntakeFoldersPage />} />
              <Route path="/operations/contacts" element={<ContactsPage />} />
              <Route path="/operations/settings" element={<OperationsSettingsPage />} />
              
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AppLayout>
          </RouterComponent>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
