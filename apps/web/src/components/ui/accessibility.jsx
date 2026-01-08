'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

// Skip to main content link for keyboard users
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none"
    >
      Skip to main content
    </a>
  );
}

// Announce content changes to screen readers
export function LiveRegion({ message, politeness = 'polite' }) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Focus trap for modals and dialogs
export function useFocusTrap(containerRef, isActive) {
  useEffect(function() {
    if (!isActive || !containerRef.current) return;
    
    var container = containerRef.current;
    var focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    var firstElement = focusableElements[0];
    var lastElement = focusableElements[focusableElements.length - 1];
    
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return function() {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}

// Keyboard shortcut hint tooltip
export function KeyboardHint({ children, shortcut, description }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{description}</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            {shortcut}
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Reduced motion preference hook
export function useReducedMotion() {
  var [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(function() {
    var query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    
    function handleChange(e) {
      setReducedMotion(e.matches);
    }
    
    query.addEventListener('change', handleChange);
    return function() {
      query.removeEventListener('change', handleChange);
    };
  }, []);
  
  return reducedMotion;
}

// High contrast mode detection
export function useHighContrast() {
  var [highContrast, setHighContrast] = useState(false);
  
  useEffect(function() {
    var query = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(query.matches);
    
    function handleChange(e) {
      setHighContrast(e.matches);
    }
    
    query.addEventListener('change', handleChange);
    return function() {
      query.removeEventListener('change', handleChange);
    };
  }, []);
  
  return highContrast;
}

// Visually hidden text for screen readers
export function VisuallyHidden({ children }) {
  return <span className="sr-only">{children}</span>;
}

// Announce page changes
export function useAnnouncePageChange(title) {
  useEffect(function() {
    if (title) {
      var announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = 'Navigated to ' + title;
      
      document.body.appendChild(announcement);
      
      var timeout = setTimeout(function() {
        document.body.removeChild(announcement);
      }, 1000);
      
      return function() {
        clearTimeout(timeout);
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      };
    }
  }, [title]);
}

// Focus visible indicator enhancement
export function FocusRing({ children, className = '' }) {
  return (
    <div className={'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded-md ' + className}>
      {children}
    </div>
  );
}
