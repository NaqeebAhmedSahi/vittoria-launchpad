import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PROMPT = `ROLE: Information Extractor (deterministic)
STYLE: Be literal, concise, and schema-accurate. Do not guess beyond the text.

TASK
Read ONE document and decide if it is a resume/CV.
• If it IS a resume, output valid JSON matching ResumeExtractionSchema.
• If it is NOT a resume, output valid JSON matching NotResumeSchema.
• Output MUST be a single JSON object only. No markdown, no prose, no extra keys, no comments.

DECISION CHECKLIST (apply in order)
1) Resume signals (any strong signal → treat as resume):
   - Sections like "Experience", "Work History", "Education", "Skills", "Projects", "Certifications".
   - Multiple roles with org names + dates; bullets of responsibilities/achievements.
   - Contact block (email/phone/LinkedIn) near the top.
2) NOT a resume (choose NotResumeSchema) if:
   - The document is a job description, proposal, brochure, article, pitch deck, invoice, or generic company profile.
   - It lacks personal work-history records and looks informational/marketing/academic without the candidate's role history.
3) If ambiguous, prefer "resume" ONLY if there are 2+ role entries or one clear role + education + skills.

EXTRACTION RULES (strict)
• Source of truth: text inside the document only. Never invent entities.
• Dates: ISO "YYYY-MM" when month is present; otherwise "YYYY". Unknown → null.
• Arrays: must exist (use [] if empty). Do NOT return null for arrays.
• Strings: return "" if truly empty; otherwise concise content from the document.
• Bullet points: put each bullet/achievement as a separate string in "highlights".
• Metrics: capture numeric KPIs (%, $, counts, time) exactly as written when possible.
• Contact normalization:
  - phone: keep as-is from doc (light cleanup allowed, e.g., remove spaces).
  - email/urls: copy exact text; do not fabricate.
• Titles/companies/locations: copy as shown; avoid expansions unless explicitly present.
• Redact NOTHING unless the source is redacted.
• Never include additional fields beyond the chosen schema.

OUTPUT GUARANTEES
• Return EXACTLY one JSON object conforming to the respective schema.
• If a required field is missing from the doc, fill with "" (strings), null (nullable fields), or [] (arrays) per schema.
• Validate mentally against required fields before responding.

TINY EXAMPLES (for shape only; do not copy values)
# Resume example (shape only)
{
  "is_valid_resume": true,
  "document_title": "Jane Doe - Resume",
  "candidate": {
    "full_name": "Jane Doe",
    "current_titles": ["Senior Data Scientist"],
    "location": "Berlin, Germany"
  },
  "contact": {
    "email": "jane@example.com",
    "phone": "+49-123-4567",
    "website": null
  },
  "public_profiles": {
    "linkedin": "https://www.linkedin.com/in/janedoe",
    "github": null,
    "other": []
  },
  "summary": "Data scientist with 7+ years...",
  "metrics": [{"label":"Model ROI","value":"€1.2M"}],
  "experience": [
    {
      "title": "Senior Data Scientist",
      "company": "Acme Corp",
      "employment_type": null,
      "start_date": "2021-02",
      "end_date": null,
      "location": "Berlin",
      "highlights": ["Built X", "Improved Y by 15%"]
    }
  ],
  "education": [
    {
      "degree": "MSc Data Science",
      "institution": "TU Berlin",
      "start_date": "2017",
      "end_date": "2019",
      "focus": null
    }
  ],
  "skills": {
    "technical": ["Python","PyTorch"],
    "domains": ["NLP"],
    "leadership": []
  },
  "projects": [],
  "certifications": [],
  "awards": []
}

# Not-resume example (shape only)
{
  "is_valid_resume": false,
  "document_title": "Acme Corp - Senior DS Job Description",
  "doc_type": "job_description",
  "reason": "Describes a role and requirements; no personal work history."
}

=== ResumeExtractionSchema (JSON Schema draft-07) ===
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ResumeExtractionSchema",
  "type": "object",
  "required": ["is_valid_resume","document_title","candidate","contact","summary","experience","education","skills","projects","certifications","awards","public_profiles","metrics"],
  "properties": {
    "is_valid_resume": { "type": "boolean", "const": true },
    "document_title": { "type": "string" },
    "candidate": {
      "type": "object",
      "required": ["full_name","current_titles","location"],
      "properties": {
        "full_name": { "type": "string" },
        "current_titles": { "type": "array", "items": { "type": "string" } },
        "location": { "type": "string" }
      }
    },
    "contact": {
      "type": "object",
      "required": ["email","phone"],
      "properties": {
        "email": { "type": "string" },
        "phone": { "type": "string" },
        "website": { "type": ["string","null"] }
      }
    },
    "public_profiles": {
      "type": "object",
      "properties": {
        "linkedin": { "type": ["string","null"] },
        "github": { "type": ["string","null"] },
        "other": { "type": "array", "items": { "type": "string" } }
      }
    },
    "summary": { "type": "string" },
    "metrics": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label","value"],
        "properties": {
          "label": { "type": "string" },
          "value": { "type": "string" }
        }
      }
    },
    "experience": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title","company","start_date","end_date","location","highlights"],
        "properties": {
          "title": { "type": "string" },
          "company": { "type": "string" },
          "employment_type": { "type": ["string","null"] },
          "start_date": { "type": ["string","null"] },
          "end_date": { "type": ["string","null"] },
          "location": { "type": "string" },
          "highlights": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["degree","institution","start_date","end_date"],
        "properties": {
          "degree": { "type": "string" },
          "institution": { "type": "string" },
          "start_date": { "type": ["string","null"] },
          "end_date": { "type": ["string","null"] },
          "focus": { "type": ["string","null"] }
        }
      }
    },
    "skills": {
      "type": "object",
      "properties": {
        "technical": { "type": "array", "items": { "type": "string" } },
        "domains": { "type": "array", "items": { "type": "string" } },
        "leadership": { "type": "array", "items": { "type": "string" } }
      }
    },
    "projects": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name","highlights"],
        "properties": {
          "name": { "type": "string" },
          "highlights": { "type": "array", "items": { "type": "string" } },
          "impact": { "type": ["string","null"] }
        }
      }
    },
    "certifications": { "type": "array", "items": { "type": "string" } },
    "awards": { "type": "array", "items": { "type": "string" } }
  }
}

=== NotResumeSchema (JSON Schema draft-07) ===
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NotResumeSchema",
  "type": "object",
  "required": ["is_valid_resume","document_title","doc_type","reason"],
  "properties": {
    "is_valid_resume": { "type": "boolean", "const": false },
    "document_title": { "type": "string" },
    "doc_type": { "type": "string" },
    "reason": { "type": "string" }
  }
}

Now process the document below. Insert its raw text where {{text}} appears.
Return ONLY one JSON object, no prose, no markdown.

Document text:
{{text}}`;

export default function PromptConfig() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await (window.api as any).settings.getSetting("openai_parse_prompt");
        if (p) setPrompt(p);
        else setPrompt(DEFAULT_PROMPT);
      } catch (err) {
        console.error("Failed to load parse prompt", err);
        setPrompt(DEFAULT_PROMPT);
      }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await (window.api as any).settings.setSetting(
        "openai_parse_prompt",
        prompt || DEFAULT_PROMPT
      );
      toast({ title: "Saved", description: "Parsing prompt saved" });
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

  const handleReset = () => setPrompt(DEFAULT_PROMPT);

  return (
    <div className="space-y-3">
      <div>
        <Label>Parsing Prompt</Label>
        <p className="text-sm text-muted-foreground">
          You can use <code>{"{{text}}"}</code> (without quotes) as a placeholder
          where the CV text will be injected. The model should return only valid
          JSON.
        </p>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) =>
          setPrompt((e.target as HTMLTextAreaElement).value)
        }
        rows={6}
      />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Prompt"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to default
        </Button>
      </div>
    </div>
  );
}
