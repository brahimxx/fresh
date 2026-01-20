'use client';

/**
 * Toast hook - thin wrapper around sonner for backward compatibility
 * 
 * Usage options:
 * 1. Direct import (preferred): import { toast } from 'sonner'
 * 2. Hook pattern (legacy): const { toast } = useToast()
 */

import { toast as sonnerToast } from 'sonner';

/**
 * Hook for backward compatibility with existing components
 * Returns the sonner toast function wrapped to match hook pattern
 */
export function useToast() {
  return { toast: sonnerToast };
}

// Re-export sonner's toast for convenience
export { sonnerToast as toast };
