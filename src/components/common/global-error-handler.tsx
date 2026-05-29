'use client';

import { useEffect } from 'react';

/**
 * Global error handler for unhandled promise rejections and errors
 * Logs errors to console in development, can be extended to send to monitoring service
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Promise Rejection]', {
        reason: event.reason,
        promise: event.promise,
        timestamp: new Date().toISOString(),
      });

      // Prevent default browser behavior (console warning)
      event.preventDefault();

      // In production, send to monitoring service (e.g., Sentry, LogRocket)
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to monitoring service
        // Example: Sentry.captureException(event.reason);
      }
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error('[Uncaught Error]', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
      });

      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to monitoring service
        // Example: Sentry.captureException(event.error);
      }
    };

    // Register handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
