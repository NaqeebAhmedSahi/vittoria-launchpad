import { Search, Bell, CheckSquare, User, Upload, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { CandidateFormDialog } from "./CandidateFormDialog";
import { MandateFormDialog } from "./MandateFormDialog";
import { useToast } from "@/hooks/use-toast";

interface TopBarProps {
  onSignOut?: () => void;
  currentUser?: any;
}

export function TopBar({ onSignOut, currentUser }: TopBarProps) {
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
        {/* Logo with inline SVG */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 flex items-center justify-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Vittoria Logo"
            >
              <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="16"
                fill="#0F172A"
              />
              <defs>
                <linearGradient id="vittoria-gradient" x1="12" y1="16" x2="52" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#22C55E" />
                </linearGradient>
              </defs>
              <path
                d="M14 24 L28 46 L50 18"
                fill="none"
                stroke="url(#vittoria-gradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="32"
                cy="32"
                r="20"
                fill="none"
                stroke="rgba(148, 163, 184, 0.35)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="font-semibold text-lg text-primary leading-none">Vittoria</div>
        </div>

        {/* Middle: search + action buttons */}
        <div className="flex-1 flex items-center gap-3">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Global search..."
              className="pl-9 h-9 bg-background"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setCandidateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Candidate
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => setMandateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Mandate
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Import CV
            </Button>
          </div>
        </div>

        {/* Right: icons pushed fully to the right */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
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
              {currentUser && (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentUser.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.fullName || currentUser.role || 'User'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              {onSignOut && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
