# 🚀 Quick Start Card

## Notification System - 30 Second Setup

### 1. Import
```tsx
import { useNotification } from "@/components/Notification";
```

### 2. Use Hook
```tsx
const notify = useNotification();
```

### 3. Call Methods
```tsx
notify.success("Done!");
notify.error("Failed", err);
notify.info("Processing...");
notify.warning("Unsaved changes");
```

### Done! ✅
No more `useToast` or `toast({variant: "destructive"})`

---

## File Encryption - 30 Second Setup

### 1. Generate Key (Once)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Save this 64-char string!
```

### 2. Set Environment
```bash
export ENCRYPTION_KEY="your-64-char-key"
```

### 3. Upload File
```bash
# Just upload normally in the app
# Backend automatically encrypts
# File stored as .enc (unreadable)
```

### 4. Preview/Parse
```bash
# Just click Preview or Parse
# Backend automatically decrypts
# User sees normal content
```

### Done! ✅
Files encrypted, automatic decryption on use

---

## File Structure

```
Notification System:
  src/components/Notification.tsx          (Use this!)
  
File Encryption:
  electron/services/encryptionService.cjs  (Handles encryption)
  electron/models/intakeModel.cjs          (Integrated)
  
Documentation:
  NOTIFICATION_QUICK_REFERENCE.md          (Read this first)
  FILE_ENCRYPTION_SETUP.md                 (Setup help)
  IMPLEMENTATION_SUMMARY.md                (Overview)
```

---

## Notification Examples

### Success
```tsx
notify.success("Saved", "Your changes have been saved");
// Green notification, 3 second auto-dismiss
```

### Error
```tsx
notify.error("Upload failed", err);
// Red notification, 5 second auto-dismiss
// Auto-extracts error.message from Error object
```

### Info
```tsx
notify.info("Processing", "Please wait...", 5000);
// Default notification, 5 second auto-dismiss (custom duration)
```

### Warning
```tsx
notify.warning("Unsaved changes", "You have unsaved work");
// Yellow notification, 3 second auto-dismiss
```

---

## Encryption Verification

### Check Encryption Key is Loaded
```bash
node -e "require('./electron/services/encryptionService.cjs').getMasterKey()" 
# Should print: No error
# If error: ENCRYPTION_KEY not set or wrong format
```

### Check Files are Encrypted
```bash
ls -la /path/to/cv_storage/
# Look for .enc extension files
# Try opening one with PDF reader (should fail - encrypted!)
```

### Check Decryption Works
```bash
# In app:
1. Upload PDF
2. Click Preview (should show PDF, not garbage)
3. Click Parse (should extract text correctly)
```

---

## Common Issues & Quick Fixes

### "ENCRYPTION_KEY not configured"
```bash
# Fix:
export ENCRYPTION_KEY="your-64-char-key-here"
# Then restart app
```

### "Invalid key length"
```bash
# Wrong key format (not 64 hex chars)
# Check: echo $ENCRYPTION_KEY | wc -c
# Should be 64 (not 65, not 32)
# Regenerate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### "Decryption failed: authenticate data"
```bash
# File corrupted or wrong key
# If wrong key: set correct ENCRYPTION_KEY
# If corrupted: delete file and re-upload
```

### File Upload Fails
```bash
# Check:
1. Storage directory exists & is writable
2. Sufficient disk space
3. File not empty
4. ENCRYPTION_KEY is set
5. Check app logs for details
```

---

## Notification Migration (One File Example)

### Before
```tsx
import { useToast } from "@/hooks/use-toast";

export function MyComponent() {
  const { toast } = useToast();
  
  const handleSave = async () => {
    try {
      await api.save();
      toast({ title: "Saved", description: "Changes saved" });
    } catch (err) {
      toast({ 
        title: "Error", 
        description: String(err), 
        variant: "destructive" 
      });
    }
  };
}
```

### After
```tsx
import { useNotification } from "@/components/Notification";

export function MyComponent() {
  const notify = useNotification();
  
  const handleSave = async () => {
    try {
      await api.save();
      notify.success("Saved", "Changes saved");
    } catch (err) {
      notify.error("Error", err);
    }
  };
}
```

**Changes:**
1. Remove: `import { useToast } from "@/hooks/use-toast"`
2. Add: `import { useNotification } from "@/components/Notification"`
3. Replace: `const { toast } = useToast()` → `const notify = useNotification()`
4. Replace: `toast({...})` → `notify.success/error/info/warning(...)`

---

## Encryption Test (5 Minutes)

```bash
# 1. Set key
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo $ENCRYPTION_KEY  # Verify it prints 64 chars

# 2. Start app
npm run electron:dev

# 3. In app:
# - Go to Intake
# - Upload a PDF
# - Check storage dir: should have .enc file
# - Click Preview: should work (file decrypts)
# - Click Parse: should work (file decrypts)

# 4. Done! ✓
```

---

## Production Checklist (Copy & Paste)

```bash
# 1. Generate key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Backup key (CRITICAL!)
echo "Save this somewhere secure:" $ENCRYPTION_KEY

# 3. Set environment
export ENCRYPTION_KEY="$ENCRYPTION_KEY"

# 4. Verify
node -e "require('./electron/services/encryptionService.cjs').getMasterKey()" || echo "ERROR: Key not loaded"

# 5. Deploy
npm run build
npm start

# 6. Test
# - Upload file
# - Check .enc created
# - Preview works
# - Parse works

# 7. Monitor
tail -f app.log | grep -i "encrypt\|decrypt"
```

---

## Documentation Map

| Need | File | Time |
|------|------|------|
| Overview | IMPLEMENTATION_SUMMARY.md | 5 min |
| Notification Quick Start | NOTIFICATION_QUICK_REFERENCE.md | 3 min |
| Notification Migration | NOTIFICATION_MIGRATION.md | 10 min |
| Encryption Setup | FILE_ENCRYPTION_SETUP.md | 10 min |
| Encryption Technical | FILE_ENCRYPTION_IMPLEMENTATION.md | 15 min |
| Deployment Steps | DEPLOYMENT_CHECKLIST.md | 10 min |

---

## Key Commands

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Verify encryption service
node -e "require('./electron/services/encryptionService.cjs').getMasterKey()"

# Check if file is encrypted
ls -la /path/to/cv_storage/ | grep ".enc"

# Test encryption/decryption
node << 'EOF'
process.env.ENCRYPTION_KEY = "your-key-here";
const enc = require('./electron/services/encryptionService.cjs');
const fs = require('fs');
const data = fs.readFileSync('test.pdf');
const encrypted = enc.encryptFile(data);
const decrypted = enc.decryptFile(encrypted);
console.log(Buffer.compare(data, decrypted) === 0 ? "✓ Success" : "✗ Failed");
EOF
```

---

## Keyboard Shortcuts (Dev)

```bash
# Terminal quick setup
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") && \
npm run electron:dev

# Check encryption working
node -e "require('./electron/services/encryptionService.cjs').getMasterKey()" && echo "✓ Key loaded"
```

---

## Resources

```
📖 Docs:       IMPLEMENTATION_SUMMARY.md
🔔 Notifs:     NOTIFICATION_QUICK_REFERENCE.md
🔐 Encryption: FILE_ENCRYPTION_SETUP.md
🚀 Deploy:     DEPLOYMENT_CHECKLIST.md
💻 Code:       src/components/Notification.tsx
               electron/services/encryptionService.cjs
```

---

## Remember

- ✅ Notification migration is optional (gradual)
- ✅ File encryption is automatic (no code changes)
- ✅ ENCRYPTION_KEY backup is CRITICAL
- ✅ Start with IMPLEMENTATION_SUMMARY.md
- ✅ All features are production-ready

---

**Version:** 1.0.0  
**Status:** ✅ Ready to Use  
**Last Updated:** 2025-01-15  

**Next Step:** `cat IMPLEMENTATION_SUMMARY.md` 🚀

