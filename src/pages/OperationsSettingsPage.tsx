import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Cloud, Settings as SettingsIcon, Database, Bell } from "lucide-react";

interface MailboxConfig {
  id: number;
  email: string;
  access_enabled: boolean;
}

interface IntegrationStatus {
  id: number;
  name: string;
  enabled: boolean;
  icon: React.ElementType;
}

interface UserPreferences {
  emailSignature?: string;
  notifications?: {
    emailAlerts: boolean;
    calendarReminders: boolean;
    documentUpdates: boolean;
  };
}

export default function OperationsSettingsPage() {
  const [mailboxes, setMailboxes] = useState<MailboxConfig[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [emailSignature, setEmailSignature] = useState("");
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    calendarReminders: true,
    documentUpdates: false,
  });
  const [loading, setLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load mailboxes
      const mailboxResult: any = await window.api.operationsSettings.getAllMailboxes();
      const mailboxList = Array.isArray(mailboxResult)
        ? mailboxResult
        : mailboxResult && Array.isArray(mailboxResult.mailboxes)
        ? mailboxResult.mailboxes
        : mailboxResult && Array.isArray(mailboxResult) // fallback
        ? mailboxResult
        : [];
      setMailboxes(mailboxList);

      // Load integrations
      const integrationResult: any = await window.api.operationsSettings.getAllIntegrations();
      const integrationList = Array.isArray(integrationResult)
        ? integrationResult
        : integrationResult && Array.isArray(integrationResult.integrations)
        ? integrationResult.integrations
        : [];
      const integrationsWithIcons = (integrationList || []).map((i: any) => ({
        ...i,
        icon: Cloud,
      }));
      setIntegrations(integrationsWithIcons);

      // Load user preferences
      const prefsResult: any = await window.api.operationsSettings.getUserPreferences();
      const prefs = prefsResult && prefsResult.preferences ? prefsResult.preferences : prefsResult || {};
      if (prefs.emailSignature) setEmailSignature(prefs.emailSignature);
      if (prefs.notifications) setNotifications(prefs.notifications);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateMailboxAccess = async (email: string, access_enabled: boolean) => {
    try {
      await window.api.operationsSettings.updateMailboxAccess(email, access_enabled);
      setMailboxes((prev) =>
        prev.map((m) => (m.email === email ? { ...m, access_enabled } : m))
      );
    } catch (error) {
      console.error("Failed to update mailbox access:", error);
    }
  };

  const toggleIntegration = async (name: string, currentEnabled: boolean) => {
    try {
      const newEnabled = !currentEnabled;
      await window.api.operationsSettings.updateIntegrationStatus(name, newEnabled);
      setIntegrations((prev) =>
        prev.map((i) =>
          i.name === name ? { ...i, enabled: newEnabled } : i
        )
      );
    } catch (error) {
      console.error("Failed to toggle integration:", error);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await window.api.operationsSettings.updateUserPreferences({
        emailSignature,
        notifications,
      });
      console.log("Preferences saved successfully");
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operations Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure mailboxes, integrations, and preferences
        </p>
      </div>

      {/* Mailbox Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mailbox Configuration
          </CardTitle>
          <CardDescription>
            Manage access levels for operational mailboxes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading mailboxes...
            </div>
          ) : mailboxes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No mailboxes configured
            </div>
          ) : (
            mailboxes.map((mailbox) => (
              <div
                key={mailbox.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{mailbox.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Current access: {mailbox.access_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <Switch
                  checked={mailbox.access_enabled}
                  onCheckedChange={(checked) =>
                    updateMailboxAccess(mailbox.email, checked)
                  }
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Integration Settings
          </CardTitle>
          <CardDescription>
            Manage Microsoft Graph API, OneDrive, and SharePoint connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading integrations...
            </div>
          ) : integrations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No integrations configured
            </div>
          ) : (
            integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <integration.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <Badge
                      variant={
                        integration.enabled ? "default" : "secondary"
                      }
                    >
                      {integration.enabled ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant={integration.enabled ? "destructive" : "default"}
                  onClick={() => toggleIntegration(integration.name, integration.enabled)}
                >
                  {integration.enabled ? "Disconnect" : "Connect"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            User Preferences
          </CardTitle>
          <CardDescription>
            Configure email signatures and notification settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Signature */}
          <div className="space-y-2">
            <Label htmlFor="signature">Email Signature</Label>
            <Textarea
              id="signature"
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              rows={6}
              placeholder="Your email signature..."
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Email Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for new emails
                  </p>
                </div>
                <Switch
                  checked={notifications.emailAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailAlerts: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Calendar Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get reminders for upcoming events
                  </p>
                </div>
                <Switch
                  checked={notifications.calendarReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, calendarReminders: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Document Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notify when documents are processed
                  </p>
                </div>
                <Switch
                  checked={notifications.documentUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, documentUpdates: checked })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={loadSettings}>Reset</Button>
            <Button onClick={handleSavePreferences}>Save Preferences</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
