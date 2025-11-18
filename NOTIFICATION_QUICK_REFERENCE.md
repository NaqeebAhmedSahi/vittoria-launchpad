# Notification System - Quick Reference

## TL;DR - One-Minute Summary

**Old Way (Scattered):**
```tsx
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();
toast({ title: "Success", variant: "default" });
toast({ title: "Error", variant: "destructive", description: String(err) });
```

**New Way (Centralized):**
```tsx
import { useNotification } from "@/components/Notification";
const notify = useNotification();
notify.success("Success");
notify.error("Error", err); // Auto-extracts error.message
notify.info("Info message");
notify.warning("Warning message");
```

---

## Quick Start

### Step 1: Replace Import
```diff
- import { useToast } from "@/hooks/use-toast";
+ import { useNotification } from "@/components/Notification";
```

### Step 2: Replace Hook
```diff
- const { toast } = useToast();
+ const notify = useNotification();
```

### Step 3: Replace Calls
```diff
# Success
- toast({ title: "Saved", description: "Data saved", variant: "default" });
+ notify.success("Saved", "Data saved");

# Error
- toast({ title: "Error", description: String(err), variant: "destructive" });
+ notify.error("Error", err);

# Info
- toast({ title: "Processing", description: "Please wait..." });
+ notify.info("Processing", "Please wait...");

# Warning
- toast({ title: "Warning", description: "Unsaved changes" });
+ notify.warning("Warning", "Unsaved changes");
```

---

## API Reference

### `notify.success(title, description?, duration?)`
Green notification. Auto-dismisses after 3 seconds.
```tsx
notify.success("Saved");
notify.success("Saved", "Your changes were saved");
notify.success("Saved", "Your changes were saved", 5000); // Custom duration
```

### `notify.error(title, errorOrDescription?, duration?)`
Red notification. Auto-dismisses after 5 seconds. Smart error extraction.
```tsx
notify.error("Failed");
notify.error("Failed", "Network error");
notify.error("Failed", err); // Extracts err.message
notify.error("Failed", new Error("Invalid input"));
notify.error("Failed", err, 7000); // Custom duration
```

### `notify.info(title, description?, duration?)`
Blue notification. Auto-dismisses after 3 seconds.
```tsx
notify.info("Processing");
notify.info("Processing", "Please wait...");
notify.info("Processing", "Please wait...", 5000);
```

### `notify.warning(title, description?, duration?)`
Amber notification. Auto-dismisses after 3 seconds.
```tsx
notify.warning("Unsaved changes");
notify.warning("Unsaved changes", "You have unsaved work");
notify.warning("Unsaved changes", "You have unsaved work", 4000);
```

---

## Common Patterns

### Pattern 1: File Upload Success
```tsx
notify.success("Files uploaded", `${files.length} file(s) uploaded successfully`);
```

### Pattern 2: API Error
```tsx
try {
  await api.call();
} catch (err) {
  notify.error("Operation failed", err);
}
```

### Pattern 3: Form Validation
```tsx
if (!email) {
  return notify.error("Validation failed", "Email is required");
}
```

### Pattern 4: Async Operation
```tsx
notify.info("Processing", "Please wait...");
const result = await longRunningTask();
notify.success("Done", "Operation completed");
```

### Pattern 5: Conditional Action
```tsx
if (!apiKey) {
  return notify.error("Configuration error", "API key not set");
}
```

---

## Edge Cases (Handled Automatically)

```tsx
// Empty/null title - silently ignored
notify.success(""); // ✗ No notification shown

// Very long title - auto-truncated to 100 chars
notify.success("A".repeat(200)); // ✓ Truncated with "..."

// Very long description - auto-truncated to 500 chars
notify.info("Title", "B".repeat(1000)); // ✓ Truncated with "..."

// Error without message
notify.error("Failed", null); // ✓ Shows "An unknown error occurred"

// Error object
notify.error("Failed", new Error("Invalid")); // ✓ Extracts "Invalid"

// Raw object (not Error)
notify.error("Failed", { code: 500 }); // ✓ Converts to string
```

---

## File Migration Order (Recommended)

1. **Settings.tsx** (13 calls) - Simple, no complex logic
2. **Intake.tsx** (17 calls) - Most calls, good for testing patterns
3. **TopBar.tsx** (3 calls) - Quick win
4. **PromptConfig.tsx** (2 calls) - Quick win
5. **Mandates.tsx** (1 call) - Quick win
6. **Teams.tsx** (1 call) - Quick win
7. **Templates.tsx** (1 call) - Quick win
8. **Finance.tsx** (1 call) - Quick win
9. **Deals.tsx** (1 call) - Quick win
10. **Candidates.tsx** (1 call) - Quick win
11. **Firms.tsx** (1 call) - Quick win

---

## Verification Checklist

After migrating each file:
- [ ] No `useToast` imports
- [ ] No `const { toast }` declarations
- [ ] All `toast({...})` calls replaced
- [ ] ESLint passes
- [ ] Browser console: no errors
- [ ] Manual test: trigger a notification
- [ ] Verify correct variant (success/error/info/warning)
- [ ] Verify auto-dismiss duration is appropriate

---

## Configuration (Advanced)

Modify `src/components/Notification.tsx`:

```typescript
const CONFIG: NotificationConfig = {
  MAX_TITLE_LENGTH: 100,              // How long titles can be
  MAX_DESCRIPTION_LENGTH: 500,        // How long descriptions can be
  DEFAULT_DURATION: 3000,             // Default auto-dismiss (ms)
  SUCCESS_DURATION: 3000,             // Success notifications
  ERROR_DURATION: 5000,               // Error notifications (longer)
  ENABLE_LOGGING: process.env.NODE_ENV === "development", // Debug logs
};
```

---

## Support

**Questions?**
1. Read `NOTIFICATION_MIGRATION.md` for detailed guide
2. Check `NOTIFICATION_VALIDATION_CHECKLIST.md` for tests
3. Review JSDoc in `src/components/Notification.tsx`

**Found a bug?**
1. Check browser console for `[Notification]` error logs
2. Verify input is valid (non-empty title)
3. Test in development mode for detailed logging
4. Check edge case handling above

**Need help?**
- Refer to migrated files in git history
- Look at Settings.tsx or Intake.tsx examples
- Test locally with different error scenarios

---

## Before & After Examples

### Example 1: Success with Dynamic Text
**Before:**
```tsx
const uploadedCount = files.length;
toast({
  title: "Files uploaded",
  description: `${uploadedCount} file(s) uploaded successfully`,
});
```

**After:**
```tsx
const uploadedCount = files.length;
notify.success("Files uploaded", `${uploadedCount} file(s) uploaded successfully`);
```

### Example 2: Error Handling
**Before:**
```tsx
try {
  await api.upload(file);
  toast({
    title: "Success",
    description: "File uploaded",
  });
} catch (err) {
  toast({
    title: "Upload failed",
    description: String(err),
    variant: "destructive",
  });
}
```

**After:**
```tsx
try {
  await api.upload(file);
  notify.success("Success", "File uploaded");
} catch (err) {
  notify.error("Upload failed", err);
}
```

### Example 3: Validation
**Before:**
```tsx
if (!email) {
  return toast({
    title: "Missing email",
    description: "Please enter your email",
    variant: "destructive",
  });
}
```

**After:**
```tsx
if (!email) {
  return notify.error("Missing email", "Please enter your email");
}
```

### Example 4: Complex Flow
**Before:**
```tsx
if (!apiKey) {
  return toast({
    title: "Not configured",
    description: "API key is required",
    variant: "destructive",
  });
}

try {
  toast({
    title: "Testing...",
    description: "Validating API key",
  });
  await testApiKey(apiKey);
  toast({
    title: "Success",
    description: "API key is valid",
  });
} catch (err) {
  toast({
    title: "Test failed",
    description: String(err),
    variant: "destructive",
  });
}
```

**After:**
```tsx
if (!apiKey) {
  return notify.error("Not configured", "API key is required");
}

try {
  notify.info("Testing...", "Validating API key");
  await testApiKey(apiKey);
  notify.success("Success", "API key is valid");
} catch (err) {
  notify.error("Test failed", err);
}
```

---

## Summary

✅ **Production Ready**
- Comprehensive error handling
- Input validation with truncation
- Type-safe API
- Development logging
- Zero breaking changes

✅ **Easy Migration**
- 7 main patterns cover ~55+ of 76 calls
- Simple find-replace for each pattern
- All edge cases handled automatically
- Backward compatible (old system still works)

✅ **Benefits**
- Consistent notifications across app
- Semantic method names (success/error/info/warning)
- Automatic error message extraction
- Configurable globally
- Easier to test and maintain

---

**Status:** ✅ Ready to deploy  
**Version:** 1.0.0  
**Files:** 3 documents + 1 component  
**Estimated Migration Time:** 2-3 hours for all 76 calls

