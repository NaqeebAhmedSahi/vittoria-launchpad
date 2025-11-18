# File Encryption Setup Guide

## Overview

All uploaded PDF and DOCX files are now encrypted using **AES-256-GCM** before storage. Files cannot be opened in file explorer or accessed without the encryption key.

**Key Features:**
- ✅ AES-256-GCM encryption (military-grade)
- ✅ Authenticated encryption (integrity verification)
- ✅ Automatic decryption on preview
- ✅ Automatic decryption before parsing
- ✅ Backward compatible (old files still work)
- ✅ Production-ready with error handling

---

## Setup: Generating and Configuring Encryption Key

### Step 1: Generate Encryption Key

Run this command to generate a new 256-bit encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 2: Set Environment Variable

Add the encryption key to your `.env` file (or system environment variables):

**Development (.env file):**
```
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Production (environment variable):**
```bash
export ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

**Docker:**
```dockerfile
ENV ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

**Electron App:**
If using electron with a main.js that loads environment:
```javascript
require('dotenv').config(); // Load from .env file
// OR set in main process before app starts
process.env.ENCRYPTION_KEY = "your-key-here";
```

### Step 3: Verify Setup

Test that the encryption service works:

```bash
node -e "
const enc = require('./electron/services/encryptionService.cjs');
try {
  const key = enc.getMasterKey();
  console.log('✓ Encryption key loaded successfully');
  console.log('✓ Key length:', key.length, 'bytes (32 bytes = AES-256)');
} catch (err) {
  console.error('✗ Error:', err.message);
}
"
```

**Expected output:**
```
✓ Encryption key loaded successfully
✓ Key length: 32 bytes (32 bytes = AES-256)
```

---

## How It Works

### Encryption Flow (File Upload)

1. **File uploaded** → `createIntakeFiles()` in intakeModel.cjs
2. **Encrypt with encryptFile()** → AES-256-GCM encryption
3. **Add encryption headers** → IV (12 bytes) + AuthTag (16 bytes)
4. **Store .enc file** → Encrypted file on disk (unreadable)
5. **Database updated** → `is_encrypted=1, encryption_version='aes-256-gcm-v1'`

```
PLAIN FILE (readable)          ENCRYPTED FILE (unreadable)
[PDF/DOCX data]      ====>     [Salt][IV][AuthTag][Ciphertext]
  500 KB              Encrypt     700 KB
```

### Decryption Flow (Preview)

1. **User clicks "Preview"** → `previewIntakeFile()` in intakeModel.cjs
2. **Check is_encrypted flag** → if true, decrypt
3. **Extract IV, AuthTag, Ciphertext** from encrypted file
4. **Decrypt with decryptFile()** → AES-256-GCM decryption
5. **Verify AuthTag** → Ensures file integrity
6. **Return base64** → Display in browser

### Decryption Flow (Parsing)

1. **User clicks "Parse CV"** → `parseAndGenerateJson()` in intakeModel.cjs
2. **Read encrypted file** → Get encrypted buffer
3. **Decrypt** → Call `decryptFile()` to get plaintext
4. **Extract text** → PDF parser or DOCX converter
5. **Send to LLM** → Parse and get structured JSON
6. **Store result** → Save parsed_json in database

---

## File Storage Format

Encrypted files use a specific binary format:

```
[Bytes 0-15]     : 16-byte SALT (for key derivation)
[Bytes 16-27]    : 12-byte IV (initialization vector)
[Bytes 28-43]    : 16-byte AuthTag (authentication tag)
[Bytes 44-...]   : Encrypted Data (variable length)
```

**Format advantages:**
- ✅ Different salt per file = even if key compromised, each file encrypted differently
- ✅ AuthTag detects tampering = if file corrupted, decryption fails
- ✅ Self-contained = all info needed for decryption in encrypted file

---

## Production Checklist

### Before Deploying

- [ ] Generate strong encryption key using provided command
- [ ] Set ENCRYPTION_KEY environment variable in production
- [ ] Test encryption: `node -e "require('./electron/services/encryptionService.cjs').getMasterKey()"`
- [ ] Test file upload: upload a PDF, verify .enc file created
- [ ] Test preview: click preview button, verify decrypted content shows
- [ ] Test parsing: click parse, verify parsing works on decrypted content
- [ ] Check logs: no encryption errors in console
- [ ] Backup encryption key: STORE SECURELY (database cannot recover files without it!)

### After Deployment

- [ ] Monitor error logs for decryption failures
- [ ] Verify file sizes increased by ~40 bytes (IV + AuthTag overhead)
- [ ] Test with large files (100+ MB) - ensure no memory issues
- [ ] Backup encrypted files (encrypted file backup is secure even if backup stolen)

---

## Key Management & Security

### 🔐 Important: Key Backup

**If you lose the encryption key, encrypted files CANNOT be recovered.**

**Backup strategy:**
1. Generate encryption key and store in secure vault (e.g., HashiCorp Vault, AWS Secrets Manager)
2. Document key generation date and rotation schedule
3. For critical deployments, use HSM (Hardware Security Module)
4. Never commit ENCRYPTION_KEY to Git

### 🔄 Key Rotation (Advanced)

To rotate encryption key (encrypt all files with new key):

```bash
# 1. Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Decrypt all files with old key, re-encrypt with new key
# (Script needed - not yet implemented)
# For now: manually re-export and re-upload files

# 3. Update ENCRYPTION_KEY environment variable
export ENCRYPTION_KEY="$NEW_KEY"

# 4. Restart application
```

### ⚠️ Common Mistakes to Avoid

| ❌ DON'T | ✅ DO |
|---------|------|
| Commit ENCRYPTION_KEY to Git | Use .env file + .gitignore |
| Share key in chat/email | Use secure vault (Vault, Secrets Manager) |
| Use same key for multiple apps | Generate unique key per deployment |
| Forget to set environment variable | Set in .env, Docker ENV, or systemd service |
| Lose the key after deployment | Backup key to secure location immediately |
| Use weak/short key | Use `randomBytes(32)` for proper entropy |

---

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable not configured"

**Solution:**
```bash
# Check if variable is set
echo $ENCRYPTION_KEY

# If empty, set it
export ENCRYPTION_KEY="your-64-char-hex-key"

# Verify it's set
echo $ENCRYPTION_KEY  # Should show your key
```

### Error: "Invalid key length: X bytes. Expected 32 bytes"

**Cause:** Key is not exactly 32 bytes (64 hex characters)

**Solution:**
- Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Ensure key is copied completely (64 characters)
- No spaces or extra characters

### Error: "Decryption failed: Unsupported state or unable to authenticate data"

**Cause:** File is corrupted OR decrypted with wrong key

**Solutions:**
1. Verify correct ENCRYPTION_KEY is set
2. Check if file was uploaded with different key
3. If file corrupted, delete from storage and re-upload

### Error: "Stored file missing"

**Cause:** File deleted from storage directory

**Solution:**
1. Restore file from backup
2. Or delete intake record from database and re-upload

---

## File Upload Example

```typescript
// Frontend: src/pages/Intake.tsx
const handleFileUpload = async (files: File[]) => {
  const payload = await Promise.all(
    files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      return {
        fileName: file.name,
        buffer: Array.from(new Uint8Array(buffer)),
        type: file.type.includes("pdf") ? "PDF" : "DOC",
        source: "Manual upload",
        uploadedBy: "Admin",
      };
    })
  );

  const rows = await window.api.intake.addFiles(payload);
  // Backend automatically encrypts files
  notify.success("Files uploaded and encrypted");
};
```

```javascript
// Backend: electron/models/intakeModel.cjs
async function createIntakeFiles(files) {
  for (const file of files) {
    const buffer = Buffer.from(file.buffer);
    
    // Automatically encrypt before storage
    const encryptedBuffer = encryptFile(buffer);
    
    // Write encrypted .enc file to disk
    fs.writeFileSync(destPath, encryptedBuffer);
    
    // Mark as encrypted in database
    // is_encrypted = 1
    // encryption_version = 'aes-256-gcm-v1'
  }
}
```

---

## Testing Encryption Locally

### Test 1: Generate and Verify Key

```bash
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "Generated key: $ENCRYPTION_KEY"

node -e "
process.env.ENCRYPTION_KEY = '$ENCRYPTION_KEY';
const enc = require('./electron/services/encryptionService.cjs');
const key = enc.getMasterKey();
console.log('Key length:', key.length, 'bytes');
console.log('✓ Key valid');
"
```

### Test 2: Encrypt/Decrypt File

```bash
node -e "
process.env.ENCRYPTION_KEY = 'your-64-char-key-here';
const enc = require('./electron/services/encryptionService.cjs');
const fs = require('fs');

// Read a sample file
const original = fs.readFileSync('sample.pdf');
console.log('Original size:', original.length);

// Encrypt
const encrypted = enc.encryptFile(original);
console.log('Encrypted size:', encrypted.length);

// Decrypt
const decrypted = enc.decryptFile(encrypted);
console.log('Decrypted size:', decrypted.length);

// Verify
if (Buffer.compare(original, decrypted) === 0) {
  console.log('✓ Encryption/decryption successful!');
} else {
  console.log('✗ Decrypted file does not match original');
}
"
```

### Test 3: File Upload Flow

```bash
cd /path/to/vittoria-launchpad
npm run electron:dev

# In app:
# 1. Go to Intake
# 2. Upload a PDF
# 3. Check storage directory - file should have .enc extension
# 4. Try to open .enc file with PDF reader - should fail (encrypted)
# 5. Click "Preview" - file should decrypt and display
# 6. Click "Parse" - should work correctly
```

---

## Performance Impact

**File Size:** +40 bytes overhead (16-byte salt + 12-byte IV + 16-byte authTag)

**Speed:**
- Encryption: ~10-50 ms per MB (depends on CPU)
- Decryption: ~10-50 ms per MB
- Not noticeable for typical CV files (< 5 MB)

**For large files (100+ MB):**
- Consider streaming encryption/decryption
- Or increase timeout limits

---

## Database Migration

If you're updating an existing installation:

1. **Old files (unencrypted):** Database column `is_encrypted` defaults to 1, but decryption checks for encryption format
2. **Backward compatibility:** If decryption fails, intakeModel falls back gracefully
3. **New files:** Always encrypted
4. **Migration:** Optional script to re-encrypt old files (not yet implemented)

---

## References

- [AES-256-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [PBKDF2 Key Derivation](https://en.wikipedia.org/wiki/PBKDF2)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [OWASP Encryption Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

