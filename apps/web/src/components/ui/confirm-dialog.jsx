'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

var ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  var [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'default',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: null,
    onCancel: null,
  });

  var confirm = useCallback(function(options) {
    return new Promise(function(resolve) {
      setState({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        variant: options.variant || 'default',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        onConfirm: function() {
          setState(function(s) { return { ...s, isOpen: false }; });
          resolve(true);
        },
        onCancel: function() {
          setState(function(s) { return { ...s, isOpen: false }; });
          resolve(false);
        },
      });
    });
  }, []);

  // Convenience methods
  confirm.delete = function(options) {
    return confirm({
      title: options?.title || 'Delete item?',
      message: options?.message || 'This action cannot be undone.',
      variant: 'destructive',
      confirmLabel: options?.confirmLabel || 'Delete',
      cancelLabel: options?.cancelLabel || 'Cancel',
    });
  };

  confirm.cancel = function(options) {
    return confirm({
      title: options?.title || 'Cancel booking?',
      message: options?.message || 'Are you sure you want to cancel this booking?',
      variant: 'warning',
      confirmLabel: options?.confirmLabel || 'Yes, cancel',
      cancelLabel: options?.cancelLabel || 'Keep it',
    });
  };

  confirm.save = function(options) {
    return confirm({
      title: options?.title || 'Save changes?',
      message: options?.message || 'Do you want to save your changes?',
      variant: 'default',
      confirmLabel: options?.confirmLabel || 'Save',
      cancelLabel: options?.cancelLabel || 'Discard',
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog state={state} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  var context = useContext(ConfirmContext);
  if (!context) {
    // Return a no-op confirm for when used outside provider
    return function() {
      return Promise.resolve(true);
    };
  }
  return context;
}

function ConfirmDialog({ state }) {
  var icons = {
    default: <HelpCircle className="h-6 w-6 text-blue-600" />,
    destructive: <Trash2 className="h-6 w-6 text-red-600" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    success: <CheckCircle className="h-6 w-6 text-green-600" />,
    danger: <AlertCircle className="h-6 w-6 text-red-600" />,
  };

  var buttonVariants = {
    default: 'default',
    destructive: 'destructive',
    warning: 'default',
    success: 'default',
    danger: 'destructive',
  };

  return (
    <Dialog open={state.isOpen} onOpenChange={function(open) { if (!open) state.onCancel?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={
              'w-12 h-12 rounded-full flex items-center justify-center ' +
              (state.variant === 'destructive' || state.variant === 'danger' 
                ? 'bg-red-100' 
                : state.variant === 'warning' 
                  ? 'bg-yellow-100' 
                  : state.variant === 'success'
                    ? 'bg-green-100'
                    : 'bg-blue-100')
            }>
              {icons[state.variant] || icons.default}
            </div>
            <div>
              <DialogTitle>{state.title}</DialogTitle>
              {state.message && (
                <DialogDescription className="mt-1">
                  {state.message}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={state.onCancel}>
            {state.cancelLabel}
          </Button>
          <Button 
            variant={buttonVariants[state.variant] || 'default'}
            onClick={state.onConfirm}
          >
            {state.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Standalone confirmation dialog component for direct use
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) {
  var icons = {
    default: <HelpCircle className="h-6 w-6 text-blue-600" />,
    destructive: <Trash2 className="h-6 w-6 text-red-600" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
  };

  function handleCancel() {
    onCancel?.();
    onOpenChange(false);
  }

  function handleConfirm() {
    onConfirm?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={
              'w-12 h-12 rounded-full flex items-center justify-center shrink-0 ' +
              (variant === 'destructive' 
                ? 'bg-red-100' 
                : variant === 'warning' 
                  ? 'bg-yellow-100' 
                  : 'bg-blue-100')
            }>
              {icons[variant] || icons.default}
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Loading...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
