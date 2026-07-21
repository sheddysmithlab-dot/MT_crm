/**
 * Global Error Handler for Malwa CRM v2.0.0
 * Handles uncaught errors, promise rejections, and system-level issues
 */

import { toast } from 'sonner';

class GlobalErrorHandler {
  constructor() {
    this.initialize();
    this.errorQueue = [];
    this.maxQueueSize = 50;
  }

  initialize() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', this.handleError.bind(this));
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // Handle resource loading errors
    window.addEventListener('error', this.handleResourceError.bind(this), true);
    
    console.log('🛡️ Global Error Handler initialized for Malwa CRM v2.0.0');
  }

  handleError(event) {
    const error = {
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logError(error);
    this.showErrorNotification(error);
  }

  handlePromiseRejection(event) {
    const error = {
      type: 'promise_rejection',
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      reason: event.reason,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logError(error);
    this.showErrorNotification(error);
    
    // Prevent the default browser error handling
    event.preventDefault();
  }

  handleResourceError(event) {
    // Only handle resource loading errors (images, scripts, etc.)
    if (event.target !== window) {
      const error = {
        type: 'resource_error',
        message: `Failed to load resource: ${event.target.src || event.target.href}`,
        tagName: event.target.tagName,
        src: event.target.src,
        href: event.target.href,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      this.logError(error);
      
      // Don't show toast for resource errors unless critical
      if (this.isCriticalResource(event.target)) {
        this.showErrorNotification(error);
      }
    }
  }

  isCriticalResource(element) {
    // Define what constitutes a critical resource
    const criticalSources = [
      '/src/',
      '/assets/',
      'main.js',
      'index.js',
      'app.js'
    ];
    
    const src = element.src || element.href || '';
    return criticalSources.some(critical => src.includes(critical));
  }

  logError(error) {
    try {
      // Add to error queue
      this.errorQueue.push(error);
      
      // Maintain queue size
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue.shift();
      }

      // Safe console logging with enhanced formatting
      if (typeof console !== 'undefined' && console.group) {
        console.group(`🚨 Global Error [${error.type.toUpperCase()}]`);
        console.error('Message:', error.message);
        console.error('Timestamp:', error.timestamp);
        if (error.filename) console.error('File:', error.filename);
        if (error.lineno) console.error('Line:', error.lineno);
        if (error.stack) console.error('Stack:', error.stack);
        console.groupEnd();
      } else if (typeof console !== 'undefined' && console.error) {
        console.error(`🚨 Global Error [${error.type.toUpperCase()}]:`, error.message);
      }

      // Try to log to database
      this.logToDatabase(error);
    } catch (consoleError) {
      // Fallback if console methods fail
      try {
        console.error('Error logging failed:', consoleError);
      } catch (e) {
        // Silent fail if console is completely broken
      }
    }
  }

  async logToDatabase(error) {
    try {
      if (window.dbOperations) {
        await window.dbOperations.insert('audit_logs', {
          id: 'global_error_' + Date.now(),
          action: 'GLOBAL_ERROR',
          performedBy: 'system',
          details: error,
          timestamp: error.timestamp
        });
      }
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  }

  showErrorNotification(error) {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Don't spam with too many error notifications
    const recentErrors = this.errorQueue.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 5000
    ).length;
    
    if (recentErrors > 3) return;

    let message = 'System Error Occurred';
    let description = 'An unexpected error occurred in the application';

    if (error.type === 'javascript_error') {
      message = 'JavaScript Error';
      description = isDev ? error.message : 'A script error occurred';
    } else if (error.type === 'promise_rejection') {
      message = 'Promise Rejection';
      description = isDev ? error.message : 'An async operation failed';
    } else if (error.type === 'resource_error') {
      message = 'Resource Loading Error';
      description = 'Failed to load a required resource';
    }

    toast.error(message, {
      description,
      duration: isDev ? 8000 : 5000,
      action: {
        label: 'Reload',
        onClick: () => window.location.reload()
      }
    });
  }

  getErrorHistory() {
    return this.errorQueue;
  }

  clearErrorHistory() {
    this.errorQueue = [];
    console.log('🧹 Error history cleared');
  }

  // Method to manually report errors
  reportError(error, context = {}) {
    const errorObj = {
      type: 'manual_report',
      message: error.message || error.toString(),
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logError(errorObj);
  }
}

// Create global instance
const globalErrorHandler = new GlobalErrorHandler();

// Export for manual error reporting
export const reportError = globalErrorHandler.reportError.bind(globalErrorHandler);
export const getErrorHistory = globalErrorHandler.getErrorHistory.bind(globalErrorHandler);
export const clearErrorHistory = globalErrorHandler.clearErrorHistory.bind(globalErrorHandler);

export default globalErrorHandler;