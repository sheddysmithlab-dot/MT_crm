/**
 * Error Dashboard Component for Malwa CRM v2.0.0
 * Shows error statistics and logs for system monitoring
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Database, Shield, RotateCcw, Network, Monitor, Settings, Trash2, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const ErrorDashboard = () => {
  const [errorStats, setErrorStats] = useState(null);
  const [errorHistory, setErrorHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    loadErrorData();
  }, [timeRange]);

  const loadErrorData = async () => {
    setLoading(true);
    try {
      // Get error statistics
      if (window.errorLogger) {
        const stats = await window.errorLogger.getErrorStats(timeRange);
        setErrorStats(stats);
      }

      // Get global error history
      if (window.getErrorHistory) {
        const history = window.getErrorHistory();
        setErrorHistory(history.slice(-20)); // Last 20 errors
      }
    } catch (error) {
      console.error('Failed to load error data:', error);
      toast.error('Failed to load error dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const clearErrorHistory = async () => {
    if (window.clearErrorHistory) {
      window.clearErrorHistory();
      setErrorHistory([]);
      toast.success('Error history cleared');
    }
  };

  const clearOldErrors = async () => {
    if (window.errorLogger) {
      const deletedCount = await window.errorLogger.clearOldErrors(30);
      toast.success(`Cleared ${deletedCount} old error logs`);
      loadErrorData();
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      database_error: Database,
      auth_error: Shield,
      permission_error: Shield,
      sync_error: RotateCcw,
      network_error: Network,
      ui_error: Monitor,
      system_error: Settings
    };
    return icons[category] || AlertTriangle;
  };

  const getCategoryColor = (category) => {
    const colors = {
      database_error: 'text-red-600',
      auth_error: 'text-orange-600',
      permission_error: 'text-yellow-600',
      sync_error: 'text-blue-600',
      network_error: 'text-purple-600',
      ui_error: 'text-green-600',
      system_error: 'text-gray-600'
    };
    return colors[category] || 'text-red-600';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-brand-red" />
          <h2 className="text-xl font-bold dark:text-dark-text">Error Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-dark-text text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
          <Button onClick={loadErrorData} size="sm" variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Statistics */}
      {errorStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{errorStats.total}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Errors</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Database className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{errorStats.byCategory.database_error || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Database Errors</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {(errorStats.byCategory.auth_error || 0) + (errorStats.byCategory.permission_error || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Auth Errors</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <RotateCcw className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{errorStats.byCategory.sync_error || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sync Errors</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Error Categories Breakdown */}
      {errorStats && errorStats.total > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-dark-text">Error Categories</h3>
          <div className="space-y-3">
            {Object.entries(errorStats.byCategory).map(([category, count]) => {
              const Icon = getCategoryIcon(category);
              const percentage = ((count / errorStats.total) * 100).toFixed(1);
              
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${getCategoryColor(category)}`} />
                    <span className="font-medium dark:text-dark-text">
                      {category.replace('_', ' ').replace(/\\b\\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{percentage}%</span>
                    <span className="font-bold dark:text-dark-text">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Errors */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-dark-text">Recent Errors</h3>
          <div className="flex gap-2">
            <Button onClick={clearErrorHistory} size="sm" variant="secondary">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
            <Button onClick={clearOldErrors} size="sm" variant="secondary">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Old Logs
            </Button>
          </div>
        </div>

        {errorHistory.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No recent errors found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">This is a good sign!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {errorHistory.map((error, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {error.type?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(error.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm dark:text-dark-text truncate" title={error.message}>
                    {error.message}
                  </p>
                  {error.filename && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {error.filename}:{error.lineno}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ErrorDashboard;