import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, Info } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FolderWatcherSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: 'business' | 'personal';
}

export function FolderWatcherSettings({ open, onOpenChange, entity }: FolderWatcherSettingsProps) {
  const [folderPath, setFolderPath] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    // TODO: Save folder watcher settings to DB
    toast({
      title: "Settings Saved",
      description: `Folder watcher for ${entity} expenses configured`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Folder Watcher Settings</DialogTitle>
          <DialogDescription>
            Configure automatic monitoring of a local folder for {entity} expense receipts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Watched Folder Path</Label>
            <div className="flex gap-2">
              <Input
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/path/to/receipts"
              />
              <Button variant="outline" size="icon">
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select a folder where receipt files will be automatically detected
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Folder Watching</Label>
              <p className="text-xs text-muted-foreground">
                Automatically detect new files in the watched folder
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg flex gap-2 text-sm">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-muted-foreground">
              <strong>Note:</strong> OS-level folder monitoring will be configured after saving. 
              New files will be queued for processing automatically.
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
