/**
 * Enhanced Error Logging System for Malwa CRM v2.0.0
 * Provides structured error logging with database persistence and analysis
 */

import { dbOperations } from '@/lib/db';
import { toast } from 'sonner';

export class ErrorLogger {
  constructor() {
    this.errorCategories = {
      DATABASE: 'database_error',
      AUTHENTICATION: 'auth_error', 
      PERMISSION: 'permission_error',
      SYNC: 'sync_error',
      VALIDATION: 'validation_error',
      NETWORK: 'network_error',
      UI: 'ui_error',
      SYSTEM: 'system_error'
    };
    
    this.logLevels = {
      ERROR: 'error',
      WARNING: 'warning', 
      INFO: 'info',
      DEBUG: 'debug'
    };
  }

  async logError(category, error, context = {}, level = this.logLevels.ERROR) {
    const errorEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      level,
      message: error.message || error.toString(),
      stack: error.stack,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        version: 'v2.0.0'
      },
      timestamp: new Date().toISOString()
    };

    // Console logging with enhanced formatting
    this.logToConsole(errorEntry);

    // Try to persist to database
    await this.logToDatabase(errorEntry);

    // Show user notification if appropriate
    if (level === this.logLevels.ERROR && !context.silent) {
      this.showUserNotification(errorEntry);
    }

    return errorEntry;
  }

  logToConsole(errorEntry) {
    const { category, level, message, context } = errorEntry;
    const emoji = this.getCategoryEmoji(category);
    const levelColor = this.getLevelColor(level);

    console.group(`${emoji} ${category.toUpperCase()} [${level.toUpperCase()}]`);
    console.log(`%c${message}`, `color: ${levelColor}; font-weight: bold;`);
    console.log('Context:', context);
    if (errorEntry.stack) {
      console.log('Stack:', errorEntry.stack);
    }
    console.groupEnd();
  }

  async logToDatabase(errorEntry) {
    try {
      await dbOperations.insert('audit_logs', {
        id: errorEntry.id,
        action: 'ERROR_LOG',
        performedBy: 'system',
        details: errorEntry,
        timestamp: errorEntry.timestamp
      });
    } catch (dbError) {
      console.error('Failed to persist error to database:', dbError);
    }
  }

  showUserNotification(errorEntry) {
    const { category, message } = errorEntry;
    const isDev = process.env.NODE_ENV === 'development';
    
    let title = 'System Error';
    let description = isDev ? message : 'An error occurred in the application';

    switch (category) {
      case this.errorCategories.DATABASE:
        title = 'Database Error';
        description = isDev ? message : 'Database operation failed';
        break;
      case this.errorCategories.AUTHENTICATION:
        title = 'Authentication Error';
        description = isDev ? message : 'Login or authentication failed';
        break;
      case this.errorCategories.PERMISSION:
        title = 'Permission Error';
        description = isDev ? message : 'Access denied for this operation';
        break;
      case this.errorCategories.SYNC:
        title = 'Sync Error';
        description = isDev ? message : 'Data synchronization failed';
        break;
      case this.errorCategories.NETWORK:
        title = 'Network Error';
        description = isDev ? message : 'Network connection issue';
        break;
    }

    toast.error(title, {
      description,
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => window.location.reload()
      }
    });
  }

  getCategoryEmoji(category) {
    const emojis = {
      [this.errorCategories.DATABASE]: '🗄️',
      [this.errorCategories.AUTHENTICATION]: '🔐',
      [this.errorCategories.PERMISSION]: '🛡️',
      [this.errorCategories.SYNC]: '🔄',
      [this.errorCategories.VALIDATION]: '✅',
      [this.errorCategories.NETWORK]: '🌐',
      [this.errorCategories.UI]: '🖥️',
      [this.errorCategories.SYSTEM]: '⚙️'
    };
    return emojis[category] || '🚨';
  }

  getLevelColor(level) {
    const colors = {
      [this.logLevels.ERROR]: '#dc2626',
      [this.logLevels.WARNING]: '#f59e0b',
      [this.logLevels.INFO]: '#3b82f6',
      [this.logLevels.DEBUG]: '#6b7280'
    };
    return colors[level] || '#dc2626';
  }

  // Convenience methods for different error types
  async logDatabaseError(error, context) {
    return this.logError(this.errorCategories.DATABASE, error, context);
  }

  async logAuthError(error, context) {
    return this.logError(this.errorCategories.AUTHENTICATION, error, context);
  }

  async logPermissionError(error, context) {
    return this.logError(this.errorCategories.PERMISSION, error, context);
  }

  async logSyncError(error, context) {
    return this.logError(this.errorCategories.SYNC, error, context);
  }

  async logValidationError(error, context) {
    return this.logError(this.errorCategories.VALIDATION, error, context);
  }

  async logNetworkError(error, context) {
    return this.logError(this.errorCategories.NETWORK, error, context);
  }

  async logUIError(error, context) {
    return this.logError(this.errorCategories.UI, error, context);
  }

  async logSystemError(error, context) {
    return this.logError(this.errorCategories.SYSTEM, error, context);
  }

  // Get error statistics
  async getErrorStats(timeRange = 24) { // hours
    try {
      const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000)).toISOString();
      const logs = await dbOperations.getAll('audit_logs');
      
      const errorLogs = logs.filter(log => 
        log.action === 'ERROR_LOG' && 
        log.timestamp >= since
      );

      const stats = errorLogs.reduce((acc, log) => {
        const category = log.details?.category || 'unknown';
        const level = log.details?.level || 'error';
        
        acc.total++;
        acc.byCategory[category] = (acc.byCategory[category] || 0) + 1;
        acc.byLevel[level] = (acc.byLevel[level] || 0) + 1;
        
        return acc;
      }, {
        total: 0,
        byCategory: {},
        byLevel: {},
        timeRange: `${timeRange} hours`
      });

      return stats;
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return null;
    }
  }

  // Clear old error logs
  async clearOldErrors(daysOld = 30) {
    try {
      const cutoff = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000)).toISOString();
      const logs = await dbOperations.getAll('audit_logs');
      
      let deletedCount = 0;
      for (const log of logs) {
        if (log.action === 'ERROR_LOG' && log.timestamp < cutoff) {
          await dbOperations.delete('audit_logs', log.id);
          deletedCount++;
        }
      }

      console.log(`🧹 Cleared ${deletedCount} old error logs (older than ${daysOld} days)`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to clear old error logs:', error);
      return 0;
    }
  }
}

// Create global instance
export const errorLogger = new ErrorLogger();

// Make available globally for easy access
window.errorLogger = errorLogger;

export default errorLogger;