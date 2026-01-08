'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

var ToastContext = createContext(null);

var TOAST_DURATION = 5000;

export function ToastProvider({ children }) {
  var [toasts, setToasts] = useState([]);

  var addToast = useCallback(function(toast) {
    var id = Date.now() + Math.random();
    var newToast = {
      id: id,
      title: toast.title,
      description: toast.description,
      variant: toast.variant || 'default',
      duration: toast.duration || TOAST_DURATION,
    };

    setToasts(function(prev) {
      return [...prev, newToast];
    });

    // Auto-dismiss
    if (newToast.duration > 0) {
      setTimeout(function() {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  var removeToast = useCallback(function(id) {
    setToasts(function(prev) {
      return prev.filter(function(t) { return t.id !== id; });
    });
  }, []);

  var toast = useCallback(function(options) {
    return addToast(options);
  }, [addToast]);

  // Convenience methods
  toast.success = function(title, description) {
    return addToast({ title: title, description: description, variant: 'success' });
  };

  toast.error = function(title, description) {
    return addToast({ title: title, description: description, variant: 'destructive' });
  };

  toast.warning = function(title, description) {
    return addToast({ title: title, description: description, variant: 'warning' });
  };

  toast.info = function(title, description) {
    return addToast({ title: title, description: description, variant: 'info' });
  };

  return (
    <ToastContext.Provider value={{ toast: toast, toasts: toasts, removeToast: removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  var context = useContext(ToastContext);
  if (!context) {
    // Return a no-op toast for when used outside provider
    return {
      toast: function(options) {
        console.log('Toast:', options);
      },
    };
  }
  return context;
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(function(toast) {
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={function() { onRemove(toast.id); }}
          />
        );
      })}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  var variants = {
    default: {
      bg: 'bg-background border',
      icon: null,
    },
    success: {
      bg: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    },
    destructive: {
      bg: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
      icon: <Info className="h-5 w-5 text-blue-600" />,
    },
  };

  var variant = variants[toast.variant] || variants.default;

  return (
    <div
      className={
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full ' +
        variant.bg
      }
      role="alert"
    >
      {variant.icon && <div className="shrink-0 mt-0.5">{variant.icon}</div>}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-sm">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
