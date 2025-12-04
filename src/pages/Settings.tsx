import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // provider only
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Database,
  Cpu,
  Link2,
  Shield,
  Info,
  Save,
  Activity,
  XCircle,
  Clock,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import PromptConfig from "@/components/PromptConfig";
import { FinancialIntelligenceEngine } from "@/services/financialIntelligenceEngine";
import { sample13WeekCashflow, sampleBusinessLedgerSummary, sampleTaxDeadlines } from "@/data/sampleFinancials";
import type { FinancialAlert, FinancialRecommendation } from "@/types/financial";

// Helper function to get display name for provider
function getProviderDisplayName(providerName: string): string {
  const providerMap: Record<string, string> = {
    "openai": "OpenAI",
    "google": "Google",
    "llmstudio": "Local (LLMStudio)",
    "local": "Local (Ollama)",
  };
  return providerMap[providerName] || providerName;
}

function AIConfigCard() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [providersMap, setProvidersMap] = useState<Record<string, any>>({});
  // Model now forced (read-only) to pro tier based on provider
  const [model, setModel] = useState("gpt-4o");
  const [activeModel, setActiveModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434/v1");
  const [localModel, setLocalModel] = useState("llama3");

  useEffect(() => {
    (async () => {
      try {
        const key = await (window.api as any).settings.getSetting("openai_api_key");
        if (key) setApiKey(key);

        // load existing provider keys map
        const pm = await (window.api as any).settings.getSetting("llm_providers");
        if (pm) {
          try {
            const parsed = (typeof pm === "string" ? JSON.parse(pm) : pm) as Record<
              string,
              any
            >;
            setProvidersMap(parsed || {});
            // If there's an active provider, pre-select it and load its key/model
            const activeEntry = Object.entries(parsed || {}).find(
              ([, info]) => info && (info as any).isActive,
            );
            if (activeEntry) {
              const [name, info] = activeEntry as [string, any];
              setProvider(name);
              if (info && (info as any).key) setApiKey((info as any).key);
              if (info && (info as any).model) setModel((info as any).model);
              if (info && (info as any).baseUrl) setBaseUrl((info as any).baseUrl);
              if (name === 'local' && (info as any).model) setLocalModel((info as any).model);
              if (name === 'llmstudio' && (info as any).model) setLocalModel((info as any).model);
            }
          } catch (e) {
            console.warn("Failed to parse llm_providers setting", e);
          }
        }
      } catch (err) {
        console.error("Failed to load OpenAI key", err);
      }
      // Load active LLM model (read-only best pro selection)
      try {
        const am = await (window.api as any).llm.activeModel();
        if (am) setActiveModel(am);
      } catch (e) {
        console.warn("Failed to fetch active model", e);
      }
    })();
  }, []);

  // When provider changes, force model to pro variant (OpenAI gpt-4o, Google gemini-2.5-pro)
  useEffect(() => {
    let forced = "gpt-4o";
    if (provider === "google") forced = "gemini-2.5-pro";
    else if (provider === "local") forced = localModel || "qwen2.5:7b";
    else if (provider === "llmstudio") forced = localModel || "qwen2.5-7b-instruct";

    setModel(forced);
    const info = providersMap && providersMap[provider];
    if (info) {
      if (info.key) setApiKey(info.key);
      if (info.baseUrl) setBaseUrl(info.baseUrl);
      if (info.model && (provider === "local" || provider === "llmstudio")) setLocalModel(info.model);
    } else {
      // Defaults for new provider selection
      if (provider === "local") {
        setBaseUrl("http://localhost:11434/");
        setLocalModel("llama3");
        setApiKey(""); // Clear key for local as it might be empty
      } else if (provider === "llmstudio") {
        setBaseUrl("http://localhost:1234/v1");
        setLocalModel("qwen2.5-7b-instruct");
        setApiKey("lm-studio"); // Dummy key usually needed
      }
    }
  }, [provider, providersMap]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await (window.api as any).settings.setSetting("openai_api_key", apiKey || "");
      toast({ title: "Saved", description: "OpenAI API key saved" });
    } catch (err) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const persistProviders = async (newMap: Record<string, any>) => {
    await (window.api as any).settings.setSetting("llm_providers", JSON.stringify(newMap));
    setProvidersMap(newMap);
  };

  const handleSaveProvider = async () => {
    if (!apiKey && provider !== "local" && provider !== "llmstudio")
      return toast({
        title: "No key",
        description: "Please enter an API key",
        variant: "destructive",
      });
    setIsSaving(true);
    try {
      // For local providers, ensure the model is loaded/available
      if (provider === "local" || provider === "llmstudio") {
        toast({
          title: "Loading Model...",
          description: `Checking availability of ${localModel}...`,
        });

        const result = await (window.api as any).llm.ensureModelLoaded(
          provider,
          localModel,
          baseUrl
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to load model");
        }
      }

      // Save provider key and mark it active (disconnect others)
      const newMap = { ...(providersMap || {}) };
      // store only the key and active flag; keep created_at for debugging
      Object.keys(newMap).forEach((k) => {
        if (newMap[k]) newMap[k].isActive = false;
      });
      const forcedModel = provider === "google" ? "gemini-2.5-pro" : ((provider === "local" || provider === "llmstudio") ? localModel : "gpt-4o");
      newMap[provider] = {
        key: apiKey,
        isActive: true,
        model: forcedModel,
        baseUrl: (provider === "local" || provider === "llmstudio") ? baseUrl : undefined,
        updated_at: new Date().toISOString(),
      };
      await persistProviders(newMap);
      toast({
        title: "Saved",
        description: `${provider} connected and model loaded`,
      });
      setModel(forcedModel);
      setActiveModel(forcedModel);
    } catch (err) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActive = async (name: string) => {
    const newMap = { ...(providersMap || {}) };
    Object.keys(newMap).forEach((k) => {
      if (newMap[k]) newMap[k].isActive = false;
    });
    if (newMap[name]) newMap[name].isActive = true;
    await persistProviders(newMap);
    toast({
      title: "Switched",
      description: `${name} is now active`,
    });
    const info = newMap[name];
    if (info?.model) setActiveModel(info.model);
  };

  const handleRemoveProvider = async (name: string) => {
    const newMap = { ...(providersMap || {}) };
    delete newMap[name];
    await persistProviders(newMap);
    toast({
      title: "Removed",
      description: `${name} key removed`,
    });
  };

  const handleTest = async () => {
    if (!apiKey && provider !== "local" && provider !== "llmstudio")
      return toast({
        title: "No key",
        description: "Please enter an API key first",
        variant: "destructive",
      });
    try {
      let url = "https://api.openai.com/v1/models";
      if ((provider === "local" || provider === "llmstudio") && baseUrl) {
        url = `${baseUrl.replace(/\/+$/, "")}/models`;
      }

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey || "dummy"}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Status ${resp.status}`);
      }
      toast({ title: "Success", description: "API key is valid" });
    } catch (err) {
      toast({
        title: "Test failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="openai-key">API Key</Label>
        <p className="text-sm text-muted-foreground">
          Select a provider and save its API key. Saving a key will connect that provider and
          disconnect others.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="llmstudio">Local (LLMStudio)</SelectItem>
                <SelectItem value="local">Local (Ollama)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "local" || provider === "llmstudio" ? (
            <>
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="base-url">Base URL</Label>
                  <Input
                    id="base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={provider === "llmstudio" ? "http://localhost:1234/v1" : "http://localhost:11434/v1"}
                  />
                </div>
                <div>
                  <Label htmlFor="local-model">Model Name</Label>
                  <Select value={localModel} onValueChange={setLocalModel}>
                    <SelectTrigger id="local-model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {provider === "local" ? (
                        <>
                          <SelectItem value="qwen2.5:7b">qwen2.5:7b</SelectItem>
                          <SelectItem value="llama3.2">llama3.2</SelectItem>
                          <SelectItem value="llama3.1">llama3.1</SelectItem>
                          <SelectItem value="mistral">mistral</SelectItem>
                          <SelectItem value="gemma2">gemma2</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="qwen2.5-7b-instruct">Qwen2.5-7B-Instruct</SelectItem>
                          <SelectItem value="gpt-oss-120b">OpenAI GPT OSS 120B</SelectItem>
                          <SelectItem value="openai/gpt-oss-20b">OpenAI GPT OSS 20B</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* API Key hidden for local providers */}
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="openai-key">Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <Button variant="ghost" onClick={() => setShowKey((s) => !s)}>
                    {showKey ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Model (read-only)</Label>
                <Input value={model} readOnly className="bg-muted/40" />
              </div>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Keys are stored locally in application settings. Only one provider can be connected at a
          time.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button onClick={handleSaveProvider} disabled={isSaving}>
          {isSaving ? "Saving..." : `Save & Connect ${provider}`}
        </Button>
        {provider !== "local" && provider !== "llmstudio" && (
          <Button variant="outline" onClick={handleTest}>
            Test Key
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        <Label>Active LLM Model (read-only)</Label>
        <Input value={activeModel || model} readOnly className="bg-muted/40" />
        <p className="text-xs text-muted-foreground">
          Automatically selects the best available pro model for the connected provider.
        </p>
      </div>

      <div className="pt-4">
        <Label>Configured Providers</Label>
        <div className="space-y-2 mt-2">
          {Object.keys(providersMap || {}).length === 0 && (
            <p className="text-sm text-muted-foreground">No providers configured yet.</p>
          )}
          {Object.entries(providersMap || {}).map(([name, info]) => (
            <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{getProviderDisplayName(name)}</div>
                <div className="text-sm text-muted-foreground">
                  {info.model
                    ? `${info.model} · ${info.updated_at
                      ? `Updated: ${new Date(info.updated_at).toLocaleString()}`
                      : ""
                    }`
                    : info.updated_at
                      ? `Updated: ${new Date(info.updated_at).toLocaleString()}`
                      : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {info.isActive ? (
                  <Badge>Connected</Badge>
                ) : (
                  <Badge variant="secondary">Disconnected</Badge>
                )}
                {!info.isActive && (
                  <Button size="sm" onClick={() => handleSetActive(name)}>
                    Connect
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (navigator.clipboard && info.key) {
                      navigator.clipboard.writeText(info.key);
                      toast({
                        title: "Copied",
                        description: "Key copied to clipboard",
                      });
                    } else {
                      toast({
                        title: "Copy failed",
                        description: "Clipboard not available",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Copy Key
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveProvider(name)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [cvStoragePath, setCvStoragePath] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [scoringApiEndpoint, setScoringApiEndpoint] = useState("");
  const [scoringApiKey, setScoringApiKey] = useState("");
  const [isSavingScoring, setIsSavingScoring] = useState(false);

  // Database connection state
  const [dbInfo, setDbInfo] = useState<{
    connected: boolean;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    version?: string;
    size?: string;
    tableCount?: number;
  }>({ connected: false });
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Health check state
  const [healthStatus, setHealthStatus] = useState<{
    overall: 'operational' | 'degraded' | 'outage';
    lastChecked: Date;
    components: Array<{
      name: string;
      status: 'operational' | 'degraded' | 'outage' | 'maintenance';
      category: 'core' | 'feature' | 'migration';
      description?: string;
    }>;
  }>({
    overall: 'operational',
    lastChecked: new Date(),
    components: []
  });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  const { toast } = useToast();

  // Load CV storage path and scoring API settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load database info
      try {
        setIsLoadingDb(true);
        const info = await (window.api as any).setup.getDatabaseInfo();
        if (info.success && info.connected) {
          setDbInfo({
            connected: true,
            host: info.host,
            port: info.port,
            database: info.database,
            username: info.username,
            version: info.version,
            size: info.size,
            tableCount: info.tableCount,
          });
        } else {
          setDbInfo({ connected: false });
        }
      } catch (err) {
        console.error("Failed to load database info:", err);
        setDbInfo({ connected: false });
      } finally {
        setIsLoadingDb(false);
      }

      // Load CV storage path
      try {
        const path = await (window.api as any).settings.getCVStoragePath();
        if (path) setCvStoragePath(path);
      } catch (err) {
        console.error("Failed to load CV storage path:", err);
      }

      try {
        const endpoint = await (window.api as any).settings.getSetting(
          "scoring_api_endpoint",
        );
        if (endpoint) setScoringApiEndpoint(endpoint);
      } catch (err) {
        console.error("Failed to load scoring_api_endpoint:", err);
      }

      try {
        const apiKey = await (window.api as any).settings.getSetting("scoring_api_key");
        if (apiKey) setScoringApiKey(apiKey);
      } catch (err) {
        console.error("Failed to load scoring_api_key:", err);
      }
    };

    loadSettings();
    loadHealthStatus();
  }, []);

  const loadHealthStatus = async () => {
    try {
      // Check database connection
      const dbStatus = await (window.api as any).setup.getDatabaseInfo();
      const isDatabaseUp = dbStatus.success && dbStatus.connected;

      // Simulate checking other services (in production, these would be real API calls)
      const components: Array<{
        name: string;
        status: 'operational' | 'degraded' | 'maintenance' | 'outage';
        category: 'core' | 'feature' | 'migration';
        description?: string;
      }> = [
          // Core Services
          {
            name: 'Database Connection',
            status: isDatabaseUp ? 'operational' : 'outage',
            category: 'core',
            description: isDatabaseUp ? `PostgreSQL ${dbStatus.version || ''}` : 'Cannot connect to database'
          },
          {
            name: 'Authentication Service',
            status: isDatabaseUp ? 'operational' : 'degraded',
            category: 'core',
            description: 'User authentication and session management'
          },
          {
            name: 'File Storage',
            status: 'operational',
            category: 'core',
            description: 'Local file system storage for CVs and documents'
          },
          {
            name: 'LLM Service',
            status: 'operational',
            category: 'core',
            description: 'AI-powered CV parsing and analysis'
          },

          // Feature Modules
          {
            name: 'CV Intake & Parsing',
            status: 'operational',
            category: 'feature',
            description: 'Upload and parse CV documents'
          },
          {
            name: 'Candidate Management',
            status: 'operational',
            category: 'feature',
            description: 'Create, update, and manage candidate profiles'
          },
          {
            name: 'Mandate Management',
            status: 'operational',
            category: 'feature',
            description: 'Job mandate creation and tracking'
          },
          {
            name: 'Firm Management',
            status: 'operational',
            category: 'feature',
            description: 'Client firm database and management'
          },
          {
            name: 'Quality Scoring',
            status: 'operational',
            category: 'feature',
            description: 'CV quality assessment and scoring'
          },
          {
            name: 'Match Scoring Engine',
            status: 'degraded',
            category: 'feature',
            description: 'Candidate-mandate matching (migration in progress)'
          },
          {
            name: 'Team Management',
            status: 'maintenance',
            category: 'feature',
            description: 'Planned for future release'
          },
          {
            name: 'Deal Tracking',
            status: 'maintenance',
            category: 'feature',
            description: 'Planned for future release'
          },
          {
            name: 'Finance & Invoicing',
            status: 'maintenance',
            category: 'feature',
            description: 'Planned for future release'
          },

          // Database Migration Status
          {
            name: 'Authentication Model',
            status: 'operational',
            category: 'migration',
            description: 'PostgreSQL migration complete'
          },
          {
            name: 'Settings Model',
            status: 'operational',
            category: 'migration',
            description: 'PostgreSQL migration complete'
          },
          {
            name: 'Candidate Model',
            status: 'operational',
            category: 'migration',
            description: 'PostgreSQL migration complete'
          },
          {
            name: 'Firm Model',
            status: 'operational',
            category: 'migration',
            description: 'PostgreSQL migration complete'
          },
          {
            name: 'Mandate Model',
            status: 'operational',
            category: 'migration',
            description: 'PostgreSQL migration complete'
          },
          {
            name: 'Intake Model',
            status: 'degraded',
            category: 'migration',
            description: 'Migration in progress - schema updated, functions being migrated'
          },
          {
            name: 'Scoring Model',
            status: 'degraded',
            category: 'migration',
            description: 'Migration pending'
          }
        ];

      // Determine overall status
      const hasOutage = components.some(c => c.status === 'outage');
      const hasDegraded = components.some(c => c.status === 'degraded');

      setHealthStatus({
        overall: hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational',
        lastChecked: new Date(),
        components
      });
    } catch (error) {
      console.error('Error loading health status:', error);
      setHealthStatus({
        overall: 'outage',
        lastChecked: new Date(),
        components: []
      });
    }
  };

  const handleRefreshHealth = async () => {
    setIsRefreshingHealth(true);
    await loadHealthStatus();
    setTimeout(() => setIsRefreshingHealth(false), 500);
    toast({
      title: "Refreshed",
      description: "Health status updated successfully"
    });
  };

  const handleSaveCVPath = async () => {
    if (!cvStoragePath.trim()) {
      toast({
        title: "Error",
        description: "CV storage path cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await (window.api as any).settings.setCVStoragePath(cvStoragePath);
      toast({
        title: "Success",
        description: "CV storage path updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveScoringApiConfig = async () => {
    setIsSavingScoring(true);
    try {
      await (window.api as any).settings.setSetting(
        "scoring_api_endpoint",
        scoringApiEndpoint || "",
      );
      await (window.api as any).settings.setSetting(
        "scoring_api_key",
        scoringApiKey || "",
      );
      toast({
        title: "Success",
        description: "Scoring API configuration saved",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsSavingScoring(false);
    }
  };

  const handleDisconnectDatabase = async () => {
    if (!confirm("Are you sure you want to disconnect the database? You will need to reconfigure the connection.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const result = await (window.api as any).setup.disconnect();
      if (result.success) {
        toast({
          title: "Disconnected",
          description: "Database disconnected successfully. Reloading application...",
        });
        setDbInfo({ connected: false });

        // Reload the application to trigger setup check
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to disconnect database",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure system preferences and integrations
        </p>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="database">Database & Storage</TabsTrigger>
          <TabsTrigger value="llm">LLM & Embeddings</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="ai">AI Config</TabsTrigger>
          <TabsTrigger value="scoring">Scoring Config</TabsTrigger>
          <TabsTrigger value="security">Security & GDPR</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          {/* Overall Status Banner */}
          <Card className={
            healthStatus.overall === 'operational'
              ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
              : healthStatus.overall === 'degraded'
                ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20'
                : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
          }>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {healthStatus.overall === 'operational' ? (
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  ) : healthStatus.overall === 'degraded' ? (
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                      <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  ) : (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {healthStatus.overall === 'operational' && 'All Systems Operational'}
                      {healthStatus.overall === 'degraded' && 'Partial System Outage'}
                      {healthStatus.overall === 'outage' && 'System Outage'}
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshHealth}
                  disabled={isRefreshingHealth}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Core Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Core Services</CardTitle>
                  <CardDescription>Essential system components and infrastructure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {healthStatus.components
                  .filter(c => c.category === 'core')
                  .map((component, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{component.name}</div>
                        {component.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {component.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {component.status === 'operational' ? (
                          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3" /> Operational
                          </Badge>
                        ) : component.status === 'degraded' ? (
                          <Badge variant="outline" className="gap-1 border-yellow-600 text-yellow-600">
                            <AlertCircle className="h-3 w-3" /> Degraded
                          </Badge>
                        ) : component.status === 'outage' ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Outage
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Info className="h-3 w-3" /> Maintenance
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Feature Modules */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Feature Modules</CardTitle>
                  <CardDescription>Application features and functionality</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {healthStatus.components
                  .filter(c => c.category === 'feature')
                  .map((component, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{component.name}</div>
                        {component.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {component.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {component.status === 'operational' ? (
                          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3" /> Operational
                          </Badge>
                        ) : component.status === 'degraded' ? (
                          <Badge variant="outline" className="gap-1 border-yellow-600 text-yellow-600">
                            <AlertCircle className="h-3 w-3" /> Partial
                          </Badge>
                        ) : component.status === 'maintenance' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Info className="h-3 w-3" /> Planned
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Outage
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Database Migration Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>PostgreSQL Migration</CardTitle>
                  <CardDescription>Database model migration from SQLite to PostgreSQL</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {healthStatus.components
                  .filter(c => c.category === 'migration')
                  .map((component, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{component.name}</div>
                        {component.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {component.description}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {component.status === 'operational' ? (
                          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3" /> Complete
                          </Badge>
                        ) : component.status === 'degraded' ? (
                          <Badge variant="outline" className="gap-1 border-yellow-600 text-yellow-600">
                            <AlertCircle className="h-3 w-3" /> In Progress
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Info className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Legend */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-muted-foreground">Operational</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                  <span className="text-muted-foreground">Degraded/Partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-muted-foreground">Outage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <span className="text-muted-foreground">Maintenance/Planned</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Database Connection</CardTitle>
                  <CardDescription>Configure PostgreSQL 16 connection settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingDb ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading database connection...
                </div>
              ) : !dbInfo.connected ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No database connection configured</p>
                  <Button
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Configure Database
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-host">Host</Label>
                      <Input id="db-host" value={dbInfo.host || ""} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="db-port">Port</Label>
                      <Input id="db-port" value={dbInfo.port || ""} readOnly className="bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-name">Database Name</Label>
                    <Input id="db-name" value={dbInfo.database || ""} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-user">Username</Label>
                    <Input id="db-user" value={dbInfo.username || ""} readOnly className="bg-muted" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectDatabase}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? "Disconnecting..." : "Disconnect Database"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-status-success/10 border border-status-success/20">
                    <CheckCircle className="h-4 w-4 text-status-success" />
                    <div className="text-sm flex-1">
                      <span className="font-medium">Connected</span>
                      <div className="text-muted-foreground mt-1">
                        <div>PostgreSQL {dbInfo.version || "Unknown"}</div>
                        <div>Size: {dbInfo.size || "Unknown"} • Tables: {dbInfo.tableCount || 0}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Settings</CardTitle>
              <CardDescription>Configure file storage and document retention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-archive old documents</Label>
                  <p className="text-sm text-muted-foreground">
                    Archive documents older than 2 years
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cv-storage-path">CV Storage Path (Read-Only)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Directory where uploaded CV files will be stored. The folder is automatically
                  created if it doesn&apos;t exist.
                </p>
                <Input
                  id="cv-storage-path"
                  type="text"
                  value={cvStoragePath}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Default path set from database. Future versions will allow customization.
                </p>
              </div>
              {/* If you later want to allow editing, you can add a button that calls handleSaveCVPath */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Local LLM Configuration</CardTitle>
                  <CardDescription>
                    Configure local language model endpoint and settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-endpoint">LLM Endpoint URL</Label>
                <Input
                  id="llm-endpoint"
                  defaultValue="http://127.0.0.1:11434"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-model">Model for Bio Generation</Label>
                <Select defaultValue="llama3">
                  <SelectTrigger id="bio-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama3">Llama 3 70B</SelectItem>
                    <SelectItem value="mistral">Mistral 7B</SelectItem>
                    <SelectItem value="claude">Claude 3 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rationale-model">Model for Rationale Polish</Label>
                <Select defaultValue="mistral">
                  <SelectTrigger id="rationale-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama3">Llama 3 70B</SelectItem>
                    <SelectItem value="mistral">Mistral 7B</SelectItem>
                    <SelectItem value="claude">Claude 3 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline">Test LLM Connection</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Embeddings Configuration</CardTitle>
              <CardDescription>Control vector embeddings and semantic search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Store Embeddings</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable semantic search and similarity matching
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedding-model">Embedding Model</Label>
                <Select defaultValue="bge">
                  <SelectTrigger id="embedding-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bge">BGE-large-en</SelectItem>
                    <SelectItem value="e5">E5-large-v2</SelectItem>
                    <SelectItem value="gte">GTE-large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>AI Configuration</CardTitle>
                  <CardDescription>Configure OpenAI API key and AI parsing options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AIConfigCard />
              <div className="pt-4">
                <PromptConfig />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>CV Quality Scoring Configuration</CardTitle>
                  <CardDescription>
                    View CV quality scoring weights and thresholds (read-only)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  These settings are configured in the system files. Contact your administrator to
                  modify them.
                </p>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-base font-semibold">Scoring Weights</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    How each dimension contributes to the final quality score
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Completeness</span>
                        <Badge variant="outline">40%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Required fields presence</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Experience</span>
                        <Badge variant="outline">40%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Work history completeness
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Education</span>
                        <Badge variant="outline">10%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Educational background</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Parser Confidence</span>
                        <Badge variant="outline">10%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Document quality heuristic
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Quality Thresholds</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Score ranges that determine auto-processing behavior
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div>
                        <div className="font-medium text-sm text-green-900 dark:text-green-100">
                          Good Threshold
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Auto-creates draft candidate
                        </p>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700">≥ 0.75</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div>
                        <div className="font-medium text-sm text-yellow-900 dark:text-yellow-100">
                          Borderline Threshold
                        </div>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          Requires human review
                        </p>
                      </div>
                      <Badge className="bg-yellow-600 hover:bg-yellow-700">≥ 0.50</Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Scoring Rules</Label>
                  <div className="space-y-2 mt-2">
                    <div className="text-sm">
                      <strong>Completeness:</strong> Checks for name, current_title, current_firm,
                      location
                    </div>
                    <div className="text-sm">
                      <strong>Experience:</strong> % of entries with firm + title + dateFrom
                    </div>
                    <div className="text-sm">
                      <strong>Education:</strong> % of entries with institution
                    </div>
                    <div className="text-sm">
                      <strong>Parser Confidence:</strong> Text length heuristic (500-30,000 chars
                      optimal)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Fit Scoring Configuration</CardTitle>
                  <CardDescription>
                    View candidate-mandate matching weights (read-only)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  These weights determine how candidates are scored against mandate requirements.
                </p>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-base font-semibold">Dimension Weights</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    How each dimension contributes to the final fit score (0-100)
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Sector Match</div>
                        <p className="text-xs text-muted-foreground">Industry alignment</p>
                      </div>
                      <Badge variant="outline" className="text-base">
                        40%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Function Match</div>
                        <p className="text-xs text-muted-foreground">Role type alignment</p>
                      </div>
                      <Badge variant="outline" className="text-base">
                        25%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Asset Class Match</div>
                        <p className="text-xs text-muted-foreground">Product category alignment</p>
                      </div>
                      <Badge variant="outline" className="text-base">
                        15%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Geography Match</div>
                        <p className="text-xs text-muted-foreground">Regional alignment</p>
                      </div>
                      <Badge variant="outline" className="text-base">
                        10%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">Seniority Match</div>
                        <p className="text-xs text-muted-foreground">Level alignment</p>
                      </div>
                      <Badge variant="outline" className="text-base">
                        10%
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Scoring Logic</Label>
                  <div className="space-y-2 mt-2">
                    <div className="text-sm">
                      <strong>Exact Match:</strong> 1.0 score (full weight contribution)
                    </div>
                    <div className="text-sm">
                      <strong>Partial Match:</strong> 0.5 score (half weight contribution)
                    </div>
                    <div className="text-sm">
                      <strong>No Match:</strong> 0.0 score (no contribution)
                    </div>
                    <div className="text-sm">
                      <strong>Seniority:</strong> Inside band = 1.0, Adjacent = 0.5, Outside = 0.0
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API-Based Scoring Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>External Scoring API</CardTitle>
                  <CardDescription>
                    Configure external API for candidate-mandate scoring
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  If configured, scoring will be delegated to an external API. Otherwise, local
                  scoring is used.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="scoring_api_endpoint">API Endpoint URL</Label>
                  <Input
                    id="scoring_api_endpoint"
                    placeholder="https://your-api.com/v1/score"
                    value={scoringApiEndpoint}
                    onChange={(e) => setScoringApiEndpoint(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    POST endpoint that accepts candidate and mandate data.
                  </p>
                </div>

                <div>
                  <Label htmlFor="scoring_api_key">API Key (Optional)</Label>
                  <Input
                    id="scoring_api_key"
                    type="password"
                    placeholder="Bearer token or API key"
                    value={scoringApiKey}
                    onChange={(e) => setScoringApiKey(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be sent as Authorization: Bearer {"{token}"}.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveScoringApiConfig}
                    className="w-full"
                    disabled={isSavingScoring}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingScoring ? "Saving..." : "Save API Configuration"}
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Label className="text-sm font-semibold">Expected API Contract:</Label>
                  <div className="p-3 bg-muted rounded-lg text-xs font-mono">
                    <div className="text-muted-foreground">POST /score</div>
                    <div className="mt-2">
                      Request: {"{candidate, mandate, firm, config}"}
                    </div>
                    <div className="mt-1">
                      Response: {"{finalScore, dimensionScores}"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectors" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>External Connectors</CardTitle>
                  <CardDescription>Manage integrations with external services</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Microsoft Graph API</div>
                    <p className="text-sm text-muted-foreground">
                      Access Office 365 and Azure AD data
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Disabled
                    </Badge>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Make.com Integration</div>
                    <p className="text-sm text-muted-foreground">
                      Automation workflow connector
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Disabled
                    </Badge>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">LinkedIn API</div>
                    <p className="text-sm text-muted-foreground">
                      Import candidate profiles from LinkedIn
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Disabled
                    </Badge>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Webhook Endpoints</div>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time updates from external systems
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Disabled
                    </Badge>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  All connectors are disabled by default. Enable only the services you need.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Security &amp; GDPR Compliance</CardTitle>
                  <CardDescription>Data protection and privacy controls</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Data Controller Role</Label>
                <Textarea
                  readOnly
                  className="text-sm"
                  rows={4}
                  defaultValue="Vittoria processes personal data as a data processor on behalf of your organization. All candidate and client data is processed in accordance with GDPR Article 28 and your organization's data processing agreement."
                />
              </div>

              <div className="space-y-3">
                <Label>Lawful Basis for Processing</Label>
                <Textarea
                  readOnly
                  className="text-sm"
                  rows={3}
                  defaultValue="Processing is based on legitimate interests (Article 6(1)(f) GDPR) for executive search services, and explicit consent for marketing communications. Special category data requires explicit consent under Article 9."
                />
              </div>

              <div className="border-t pt-6 space-y-4">
                <Label className="text-base">Data Subject Rights</Label>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Export All Personal Data (GDPR Right to Access)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Delete Personal Data (GDPR Right to Erasure)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Generate Data Processing Report
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <Label>Log Retention Settings</Label>
                <div className="space-y-2">
                  <Label htmlFor="audit-retention" className="text-sm font-normal">
                    Audit Log Retention Period
                  </Label>
                  <Select defaultValue="2years">
                    <SelectTrigger id="audit-retention">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1year">1 Year</SelectItem>
                      <SelectItem value="2years">2 Years</SelectItem>
                      <SelectItem value="5years">5 Years</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>About Vittoria</CardTitle>
                  <CardDescription>System information and version details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground">Version</Label>
                  <p className="text-lg font-medium mt-1">2025.11.1</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Build</Label>
                  <p className="text-lg font-medium mt-1">20251113-1432</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Database Schema</Label>
                  <p className="text-lg font-medium mt-1">v2025.11.2</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">License Type</Label>
                  <p className="text-lg font-medium mt-1">Enterprise</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base mb-3 block">Quick Status</Label>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Status</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> {healthStatus.overall === 'operational' ? 'Operational' : healthStatus.overall === 'degraded' ? 'Degraded' : 'Outage'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For detailed health status and component monitoring, visit the{' '}
                    <button
                      onClick={() => {
                        const healthTab = document.querySelector('[value="health"]') as HTMLElement;
                        healthTab?.click();
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      System Health
                    </button>
                    {' '}tab.
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  © 2025 BWS Executive Search. All rights reserved.
                  <br />
                  Vittoria is an internal CRM workspace for executive search operations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
