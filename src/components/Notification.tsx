import { useToast } from "@/hooks/use-toast";

/**
 * ============================================================================
 * CENTRALIZED NOTIFICATION SYSTEM - PRODUCTION READY
 * ============================================================================
 * 
 * This is the single source of truth for all user-facing notifications.
 * 
 * NOTIFICATIONS TYPES:
 *   - success: Positive confirmations (green)
 *   - error: Errors and failures requiring action (red)
 *   - info: Informational messages (default)
 *   - warning: Warnings and cautions (amber)
 * 
 * PRODUCTION FEATURES:
 *   ✓ Input validation (title/description sanitization)
 *   ✓ Error handling and recovery
 *   ✓ Default & custom duration support
 *   ✓ Type-safe variant mapping
 *   ✓ Logging for debugging
 *   ✓ Error object handling (gracefully converts Error to string)
 *   ✓ Max length enforcement (prevents UI overflow)
 * 
 * USAGE EXAMPLES:
 *   const notify = useNotification();
 *   
 *   // Success
 *   notify.success("Saved", "Your changes have been saved");
 *   
 *   // Error with error object
 *   notify.error("Upload failed", err instanceof Error ? err.message : String(err));
 *   
 *   // Info with custom duration
 *   notify.info("Processing", "Please wait...", 5000);
 *   
 *   // Warning
 *   notify.warning("Unsaved changes", "You have unsaved work");
 * 
 * ============================================================================
 */

export type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationConfig {
  /** Validation: max characters for title to prevent UI overflow */
  MAX_TITLE_LENGTH: number;
  /** Validation: max characters for description to prevent UI overflow */
  MAX_DESCRIPTION_LENGTH: number;
  /** Default duration in milliseconds; set to 0 for permanent (user must dismiss) */
  DEFAULT_DURATION: number;
  /** Duration for success notifications */
  SUCCESS_DURATION: number;
  /** Duration for error notifications (longer for user to read) */
  ERROR_DURATION: number;
  /** Enable logging for debugging in development */
  ENABLE_LOGGING: boolean;
}

// Production configuration
const CONFIG: NotificationConfig = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  DEFAULT_DURATION: 3000,
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 5000,
  ENABLE_LOGGING: process.env.NODE_ENV === "development",
};

/**
 * Sanitizes and validates a string for notification display
 * @param text - Input text to sanitize
 * @param maxLength - Maximum length allowed
 * @returns Sanitized, trimmed string
 */
function sanitizeText(text: unknown, maxLength: number): string {
  // Handle null/undefined
  if (text == null) {
    return "";
  }

  // Convert to string if needed
  let str = typeof text === "string" ? text : String(text);

  // Trim whitespace
  str = str.trim();

  // Truncate if exceeds max length
  if (str.length > maxLength) {
    str = str.substring(0, maxLength - 3) + "...";
  }

  return str;
}

/**
 * Extracts error message from various error types
 * @param error - Error object or string
 * @returns Error message string
 */
function extractErrorMessage(error: unknown): string {
  if (!error) {
    return "An unknown error occurred";
  }

  if (error instanceof Error) {
    return error.message || "Error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error) {
    return String((error as Record<string, unknown>).message);
  }

  return String(error);
}

/**
 * Production-grade notification hook with validation and error handling
 * @returns Object with notification methods (success, error, info, warning)
 */
export const useNotification = () => {
  const { toast } = useToast();

  /**
   * Internal method to handle all notifications with validation
   * @param type - Notification type (success, error, info, warning)
   * @param title - Notification title
   * @param description - Optional description
   * @param duration - Optional custom duration (ms)
   */
  const notify = (
    type: NotificationType,
    title: string,
    description?: string,
    duration?: number
  ): void => {
    try {
      // Validate required title
      const sanitizedTitle = sanitizeText(title, CONFIG.MAX_TITLE_LENGTH);
      if (!sanitizedTitle) {
        if (CONFIG.ENABLE_LOGGING) {
          console.warn("[Notification] Empty title provided");
        }
        return;
      }

      // Sanitize optional description
      const sanitizedDescription = description
        ? sanitizeText(description, CONFIG.MAX_DESCRIPTION_LENGTH)
        : undefined;

      // Map notification type to toast variant
      const variantMap: Record<NotificationType, "default" | "destructive"> = {
        success: "default",
        error: "destructive",
        info: "default",
        warning: "default",
      };

      // Determine duration: use explicit param, then type-specific defaults, then global default
      let finalDuration = CONFIG.DEFAULT_DURATION;
      if (duration !== undefined && duration >= 0) {
        finalDuration = duration;
      } else if (type === "success") {
        finalDuration = CONFIG.SUCCESS_DURATION;
      } else if (type === "error") {
        finalDuration = CONFIG.ERROR_DURATION;
      }

      // Debug logging
      if (CONFIG.ENABLE_LOGGING) {
        console.log(`[Notification] ${type.toUpperCase()}: "${sanitizedTitle}"`, {
          description: sanitizedDescription,
          duration: finalDuration,
        });
      }

      // Show toast
      toast({
        title: sanitizedTitle,
        description: sanitizedDescription,
        variant: variantMap[type],
        duration: finalDuration,
      });
    } catch (err) {
      // Fallback: if notification system fails, log to console
      console.error("[Notification] System error:", err);
      console.error(
        "[Notification] Failed to show notification:",
        title,
        description
      );
    }
  };

  return {
    /**
     * Show success notification
     * @param title - Success message title
     * @param description - Optional detailed message
     * @param duration - Optional custom duration (ms)
     */
    success: (title: string, description?: string, duration?: number): void =>
      notify("success", title, description, duration),

    /**
     * Show error notification
     * @param title - Error message title
     * @param errorOrDescription - Error object or description string
     * @param duration - Optional custom duration (ms)
     */
    error: (
      title: string,
      errorOrDescription?: unknown,
      duration?: number
    ): void => {
      const description =
        typeof errorOrDescription === "string"
          ? errorOrDescription
          : extractErrorMessage(errorOrDescription);
      notify("error", title, description, duration);
    },

    /**
     * Show info notification
     * @param title - Info message title
     * @param description - Optional detailed message
     * @param duration - Optional custom duration (ms)
     */
    info: (title: string, description?: string, duration?: number): void =>
      notify("info", title, description, duration),

    /**
     * Show warning notification
     * @param title - Warning message title
     * @param description - Optional detailed message
     * @param duration - Optional custom duration (ms)
     */
    warning: (title: string, description?: string, duration?: number): void =>
      notify("warning", title, description, duration),
  };
};
