'use client';

import { HelpCircle, Info, AlertCircle, Lightbulb } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Simple inline help tooltip
export function HelpTooltip({ content, children, side = 'top', className }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children || (
            <button 
              type="button" 
              className={cn("inline-flex text-muted-foreground hover:text-foreground transition-colors", className)}
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Info tooltip with icon
export function InfoTooltip({ content, side = 'top', className }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={cn("inline-flex text-blue-500 hover:text-blue-600 transition-colors", className)}
            aria-label="Information"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Warning tooltip with icon
export function WarningTooltip({ content, side = 'top', className }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={cn("inline-flex text-yellow-500 hover:text-yellow-600 transition-colors", className)}
            aria-label="Warning"
          >
            <AlertCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Tip tooltip with lightbulb
export function TipTooltip({ content, side = 'top', className }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={cn("inline-flex text-amber-500 hover:text-amber-600 transition-colors", className)}
            aria-label="Tip"
          >
            <Lightbulb className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Form field label with help tooltip
export function LabelWithHelp({ label, helpText, required, htmlFor }) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {helpText && <HelpTooltip content={helpText} />}
    </div>
  );
}

// Extended help popover for more detailed information
export function HelpPopover({ 
  title, 
  content, 
  children,
  side = 'right',
  align = 'start',
  className 
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button 
            type="button"
            variant="ghost" 
            size="icon"
            className={cn("h-6 w-6", className)}
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        align={align}
        className="w-80"
      >
        {title && (
          <div className="flex items-center gap-2 pb-2 border-b mb-3">
            <Info className="h-4 w-4 text-primary" />
            <h4 className="font-medium">{title}</h4>
          </div>
        )}
        <div className="text-sm text-muted-foreground space-y-2">
          {typeof content === 'string' ? <p>{content}</p> : content}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Contextual help card for sidebars or help panels
export function HelpCard({ title, description, tips, className }) {
  return (
    <div className={cn("rounded-lg border bg-muted/50 p-4 space-y-3", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      
      {tips && tips.length > 0 && (
        <ul className="space-y-2 text-sm text-muted-foreground pl-11">
          {tips.map(function(tip, index) {
            return (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                {tip}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Keyboard shortcut display
export function KeyboardShortcut({ keys, description }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map(function(key, index) {
          return (
            <kbd 
              key={index}
              className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
            >
              {key}
            </kbd>
          );
        })}
      </div>
    </div>
  );
}

// Feature highlight tooltip for new features
export function NewFeatureBadge({ label = 'New', className }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
      className
    )}>
      {label}
    </span>
  );
}

// Guided tour spotlight (placeholder for future implementation)
export function SpotlightTarget({ id, children, className }) {
  return (
    <div 
      data-spotlight-id={id}
      className={cn("relative", className)}
    >
      {children}
    </div>
  );
}
