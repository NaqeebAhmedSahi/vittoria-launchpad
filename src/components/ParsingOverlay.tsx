import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { Progress } from "@/components/ui/progress";

type ParsingOverlayProps = {
  open: boolean;
  label?: string;
  sublabel?: string;
  progress?: number; // 0-100 for OCR progress
};

export function ParsingOverlay({
  open,
  label = "Parsing CV...",
  sublabel = "Extracting text and generating structured JSON with AI",
  progress,
}: ParsingOverlayProps) {
  if (!open) return null;

  // If progress is provided, update the sublabel
  const displaySublabel = progress !== undefined 
    ? `Extracting text using OCR technology... ${progress}%`
    : sublabel;

  // Render at the very top of the DOM so it sits above navbar/layout
  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* FULLSCREEN blur + dim layer (covers navbar + content) */}
      <div className="absolute inset-0 bg-background/65 backdrop-blur-xl" />

      {/* Centered container (you can adjust padding if you want lower Y) */}
      <div className="relative h-full flex items-center justify-center">
        {/* Gradient border container */}
        <div className="bg-gradient-to-r from-primary/80 via-purple-500/70 to-sky-500/70 p-[1.5px] rounded-2xl shadow-2xl">
          {/* Inner card */}
          <div className="relative flex flex-col items-center gap-4 rounded-2xl bg-background px-8 py-6 md:px-10 md:py-8">
            {/* Soft glow */}
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-primary/5 blur-3xl" />

            {/* Spinner + text */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="relative">
                {/* Outer ring */}
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-full border border-border/50 bg-gradient-to-tr from-primary/10 via-background to-purple-500/10 flex items-center justify-center shadow-inner">
                  {/* Inner spinning icon */}
                  <div className="rounded-full bg-primary/10 p-2">
                    <Loader2 className="h-7 w-7 md:h-8 md:w-8 animate-spin text-primary" />
                  </div>
                </div>

                {/* Accent orbiting dot */}
                <div className="absolute -right-1 top-1 h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)] animate-ping" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm md:text-base font-medium text-foreground">
                  {label}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {displaySublabel}
                </p>
              </div>
            </div>

            {/* Progress bar or shimmer */}
            {progress !== undefined ? (
              <div className="relative mt-2 w-40 md:w-52">
                <Progress value={progress} className="h-1.5" />
              </div>
            ) : (
              <div className="relative mt-2 h-1.5 w-40 md:w-52 overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>,
    document.body
  );
}
