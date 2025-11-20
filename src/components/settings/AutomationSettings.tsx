import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FolderOpen, Mail, FileText, Mic } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function AutomationSettings() {
  const { toast } = useToast();
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [cvFolderEnabled, setCvFolderEnabled] = useState(false);
  const [voiceFolderEnabled, setVoiceFolderEnabled] = useState(false);
  const [cvFolderPath, setCvFolderPath] = useState('');
  const [voiceFolderPath, setVoiceFolderPath] = useState('');

  const handleSave = () => {
    // TODO: Save automation settings to DB
    toast({
      title: "Settings Saved",
      description: "Automation preferences updated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Automation Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure automatic file ingestion and monitoring
        </p>
      </div>

      {/* Email Ingestion */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Email Ingestion</CardTitle>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Monitor Vittoria inbox via Microsoft Graph API for CV attachments and voice notes
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Monitored Inbox</Label>
            <Input
              value="vittoria@yourdomain.com"
              disabled
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* CV Folder Watcher */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">CV Folder Watcher</CardTitle>
            </div>
            <Switch
              checked={cvFolderEnabled}
              onCheckedChange={setCvFolderEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Automatically detect and process new CV files in a local folder
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Watched Folder Path</Label>
            <div className="flex gap-2">
              <Input
                value={cvFolderPath}
                onChange={(e) => setCvFolderPath(e.target.value)}
                placeholder="/path/to/cv-inbox"
                disabled={!cvFolderEnabled}
              />
              <Button variant="outline" size="icon" disabled={!cvFolderEnabled}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Notes Folder Watcher */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Voice Notes Folder Watcher</CardTitle>
            </div>
            <Switch
              checked={voiceFolderEnabled}
              onCheckedChange={setVoiceFolderEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Automatically transcribe voice recordings placed in a local folder
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Watched Folder Path</Label>
            <div className="flex gap-2">
              <Input
                value={voiceFolderPath}
                onChange={(e) => setVoiceFolderPath(e.target.value)}
                placeholder="/path/to/voice-notes"
                disabled={!voiceFolderEnabled}
              />
              <Button variant="outline" size="icon" disabled={!voiceFolderEnabled}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          Save Automation Settings
        </Button>
      </div>
    </div>
  );
}
