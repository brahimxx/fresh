"use client";

/**
 * Toast hook - wrapper around sonner for backward compatibility
 *
 * Converts shadcn/ui toast API to sonner API:
 * - toast({ title: 'X' }) => toast('X')
 * - toast({ title: 'X', description: 'Y' }) => toast('X', { description: 'Y' })
 * - toast({ title: 'X', variant: 'destructive' }) => toast.error('X')
 */

import { toast as sonnerToast } from "sonner";

/**
 * Wrapper function that converts shadcn/ui toast format to sonner format
 */
function wrappedToast(options) {
  // If called with a string directly, pass through
  if (typeof options === "string") {
    return sonnerToast(options);
  }

  // If not an object, pass through
  if (typeof options !== "object" || options === null) {
    return sonnerToast(options);
  }

  const { title, description, variant } = options;

  // Build sonner options
  const sonnerOptions = {};
  if (description) {
    sonnerOptions.description = description;
  }

  // Route to appropriate sonner method based on variant
  if (variant === "destructive") {
    return sonnerToast.error(title || "Error", sonnerOptions);
  }

  // Default: use success for positive messages, regular for others
  if (
    title &&
    (title.toLowerCase().includes("success") ||
      title.toLowerCase().includes("saved") ||
      title.toLowerCase().includes("deleted") ||
      title.toLowerCase().includes("created") ||
      title.toLowerCase().includes("updated"))
  ) {
    return sonnerToast.success(title, sonnerOptions);
  }

  return sonnerToast(title || "", sonnerOptions);
}

/**
 * Hook for backward compatibility with existing components
 * Returns the wrapped toast function
 */
export function useToast() {
  return { toast: wrappedToast };
}

// Re-export sonner's toast for direct usage
export { sonnerToast as toast };
