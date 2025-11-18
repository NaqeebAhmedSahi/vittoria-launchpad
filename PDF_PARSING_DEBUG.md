# PDF Parsing Debug - Encryption Disabled

## Changes Made

To debug the PDF parsing issue, encryption/decryption has been **temporarily disabled** in `intakeModel.cjs`:

### 1. Upload Function (createIntakeFiles)
- ❌ **Encryption disabled** - Files stored without encryption
- ❌ **`.enc` extension removed** - Files stored with original extension (e.g., `.pdf`)
- ❌ **is_encrypted flag set to 0** - Mark files as unencrypted in database
- Files are now stored as plain binary files (original format)

### 2. Preview Function (previewIntakeFile)
- ❌ **Decryption logic removed** - Files read directly from disk
- Files returned as-is for preview

### 3. Parse Function (parseAndGenerateJson)
- ❌ **Decryption logic removed** - Files read and parsed directly
- ✅ **Comprehensive logging added** throughout the function
- **Console output will show:**
  - File name, extension, file size
  - Text extraction status and length
  - Link/email extraction results
  - LLM prompt size and response
  - Final JSON parsing results
  - Complete execution flow

## Logging Added

The parseAndGenerateJson function now logs at every major step:

```
[parseAndGenerateJson] ========== START for id ${id} ==========
[parseAndGenerateJson] File: ${filename}, is_encrypted: false
[parseAndGenerateJson] File extension: ${ext}
[parseAndGenerateJson] Read ${bytes} bytes
[parseAndGenerateJson] Starting text extraction...
[parseAndGenerateJson] Parsing PDF/DOCX...
[parseAndGenerateJson] PDF/DOCX parsed, extracted text length: ${length}
[parseAndGenerateJson] Text extraction complete: ${textLength} chars, ${linkCount} links
[parseAndGenerateJson] User prompt length: ${promptLength} chars
[parseAndGenerateJson] Final user prompt length: ${finalLength} chars
[parseAndGenerateJson] Calling LLM adapter...
[parseAndGenerateJson] LLM response received, length: ${length} chars
[parseAndGenerateJson] LLM response length for id ${id}: ${length} chars
[parseAndGenerateJson] LLM response first 500 chars: ${response}
[parseAndGenerateJson] LLM response last 200 chars: ${response}
[parseAndGenerateJson] Saving parsed JSON to database...
[parseAndGenerateJson] ========== COMPLETE for id ${id} ==========
```

## How to Debug Now

1. **Start the app:** `npm run electron:dev`
2. **Upload a PDF file** via the Intake page
3. **Click "Parse" button** to trigger parseAndGenerateJson
4. **Check terminal output** for detailed logs showing:
   - Where the process stops (if it fails)
   - LLM response content
   - Any error messages

## Next Steps After Debugging

Once we identify and fix the PDF parsing issue:
1. Re-enable encryption in upload function
2. Re-enable decryption in preview and parse functions
3. Keep the comprehensive logging for production debugging

## Files Modified

- `electron/models/intakeModel.cjs`
  - Disabled encryption in createIntakeFiles()
  - Disabled decryption in previewIntakeFile()
  - Disabled decryption in parseAndGenerateJson()
  - Added comprehensive logging throughout parseAndGenerateJson()

## Status

✅ Encryption disabled for debugging  
✅ Comprehensive logging added  
🚀 Ready to test PDF parsing flow

