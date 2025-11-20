import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VoiceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceSettingsModal({ open, onOpenChange }: VoiceSettingsModalProps) {
  const { toast } = useToast();
  const [folderPath, setFolderPath] = useState("/Users/default/VoiceNotes");
  const [watchEnabled, setWatchEnabled] = useState(true);
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [maxConcurrent, setMaxConcurrent] = useState("2");

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Voice note settings have been updated successfully.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Voice Notes Settings</DialogTitle>
          <DialogDescription>
            Configure voice note ingestion and transcription settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="folder-path">Watched Folder Path</Label>
            <Input
              id="folder-path"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/path/to/voice-notes"
            />
            <p className="text-xs text-muted-foreground">
              Audio files dropped in this folder will be automatically processed
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Folder Watching</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect new voice notes
              </p>
            </div>
            <Switch checked={watchEnabled} onCheckedChange={setWatchEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-Transcription</Label>
              <p className="text-sm text-muted-foreground">
                Use local Whisper engine for offline transcription
              </p>
            </div>
            <Switch checked={autoTranscribe} onCheckedChange={setAutoTranscribe} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-concurrent">Max Concurrent Transcriptions</Label>
            <Select value={maxConcurrent} onValueChange={setMaxConcurrent}>
              <SelectTrigger id="max-concurrent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (Lower CPU usage)</SelectItem>
                <SelectItem value="2">2 (Balanced)</SelectItem>
                <SelectItem value="3">3 (Faster processing)</SelectItem>
                <SelectItem value="4">4 (Maximum speed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <strong>Note:</strong> All transcription happens locally using the Whisper model. 
            No audio data is sent to external services. Processing time depends on file length 
            and CPU performance.
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
