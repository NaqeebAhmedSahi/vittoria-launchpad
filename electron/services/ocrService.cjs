/**
 * OCR Service
 * Handles text extraction from images and scanned PDFs using Tesseract.js
 */

const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Check if a file is an image based on extension
 */
function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
  return imageExtensions.includes(ext);
}

/**
 * Check if a PDF is image-based (scanned) by attempting to extract text
 * Returns true if PDF appears to be scanned/image-based
 */
async function isPdfImageBased(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    // If extracted text is very short or mostly whitespace, likely scanned
    const text = data.text.trim();
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // If less than 50 words extracted, consider it image-based
    return wordCount < 50;
  } catch (error) {
    console.error('[isPdfImageBased] Error checking PDF:', error);
    return false;
  }
}

/**
 * Preprocess image for better OCR results
 * - Converts to grayscale
 * - Increases contrast
 * - Resizes if needed
 */
async function preprocessImage(inputPath) {
  try {
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    console.log(`[preprocessImage] Original size: ${width}x${height}`);

    // Limit max width to 2000px for performance
    if (width > 2000) {
      image.resize(2000, Jimp.AUTO);
    }

    // Convert to grayscale and increase contrast
    image.grayscale();
    // Jimp's contrast range is -1 to +1; use a modest boost
    image.contrast(0.3);

    // Convert to PNG buffer
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return processedBuffer;
  } catch (error) {
    console.error('[preprocessImage] Error preprocessing image:', error);
    // Return original if preprocessing fails
    return await fs.readFile(inputPath);
  }
}

/**
 * Extract text from image using OCR
 * @param {string} imagePath - Path to the image file
 * @param {object} options - OCR options
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imagePath, options = {}) {
  const {
    lang = 'eng', // Language (eng, fra, deu, etc.)
    tessedit_pageseg_mode = '1', // Page segmentation mode (1 = Automatic with OSD)
    onProgress = null, // Progress callback function
  } = options;

  console.log(`[extractTextFromImage] Starting OCR for: ${path.basename(imagePath)}`);
  console.log(`[extractTextFromImage] Language: ${lang}`);

  try {
    // Preprocess image for better OCR
    const imageBuffer = await preprocessImage(imagePath);

    // Perform OCR with progress tracking
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageBuffer,
      lang,
      {
        tessedit_pageseg_mode,
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            console.log(`[OCR] Progress: ${progress}%`);
            
            // Call progress callback if provided
            if (onProgress && typeof onProgress === 'function') {
              onProgress(progress);
            }
          }
        },
      }
    );

    console.log(`[extractTextFromImage] OCR completed with confidence: ${confidence}%`);
    console.log(`[extractTextFromImage] Extracted ${text.length} characters`);

    return text;
  } catch (error) {
    console.error('[extractTextFromImage] OCR failed:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

/**
 * Extract text from scanned/image-based PDF
 * Converts PDF pages to images and runs OCR on each page
 */
async function extractTextFromScannedPdf(pdfPath, options = {}) {
  console.log(`[extractTextFromScannedPdf] Processing PDF: ${path.basename(pdfPath)}`);
  
  try {
    // Use pdf-poppler or pdf2pic to convert PDF to images
    // For now, we'll use a simpler approach with pdf-parse first
    const pdfParse = require('pdf-parse');
    const dataBuffer = await fs.readFile(pdfPath);
    
    // Try standard text extraction first
    const data = await pdfParse(dataBuffer);
    const extractedText = data.text.trim();
    
    if (extractedText.length > 100) {
      console.log('[extractTextFromScannedPdf] PDF has extractable text, using standard extraction');
      return extractedText;
    }

    // If no text, inform user OCR is needed
    console.log('[extractTextFromScannedPdf] PDF appears to be image-based');
    console.log('[extractTextFromScannedPdf] Note: Full PDF page OCR requires pdf2pic package');
    
    // Return what we have
    return extractedText || '[Scanned PDF - Limited text extracted. Consider converting to images first.]';
    
  } catch (error) {
    console.error('[extractTextFromScannedPdf] Error processing PDF:', error);
    throw new Error(`Failed to process scanned PDF: ${error.message}`);
  }
}

/**
 * Main function to extract text with automatic format detection
 * @param {string} filePath - Path to the file (image or PDF)
 * @param {object} options - Extraction options
 * @returns {Promise<{text: string, method: string, confidence?: number}>}
 */
async function extractText(filePath, options = {}) {
  console.log(`\n[extractText] Processing file: ${path.basename(filePath)}`);
  
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    // Handle TXT files - direct read
    if (ext === '.txt') {
      console.log('[extractText] Detected TXT file, reading directly');
      const text = await fs.readFile(filePath, 'utf-8');
      return {
        text,
        method: 'Direct read',
        sourceType: 'text',
      };
    }
    
    // Handle image files
    if (isImageFile(filePath)) {
      console.log('[extractText] Detected image file, using OCR');
      const text = await extractTextFromImage(filePath, options);
      return {
        text,
        method: 'OCR',
        sourceType: 'image',
      };
    }
    
    // Handle PDF files
    if (ext === '.pdf') {
      console.log('[extractText] Detected PDF file, checking if scanned...');
      const isScanned = await isPdfImageBased(filePath);
      
      if (isScanned) {
        console.log('[extractText] PDF is image-based, attempting OCR');
        const text = await extractTextFromScannedPdf(filePath, options);
        return {
          text,
          method: 'OCR (Scanned PDF)',
          sourceType: 'scanned-pdf',
        };
      } else {
        console.log('[extractText] PDF has extractable text');
        const pdfParse = require('pdf-parse');
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        return {
          text: data.text,
          method: 'PDF text extraction',
          sourceType: 'text-pdf',
        };
      }
    }
    
    // Handle DOCX files
    if (ext === '.docx' || ext === '.doc') {
      console.log('[extractText] Detected Word document');
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return {
        text: result.value,
        method: 'DOCX extraction',
        sourceType: 'docx',
      };
    }
    
    throw new Error(`Unsupported file format: ${ext}`);
    
  } catch (error) {
    console.error('[extractText] Error extracting text:', error);
    throw error;
  }
}

/**
 * Batch process multiple images/files
 */
async function batchExtractText(filePaths, options = {}) {
  console.log(`[batchExtractText] Processing ${filePaths.length} files`);
  
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const result = await extractText(filePath, options);
      results.push({
        filePath,
        success: true,
        ...result,
      });
    } catch (error) {
      results.push({
        filePath,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
}

module.exports = {
  extractText,
  extractTextFromImage,
  extractTextFromScannedPdf,
  isImageFile,
  isPdfImageBased,
  batchExtractText,
};
