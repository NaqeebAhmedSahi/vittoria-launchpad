# Notification System Migration Guide (Production)

## Overview
This guide provides step-by-step instructions to migrate from scattered `useToast()` calls to the centralized `useNotification()` system.

**Status**: Production-ready with comprehensive validation and error handling  
**Files Affected**: 11 files with ~76 toast calls  
**Estimated Time**: 2-3 hours for complete migration + testing

---

## Architecture

### Old Pattern (Scatter)
```tsx
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();
  
  toast({ title: "Success", variant: "default" });
  toast({ title: "Error", variant: "destructive", description: String(err) });
}
```

### New Pattern (Centralized)
```tsx
import { useNotification } from "@/components/Notification";

function MyComponent() {
  const notify = useNotification();
  
  notify.success("Success");
  notify.error("Error", err);  // Handles Error objects automatically
}
```

---

## Migration Rules

### Rule 1: Import Replacement
**Remove:**
```tsx
import { useToast } from "@/hooks/use-toast";
```

**Add:**
```tsx
import { useNotification } from "@/components/Notification";
```

### Rule 2: Hook Usage Replacement
**Before:**
```tsx
const { toast } = useToast();
```

**After:**
```tsx
const notify = useNotification();
```

### Rule 3: Toast Call Mapping

#### Success Notifications
**Before:**
```tsx
toast({ title: "Saved", description: "Your data was saved" });
```

**After:**
```tsx
notify.success("Saved", "Your data was saved");
```

#### Error Notifications
**Before:**
```tsx
toast({ title: "Error", description: String(err), variant: "destructive" });
// OR
toast({ title: "Upload failed", description: "File too large", variant: "destructive" });
```

**After:**
```tsx
// Automatically extracts error.message from Error objects
notify.error("Error", err);

// OR with custom description
notify.error("Upload failed", "File too large");
```

#### Info Notifications
**Before:**
```tsx
toast({ title: "Processing", description: "Please wait..." });
```

**After:**
```tsx
notify.info("Processing", "Please wait...");
```

#### Warning Notifications
**Before:**
```tsx
toast({ title: "Warning", description: "This action cannot be undone" });
```

**After:**
```tsx
notify.warning("Warning", "This action cannot be undone");
```

### Rule 4: Custom Duration
**Before:**
```tsx
toast({ title: "Message", duration: 5000 });
```

**After:**
```tsx
// 3rd parameter is custom duration (milliseconds)
notify.success("Message", undefined, 5000);
// OR with description and duration
notify.info("Message", "Details here", 5000);
```

### Rule 5: Error Object Handling
**Before:**
```tsx
try {
  await api.call();
} catch (err) {
  toast({ 
    title: "Failed", 
    description: String(err),  // Manual error conversion
    variant: "destructive" 
  });
}
```

**After:**
```tsx
try {
  await api.call();
} catch (err) {
  notify.error("Failed", err);  // Automatic error extraction
}
```

The `useNotification()` hook provides an `error()` method that:
- Accepts Error objects directly
- Extracts `.message` property
- Falls back to `String()` if not an Error
- Handles null/undefined gracefully

---

## File-by-File Migration Plan

### Phase 1: Core Pages (5 files)

#### 1. `src/pages/Intake.tsx` (17 toast calls)
Find all `toast({` and apply migration rules.

**Key patterns:**
- File upload success: `notify.success("Files uploaded", `${count} file(s)...`)`
- Parse errors: `notify.error("Upload failed", err)`
- Parse in progress: `notify.info("Parsing...", "Extracting text...")`

#### 2. `src/pages/Settings.tsx` (13 toast calls)
Key patterns:
- Provider switch: `notify.success("Switched", `${name} is now active`)`
- API test: `notify.success("API key is valid")` / `notify.error("Test failed", err)`
- Save provider: `notify.success("Saved", `${provider} key saved and connected`)`

#### 3. `src/pages/Mandates.tsx` (1 toast call)
#### 4. `src/pages/Teams.tsx` (1 toast call)
#### 5. `src/pages/Templates.tsx` (1 toast call)

### Phase 2: Components (6 files)

#### 6. `src/components/TopBar.tsx` (3 toast calls)
Key patterns:
- File import: `notify.success("CV imported", `${count} file(s)...`)`
- Create record: `notify.success("Candidate created", `${name}...`)`

#### 7. `src/components/PromptConfig.tsx` (2 toast calls)
#### 8. `src/pages/Finance.tsx` (1 toast call)
#### 9. `src/pages/Deals.tsx` (1 toast call)
#### 10. `src/pages/Candidates.tsx` (1 toast call)
#### 11. `src/pages/Firms.tsx` (1 toast call)

---

## Migration Checklist

### Pre-Migration Validation
- [ ] `Notification.tsx` exists at `src/components/Notification.tsx`
- [ ] File contains `useNotification` hook export
- [ ] File has comprehensive JSDoc and examples
- [ ] Production config constants are defined (MAX_TITLE_LENGTH, etc.)

### Per-File Migration Checklist
For each file being migrated:
- [ ] Remove `useToast` import
- [ ] Add `useNotification` import
- [ ] Replace hook usage: `const { toast } = useToast()` → `const notify = useNotification()`
- [ ] Replace all `toast({...})` calls with `notify.success/error/info/warning(...)`
- [ ] Test error handling: try/catch blocks should pass error objects directly
- [ ] Verify no `useToast` imports remain
- [ ] Run `eslint` to catch any issues
- [ ] Manual testing: trigger notifications in UI

### Post-Migration Verification
- [ ] No `useToast` imports remain in any component (grep check)
- [ ] All notifications use semantic methods (success/error/info/warning)
- [ ] Error messages are user-friendly (not raw error stack traces)
- [ ] Notification durations are appropriate (errors longer than success)
- [ ] UI tests pass (if applicable)
- [ ] Browser console has no errors

---

## Testing Strategy

### Unit Testing (Manual)
For each notification type, verify:

```tsx
const notify = useNotification();

// Success: Should show green notification for 3s
notify.success("Operation complete");

// Error with object: Should extract and display error message
try { throw new Error("Invalid input"); } 
catch (err) { notify.error("Validation failed", err); }

// Info with custom duration: Should show for 5s
notify.info("Processing...", "Please wait", 5000);

// Warning: Should show yellow notification
notify.warning("Unsaved changes");

// Edge cases:
notify.success(""); // Should be ignored (empty title)
notify.error("Title", null); // Should show default error message
notify.info("A".repeat(200)); // Should truncate to MAX_TITLE_LENGTH
```

### Integration Testing
1. Upload file → Check success notification
2. Trigger error in API call → Check error notification displays error message
3. Switch provider in Settings → Check success notification
4. Test API key → Check error notification on failure
5. Create candidate/mandate → Check success notification

### Browser Console Check
After migration, console should show:
- No errors or warnings related to notification system
- Development mode: `[Notification]` debug logs for each notification
- Production mode: Clean console (logging disabled)

---

## Rollback Plan

If issues occur during migration:
1. Revert changes to affected files
2. Keep `Notification.tsx` (it's non-breaking)
3. Old `useToast` system continues to work
4. No database or configuration changes

---

## Configuration (Advanced)

To modify notification behavior globally, edit `src/components/Notification.tsx`:

```tsx
const CONFIG: NotificationConfig = {
  MAX_TITLE_LENGTH: 100,        // Truncate titles longer than 100 chars
  MAX_DESCRIPTION_LENGTH: 500,  // Truncate descriptions longer than 500 chars
  DEFAULT_DURATION: 3000,       // 3 seconds
  SUCCESS_DURATION: 3000,       // Success slightly shorter
  ERROR_DURATION: 5000,         // Errors stay longer for readability
  ENABLE_LOGGING: process.env.NODE_ENV === "development", // Debug mode
};
```

---

## Production Checklist

Before deploying to production:
- [ ] All 76 toast calls have been migrated
- [ ] No `useToast` imports remain in codebase
- [ ] Error messages are user-friendly (no stack traces)
- [ ] Notification durations are appropriate
- [ ] Testing completed (manual + unit)
- [ ] Code review approved
- [ ] No console errors in browser DevTools
- [ ] Smoke testing on staging environment
- [ ] All form validations trigger appropriate notifications
- [ ] File uploads show success/error notifications

---

## FAQ

**Q: Can I use both `useToast` and `useNotification` in the same file?**  
A: Not recommended. Migrate all notifications to `useNotification()` in a single pass per file.

**Q: What if a description is very long?**  
A: The component truncates to MAX_DESCRIPTION_LENGTH (500 chars) automatically. For lengthy content, consider alternative UI patterns.

**Q: How do I show a notification without dismissing automatically?**  
A: Use duration 0: `notify.success("Title", "Description", 0)`. User must click to dismiss.

**Q: Can I customize colors per notification?**  
A: Currently only success (green) and error (red) variants. For custom styling, modify `variantMap` in the hook or extend the component.

**Q: What if title is null or undefined?**  
A: The notification is silently ignored (logged to console in dev mode). Always provide a title.

---

## Support

For issues or questions:
1. Check the JSDoc comments in `src/components/Notification.tsx`
2. Review usage examples in migrated files
3. Test in browser DevTools console with `[Notification]` debug logs enabled

