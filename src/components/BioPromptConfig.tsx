import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_BIO_PROMPT = `ROLE: Professional Bio Writer
You write concise, technical candidate biographies for executive search purposes.

TASK
Generate a professional biography (150-250 words) based on the parsed resume JSON provided.
Focus on:
- Career highlights and progression
- Technical expertise and skills
- Key achievements and impact
- Industry experience
- Educational background (if relevant)

STYLE
- Write in third person
- Professional, executive-level tone
- Technical and specific (mention technologies, methodologies, industries)
- Quantify achievements where possible
- Avoid personal information (names, emails, phone numbers will be removed later)

OUTPUT
Return ONLY the biography text. No markdown, no formatting, no JSON wrapper.
Just the biography paragraph(s).

Parsed Resume JSON:
{{json}}`;

export default function BioPromptConfig() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await (window.api as any).settings.getSetting("bio_generation_prompt");
        if (p) setPrompt(p);
        else setPrompt(DEFAULT_BIO_PROMPT);
      } catch (err) {
        console.error("Failed to load bio prompt settings", err);
        setPrompt(DEFAULT_BIO_PROMPT);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await (window.api as any).settings.setSetting(
        "bio_generation_prompt",
        prompt || DEFAULT_BIO_PROMPT
      );
      toast({ title: "Saved", description: "Bio generation prompt saved" });
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

  const handleReset = () => setPrompt(DEFAULT_BIO_PROMPT);

  return (
    <div className="space-y-4">
      <div>
        <Label>Bio Generation Prompt</Label>
        <p className="text-sm text-muted-foreground">
          You can use <code>{"{{json}}"}</code> (without quotes) as a placeholder
          where the complete parsed resume JSON will be injected. The model should return
          only the biography text (no markdown, no JSON wrapper).
        </p>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) =>
          setPrompt((e.target as HTMLTextAreaElement).value)
        }
        rows={10}
        className="font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Prompt"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to Default
        </Button>
      </div>
    </div>
  );
}

