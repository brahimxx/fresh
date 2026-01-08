import { Loader2 } from 'lucide-react';

// Full page loading spinner
export function PageLoading({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Inline loading spinner
export function InlineLoading({ size = 'default' }) {
  var sizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Loader2 className={'animate-spin text-muted-foreground ' + sizes[size]} />
  );
}

// Button loading state
export function ButtonLoading({ children, loading, className = '' }) {
  if (!loading) return children;

  return (
    <span className={'inline-flex items-center gap-2 ' + className}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {children}
    </span>
  );
}

// Overlay loading for cards/sections
export function OverlayLoading({ loading, children }) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
