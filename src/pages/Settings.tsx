import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Database, Cpu, Link2, Shield, Info } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure system preferences and integrations</p>
      </div>

      <Tabs defaultValue="database" className="space-y-6">
        <TabsList>
          <TabsTrigger value="database">Database & Storage</TabsTrigger>
          <TabsTrigger value="llm">LLM & Embeddings</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="security">Security & GDPR</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-host">Host</Label>
                  <Input id="db-host" defaultValue="localhost" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-port">Port</Label>
                  <Input id="db-port" defaultValue="5432" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="db-name">Database Name</Label>
                <Input id="db-name" defaultValue="bws_vittoria" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-user">Username</Label>
                  <Input id="db-user" defaultValue="vittoria_admin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-password">Password</Label>
                  <Input id="db-password" type="password" defaultValue="••••••••••" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline">Test Connection</Button>
                <Button variant="outline">Run Migrations</Button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-status-success/10 border border-status-success/20">
                <CheckCircle className="h-4 w-4 text-status-success" />
                <div className="text-sm">
                  <span className="font-medium">Connected</span>
                  <span className="text-muted-foreground ml-2">Schema version: v2025.11.2</span>
                </div>
              </div>
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
                  <p className="text-sm text-muted-foreground">Archive documents older than 2 years</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage-path">Storage Path</Label>
                <Input id="storage-path" defaultValue="/var/vittoria/storage" />
              </div>
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
                  <CardDescription>Configure local language model endpoint and settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-endpoint">LLM Endpoint URL</Label>
                <Input id="llm-endpoint" defaultValue="http://127.0.0.1:11434" placeholder="http://localhost:11434" />
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
                  <p className="text-sm text-muted-foreground">Enable semantic search and similarity matching</p>
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
                    <p className="text-sm text-muted-foreground">Access Office 365 and Azure AD data</p>
                    <Badge variant="secondary" className="mt-2">Disabled</Badge>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Make.com Integration</div>
                    <p className="text-sm text-muted-foreground">Automation workflow connector</p>
                    <Badge variant="secondary" className="mt-2">Disabled</Badge>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">LinkedIn API</div>
                    <p className="text-sm text-muted-foreground">Import candidate profiles from LinkedIn</p>
                    <Badge variant="secondary" className="mt-2">Disabled</Badge>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Webhook Endpoints</div>
                    <p className="text-sm text-muted-foreground">Receive real-time updates from external systems</p>
                    <Badge variant="secondary" className="mt-2">Disabled</Badge>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">All connectors are disabled by default. Enable only the services you need.</p>
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
                  <CardTitle>Security & GDPR Compliance</CardTitle>
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
                  <Label htmlFor="audit-retention" className="text-sm font-normal">Audit Log Retention Period</Label>
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
                <Label className="text-base mb-3 block">System Status</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Database Connection</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Connected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">LLM Service</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Storage</span>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Available
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  © 2025 BWS Executive Search. All rights reserved.<br />
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
