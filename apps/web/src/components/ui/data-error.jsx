import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Full page data error
export function DataError({ 
  title = 'Failed to load data',
  message = 'Something went wrong while fetching the data.',
  onRetry,
  error,
}) {
  var isNetworkError = error?.message?.includes('fetch') || 
                       error?.message?.includes('network') ||
                       error?.name === 'TypeError';

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          {isNetworkError ? (
            <WifiOff className="h-8 w-8 text-red-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mb-2">{message}</p>
        {error && process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-600 font-mono mb-4">{error.message}</p>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Inline error alert
export function InlineError({ message, onRetry }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Form field error
export function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 mt-1">{message}</p>
  );
}

// API error handler helper
export function getErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    // Clean up common error messages
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message.includes('401')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
