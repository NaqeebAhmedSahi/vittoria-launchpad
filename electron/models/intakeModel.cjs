// ============================================================
// POSTGRESQL VERSION (ACTIVE)
// ============================================================
const { query, getClient } = require("../db/pgConnection.cjs");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const { v4: uuidv4 } = require("uuid");
const { getCVStoragePath, getSetting } = require("./settingsModel.cjs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const ocrService = require("../services/ocrService.cjs");
const { encryptFile, decryptFile } = require("../services/encryptionService.cjs");

// pdfjs-dist for reading PDF annotations (link URIs)
let pdfjsLib;
try {
  pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
} catch (e) {
  // will attempt dynamic import later if needed
  pdfjsLib = null;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT - KEPT FOR REFERENCE)
// ============================================================
// const initDatabase = require("../db/connection.cjs");
// const path = require("path");
// const fs = require("fs");
// const { app } = require("electron");
// const { v4: uuidv4 } = require("uuid");
// const { getCVStoragePath } = require("./settingsModel.cjs");
// const pdfParse = require("pdf-parse");
// const mammoth = require("mammoth");
// const { encryptFile, decryptFile } = require("../services/encryptionService.cjs");
// let pdfjsLib;
// try {
//   pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
// } catch (e) {
//   pdfjsLib = null;
// }
// const { getSetting } = require("./settingsModel.cjs");
// ============================================================

// Default parsing prompt that follows the ResumeExtractionSchema
const DEFAULT_PARSING_PROMPT = `ROLE: Information Extractor (deterministic)
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

/**
 * List all intake files (PostgreSQL)
 */
async function listIntakeFiles() {
  const result = await query(
    "SELECT * FROM intake_files ORDER BY uploaded_at DESC, id DESC"
  );
  return result.rows;
}

/**
 * List intake files with pagination (PostgreSQL)
 */
async function listIntakeFilesPaged(options = {}) {
  const page = Number(options.page) > 0 ? Number(options.page) : 1;
  const pageSize = Number(options.pageSize) > 0 ? Number(options.pageSize) : 10;

  const offset = (page - 1) * pageSize;

  const totalResult = await query("SELECT COUNT(*)::int AS count FROM intake_files");
  const total = totalResult.rows[0]?.count ?? 0;

  const result = await query(
    "SELECT * FROM intake_files ORDER BY uploaded_at DESC, id DESC LIMIT $1 OFFSET $2",
    [pageSize, offset]
  );

  return {
    rows: result.rows,
    total,
  };
}

/**
 * Create intake entries + store file on disk (encrypted/unencrypted)
 */
async function createIntakeFiles(files) {
  // Get the configured CV storage path
  const storageDir = await getCVStoragePath();
  const today = new Date().toISOString().slice(0, 10);

  // Helper to detect candidate name from raw text heuristically
  function detectCandidateName(rawText) {
    if (!rawText) return null;
    const maxSlice = rawText.slice(0, 4000);
    const lines = maxSlice
      .split(/\r?\n|\t|\s{2,}/)
      .map((l) => l.trim())
      .filter(Boolean);

    const nameRegex = /^([A-Z][a-zA-Z'\-]+\s){1,3}[A-Z][a-zA-Z'\-]+$/;

    for (const line of lines) {
      if (line.length > 120) continue; // too long for a name
      if (/[@|https?:\/]/i.test(line)) continue; // skip lines with emails/urls
      if (nameRegex.test(line)) return line.trim();
    }
    return null;
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    for (const file of files) {
      const ext = path.extname(file.fileName);
      const newFilename = uuidv4() + ext; // Stored filename (UUID)
      const destPath = path.join(storageDir, newFilename);

      const buffer = Buffer.from(file.buffer);

      // NOTE: encryption currently disabled for debugging; store as plain
      fs.writeFileSync(destPath, buffer);

      // Attempt lightweight text extraction for name detection
      // SKIP OCR for images during upload - will do it during Score CV action
      let detectedName = null;
      try {
        const lowerExt = ext.toLowerCase();
        
        // Check if it's an image file - skip name detection for images
        if (ocrService.isImageFile(destPath)) {
          console.log(`[createIntakeFiles] Image file detected: ${file.fileName}, skipping name detection (will use OCR during Score CV)`);
          detectedName = null; // Will be filled during OCR scoring
        } else if (lowerExt.includes("pdf")) {
          const parsed = await pdfParse(buffer);
          detectedName = detectCandidateName(parsed.text || "");
        } else if (lowerExt.includes("docx")) {
          try {
            const result = await mammoth.extractRawText({ buffer });
            detectedName = detectCandidateName(result.value || "");
          } catch (e) {
            const txt = buffer.toString("utf8");
            detectedName = detectCandidateName(txt);
          }
        } else {
          const txt = buffer.toString("utf8");
          detectedName = detectCandidateName(txt);
        }
      } catch (e) {
        console.warn(
          "[createIntakeFiles] name detection failed for",
          file.fileName,
          e && e.message ? e.message : e
        );
      }

      const finalDisplayName = detectedName || file.fileName;

      await client.query(
        `
        INSERT INTO intake_files
          (file_name, file_path, candidate, type, source, uploaded_by, uploaded_at, status, variant, is_encrypted, encryption_version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          finalDisplayName, // file_name (shown in UI, possibly normalized to candidate name)
          destPath, // file_path
          detectedName || null, // candidate column stores detected name if found
          file.type || ext.replace(".", "").toUpperCase() || "PDF", // type
          file.source || "Manual upload", // source
          file.uploadedBy || "Admin", // uploaded_by
          file.uploadedAt || today, // uploaded_at
          "New", // status
          "info", // variant
          0, // is_encrypted (0 = false; adjust if you enable encryption)
          null, // encryption_version
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return listIntakeFiles();
}

/**
 * Update intake row status
 */
async function updateIntakeStatus(id, status) {
  let variant = "info";
  if (status === "Approved") variant = "success";
  else if (status === "Needs review") variant = "warning";
  else if (status === "Rejected") variant = "destructive";

  await query(
    "UPDATE intake_files SET status = $1, variant = $2 WHERE id = $3",
    [status, variant, id]
  );

  const result = await query(
    "SELECT * FROM intake_files WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Preview intake file content as base64
 */
async function previewIntakeFile(id) {
  const result = await query(
    "SELECT * FROM intake_files WHERE id = $1",
    [id]
  );
  const row = result.rows[0];

  if (!row || !row.file_path) throw new Error("File not found");

  const filePath = row.file_path;
  if (!fs.existsSync(filePath)) throw new Error("Stored file missing");

  const ext = path.extname(filePath).toLowerCase();
  let mime = "application/octet-stream";
  if (ext === ".pdf" || ext === ".pdf.enc") mime = "application/pdf";
  else if (ext === ".txt") mime = "text/plain";
  else if (ext === ".png") mime = "image/png";
  else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
  else if (ext === ".docx" || ext === ".docx.enc")
    mime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  let buf = fs.readFileSync(filePath);

  // Encryption disabled for debugging
  const base64 = buf.toString("base64");
  return { fileName: row.file_name, mimeType: mime, base64 };
}

/**
 * Parse a stored intake file, extract text, send to LLM, store JSON
 */
async function parseAndGenerateJson(id) {
  console.log(
    `[parseAndGenerateJson] ========== START for id ${id} ==========`
  );

  const result = await query(
    "SELECT * FROM intake_files WHERE id = $1",
    [id]
  );
  const row = result.rows[0];

  if (!row) throw new Error("Intake row not found");

  console.log(
    `[parseAndGenerateJson] File: ${row.file_name}, is_encrypted: ${row.is_encrypted}`
  );

  // If parsed JSON present, return it (avoid calling LLM)
  if (row.parsed_json) {
    console.log(`[parseAndGenerateJson] Using cached parsed_json`);
    try {
      const cachedData = typeof row.parsed_json === 'string' 
        ? JSON.parse(row.parsed_json) 
        : row.parsed_json;
      console.log(
        "[parseAndGenerateJson] Cached data:",
        JSON.stringify(cachedData, null, 2)
      );

      const isValid =
        cachedData &&
        cachedData.name &&
        cachedData.name.trim() !== "" &&
        cachedData.name !== "null";

      if (!isValid) {
        console.warn(
          "[parseAndGenerateJson] Cached data is invalid (empty name), regenerating..."
        );
        await query(
          "UPDATE intake_files SET parsed_json = NULL WHERE id = $1",
          [id]
        );
      } else {
        return cachedData;
      }
    } catch (e) {
      console.warn("Stored parsed_json invalid, regenerating", e);
    }
  }

  if (!row.file_path || !fs.existsSync(row.file_path)) {
    throw new Error("Stored file not available");
  }

  const ext = path.extname(row.file_path).toLowerCase();
  let extractedText = "";
  let extractedLinks = [];

  console.log(`[parseAndGenerateJson] File extension: ${ext}`);

  // Read file from disk
  let fileBuffer = fs.readFileSync(row.file_path);
  console.log(`[parseAndGenerateJson] Read ${fileBuffer.length} bytes`);

  // 1) Extract text + links/emails
  console.log(`[parseAndGenerateJson] Starting text extraction...`);
  try {
    // Check if it's an image file first
    if (ocrService.isImageFile(row.file_path)) {
      console.log(`[parseAndGenerateJson] Detected image file, using OCR...`);
      
      // Update database with OCR start
      await query(
        "UPDATE intake_files SET ocr_progress = $1, ocr_method = $2 WHERE id = $3",
        [0, "OCR", id]
      );
      
      // Emit progress event to frontend
      const { BrowserWindow } = require("electron");
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send("intake:ocr-progress", {
          intakeId: id,
          progress: 0,
          status: "starting"
        });
      }
      
      const ocrResult = await ocrService.extractText(row.file_path, {
        onProgress: async (progress) => {
          console.log(`[parseAndGenerateJson] OCR progress for intake ${id}: ${progress}%`);
          
          // Update database
          await query(
            "UPDATE intake_files SET ocr_progress = $1 WHERE id = $2",
            [progress, id]
          );
          
          // Emit to frontend
          if (mainWindow) {
            mainWindow.webContents.send("intake:ocr-progress", {
              intakeId: id,
              progress,
              status: "processing"
            });
          }
        }
      });
      
      extractedText = ocrResult.text || "";
      console.log(`[parseAndGenerateJson] OCR extraction complete: ${extractedText.length} chars`);
      console.log(`[parseAndGenerateJson] OCR method: ${ocrResult.method}`);
      
      // Update database with completion
      await query(
        "UPDATE intake_files SET ocr_progress = $1, ocr_method = $2 WHERE id = $3",
        [100, ocrResult.method || "OCR", id]
      );
      
      // Emit completion to frontend
      if (mainWindow) {
        mainWindow.webContents.send("intake:ocr-progress", {
          intakeId: id,
          progress: 100,
          status: "complete"
        });
      }
      
      // Extract links and emails from OCR text
      const urlRegex = /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
      const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const urls = (extractedText.match(urlRegex) || []).map((s) => s.trim());
      const emails = (extractedText.match(emailRegex) || []).map((s) => s.trim());
      extractedLinks = Array.from(new Set([...urls, ...emails]));
    } else if (ext === ".pdf" || ext === ".pdf.enc") {
      console.log(`[parseAndGenerateJson] Parsing PDF...`);
      
      // First try to check if it's an image-based PDF
      const isPdfScanned = await ocrService.isPdfImageBased(row.file_path);
      
      if (isPdfScanned) {
        console.log(`[parseAndGenerateJson] PDF appears to be scanned, using OCR...`);
        
        // Update database with OCR start
        await query(
          "UPDATE intake_files SET ocr_progress = $1, ocr_method = $2 WHERE id = $3",
          [0, "OCR", id]
        );
        
        // Emit progress event to frontend
        const { BrowserWindow } = require("electron");
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send("intake:ocr-progress", {
            intakeId: id,
            progress: 0,
            status: "starting"
          });
        }
        
        const ocrResult = await ocrService.extractText(row.file_path, {
          onProgress: async (progress) => {
            console.log(`[parseAndGenerateJson] OCR progress for intake ${id}: ${progress}%`);
            
            // Update database
            await query(
              "UPDATE intake_files SET ocr_progress = $1 WHERE id = $2",
              [progress, id]
            );
            
            // Emit to frontend
            if (mainWindow) {
              mainWindow.webContents.send("intake:ocr-progress", {
                intakeId: id,
                progress,
                status: "processing"
              });
            }
          }
        });
        
        extractedText = ocrResult.text || "";
        console.log(`[parseAndGenerateJson] OCR extraction complete: ${extractedText.length} chars`);
        
        // Update database with completion
        await query(
          "UPDATE intake_files SET ocr_progress = $1, ocr_method = $2 WHERE id = $3",
          [100, ocrResult.method || "OCR", id]
        );
        
        // Emit completion to frontend
        if (mainWindow) {
          mainWindow.webContents.send("intake:ocr-progress", {
            intakeId: id,
            progress: 100,
            status: "complete"
          });
        }
      } else {
        console.log(`[parseAndGenerateJson] PDF has extractable text, using standard parser...`);
        const parsed = await pdfParse(fileBuffer);
        extractedText = parsed.text || "";
        console.log(`[parseAndGenerateJson] PDF parsed, extracted text length: ${extractedText.length}`);
        
        // Mark as text extraction (not OCR)
        await query(
          "UPDATE intake_files SET ocr_progress = $1, ocr_method = $2 WHERE id = $3",
          [100, "Text extraction", id]
        );
      }

      extractedText = extractedText || "";

      try {
        console.log(
          `[intakeModel] pdf text snippet id ${id}:`,
          (extractedText || "").slice(0, 200)
        );
      } catch (e) {}

      const urlRegex =
        /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
      const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const urls = (extractedText.match(urlRegex) || []).map((s) =>
        s.trim()
      );
      const emails = (extractedText.match(emailRegex) || []).map((s) =>
        s.trim()
      );
      extractedLinks = Array.from(new Set([...urls, ...emails]));

      // PDF link annotations (mailto, LinkedIn, etc.)
      try {
        if (!pdfjsLib)
          pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
        const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
        const pdfDoc = await loadingTask.promise;
        const pdfLinks = [];
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const page = await pdfDoc.getPage(p);
          const ann = await page.getAnnotations();
          for (const a of ann) {
            if (a.subtype === "Link") {
              if (a.url) pdfLinks.push(a.url);
              else if (a.dest && typeof a.dest === "string")
                pdfLinks.push(a.dest);
            }
          }
        }
        if (pdfLinks.length) {
          extractedLinks = Array.from(
            new Set([...extractedLinks, ...pdfLinks])
          );
          try {
            console.log(
              `[intakeModel] pdf annotations for id ${id}:`,
              pdfLinks
            );
          } catch (e) {}
        }
      } catch (e) {
        console.warn(
          "[intakeModel] pdfjs annotation extraction failed",
          e && e.message ? e.message : e
        );
      }
    } else if (ext === ".docx" || ext === ".docx.enc") {
      console.log(`[parseAndGenerateJson] Parsing DOCX...`);
      try {
        const resultHtml = await mammoth.convertToHtml({
          buffer: fileBuffer,
        });
        console.log(
          `[parseAndGenerateJson] DOCX converted to HTML, length: ${
            resultHtml.value?.length || 0
          }`
        );
        let html = resultHtml.value || "";

        const hrefs = [];
        html = html.replace(
          /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
          (match, href, text) => {
            const cleanHref = href.trim();
            if (cleanHref) hrefs.push(cleanHref);
            const cleanText = (text || "").trim();
            return cleanText ? `${cleanText} (${cleanHref})` : cleanHref;
          }
        );

        const plain = html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        extractedText = plain.slice(0, 20000);
        extractedLinks = Array.from(new Set(hrefs));
        console.log(
          `[parseAndGenerateJson] DOCX extraction complete: ${extractedText.length} chars, ${extractedLinks.length} links`
        );
      } catch (e) {
        console.warn(
          "[parseAndGenerateJson] mammoth conversion failed, falling back to text read",
          e
        );
        const data = fileBuffer.toString("utf8");
        extractedText = data.slice(0, 20000);
        const urlRegex2 =
          /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
        extractedLinks = Array.from(
          new Set(extractedText.match(urlRegex2) || [])
        );
      }
    } else {
      console.log(`[parseAndGenerateJson] Parsing as text file`);
      const data = fileBuffer.toString("utf8");
      extractedText = data.slice(0, 20000);
      const urlRegex2 =
        /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
      const emailRegex2 =
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const urls = (extractedText.match(urlRegex2) || []).map((s) =>
        s.trim()
      );
      const emails = (extractedText.match(emailRegex2) || []).map((s) =>
        s.trim()
      );
      extractedLinks = Array.from(new Set([...urls, ...emails]));
    }
  } catch (err) {
    console.error(`[parseAndGenerateJson] Text extraction failed:`, err);
    throw err;
  }

  console.log(
    `[parseAndGenerateJson] Text extraction complete: ${extractedText.length} chars, ${extractedLinks.length} links`
  );

  try {
    console.log(
      `[parseAndGenerateJson] extracted links for id ${id}:`,
      extractedLinks
    );
  } catch (e) {}

  const systemPrompt = `ROLE: Information Extractor (deterministic)
You convert resume/CV documents into strict JSON according to the instructions and schemas provided in the user message.
Follow the user message EXACTLY. Do not invent extra keys or formats. Output a single JSON object only.`;

  const userPromptTemplate = await getSetting("openai_parse_prompt");
  let userPrompt;
  console.log(
    `[parseAndGenerateJson] User prompt template: ${
      userPromptTemplate ? "set" : "not set, using DEFAULT_PARSING_PROMPT"
    }`
  );
  if (userPromptTemplate && typeof userPromptTemplate === "string") {
    if (userPromptTemplate.includes("{{text}}")) {
      userPrompt = userPromptTemplate.replace(/{{text}}/g, extractedText);
    } else {
      userPrompt = `${userPromptTemplate}\n\n${extractedText}`;
    }
  } else {
    userPrompt = DEFAULT_PARSING_PROMPT.replace(/{{text}}/g, extractedText);
  }

  console.log(
    `[parseAndGenerateJson] User prompt length: ${userPrompt.length} chars`
  );

  if (extractedLinks && extractedLinks.length) {
    userPrompt += `\n\nDetected hyperlinks and emails in the original document:\n${extractedLinks.join(
      "\n"
    )}\n\nWhen a certification or course refers to an online resource, include the corresponding URL in the certification text and use URLs/emails to populate contact and public_profiles where appropriate.`;
  }

  console.log(
    `[parseAndGenerateJson] Final user prompt length: ${
      userPrompt.length
    } chars`
  );

  console.log(`[parseAndGenerateJson] Calling LLM adapter...`);
  const llmAdapter = require("../services/llmAdapter.cjs");
  let assistant;
  try {
    assistant = await llmAdapter.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0, max_tokens: 4000 }
    );
    console.log(
      `[parseAndGenerateJson] LLM response received, length: ${
        assistant?.length || 0
      } chars`
    );
  } catch (err) {
    console.error(`[parseAndGenerateJson] LLM call failed:`, err.message);
    throw err;
  }

  try {
    console.log(
      `[parseAndGenerateJson] LLM response length for id ${id}: ${
        assistant?.length || 0
      } chars`
    );
    console.log(
      `[parseAndGenerateJson] LLM response first 500 chars: ${String(
        assistant || ""
      ).slice(0, 500)}`
    );
    console.log(
      `[parseAndGenerateJson] LLM response last 200 chars: ${String(
        assistant || ""
      ).slice(-200)}`
    );
  } catch (e) {}

  const cleaned = assistant.replace(/```json|```/g, "").trim();
  let parsedJson = null;
  try {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonText =
      firstBrace !== -1 && lastBrace !== -1
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;
    parsedJson = JSON.parse(jsonText);
  } catch (e) {
    console.error(
      `[intakeModel] JSON parsing failed for id ${id}:`,
      e.message
    );
    console.error(
      `[intakeModel] Cleaned response: ${cleaned.slice(0, 1000)}`
    );
    throw new Error(
      "Failed to parse JSON from model response: " +
        e.message +
        "\nResponse:\n" +
        assistant.slice(0, 2000)
    );
  }

  try {
    if (!parsedJson.raw_text) parsedJson.raw_text = extractedText || "";
    parsedJson._extracted_links = extractedLinks || [];
  } catch (e) {
    console.warn(
      "[parseAndGenerateJson] failed to attach raw_text/_extracted_links",
      e && e.message ? e.message : e
    );
  }

  // 2b) Candidate name detection
  let detectedName = null;
  try {
    if (
      parsedJson.name &&
      typeof parsedJson.name === "string" &&
      parsedJson.name.trim().length > 1
    ) {
      detectedName = parsedJson.name.trim();
      console.log(
        `[parseAndGenerateJson] Detected candidate name (top-level): ${detectedName}`
      );
    }
    if (!detectedName) {
      const pp = parsedJson.public_profiles;
      if (Array.isArray(pp)) {
        for (const entry of pp) {
          if (entry && typeof entry === "object") {
            const maybeName =
              entry.name || entry.full_name || entry.displayName;
            if (
              maybeName &&
              typeof maybeName === "string" &&
              maybeName.trim().length > 1
            ) {
              detectedName = maybeName.trim();
              console.log(
                `[parseAndGenerateJson] Detected candidate name (public_profiles array): ${detectedName}`
              );
              break;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn(
      "[parseAndGenerateJson] name detection failed",
      e && e.message ? e.message : e
    );
  }

  if (detectedName) {
    try {
      await query(
        `UPDATE intake_files SET file_name = $1, candidate = $2 WHERE id = $3`,
        [detectedName, detectedName, id]
      );
      console.log(
        `[parseAndGenerateJson] Intake row updated with detected name: ${detectedName}`
      );
    } catch (e) {
      console.warn(
        "[parseAndGenerateJson] failed to update intake row with detected name",
        e && e.message ? e.message : e
      );
    }
  } else {
    console.log("[parseAndGenerateJson] No candidate name detected for id", id);
  }

  // 3) Post-processing: email + contact + public_profiles

  try {
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    let foundEmail = null;

    if (extractedLinks && extractedLinks.length) {
      for (const link of extractedLinks) {
        const m = String(link).match(emailPattern);
        if (m && m[0]) {
          foundEmail = m[0];
          break;
        }
      }
    }

    if (!foundEmail && extractedText) {
      const m2 = extractedText.match(emailPattern);
      if (m2 && m2[0]) {
        foundEmail = m2[0];
      }
    }

    if (
      foundEmail &&
      (!parsedJson.email ||
        parsedJson.email === null ||
        parsedJson.email === "")
    ) {
      parsedJson.email = foundEmail;
    }
  } catch (e) {
    console.warn("[intakeModel] email post-processing failed", e);
  }

  try {
    if (!parsedJson.contact || typeof parsedJson.contact !== "object") {
      parsedJson.contact = {
        email: parsedJson.email || null,
        phone: parsedJson.phone || null,
        website: null,
      };
    } else {
      if (
        (!parsedJson.contact.email ||
          parsedJson.contact.email === null ||
          parsedJson.contact.email === "") &&
        parsedJson.email
      ) {
        parsedJson.contact.email = parsedJson.email;
      }
      if (
        (!parsedJson.contact.phone ||
          parsedJson.contact.phone === null ||
          parsedJson.contact.phone === "") &&
        parsedJson.phone
      ) {
        parsedJson.contact.phone = parsedJson.phone;
      }
      if (!("website" in parsedJson.contact)) {
        parsedJson.contact.website = null;
      }
    }
  } catch (e) {
    console.warn("[intakeModel] contact post-processing failed", e);
  }

  try {
    if (
      !parsedJson.public_profiles ||
      typeof parsedJson.public_profiles !== "object"
    ) {
      parsedJson.public_profiles = {
        linkedin: null,
        github: null,
        other: [],
      };
    } else {
      if (parsedJson.public_profiles.linkedin === undefined)
        parsedJson.public_profiles.linkedin = null;
      if (parsedJson.public_profiles.github === undefined)
        parsedJson.public_profiles.github = null;
      if (!Array.isArray(parsedJson.public_profiles.other))
        parsedJson.public_profiles.other = [];
    }

    if (extractedLinks && extractedLinks.length) {
      for (const raw of extractedLinks) {
        const u = String(raw).trim();
        const lower = u.toLowerCase();
        if (lower.includes("linkedin.com")) {
          if (!parsedJson.public_profiles.linkedin) {
            parsedJson.public_profiles.linkedin = u;
          }
          continue;
        }
        if (lower.includes("github.com") || lower.includes("github.io")) {
          if (!parsedJson.public_profiles.github) {
            parsedJson.public_profiles.github = u;
          }
          continue;
        }
        const looksUrl =
          /^https?:\/\//i.test(u) || lower.startsWith("www.");
        if (looksUrl) {
          if (!parsedJson.public_profiles.other.includes(u)) {
            parsedJson.public_profiles.other.push(u);
          }
          if (
            (!parsedJson.contact.website ||
              parsedJson.contact.website === null ||
              parsedJson.contact.website === "") &&
            !lower.includes("linkedin.com") &&
            !lower.includes("github.com")
          ) {
            parsedJson.contact.website = u;
          }
        }
      }
    }
  } catch (e) {
    console.warn(
      "[intakeModel] public_profiles post-processing failed",
      e
    );
  }

  try {
    console.log(
      `[parseAndGenerateJson] final extracted links for id ${id}:`,
      extractedLinks
    );
  } catch (e) {}

  console.log(`[parseAndGenerateJson] Saving parsed JSON to database...`);
  await query(
    "UPDATE intake_files SET parsed_json = $1, parsed_at = CURRENT_TIMESTAMP WHERE id = $2",
    [JSON.stringify(parsedJson), id]
  );

  console.log(
    `[parseAndGenerateJson] ========== COMPLETE for id ${id} ==========`
  );
  return parsedJson;
}

/**
 * Initialize intake_files table with new columns for CV processing (PostgreSQL)
 */
async function initIntakeFilesTable() {
  // Using ALTER TABLE ... ADD COLUMN IF NOT EXISTS (Postgres)
  await query(
    `ALTER TABLE intake_files ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION;`
  );
  await query(
    `ALTER TABLE intake_files ADD COLUMN IF NOT EXISTS candidate_id INTEGER;`
  );
  await query(
    `ALTER TABLE intake_files ADD COLUMN IF NOT EXISTS json JSONB;`
  );
  await query(
    `ALTER TABLE intake_files ADD COLUMN IF NOT EXISTS json_candidate JSONB;`
  );

  await query(`
    CREATE INDEX IF NOT EXISTS idx_intake_files_candidate_id
    ON intake_files(candidate_id);
  `);
}

/**
 * Normalize parsed CV from various schema formats to the format expected by scoring
 */
function normalizeParsedCvForScoring(parsedCv) {
  console.log('\n[normalizeParsedCvForScoring] Starting normalization...');
  console.log(
    '[normalizeParsedCvForScoring] Input keys:',
    Object.keys(parsedCv).join(', ')
  );

  if (parsedCv.current_title && parsedCv.current_firm && parsedCv.name) {
    console.log(
      '[normalizeParsedCvForScoring] Already in flat format, returning as-is'
    );
    return parsedCv;
  }

  const normalized = { ...parsedCv };

  if (parsedCv.personal_information && typeof parsedCv.personal_information === 'object') {
    console.log('[normalizeParsedCvForScoring] Detected personal_information structure');
    const pi = parsedCv.personal_information;
    normalized.name = pi.name || parsedCv.name;
    normalized.current_title = pi.current_title;
    normalized.current_firm = pi.current_firm;
    normalized.location = pi.location;
  }

  if (parsedCv.candidate && typeof parsedCv.candidate === 'object') {
    console.log('[normalizeParsedCvForScoring] Detected candidate structure');
    normalized.name = parsedCv.candidate.full_name || parsedCv.name;
    normalized.current_title =
      Array.isArray(parsedCv.candidate.current_titles) &&
      parsedCv.candidate.current_titles.length > 0
        ? parsedCv.candidate.current_titles[0]
        : null;
    normalized.location = parsedCv.candidate.location;
  }

  let experienceArray = null;
  if (parsedCv.professional_experience && Array.isArray(parsedCv.professional_experience)) {
    console.log('[normalizeParsedCvForScoring] Detected professional_experience array');
    experienceArray = parsedCv.professional_experience;

    normalized.experience = experienceArray.map((exp) => ({
      firm: exp.firm || exp.company,
      title: exp.title,
      dateFrom: exp.start_date,
      dateTo: exp.end_date,
      location: exp.location,
      highlights: exp.responsibilities || exp.highlights || [],
    }));
  } else if (parsedCv.experience && Array.isArray(parsedCv.experience)) {
    console.log('[normalizeParsedCvForScoring] Detected experience array (ResumeExtractionSchema format)');
    experienceArray = parsedCv.experience;

    if (experienceArray.length > 0 && experienceArray[0].company !== undefined) {
      console.log(
        '[normalizeParsedCvForScoring] Mapping experience from ResumeExtractionSchema format to scoring format'
      );
      normalized.experience = experienceArray.map((exp) => ({
        firm: exp.company,
        title: exp.title,
        dateFrom: exp.start_date,
        dateTo: exp.end_date,
        location: exp.location,
        highlights: exp.highlights || [],
      }));
    } else {
      console.log('[normalizeParsedCvForScoring] Experience already in scoring format');
      normalized.experience = experienceArray;
    }
  }

  if (
    !normalized.current_firm &&
    normalized.experience &&
    Array.isArray(normalized.experience) &&
    normalized.experience.length > 0
  ) {
    const firstExp = normalized.experience[0];
    const endDate = firstExp.dateTo || firstExp.end_date;

    if (
      !endDate ||
      endDate === null ||
      endDate === '' ||
      String(endDate).toLowerCase().includes('present') ||
      String(endDate).toLowerCase().includes('current')
    ) {
      normalized.current_firm = firstExp.firm;
      console.log(
        `[normalizeParsedCvForScoring] Extracted current_firm from first experience: ${normalized.current_firm}`
      );

      if (!normalized.current_title) {
        normalized.current_title = firstExp.title;
        console.log(
          `[normalizeParsedCvForScoring] Extracted current_title from first experience: ${normalized.current_title}`
        );
      }
    }
  }

  normalized.education = parsedCv.education || [];

  console.log('\n[normalizeParsedCvForScoring] ✅ Normalized CV for scoring:');
  console.log(`  name: ${normalized.name || '(empty)'}`);
  console.log(`  current_title: ${normalized.current_title || '(empty)'}`);
  console.log(`  current_firm: ${normalized.current_firm || '(empty)'}`);
  console.log(`  location: ${normalized.location || '(empty)'}`);
  console.log(
    `  experience entries: ${normalized.experience?.length || 0}`
  );
  console.log(
    `  education entries: ${normalized.education?.length || 0}`
  );

  if (normalized.experience && normalized.experience.length > 0) {
    console.log('\n[normalizeParsedCvForScoring] Sample experience entries:');
    normalized.experience.slice(0, 2).forEach((exp, idx) => {
      console.log(`  Entry ${idx + 1}:`);
      console.log(`    firm: ${exp.firm || '(empty)'}`);
      console.log(`    title: ${exp.title || '(empty)'}`);
      console.log(`    dateFrom: ${exp.dateFrom || '(empty)'}`);
      console.log(`    dateTo: ${exp.dateTo || '(empty)'}`);
    });
  }

  return normalized;
}

/**
 * Process a parsed CV: compute quality, save results, and auto-create candidate if threshold met
 * Returns: { status, qualityScore, candidateId? }
 */
async function processParsedCv(intakeId, parsedCv) {
  const {
    computeCvQuality,
    getQualityThresholds,
    getCvQualityWeights,
  } = require("./scoringModel.cjs");
  const { createDraftCandidate } = require("./candidateModel.cjs");
  const llmAdapter = require("../services/llmAdapter.cjs");

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Normalize the parsed CV
    const normalizedCv = normalizeParsedCvForScoring(parsedCv);

    // Compute CV quality
    const qualityResult = computeCvQuality(normalizedCv);
    const thresholds = getQualityThresholds();
    const qWeights = getCvQualityWeights();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              QUALITY SCORE EVALUATION RESULT                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(
      `\n📊 Final Quality Score: ${qualityResult.score.toFixed(4)} (${(
        qualityResult.score * 100
      ).toFixed(2)}%)`
    );
    console.log('\n🎯 Thresholds:');
    console.log(`   Good Threshold:       ${thresholds.good.toFixed(2)}`);
    console.log(
      `   Borderline Threshold: ${thresholds.borderline.toFixed(2)}`
    );

    let qualityStatus;
    let emoji;
    if (qualityResult.score >= thresholds.good) {
      qualityStatus = "GOOD - Will auto-create candidate";
      emoji = "✅";
    } else if (qualityResult.score >= thresholds.borderline) {
      qualityStatus = "BORDERLINE - Requires review";
      emoji = "⚠️";
    } else {
      qualityStatus = "POOR - Requires manual review";
      emoji = "❌";
    }

    console.log(`\n${emoji} Status: ${qualityStatus}`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Generate candidate-shaped JSON using AI
    let candidateJson = null;

    try {
      const systemPrompt =
        "ROLE: Candidate JSON Normalizer with Confidence Scoring\nYou convert a parsed CV object into a STRICT candidate JSON matching the exact schema provided.\nFor each field, provide a confidence score (0.0-1.0) and provenance explaining where the data came from.\nReturn ONLY a single JSON object with the exact keys and types. No markdown, no comments.";

      const schema = {
        name: "string",
        current_title: "string|null",
        current_firm: "string|null",
        location: "string|null",
        sectors: ["string"],
        functions: ["string"],
        asset_classes: ["string"],
        geographies: ["string"],
        seniority: "string|null",
        _metadata: {
          field_confidence: {
            name: "number (0.0-1.0)",
            current_title: "number (0.0-1.0)",
            current_firm: "number (0.0-1.0)",
            location: "number (0.0-1.0)",
            sectors: "number (0.0-1.0)",
            functions: "number (0.0-1.0)",
            asset_classes: "number (0.0-1.0)",
            geographies: "number (0.0-1.0)",
            seniority: "number (0.0-1.0)"
          },
          provenance: {
            name: "string (source description)",
            current_title: "string (source description)",
            current_firm: "string (source description)",
            location: "string (source description)",
            sectors: "string (source description)",
            functions: "string (source description)",
            asset_classes: "string (source description)",
            geographies: "string (source description)",
            seniority: "string (source description)"
          }
        }
      };

      const userPrompt = `Using the parsed CV JSON below, produce a candidate JSON with this exact schema:
${JSON.stringify(schema, null, 2)}

NORMALIZATION RULES:
- Arrays must always be arrays (may be empty).
- Use strings without trailing punctuation; trim whitespace.
- If a field cannot be determined, set null (for strings) or [] (for arrays).
- Deduplicate and normalize capitalization (e.g., 'ECM', 'Equity').
- Prefer values that reflect the current/latest role for current_title/current_firm.

EXTRACTION RULES FOR SECTORS/FUNCTIONS/ASSET_CLASSES/GEOGRAPHIES:
- **sectors**: Extract from work experience (e.g., Technology, Healthcare, Financial Services, Consumer Goods, Energy, Real Estate)
- **functions**: Extract from job titles and responsibilities (e.g., M&A, Equity Capital Markets, Leveraged Finance, Private Equity, Restructuring, FP&A)
- **asset_classes**: Extract from deal experience (e.g., Equity, Debt, Convertibles, Derivatives, Real Assets)
- **geographies**: Extract from locations and regional focus (e.g., North America, Europe, APAC, EMEA)
- Look through ALL work experience entries, not just the current role
- Combine unique values across all roles
- Use standard industry terminology

CONFIDENCE SCORING (0.0-1.0):
- **1.0**: Explicitly stated in CV (e.g., name in header, current title clearly labeled)
- **0.8-0.9**: Strong inference from context (e.g., recent job title, clear patterns)
- **0.6-0.7**: Moderate inference (e.g., derived from multiple sources, some ambiguity)
- **0.4-0.5**: Weak inference (e.g., limited data, assumptions made)
- **0.0-0.3**: Very uncertain or missing data

PROVENANCE DESCRIPTION:
Explain WHERE each field value came from. Examples:
- "Extracted from CV header - personal information section"
- "Most recent position in work experience (2023-present)"
- "Inferred from job titles across 3 roles in financial services"
- "Derived from work locations: New York, London"
- "No explicit data - inferred from VP title and 8 years experience"

PARSED CV (first 8000 chars):
${JSON.stringify(parsedCv, null, 2).slice(0, 8000)}

Return ONLY the candidate JSON object with confidence and provenance metadata.`;

      const aiResp = await llmAdapter.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0, max_tokens: 2048 }
      );

      const cleaned = String(aiResp || "")
        .replace(/```json|```/g, "")
        .trim();

      try {
        const fb = cleaned.indexOf("{");
        const lb = cleaned.lastIndexOf("}");
        const jt =
          fb !== -1 && lb !== -1 ? cleaned.slice(fb, lb + 1) : cleaned;
        candidateJson = JSON.parse(jt);
        console.log(
          "[processParsedCv] AI-generated candidate JSON:",
          JSON.stringify(candidateJson, null, 2).slice(0, 500)
        );
      } catch (pe) {
        throw new Error(
          "AI candidate JSON parse failed: " +
            (pe && pe.message ? pe.message : pe)
        );
      }
    } catch (aiErr) {
      console.warn(
        "[processParsedCv] AI candidate JSON generation failed, falling back to heuristic mapping:",
        aiErr && aiErr.message ? aiErr.message : aiErr
      );
      candidateJson = {
        name:
          normalizedCv.name ||
          parsedCv.name ||
          (parsedCv.personal_information &&
            parsedCv.personal_information.name) ||
          (parsedCv.candidate && parsedCv.candidate.full_name) ||
          null,
        current_title:
          normalizedCv.current_title ||
          parsedCv.current_title ||
          (parsedCv.personal_information &&
            parsedCv.personal_information.current_title) ||
          null,
        current_firm:
          normalizedCv.current_firm ||
          parsedCv.current_firm ||
          (parsedCv.personal_information &&
            parsedCv.personal_information.current_firm) ||
          null,
        location:
          normalizedCv.location ||
          parsedCv.location ||
          (parsedCv.personal_information &&
            parsedCv.personal_information.location) ||
          (parsedCv.candidate && parsedCv.candidate.location) ||
          null,
        sectors:
          parsedCv.sectors ||
          (parsedCv.key_sectors_functions_expertise &&
            parsedCv.key_sectors_functions_expertise.sectors) ||
          [],
        functions:
          parsedCv.functions ||
          (parsedCv.key_sectors_functions_expertise &&
            parsedCv.key_sectors_functions_expertise.functions) ||
          [],
        asset_classes:
          parsedCv.asset_classes ||
          (parsedCv.key_sectors_functions_expertise &&
            parsedCv.key_sectors_functions_expertise.asset_classes) ||
          [],
        geographies:
          parsedCv.geographies ||
          (parsedCv.key_sectors_functions_expertise &&
            parsedCv.key_sectors_functions_expertise.geographies) ||
          [],
        seniority:
          parsedCv.seniority ||
          (parsedCv.key_sectors_functions_expertise &&
            parsedCv.key_sectors_functions_expertise.seniority) ||
          null,
      };
    }

    let status;
    let candidateId = null;

    console.log(
      "[processParsedCv] About to create candidate with data:",
      JSON.stringify(candidateJson, null, 2)
    );

    if (
      !candidateJson.name ||
      (typeof candidateJson.name === "string" &&
        candidateJson.name.trim() === "")
    ) {
      const derivedName =
        normalizedCv.name ||
        (parsedCv.personal_information &&
          parsedCv.personal_information.name) ||
        (parsedCv.candidate && parsedCv.candidate.full_name) ||
        null;
      if (derivedName) {
        candidateJson.name = String(derivedName).trim();
        console.log(
          "[processParsedCv] candidateJson.name filled from derived sources:",
          candidateJson.name
        );
      }
    }

    const detectedCandidateName =
      candidateJson &&
      typeof candidateJson.name === "string" &&
      candidateJson.name.trim()
        ? candidateJson.name.trim()
        : null;
    console.log(
      "[processParsedCv] Detected candidate name for intake:",
      detectedCandidateName || "(empty)"
    );

    // Re-score with complete candidate data including AI-extracted fields
    console.log('\n🔄 Re-scoring CV with AI-extracted professional context...');
    const enrichedCv = {
      ...normalizedCv,
      name: candidateJson.name,
      current_title: candidateJson.current_title,
      current_firm: candidateJson.current_firm,
      location: candidateJson.location,
      sectors: candidateJson.sectors || [],
      functions: candidateJson.functions || [],
      asset_classes: candidateJson.asset_classes || [],
      geographies: candidateJson.geographies || [],
      seniority: candidateJson.seniority,
    };
    
    const finalQualityResult = computeCvQuality(enrichedCv);
    console.log(`✅ Updated Quality Score: ${finalQualityResult.score.toFixed(4)} (${(finalQualityResult.score * 100).toFixed(2)}%)`);

    if (finalQualityResult.score >= thresholds.good) {
      // createDraftCandidate uses pool-based query (outside client transaction)
      candidateId = await createDraftCandidate(candidateJson);
      console.log(
        "[processParsedCv] Created candidate with ID:",
        candidateId
      );
      status = "Parsed";

      // Merge candidateJson into parsedCv so all fields are available in parsed_json
      const mergedParsedJson = {
        ...parsedCv,
        name: candidateJson.name,
        current_title: candidateJson.current_title,
        current_firm: candidateJson.current_firm,
        location: candidateJson.location,
        sectors: candidateJson.sectors || [],
        functions: candidateJson.functions || [],
        asset_classes: candidateJson.asset_classes || [],
        geographies: candidateJson.geographies || [],
        seniority: candidateJson.seniority,
        _metadata: candidateJson._metadata,
      };

      await client.query(
        `UPDATE intake_files 
         SET status = $1,
             quality_score = $2,
             parsed_json = $3,
             json = $4,
             json_candidate = $5,
             candidate = $6,
             candidate_id = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [
          status,
          finalQualityResult.score,
          JSON.stringify(mergedParsedJson),
          JSON.stringify(parsedCv),
          JSON.stringify(candidateJson),
          detectedCandidateName,
          candidateId,
          intakeId,
        ]
      );
    } else {
      status = "Needs review";

      // Merge candidateJson into parsedCv for needs review status too
      const mergedParsedJson = {
        ...parsedCv,
        name: candidateJson.name,
        current_title: candidateJson.current_title,
        current_firm: candidateJson.current_firm,
        location: candidateJson.location,
        sectors: candidateJson.sectors || [],
        functions: candidateJson.functions || [],
        asset_classes: candidateJson.asset_classes || [],
        geographies: candidateJson.geographies || [],
        seniority: candidateJson.seniority,
        _metadata: candidateJson._metadata,
      };

      await client.query(
        `UPDATE intake_files 
         SET status = $1,
             quality_score = $2,
             parsed_json = $3,
             json = $4,
             json_candidate = $5,
             candidate = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          status,
          finalQualityResult.score,
          JSON.stringify(mergedParsedJson),
          JSON.stringify(parsedCv),
          JSON.stringify(candidateJson),
          detectedCandidateName,
          intakeId,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      status,
      qualityScore: finalQualityResult.score,
      candidateId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing parsed CV:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle full CV upload pipeline: parse, score quality, create candidate
 */
async function handleCvUpload(intakeId) {
  try {
    // Step 1: Update status to PARSING
    await query(
      "UPDATE intake_files SET status = $1 WHERE id = $2",
      ["Parsing", intakeId]
    );

    // Step 2: Parse CV
    const parsedCv = await parseAndGenerateJson(intakeId);

    // Step 3: Process parsed CV
    const processResult = await processParsedCv(intakeId, parsedCv);

    console.log(`\n[handleCvUpload] ✅ CV processed successfully`);
    console.log(
      `[handleCvUpload] Quality Score: ${processResult.qualityScore}`
    );
    console.log(
      `[handleCvUpload] Candidate ID: ${
        processResult.candidateId || "None (quality too low)"
      }`
    );
    console.log(
      `[handleCvUpload] Status: ${processResult.status}\n`
    );

    return {
      intakeStatus: processResult.status,
      candidateId: processResult.candidateId,
      cvQualityScore: processResult.qualityScore,
    };
  } catch (error) {
    try {
      await query(
        "UPDATE intake_files SET status = $1 WHERE id = $2",
        ["NEEDS_REVIEW", intakeId]
      );
    } catch (updateError) {
      console.error(
        "Failed to update intake status after error:",
        updateError
      );
    }

    console.error("Error in CV upload pipeline:", error);
    throw error;
  }
}

/**
 * Manually create candidate from intake file (for files that needed review)
 */
async function createCandidateFromIntake(intakeId) {
  const { createDraftCandidate } = require("./candidateModel.cjs");
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const res = await client.query(
      "SELECT * FROM intake_files WHERE id = $1 FOR UPDATE",
      [intakeId]
    );
    const row = res.rows[0];

    if (!row) {
      throw new Error(`Intake file with ID ${intakeId} not found`);
    }

    if (!row.parsed_json) {
      throw new Error(
        `Intake file with ID ${intakeId} has no parsed data`
      );
    }

    if (row.candidate_id) {
      throw new Error(
        `Intake file with ID ${intakeId} already has a candidate`
      );
    }

    const parsedCv = typeof row.parsed_json === 'string' 
      ? JSON.parse(row.parsed_json) 
      : row.parsed_json;

    const candidateId = await createDraftCandidate(parsedCv);

    await client.query(
      `UPDATE intake_files 
       SET candidate_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [candidateId, "PARSED", intakeId]
    );

    await client.query("COMMIT");

    return candidateId;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating candidate from intake:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update parsed JSON for an intake file and optionally re-score
 * @param {number} intakeId - Intake file ID
 * @param {object} updatedJson - Updated parsed JSON data
 * @param {boolean} reScore - Whether to re-run quality scoring
 * @returns {Promise<object>} - Updated intake file with new score if applicable
 */
async function updateParsedJson(intakeId, updatedJson, reScore = true) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get the current intake file to check if candidate already exists
    const intakeResult = await client.query(
      'SELECT * FROM intake_files WHERE id = $1',
      [intakeId]
    );
    
    if (intakeResult.rows.length === 0) {
      throw new Error(`Intake file with ID ${intakeId} not found`);
    }
    
    const intake = intakeResult.rows[0];
    
    // Add edit metadata
    const editedJson = {
      ...updatedJson,
      _editHistory: [
        ...(updatedJson._editHistory || []),
        {
          editedAt: new Date().toISOString(),
          editedBy: 'user', // TODO: Replace with actual user ID when auth is implemented
          reason: 'Manual correction'
        }
      ]
    };

    // Update the parsed JSON
    await client.query(
      'UPDATE intake_files SET parsed_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(editedJson), intakeId]
    );

    // Re-score if requested (but don't create a new candidate)
    let qualityScore = intake.quality_score;
    if (reScore) {
      // Import scoring functions
      const { computeCvQuality } = require("./scoringModel.cjs");
      
      // Normalize and score
      const normalizedCv = normalizeParsedCvForScoring(editedJson);
      const qualityResult = computeCvQuality(normalizedCv);
      qualityScore = qualityResult.score;
      
      await client.query(
        'UPDATE intake_files SET quality_score = $1 WHERE id = $2',
        [qualityScore, intakeId]
      );
      
      console.log(`[updateParsedJson] Re-scored CV, new quality: ${qualityScore}`);
    }

    // If a candidate already exists, update their data
    if (intake.candidate_id) {
      const candidateName = editedJson.candidate?.full_name || editedJson.name || intake.candidate;
      
      await client.query(
        `UPDATE candidates 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [candidateName, intake.candidate_id]
      );
      
      console.log(`[updateParsedJson] Updated candidate ${intake.candidate_id} with new name: ${candidateName}`);
    }

    await client.query('COMMIT');
    
    // Return updated intake file
    const updatedIntake = await client.query(
      'SELECT * FROM intake_files WHERE id = $1',
      [intakeId]
    );
    
    return updatedIntake.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating parsed JSON:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Final exports
module.exports = {
  listIntakeFiles,
  listIntakeFilesPaged,
  createIntakeFiles,
  updateIntakeStatus,
  updateParsedJson,
  previewIntakeFile,
  parseAndGenerateJson,
  initIntakeFilesTable,
  processParsedCv,
  handleCvUpload,
  createCandidateFromIntake,
};



// // ============================================================
// // POSTGRESQL VERSION (ACTIVE)
// // ============================================================
// const { query, getClient } = require("../db/pgConnection.cjs");
// const path = require("path");
// const fs = require("fs");
// const { app } = require("electron");
// const { v4: uuidv4 } = require("uuid");
// const { getCVStoragePath } = require("./settingsModel.cjs");
// const pdfParse = require("pdf-parse");
// const mammoth = require("mammoth");
// const { encryptFile, decryptFile } = require("../services/encryptionService.cjs");
// // pdfjs-dist for reading PDF annotations (link URIs)
// let pdfjsLib;
// try {
//   pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
// } catch (e) {
//   // will attempt dynamic import later if needed
//   pdfjsLib = null;
// }
// const { getSetting } = require("./settingsModel.cjs");

// // ============================================================
// // SQLITE VERSION (COMMENTED OUT - KEPT FOR REFERENCE)
// // ============================================================
// // const initDatabase = require("../db/connection.cjs");
// // const path = require("path");
// // const fs = require("fs");
// // const { app } = require("electron");
// // const { v4: uuidv4 } = require("uuid");
// // const { getCVStoragePath } = require("./settingsModel.cjs");
// // const pdfParse = require("pdf-parse");
// // const mammoth = require("mammoth");
// // const { encryptFile, decryptFile } = require("../services/encryptionService.cjs");
// // let pdfjsLib;
// // try {
// //   pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
// // } catch (e) {
// //   pdfjsLib = null;
// // }
// // const { getSetting } = require("./settingsModel.cjs");
// // ============================================================

// // Default parsing prompt that follows the ResumeExtractionSchema
// const DEFAULT_PARSING_PROMPT = `ROLE: Information Extractor (deterministic)
// STYLE: Be literal, concise, and schema-accurate. Do not guess beyond the text.

// TASK
// Read ONE document and decide if it is a resume/CV.
// • If it IS a resume, output valid JSON matching ResumeExtractionSchema.
// • If it is NOT a resume, output valid JSON matching NotResumeSchema.
// • Output MUST be a single JSON object only. No markdown, no prose, no extra keys, no comments.

// DECISION CHECKLIST (apply in order)
// 1) Resume signals (any strong signal → treat as resume):
//    - Sections like "Experience", "Work History", "Education", "Skills", "Projects", "Certifications".
//    - Multiple roles with org names + dates; bullets of responsibilities/achievements.
//    - Contact block (email/phone/LinkedIn) near the top.
// 2) NOT a resume (choose NotResumeSchema) if:
//    - The document is a job description, proposal, brochure, article, pitch deck, invoice, or generic company profile.
//    - It lacks personal work-history records and looks informational/marketing/academic without the candidate's role history.
// 3) If ambiguous, prefer "resume" ONLY if there are 2+ role entries or one clear role + education + skills.

// EXTRACTION RULES (strict)
// • Source of truth: text inside the document only. Never invent entities.
// • Dates: ISO "YYYY-MM" when month is present; otherwise "YYYY". Unknown → null.
// • Arrays: must exist (use [] if empty). Do NOT return null for arrays.
// • Strings: return "" if truly empty; otherwise concise content from the document.
// • Bullet points: put each bullet/achievement as a separate string in "highlights".
// • Metrics: capture numeric KPIs (%, $, counts, time) exactly as written when possible.
// • Contact normalization:
//   - phone: keep as-is from doc (light cleanup allowed, e.g., remove spaces).
//   - email/urls: copy exact text; do not fabricate.
// • Titles/companies/locations: copy as shown; avoid expansions unless explicitly present.
// • Redact NOTHING unless the source is redacted.
// • Never include additional fields beyond the chosen schema.

// OUTPUT GUARANTEES
// • Return EXACTLY one JSON object conforming to the respective schema.
// • If a required field is missing from the doc, fill with "" (strings), null (nullable fields), or [] (arrays) per schema.
// • Validate mentally against required fields before responding.

// === ResumeExtractionSchema (JSON Schema draft-07) ===
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "title": "ResumeExtractionSchema",
//   "type": "object",
//   "required": ["is_valid_resume","document_title","candidate","contact","summary","experience","education","skills","projects","certifications","awards","public_profiles","metrics"],
//   "properties": {
//     "is_valid_resume": { "type": "boolean", "const": true },
//     "document_title": { "type": "string" },
//     "candidate": {
//       "type": "object",
//       "required": ["full_name","current_titles","location"],
//       "properties": {
//         "full_name": { "type": "string" },
//         "current_titles": { "type": "array", "items": { "type": "string" } },
//         "location": { "type": "string" }
//       }
//     },
//     "contact": {
//       "type": "object",
//       "required": ["email","phone"],
//       "properties": {
//         "email": { "type": "string" },
//         "phone": { "type": "string" },
//         "website": { "type": ["string","null"] }
//       }
//     },
//     "public_profiles": {
//       "type": "object",
//       "properties": {
//         "linkedin": { "type": ["string","null"] },
//         "github": { "type": ["string","null"] },
//         "other": { "type": "array", "items": { "type": "string" } }
//       }
//     },
//     "summary": { "type": "string" },
//     "metrics": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "required": ["label","value"],
//         "properties": {
//           "label": { "type": "string" },
//           "value": { "type": "string" }
//         }
//       }
//     },
//     "experience": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "required": ["title","company","start_date","end_date","location","highlights"],
//         "properties": {
//           "title": { "type": "string" },
//           "company": { "type": "string" },
//           "employment_type": { "type": ["string","null"] },
//           "start_date": { "type": ["string","null"] },
//           "end_date": { "type": ["string","null"] },
//           "location": { "type": "string" },
//           "highlights": { "type": "array", "items": { "type": "string" } }
//         }
//       }
//     },
//     "education": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "required": ["degree","institution","start_date","end_date"],
//         "properties": {
//           "degree": { "type": "string" },
//           "institution": { "type": "string" },
//           "start_date": { "type": ["string","null"] },
//           "end_date": { "type": ["string","null"] },
//           "focus": { "type": ["string","null"] }
//         }
//       }
//     },
//     "skills": {
//       "type": "object",
//       "properties": {
//         "technical": { "type": "array", "items": { "type": "string" } },
//         "domains": { "type": "array", "items": { "type": "string" } },
//         "leadership": { "type": "array", "items": { "type": "string" } }
//       }
//     },
//     "projects": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "required": ["name","highlights"],
//         "properties": {
//           "name": { "type": "string" },
//           "highlights": { "type": "array", "items": { "type": "string" } },
//           "impact": { "type": ["string","null"] }
//         }
//       }
//     },
//     "certifications": { "type": "array", "items": { "type": "string" } },
//     "awards": { "type": "array", "items": { "type": "string" } }
//   }
// }

// === NotResumeSchema (JSON Schema draft-07) ===
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "title": "NotResumeSchema",
//   "type": "object",
//   "required": ["is_valid_resume","document_title","doc_type","reason"],
//   "properties": {
//     "is_valid_resume": { "type": "boolean", "const": false },
//     "document_title": { "type": "string" },
//     "doc_type": { "type": "string" },
//     "reason": { "type": "string" }
//   }
// }

// Now process the document below. Insert its raw text where {{text}} appears.
// Return ONLY one JSON object, no prose, no markdown.

// Document text:
// {{text}}`;

// /**
//  * List all intake files
//  */
// async function listIntakeFiles() {
//   const db = await initDatabase();
//   return db.all(
//     "SELECT * FROM intake_files ORDER BY uploaded_at DESC, id DESC"
//   );
// }

// /**
//  * Create intake entries + store file on disk (encrypted/unencrypted)
//  */
// async function createIntakeFiles(files) {
//   const db = await initDatabase();

//   // Get the configured CV storage path
//   const storageDir = await getCVStoragePath();

//   const stmt = await db.prepare(`
//     INSERT INTO intake_files
//       (file_name, file_path, candidate, type, source, uploaded_by, uploaded_at, status, variant, is_encrypted, encryption_version)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `);

//   const today = new Date().toISOString().slice(0, 10);

//   // Helper to detect candidate name from raw text heuristically
//   function detectCandidateName(rawText) {
//     if (!rawText) return null;
//     const maxSlice = rawText.slice(0, 4000);
//     const lines = maxSlice
//       .split(/\r?\n|\t|\s{2,}/)
//       .map((l) => l.trim())
//       .filter(Boolean);

//     const nameRegex = /^([A-Z][a-zA-Z'\-]+\s){1,3}[A-Z][a-zA-Z'\-]+$/;

//     for (const line of lines) {
//       if (line.length > 120) continue; // too long for a name
//       if (/[@|https?:\/]/i.test(line)) continue; // skip lines with emails/urls
//       if (nameRegex.test(line)) return line.trim();
//     }
//     return null;
//   }

//   try {
//     for (const file of files) {
//       const ext = path.extname(file.fileName);
//       const newFilename = uuidv4() + ext; // Stored filename (UUID)
//       const destPath = path.join(storageDir, newFilename);

//       const buffer = Buffer.from(file.buffer);

//       // NOTE: encryption currently disabled for debugging; store as plain
//       fs.writeFileSync(destPath, buffer);

//       // Attempt lightweight text extraction for name detection
//       let detectedName = null;
//       try {
//         const lowerExt = ext.toLowerCase();
//         if (lowerExt.includes("pdf")) {
//           const parsed = await pdfParse(buffer);
//           detectedName = detectCandidateName(parsed.text || "");
//         } else if (lowerExt.includes("docx")) {
//           try {
//             const result = await mammoth.extractRawText({ buffer });
//             detectedName = detectCandidateName(result.value || "");
//           } catch (e) {
//             const txt = buffer.toString("utf8");
//             detectedName = detectCandidateName(txt);
//           }
//         } else {
//           const txt = buffer.toString("utf8");
//           detectedName = detectCandidateName(txt);
//         }
//       } catch (e) {
//         console.warn(
//           "[createIntakeFiles] name detection failed for",
//           file.fileName,
//           e && e.message ? e.message : e
//         );
//       }

//       const finalDisplayName = detectedName || file.fileName;

//       await stmt.run(
//         finalDisplayName, // file_name (shown in UI, possibly normalized to candidate name)
//         destPath, // file_path
//         detectedName || null, // candidate column stores detected name if found
//         file.type || ext.replace(".", "").toUpperCase() || "PDF", // type
//         file.source || "Manual upload", // source
//         file.uploadedBy || "Admin", // uploaded_by
//         file.uploadedAt || today, // uploaded_at
//         "New", // status
//         "info", // variant
//         0, // is_encrypted (0 = false; adjust if you enable encryption)
//         null // encryption_version
//       );
//     }
//   } finally {
//     await stmt.finalize();
//   }

//   return listIntakeFiles();
// }

// /**
//  * Update intake row status
//  */
// async function updateIntakeStatus(id, status) {
//   const db = await initDatabase();

//   let variant = "info";
//   if (status === "Approved") variant = "success";
//   else if (status === "Needs review") variant = "warning";
//   else if (status === "Rejected") variant = "destructive";

//   await db.run(
//     "UPDATE intake_files SET status = ?, variant = ? WHERE id = ?",
//     status,
//     variant,
//     id
//   );

//   return db.get("SELECT * FROM intake_files WHERE id = ?", id);
// }

// /**
//  * Preview intake file content as base64
//  */
// async function previewIntakeFile(id) {
//   const db = await initDatabase();
//   const row = await db.get("SELECT * FROM intake_files WHERE id = ?", id);
//   if (!row || !row.file_path) throw new Error("File not found");

//   const filePath = row.file_path;
//   if (!fs.existsSync(filePath)) throw new Error("Stored file missing");

//   const ext = path.extname(filePath).toLowerCase();
//   let mime = "application/octet-stream";
//   if (ext === ".pdf" || ext === ".pdf.enc") mime = "application/pdf";
//   else if (ext === ".txt") mime = "text/plain";
//   else if (ext === ".png") mime = "image/png";
//   else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
//   else if (ext === ".docx" || ext === ".docx.enc")
//     mime =
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

//   let buf = fs.readFileSync(filePath);

//   // Encryption disabled for debugging
//   const base64 = buf.toString("base64");
//   return { fileName: row.file_name, mimeType: mime, base64 };
// }

// /**
//  * Parse a stored intake file, extract text, send to OpenAI to get structured JSON,
//  * store the JSON in the intake_files.parsed_json column and return the parsed object.
//  * If parsed_json already exists in DB, return it directly without calling OpenAI.
//  */
// async function parseAndGenerateJson(id) {
//   console.log(
//     `[parseAndGenerateJson] ========== START for id ${id} ==========`
//   );

//   const db = await initDatabase();
//   const row = await db.get("SELECT * FROM intake_files WHERE id = ?", id);
//   if (!row) throw new Error("Intake row not found");

//   console.log(
//     `[parseAndGenerateJson] File: ${row.file_name}, is_encrypted: ${row.is_encrypted}`
//   );

//   // If parsed JSON present, return it (avoid calling OpenAI)
//   if (row.parsed_json) {
//     console.log(`[parseAndGenerateJson] Using cached parsed_json`);
//     try {
//       const cachedData = JSON.parse(row.parsed_json);
//       console.log('[parseAndGenerateJson] Cached data:', JSON.stringify(cachedData, null, 2));
      
//       // Validate cached data - if it's incomplete, force regeneration
//       const isValid = cachedData && 
//                      cachedData.name && 
//                      cachedData.name.trim() !== '' &&
//                      cachedData.name !== 'null';
      
//       if (!isValid) {
//         console.warn('[parseAndGenerateJson] Cached data is invalid (empty name), regenerating...');
//         // Clear the cached data and continue to regenerate
//         await db.run(
//           "UPDATE intake_files SET parsed_json = NULL WHERE id = ?",
//           [id]
//         );
//       } else {
//         return cachedData;
//       }
//     } catch (e) {
//       console.warn("Stored parsed_json invalid, regenerating", e);
//     }
//   }

//   if (!row.file_path || !fs.existsSync(row.file_path)) {
//     throw new Error("Stored file not available");
//   }

//   const ext = path.extname(row.file_path).toLowerCase();
//   let extractedText = "";
//   let extractedLinks = [];

//   console.log(`[parseAndGenerateJson] File extension: ${ext}`);

//   // Read file from disk
//   let fileBuffer = fs.readFileSync(row.file_path);
//   console.log(`[parseAndGenerateJson] Read ${fileBuffer.length} bytes`);

//   // 1) Extract text + links/emails
//   console.log(`[parseAndGenerateJson] Starting text extraction...`);
//   try {
//     if (ext === ".pdf" || ext === ".pdf.enc") {
//       console.log(`[parseAndGenerateJson] Parsing PDF...`);
//       const parsed = await pdfParse(fileBuffer);
//       console.log(
//         `[parseAndGenerateJson] PDF parsed, extracted text length: ${
//           parsed.text?.length || 0
//         }`
//       );

//       extractedText = parsed.text || "";

//       try {
//         console.log(
//           `[intakeModel] pdf text snippet id ${id}:`,
//           (extractedText || "").slice(0, 200)
//         );
//       } catch (e) {}

//       // URLs & emails in visible text
//       const urlRegex =
//         /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
//       const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
//       const urls = (extractedText.match(urlRegex) || []).map((s) =>
//         s.trim()
//       );
//       const emails = (extractedText.match(emailRegex) || []).map((s) =>
//         s.trim()
//       );
//       extractedLinks = Array.from(new Set([...urls, ...emails]));

//       // PDF link annotations (mailto, LinkedIn, etc.)
//       try {
//         if (!pdfjsLib)
//           pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
//         const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
//         const pdfDoc = await loadingTask.promise;
//         const pdfLinks = [];
//         for (let p = 1; p <= pdfDoc.numPages; p++) {
//           const page = await pdfDoc.getPage(p);
//           const ann = await page.getAnnotations();
//           for (const a of ann) {
//             if (a.subtype === "Link") {
//               if (a.url) pdfLinks.push(a.url);
//               else if (a.dest && typeof a.dest === "string")
//                 pdfLinks.push(a.dest);
//             }
//           }
//         }
//         if (pdfLinks.length) {
//           extractedLinks = Array.from(
//             new Set([...extractedLinks, ...pdfLinks])
//           );
//           try {
//             console.log(
//               `[intakeModel] pdf annotations for id ${id}:`,
//               pdfLinks
//             );
//           } catch (e) {}
//         }
//       } catch (e) {
//         console.warn(
//           "[intakeModel] pdfjs annotation extraction failed",
//           e && e.message ? e.message : e
//         );
//       }
//     } else if (ext === ".docx" || ext === ".docx.enc") {
//       console.log(`[parseAndGenerateJson] Parsing DOCX...`);
//       // DOCX: mammoth -> HTML -> inject URLs into text
//       try {
//         const result = await mammoth.convertToHtml({
//           buffer: fileBuffer,
//         });
//         console.log(
//           `[parseAndGenerateJson] DOCX converted to HTML, length: ${
//             result.value?.length || 0
//           }`
//         );
//         let html = result.value || "";

//         const hrefs = [];
//         html = html.replace(
//           /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
//           (match, href, text) => {
//             const cleanHref = href.trim();
//             if (cleanHref) hrefs.push(cleanHref);
//             const cleanText = (text || "").trim();
//             return cleanText ? `${cleanText} (${cleanHref})` : cleanHref;
//           }
//         );

//         const plain = html
//           .replace(/<[^>]+>/g, " ")
//           .replace(/\s+/g, " ")
//           .trim();
//         extractedText = plain.slice(0, 20000);
//         extractedLinks = Array.from(new Set(hrefs));
//         console.log(
//           `[parseAndGenerateJson] DOCX extraction complete: ${extractedText.length} chars, ${extractedLinks.length} links`
//         );
//       } catch (e) {
//         console.warn(
//           "[parseAndGenerateJson] mammoth conversion failed, falling back to text read",
//           e
//         );
//         const data = fileBuffer.toString("utf8");
//         extractedText = data.slice(0, 20000);
//         const urlRegex2 =
//           /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
//         extractedLinks = Array.from(
//           new Set(extractedText.match(urlRegex2) || [])
//         );
//       }
//     } else {
//       console.log(`[parseAndGenerateJson] Parsing as text file`);
//       // TXT / .doc etc.
//       const data = fileBuffer.toString("utf8");
//       extractedText = data.slice(0, 20000);
//       const urlRegex2 =
//         /(?:https?:\/\/|www\.)[\w\-\.@:\/?#=%&+~,;()\[\]\$'!]+/gi;
//       const emailRegex2 =
//         /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
//       const urls = (extractedText.match(urlRegex2) || []).map((s) =>
//         s.trim()
//       );
//       const emails = (extractedText.match(emailRegex2) || []).map((s) =>
//         s.trim()
//       );
//       extractedLinks = Array.from(new Set([...urls, ...emails]));
//     }
//   } catch (err) {
//     console.error(`[parseAndGenerateJson] Text extraction failed:`, err);
//     throw err;
//   }

//   console.log(
//     `[parseAndGenerateJson] Text extraction complete: ${extractedText.length} chars, ${extractedLinks.length} links`
//   );

//   try {
//     console.log(
//       `[parseAndGenerateJson] extracted links for id ${id}:`,
//       extractedLinks
//     );
//   } catch (e) {}

//   // IMPORTANT: system prompt is generic; user prompt defines schema (your DEFAULT_PROMPT)
//   const systemPrompt = `ROLE: Information Extractor (deterministic)
// You convert resume/CV documents into strict JSON according to the instructions and schemas provided in the user message.
// Follow the user message EXACTLY. Do not invent extra keys or formats. Output a single JSON object only.`;

//   const userPromptTemplate = await getSetting("openai_parse_prompt");
//   let userPrompt;
//   console.log(
//     `[parseAndGenerateJson] User prompt template: ${
//       userPromptTemplate ? "set" : "not set, using DEFAULT_PARSING_PROMPT"
//     }`
//   );
//   if (userPromptTemplate && typeof userPromptTemplate === "string") {
//     if (userPromptTemplate.includes("{{text}}")) {
//       userPrompt = userPromptTemplate.replace(/{{text}}/g, extractedText);
//     } else {
//       userPrompt = `${userPromptTemplate}\n\n${extractedText}`;
//     }
//   } else {
//     // Use DEFAULT_PARSING_PROMPT with proper schema
//     userPrompt = DEFAULT_PARSING_PROMPT.replace(/{{text}}/g, extractedText);
//   }

//   console.log(
//     `[parseAndGenerateJson] User prompt length: ${userPrompt.length} chars`
//   );

//   // Append extracted links/emails so the model can use them
//   if (extractedLinks && extractedLinks.length) {
//     userPrompt += `\n\nDetected hyperlinks and emails in the original document:\n${extractedLinks.join(
//       "\n"
//     )}\n\nWhen a certification or course refers to an online resource, include the corresponding URL in the certification text and use URLs/emails to populate contact and public_profiles where appropriate.`;
//   }

//   console.log(
//     `[parseAndGenerateJson] Final user prompt length: ${
//       userPrompt.length
//     } chars`
//   );

//   // Use llmAdapter to call the active provider (LangChain ChatOpenAI preferred, or Google Gemini, etc.)
//   console.log(`[parseAndGenerateJson] Calling LLM adapter...`);
//   const llmAdapter = require("../services/llmAdapter.cjs");
//   let assistant;
//   try {
//     assistant = await llmAdapter.chat(
//       [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: userPrompt },
//       ],
//       { temperature: 0, max_tokens: 4000 }
//     );
//     console.log(
//       `[parseAndGenerateJson] LLM response received, length: ${
//         assistant?.length || 0
//       } chars`
//     );
//   } catch (err) {
//     console.error(`[parseAndGenerateJson] LLM call failed:`, err.message);
//     throw err;
//   }

//   // Log the response for debugging
//   try {
//     console.log(
//       `[parseAndGenerateJson] LLM response length for id ${id}: ${
//         assistant?.length || 0
//       } chars`
//     );
//     console.log(
//       `[parseAndGenerateJson] LLM response first 500 chars: ${String(
//         assistant || ""
//       ).slice(0, 500)}`
//     );
//     console.log(
//       `[parseAndGenerateJson] LLM response last 200 chars: ${String(
//         assistant || ""
//       ).slice(-200)}`
//     );
//   } catch (e) {}

//   const cleaned = assistant.replace(/```json|```/g, "").trim();
//   let parsedJson = null;
//   try {
//     const firstBrace = cleaned.indexOf("{");
//     const lastBrace = cleaned.lastIndexOf("}");
//     const jsonText =
//       firstBrace !== -1 && lastBrace !== -1
//         ? cleaned.slice(firstBrace, lastBrace + 1)
//         : cleaned;
//     parsedJson = JSON.parse(jsonText);
//   } catch (e) {
//     console.error(
//       `[intakeModel] JSON parsing failed for id ${id}:`,
//       e.message
//     );
//     console.error(
//       `[intakeModel] Cleaned response: ${cleaned.slice(0, 1000)}`
//     );
//     throw new Error(
//       "Failed to parse JSON from model response: " +
//         e.message +
//         "\nResponse:\n" +
//         assistant.slice(0, 2000)
//     );
//   }

//   // Ensure raw_text captured for parser confidence scoring and diagnostics
//   try {
//     if (!parsedJson.raw_text) parsedJson.raw_text = extractedText || "";
//     parsedJson._extracted_links = extractedLinks || [];
//   } catch (e) {
//     console.warn(
//       "[parseAndGenerateJson] failed to attach raw_text/_extracted_links",
//       e && e.message ? e.message : e
//     );
//   }

//   // 2b) Candidate name detection (top-level or public_profiles array)
//   let detectedName = null;
//   try {
//     if (
//       parsedJson.name &&
//       typeof parsedJson.name === "string" &&
//       parsedJson.name.trim().length > 1
//     ) {
//       detectedName = parsedJson.name.trim();
//       console.log(
//         `[parseAndGenerateJson] Detected candidate name (top-level): ${detectedName}`
//       );
//     }
//     if (!detectedName) {
//       const pp = parsedJson.public_profiles;
//       if (Array.isArray(pp)) {
//         for (const entry of pp) {
//           if (entry && typeof entry === "object") {
//             const maybeName =
//               entry.name || entry.full_name || entry.displayName;
//             if (
//               maybeName &&
//               typeof maybeName === "string" &&
//               maybeName.trim().length > 1
//             ) {
//               detectedName = maybeName.trim();
//               console.log(
//                 `[parseAndGenerateJson] Detected candidate name (public_profiles array): ${detectedName}`
//               );
//               break;
//             }
//           }
//         }
//       } else if (pp && typeof pp === "object") {
//         // Legacy object shape – not expected to carry name, skip
//       }
//     }
//   } catch (e) {
//     console.warn(
//       "[parseAndGenerateJson] name detection failed",
//       e && e.message ? e.message : e
//     );
//   }

//   // If a detected name exists, update intake_files immediately (file_name & candidate columns)
//   if (detectedName) {
//     try {
//       await db.run(
//         `UPDATE intake_files SET file_name = ?, candidate = ? WHERE id = ?`,
//         detectedName,
//         detectedName,
//         id
//       );
//       console.log(
//         `[parseAndGenerateJson] Intake row updated with detected name: ${detectedName}`
//       );
//     } catch (e) {
//       console.warn(
//         "[parseAndGenerateJson] failed to update intake row with detected name",
//         e && e.message ? e.message : e
//       );
//     }
//   } else {
//     console.log("[parseAndGenerateJson] No candidate name detected for id", id);
//   }

//   // 3) Post-processing: email + contact + public_profiles

//   // 3a) Try to fill email if missing
//   try {
//     const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
//     let foundEmail = null;

//     if (extractedLinks && extractedLinks.length) {
//       for (const link of extractedLinks) {
//         const m = String(link).match(emailPattern);
//         if (m && m[0]) {
//           foundEmail = m[0];
//           break;
//         }
//       }
//     }

//     if (!foundEmail && extractedText) {
//       const m2 = extractedText.match(emailPattern);
//       if (m2 && m2[0]) {
//         foundEmail = m2[0];
//       }
//     }

//     if (
//       foundEmail &&
//       (!parsedJson.email ||
//         parsedJson.email === null ||
//         parsedJson.email === "")
//     ) {
//       parsedJson.email = foundEmail;
//     }
//   } catch (e) {
//     console.warn("[intakeModel] email post-processing failed", e);
//   }

//   // 3b) Ensure contact object exists and is synced with top-level email/phone
//   try {
//     if (!parsedJson.contact || typeof parsedJson.contact !== "object") {
//       parsedJson.contact = {
//         email: parsedJson.email || null,
//         phone: parsedJson.phone || null,
//         website: null,
//       };
//     } else {
//       if (
//         (!parsedJson.contact.email ||
//           parsedJson.contact.email === null ||
//           parsedJson.contact.email === "") &&
//         parsedJson.email
//       ) {
//         parsedJson.contact.email = parsedJson.email;
//       }
//       if (
//         (!parsedJson.contact.phone ||
//           parsedJson.contact.phone === null ||
//           parsedJson.contact.phone === "") &&
//         parsedJson.phone
//       ) {
//         parsedJson.contact.phone = parsedJson.phone;
//       }
//       if (!("website" in parsedJson.contact)) {
//         parsedJson.contact.website = null;
//       }
//     }
//   } catch (e) {
//     console.warn("[intakeModel] contact post-processing failed", e);
//   }

//   // 3c) Ensure public_profiles exists, and populate linkedin/github/other from links
//   try {
//     if (
//       !parsedJson.public_profiles ||
//       typeof parsedJson.public_profiles !== "object"
//     ) {
//       parsedJson.public_profiles = {
//         linkedin: null,
//         github: null,
//         other: [],
//       };
//     } else {
//       if (parsedJson.public_profiles.linkedin === undefined)
//         parsedJson.public_profiles.linkedin = null;
//       if (parsedJson.public_profiles.github === undefined)
//         parsedJson.public_profiles.github = null;
//       if (!Array.isArray(parsedJson.public_profiles.other))
//         parsedJson.public_profiles.other = [];
//     }

//     if (extractedLinks && extractedLinks.length) {
//       for (const raw of extractedLinks) {
//         const u = String(raw).trim();
//         const lower = u.toLowerCase();
//         if (lower.includes("linkedin.com")) {
//           if (!parsedJson.public_profiles.linkedin) {
//             parsedJson.public_profiles.linkedin = u;
//           }
//           continue;
//         }
//         if (lower.includes("github.com") || lower.includes("github.io")) {
//           if (!parsedJson.public_profiles.github) {
//             parsedJson.public_profiles.github = u;
//           }
//           continue;
//         }
//         // generic URL -> push to other, maybe also website if contact.website empty
//         const looksUrl =
//           /^https?:\/\//i.test(u) || lower.startsWith("www.");
//         if (looksUrl) {
//           if (!parsedJson.public_profiles.other.includes(u)) {
//             parsedJson.public_profiles.other.push(u);
//           }
//           if (
//             (!parsedJson.contact.website ||
//               parsedJson.contact.website === null ||
//               parsedJson.contact.website === "") &&
//             !lower.includes("linkedin.com") &&
//             !lower.includes("github.com")
//           ) {
//             parsedJson.contact.website = u;
//           }
//         }
//       }
//     }
//   } catch (e) {
//     console.warn(
//       "[intakeModel] public_profiles post-processing failed",
//       e
//     );
//   }

//   try {
//     console.log(
//       `[parseAndGenerateJson] final extracted links for id ${id}:`,
//       extractedLinks
//     );
//   } catch (e) {}

//   console.log(`[parseAndGenerateJson] Saving parsed JSON to database...`);
//   await db.run(
//     "UPDATE intake_files SET parsed_json = ?, parsed_at = CURRENT_TIMESTAMP WHERE id = ?",
//     JSON.stringify(parsedJson),
//     id
//   );

//   console.log(
//     `[parseAndGenerateJson] ========== COMPLETE for id ${id} ==========`
//   );
//   return parsedJson;
// }

// /**
//  * Initialize intake_files table with new columns for CV processing
//  */
// async function initIntakeFilesTable(db) {
//   if (!db) {
//     db = await initDatabase();
//   }

//   // Add columns if they don't exist
//   const pragma = await db.all(`PRAGMA table_info(intake_files)`);

//   const hasQualityScore = pragma.some(
//     (col) => col.name === "quality_score"
//   );
//   if (!hasQualityScore) {
//     try {
//       await db.exec(
//         `ALTER TABLE intake_files ADD COLUMN quality_score REAL;`
//       );
//     } catch (e) {
//       // Column might already exist
//     }
//   }

//   const hasCandidateId = pragma.some(
//     (col) => col.name === "candidate_id"
//   );
//   if (!hasCandidateId) {
//     try {
//       await db.exec(
//         `ALTER TABLE intake_files ADD COLUMN candidate_id INTEGER;`
//       );
//     } catch (e) {
//       // Column might already exist
//     }
//   }

//   const hasJson = pragma.some((col) => col.name === "json");
//   if (!hasJson) {
//     try {
//       await db.exec(
//         `ALTER TABLE intake_files ADD COLUMN json TEXT;`
//       );
//     } catch (e) {
//       // Column might already exist
//     }
//   }

//   const hasJsonCandidate = pragma.some(
//     (col) => col.name === "jsonCandidate"
//   );
//   if (!hasJsonCandidate) {
//     try {
//       await db.exec(
//         `ALTER TABLE intake_files ADD COLUMN jsonCandidate TEXT;`
//       );
//     } catch (e) {
//       // Column might already exist
//     }
//   }

//   try {
//     await db.exec(`
//       CREATE INDEX IF NOT EXISTS idx_intake_files_candidate_id ON intake_files(candidate_id);
//     `);
//   } catch (e) {
//     // Index might already exist
//   }
// }

// /**
//  * Normalize parsed CV from various schema formats to the format expected by scoring
//  */
// function normalizeParsedCvForScoring(parsedCv) {
//   console.log('\n[normalizeParsedCvForScoring] Starting normalization...');
//   console.log('[normalizeParsedCvForScoring] Input keys:', Object.keys(parsedCv).join(', '));

//   // If already in flat format, return as-is
//   if (parsedCv.current_title && parsedCv.current_firm && parsedCv.name) {
//     console.log('[normalizeParsedCvForScoring] Already in flat format, returning as-is');
//     return parsedCv;
//   }

//   const normalized = { ...parsedCv };

//   // Strategy 1: Handle "personal_information" structure (custom format)
//   if (parsedCv.personal_information && typeof parsedCv.personal_information === 'object') {
//     console.log('[normalizeParsedCvForScoring] Detected personal_information structure');
//     const pi = parsedCv.personal_information;
//     normalized.name = pi.name || parsedCv.name;
//     normalized.current_title = pi.current_title;
//     normalized.current_firm = pi.current_firm;
//     normalized.location = pi.location;
//   }

//   // Strategy 2: Handle "candidate" structure (ResumeExtractionSchema format)
//   if (parsedCv.candidate && typeof parsedCv.candidate === 'object') {
//     console.log('[normalizeParsedCvForScoring] Detected candidate structure');
//     normalized.name = parsedCv.candidate.full_name || parsedCv.name;
//     normalized.current_title = Array.isArray(parsedCv.candidate.current_titles) && parsedCv.candidate.current_titles.length > 0
//       ? parsedCv.candidate.current_titles[0]
//       : null;
//     normalized.location = parsedCv.candidate.location;
//   }

//   // Strategy 3: Handle "professional_experience" array
//   let experienceArray = null;
//   if (parsedCv.professional_experience && Array.isArray(parsedCv.professional_experience)) {
//     console.log('[normalizeParsedCvForScoring] Detected professional_experience array');
//     experienceArray = parsedCv.professional_experience;
    
//     // Map professional_experience to experience format expected by scoring
//     normalized.experience = experienceArray.map(exp => ({
//       firm: exp.firm || exp.company,
//       title: exp.title,
//       dateFrom: exp.start_date,
//       dateTo: exp.end_date,
//       location: exp.location,
//       highlights: exp.responsibilities || exp.highlights || []
//     }));
//   } else if (parsedCv.experience && Array.isArray(parsedCv.experience)) {
//     console.log('[normalizeParsedCvForScoring] Detected experience array (ResumeExtractionSchema format)');
//     experienceArray = parsedCv.experience;
    
//     // Check if the first entry uses 'company' and 'start_date' (ResumeExtractionSchema format)
//     // If so, map it to the format expected by scoring (firm, dateFrom)
//     if (experienceArray.length > 0 && experienceArray[0].company !== undefined) {
//       console.log('[normalizeParsedCvForScoring] Mapping experience from ResumeExtractionSchema format to scoring format');
//       normalized.experience = experienceArray.map(exp => ({
//         firm: exp.company,
//         title: exp.title,
//         dateFrom: exp.start_date,
//         dateTo: exp.end_date,
//         location: exp.location,
//         highlights: exp.highlights || []
//       }));
//     } else {
//       // Already in the correct format (firm, dateFrom)
//       console.log('[normalizeParsedCvForScoring] Experience already in scoring format');
//       normalized.experience = experienceArray;
//     }
//   }

//   // Extract current_firm from first experience entry if available and not already set
//   // Use the normalized.experience array (which has been mapped to the correct format)
//   if (!normalized.current_firm && normalized.experience && Array.isArray(normalized.experience) && normalized.experience.length > 0) {
//     const firstExp = normalized.experience[0];
//     const endDate = firstExp.dateTo || firstExp.end_date;
    
//     // Only use first experience as "current" if it has no end_date or end_date is "Present"
//     if (!endDate || endDate === null || endDate === '' || 
//         String(endDate).toLowerCase().includes('present') || 
//         String(endDate).toLowerCase().includes('current')) {
//       normalized.current_firm = firstExp.firm;
//       console.log(`[normalizeParsedCvForScoring] Extracted current_firm from first experience: ${normalized.current_firm}`);
      
//       // Also update current_title if not already set
//       if (!normalized.current_title) {
//         normalized.current_title = firstExp.title;
//         console.log(`[normalizeParsedCvForScoring] Extracted current_title from first experience: ${normalized.current_title}`);
//       }
//     }
//   }

//   // Ensure education array is properly formatted
//   normalized.education = parsedCv.education || [];

//   console.log('\n[normalizeParsedCvForScoring] ✅ Normalized CV for scoring:');
//   console.log(`  name: ${normalized.name || '(empty)'}`);
//   console.log(`  current_title: ${normalized.current_title || '(empty)'}`);
//   console.log(`  current_firm: ${normalized.current_firm || '(empty)'}`);
//   console.log(`  location: ${normalized.location || '(empty)'}`);
//   console.log(`  experience entries: ${normalized.experience?.length || 0}`);
//   console.log(`  education entries: ${normalized.education?.length || 0}`);
  
//   // Log first few experience entries for debugging
//   if (normalized.experience && normalized.experience.length > 0) {
//     console.log('\n[normalizeParsedCvForScoring] Sample experience entries:');
//     normalized.experience.slice(0, 2).forEach((exp, idx) => {
//       console.log(`  Entry ${idx + 1}:`);
//       console.log(`    firm: ${exp.firm || '(empty)'}`);
//       console.log(`    title: ${exp.title || '(empty)'}`);
//       console.log(`    dateFrom: ${exp.dateFrom || '(empty)'}`);
//       console.log(`    dateTo: ${exp.dateTo || '(empty)'}`);
//     });
//   }

//   return normalized;
// }

// /**
//  * Process a parsed CV: compute quality, save results, and auto-create candidate if threshold met
//  * Returns: { status, qualityScore, candidateId? }
//  */
// async function processParsedCv(intakeId, parsedCv) {
//   const {
//     computeCvQuality,
//     getQualityThresholds,
//     getCvQualityWeights,
//   } = require("./scoringModel.cjs");
//   const { createDraftCandidate } = require("./candidateModel.cjs");
//   const llmAdapter = require("../services/llmAdapter.cjs");

//   const db = await initDatabase();

//   await db.run("BEGIN TRANSACTION");

//   try {
//     // Normalize the parsed CV to match the expected scoring format
//     const normalizedCv = normalizeParsedCvForScoring(parsedCv);

//     // Compute CV quality
//     const qualityResult = computeCvQuality(normalizedCv);
//     const thresholds = getQualityThresholds();
//     const qWeights = getCvQualityWeights();

//     // Enhanced logging with threshold comparison
//     console.log('\n╔════════════════════════════════════════════════════════════════╗');
//     console.log('║              QUALITY SCORE EVALUATION RESULT                   ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log(`\n📊 Final Quality Score: ${qualityResult.score.toFixed(4)} (${(qualityResult.score * 100).toFixed(2)}%)`);
//     console.log('\n🎯 Thresholds:');
//     console.log(`   Good Threshold:       ${thresholds.good.toFixed(2)}`);
//     console.log(`   Borderline Threshold: ${thresholds.borderline.toFixed(2)}`);
    
//     let qualityStatus;
//     let emoji;
//     if (qualityResult.score >= thresholds.good) {
//       qualityStatus = 'GOOD - Will auto-create candidate';
//       emoji = '✅';
//     } else if (qualityResult.score >= thresholds.borderline) {
//       qualityStatus = 'BORDERLINE - Requires review';
//       emoji = '⚠️';
//     } else {
//       qualityStatus = 'POOR - Requires manual review';
//       emoji = '❌';
//     }
    
//     console.log(`\n${emoji} Status: ${qualityStatus}`);
//     console.log('╚════════════════════════════════════════════════════════════════╝\n');

//     // Generate candidate-shaped JSON using AI with a deterministic prompt
//     let candidateJson = null;
    
//     try {
//       const systemPrompt =
//         "ROLE: Candidate JSON Normalizer (deterministic)\nYou convert a parsed CV object into a STRICT candidate JSON matching the exact schema provided.\nReturn ONLY a single JSON object with the exact keys and types. No markdown, no comments.";

//       const schema = {
//         name: "string",
//         current_title: "string|null",
//         current_firm: "string|null",
//         location: "string|null",
//         sectors: ["string"],
//         functions: ["string"],
//         asset_classes: ["string"],
//         geographies: ["string"],
//         seniority: "string|null",
//       };

//       // Simple prompt for candidate extraction only
//       const userPrompt = `Using the parsed CV JSON below, produce a candidate JSON with this exact schema:
// ${JSON.stringify(schema, null, 2)}

// NORMALIZATION RULES:
// - Arrays must always be arrays (may be empty).
// - Use strings without trailing punctuation; trim whitespace.
// - If a field cannot be determined, set null (for strings) or [] (for arrays).
// - Deduplicate and normalize capitalization (e.g., 'ECM', 'Equity').
// - Prefer values that reflect the current/latest role for current_title/current_firm.

// PARSED CV (first 8000 chars):
// ${JSON.stringify(parsedCv, null, 2).slice(0, 8000)}

// Return ONLY the candidate JSON object.`;

//       const aiResp = await llmAdapter.chat(
//         [
//           { role: "system", content: systemPrompt },
//           { role: "user", content: userPrompt },
//         ],
//         { temperature: 0, max_tokens: 2048 }
//       );

//       const cleaned = String(aiResp || "")
//         .replace(/```json|```/g, "")
//         .trim();
      
//       try {
//         const fb = cleaned.indexOf("{");
//         const lb = cleaned.lastIndexOf("}");
//         const jt =
//           fb !== -1 && lb !== -1
//             ? cleaned.slice(fb, lb + 1)
//             : cleaned;
//         candidateJson = JSON.parse(jt);
//         console.log('[processParsedCv] AI-generated candidate JSON:', JSON.stringify(candidateJson, null, 2).slice(0, 500));
//       } catch (pe) {
//         throw new Error(
//           "AI candidate JSON parse failed: " +
//             (pe && pe.message ? pe.message : pe)
//         );
//       }

//     } catch (aiErr) {
//       console.warn(
//         "[processParsedCv] AI candidate JSON generation failed, falling back to heuristic mapping:",
//         aiErr && aiErr.message ? aiErr.message : aiErr
//       );
//       // Fallback heuristic mapping (use normalizedCv to capture derived name/title/firm)
//       candidateJson = {
//         name: normalizedCv.name || parsedCv.name || (parsedCv.personal_information && parsedCv.personal_information.name) || (parsedCv.candidate && parsedCv.candidate.full_name) || null,
//         current_title: normalizedCv.current_title || parsedCv.current_title || (parsedCv.personal_information && parsedCv.personal_information.current_title) || null,
//         current_firm: normalizedCv.current_firm || parsedCv.current_firm || (parsedCv.personal_information && parsedCv.personal_information.current_firm) || null,
//         location: normalizedCv.location || parsedCv.location || (parsedCv.personal_information && parsedCv.personal_information.location) || (parsedCv.candidate && parsedCv.candidate.location) || null,
//         sectors: parsedCv.sectors || (parsedCv.key_sectors_functions_expertise && parsedCv.key_sectors_functions_expertise.sectors) || [],
//         functions: parsedCv.functions || (parsedCv.key_sectors_functions_expertise && parsedCv.key_sectors_functions_expertise.functions) || [],
//         asset_classes: parsedCv.asset_classes || (parsedCv.key_sectors_functions_expertise && parsedCv.key_sectors_functions_expertise.asset_classes) || [],
//         geographies: parsedCv.geographies || (parsedCv.key_sectors_functions_expertise && parsedCv.key_sectors_functions_expertise.geographies) || [],
//         seniority: parsedCv.seniority || (parsedCv.key_sectors_functions_expertise && parsedCv.key_sectors_functions_expertise.seniority) || null,
//       };
//     }

//     let status;
//     let candidateId = null;

//     console.log('[processParsedCv] About to create candidate with data:', JSON.stringify(candidateJson, null, 2));

//     // Ensure candidateJson.name populated from any nested structures if missing
//     if (!candidateJson.name || (typeof candidateJson.name === 'string' && candidateJson.name.trim() === '')) {
//       const derivedName = normalizedCv.name ||
//         (parsedCv.personal_information && parsedCv.personal_information.name) ||
//         (parsedCv.candidate && parsedCv.candidate.full_name) || null;
//       if (derivedName) {
//         candidateJson.name = String(derivedName).trim();
//         console.log('[processParsedCv] candidateJson.name filled from derived sources:', candidateJson.name);
//       }
//     }

//     // Determine detected candidate name from candidateJson (final)
//     const detectedCandidateName = (candidateJson && typeof candidateJson.name === 'string' && candidateJson.name.trim())
//       ? candidateJson.name.trim()
//       : null;
//     console.log('[processParsedCv] Detected candidate name for intake:', detectedCandidateName || '(empty)');

//     // Determine action based on quality score
//     if (qualityResult.score >= thresholds.good) {
//       // Auto-create draft candidate
//       candidateId = await createDraftCandidate(candidateJson);
//       console.log('[processParsedCv] Created candidate with ID:', candidateId);
//       status = "Parsed";

//       // Update intake file with candidate link
//       await db.run(
//         `UPDATE intake_files 
//          SET status = ?, quality_score = ?, parsed_json = ?, json = ?, jsonCandidate = ?, candidate = ?, candidate_id = ?, updated_at = CURRENT_TIMESTAMP
//          WHERE id = ?`,
//         [
//           status,
//           qualityResult.score,
//           JSON.stringify(parsedCv),
//           JSON.stringify(parsedCv),
//           JSON.stringify(candidateJson),
//           detectedCandidateName,
//           candidateId,
//           intakeId,
//         ]
//       );
//     } else {
//       // Quality below threshold - needs review
//       status = "Needs review";

//       await db.run(
//         `UPDATE intake_files 
//          SET status = ?, quality_score = ?, parsed_json = ?, json = ?, jsonCandidate = ?, candidate = ?, updated_at = CURRENT_TIMESTAMP
//          WHERE id = ?`,
//         [
//           status,
//           qualityResult.score,
//           JSON.stringify(parsedCv),
//           JSON.stringify(parsedCv),
//           JSON.stringify(candidateJson),
//           detectedCandidateName,
//           intakeId,
//         ]
//       );
//     }

//     await db.run("COMMIT");

//     return {
//       status,
//       qualityScore: qualityResult.score,
//       candidateId,
//     };
//   } catch (error) {
//     await db.run("ROLLBACK");
//     console.error("Error processing parsed CV:", error);
//     throw error;
//   }
// }

// /**
//  * Handle full CV upload pipeline: parse, score quality, create candidate
//  */
// async function handleCvUpload(intakeId) {
//   const db = await initDatabase();

//   try {
//     // Step 1: Update status to PARSING
//     await db.run(
//       "UPDATE intake_files SET status = ? WHERE id = ?",
//       ["Parsing", intakeId]
//     );

//     // Step 2: Parse CV (existing parseAndGenerateJson function)
//     const parsedCv = await parseAndGenerateJson(intakeId);

//     // Step 3: Process parsed CV (compute quality, auto-create candidate if quality is good)
//     const processResult = await processParsedCv(intakeId, parsedCv);

//     console.log(`\n[handleCvUpload] ✅ CV processed successfully`);
//     console.log(`[handleCvUpload] Quality Score: ${processResult.qualityScore}`);
//     console.log(`[handleCvUpload] Candidate ID: ${processResult.candidateId || 'None (quality too low)'}`);
//     console.log(`[handleCvUpload] Status: ${processResult.status}\n`);

//     // Step 4: Return results (NO automatic fit scoring)
//     return {
//       intakeStatus: processResult.status,
//       candidateId: processResult.candidateId,
//       cvQualityScore: processResult.qualityScore,
//     };
//   } catch (error) {
//     // Update intake file to error state
//     try {
//       await db.run(
//         "UPDATE intake_files SET status = ? WHERE id = ?",
//         ["NEEDS_REVIEW", intakeId]
//       );
//     } catch (updateError) {
//       console.error(
//         "Failed to update intake status after error:",
//         updateError
//       );
//     }

//     console.error("Error in CV upload pipeline:", error);
//     throw error;
//   }
// }

// /**
//  * Manually create candidate from intake file (for files that needed review)
//  */
// async function createCandidateFromIntake(intakeId) {
//   const { createDraftCandidate } = require("./candidateModel.cjs");

//   const db = await initDatabase();

//   await db.run("BEGIN TRANSACTION");

//   try {
//     // Get intake file
//     const row = await db.get(
//       "SELECT * FROM intake_files WHERE id = ?",
//       [intakeId]
//     );

//     if (!row) {
//       throw new Error(`Intake file with ID ${intakeId} not found`);
//     }

//     if (!row.parsed_json) {
//       throw new Error(
//         `Intake file with ID ${intakeId} has no parsed data`
//       );
//     }

//     if (row.candidate_id) {
//       throw new Error(
//         `Intake file with ID ${intakeId} already has a candidate`
//       );
//     }

//     const parsedCv = JSON.parse(row.parsed_json);

//     // Create draft candidate
//     const candidateId = await createDraftCandidate(parsedCv);

//     // Update intake file
//     await db.run(
//       `UPDATE intake_files 
//        SET candidate_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
//        WHERE id = ?`,
//       [candidateId, "PARSED", intakeId]
//     );

//     await db.run("COMMIT");

//     return candidateId;
//   } catch (error) {
//     await db.run("ROLLBACK");
//     console.error("Error creating candidate from intake:", error);
//     throw error;
//   }
// }

// // Final exports
// module.exports = {
//   listIntakeFiles,
//   createIntakeFiles,
//   updateIntakeStatus,
//   previewIntakeFile,
//   parseAndGenerateJson,
//   initIntakeFilesTable,
//   processParsedCv,
//   handleCvUpload,
//   createCandidateFromIntake,
// };
