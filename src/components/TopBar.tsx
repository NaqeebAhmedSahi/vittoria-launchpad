import { Search, Bell, CheckSquare, User, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { CandidateFormDialog } from "./CandidateFormDialog";
import { MandateFormDialog } from "./MandateFormDialog";
import { useToast } from "@/hooks/use-toast";

export function TopBar() {
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [mandateDialogOpen, setMandateDialogOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast({
        title: "CV imported",
        description: `${files.length} file(s) imported successfully`,
      });
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      <CandidateFormDialog
        open={candidateDialogOpen}
        onOpenChange={setCandidateDialogOpen}
        onSubmit={(data) => {
          toast({
            title: "Candidate created",
            description: `${data.name} has been added successfully`,
          });
        }}
      />

      <MandateFormDialog
        open={mandateDialogOpen}
        onOpenChange={setMandateDialogOpen}
        onSubmit={(data) => {
          toast({
            title: "Mandate created",
            description: `${data.name} has been added successfully`,
          });
        }}
      />

      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
        <div className="font-semibold text-lg text-primary">Vittoria</div>

        {/* Middle: search + action buttons */}
        <div className="flex-1 flex items-center gap-3">
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Global search..."
                className="pl-9 h-9 bg-background"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCandidateDialogOpen(true)}>
              + New Candidate
            </Button>

            <Button variant="outline" size="sm" onClick={() => setMandateDialogOpen(true)}>
              + New Mandate
            </Button>

            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Import CV
            </Button>
          </div>
        </div>

        {/* Right: icons pushed fully to the right */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
          </Button>

          <Button variant="ghost" size="icon">
            <CheckSquare className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
