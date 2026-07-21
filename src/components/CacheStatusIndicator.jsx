import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Upload, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Cache Status Indicator Component
 * 
 * Displays real-time status of the write-behind cache:
 * - Pending changes count
 * - Time until next upload
 * - Upload progress
 * - Manual upload trigger
 */
const CacheStatusIndicator = () => {
  const [cacheStatus, setCacheStatus] = useState({
    enabled: false,
    pendingChanges: 0,
    bufferSize: 0,
    isUploading: false,
    lastUpload: null,
    nextUpload: null,
    timeUntilUpload: null,
    totalChanges: 0,
    successfulUploads: 0,
    failedUploads: 0
  });
  
  const [expanded, setExpanded] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const electronDetected = typeof window !== 'undefined' && window.electron;
    setIsElectron(electronDetected);
    console.log('[CACHE-STATUS] Electron detected:', electronDetected);
    console.log('[CACHE-STATUS] Cache manager available:', !!window.cacheManager);
    
    if (!window.cacheManager) {
      console.warn('[CACHE-STATUS] Cache manager not available');
      return;
    }

    // Initial load
    updateCacheStatus();

    // Update every 10 seconds for more responsive UI
    const interval = setInterval(updateCacheStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  const updateCacheStatus = async () => {
    try {
      if (window.cacheManager && typeof window.cacheManager.status === 'function') {
        const status = await window.cacheManager.status();
        console.log('[CACHE-STATUS] Status updated:', status);
        setCacheStatus(status);
      } else if (window.cacheManager && typeof window.cacheManager.getStatus === 'function') {
        // Fallback to direct method call
        const status = await window.cacheManager.getStatus();
        console.log('[CACHE-STATUS] Status updated (getStatus):', status);
        setCacheStatus(status);
      } else {
        console.warn('[CACHE-STATUS] No status method available on cacheManager');
      }
    } catch (error) {
      console.error('[CACHE-STATUS] Failed to get cache status:', error);
    }
  };

  const handleManualUpload = async () => {
    try {
      console.log('[CACHE-STATUS] 🔧 Manual upload button clicked');
      console.log('[CACHE-STATUS] window.cacheManager exists:', !!window.cacheManager);
      console.log('[CACHE-STATUS] window.electron exists:', !!window.electron);
      console.log('[CACHE-STATUS] window.electron.fs exists:', !!window.electron?.fs);
      console.log('[CACHE-STATUS] window.electron.cache exists:', !!window.electron?.cache);
      console.log('[CACHE-STATUS] isElectron state:', isElectron);
      
      // Check if running in browser mode
      if (!window.electron) {
        console.warn('[CACHE-STATUS] ⚠️ Running in browser mode - manual upload not available');
        alert('Manual upload is only available in Electron (desktop) mode.\n\nYou are currently running in browser development mode.\n\nTo use this feature, run: npm run electron:dev');
        return;
      }
      
      if (window.cacheManager && typeof window.cacheManager.upload === 'function') {
        console.log('[CACHE-STATUS] Calling cacheManager.upload()...');
        const result = await window.cacheManager.upload();
        console.log('[CACHE-STATUS] ✅ Manual upload completed, result:', result);
        // Wait a bit for upload to complete, then update status
        setTimeout(updateCacheStatus, 1000);
      } else if (window.cacheManager && typeof window.cacheManager.manualUpload === 'function') {
        // Fallback to direct method call
        console.log('[CACHE-STATUS] Calling cacheManager.manualUpload()...');
        const result = await window.cacheManager.manualUpload();
        console.log('[CACHE-STATUS] ✅ Manual upload completed (manualUpload), result:', result);
        setTimeout(updateCacheStatus, 1000);
      } else {
        console.warn('[CACHE-STATUS] ⚠️ No upload method available on cacheManager');
        console.log('[CACHE-STATUS] Available methods:', Object.keys(window.cacheManager || {}));
      }
    } catch (error) {
      console.error('[CACHE-STATUS] ❌ Manual upload failed:', error);
      console.error('[CACHE-STATUS] Error details:', error.message, error.stack);
    }
  };

  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined) return 'Calculating...';
    if (minutes <= 0) return 'Ready';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === 'Never') return 'Never';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Never';
      return date.toLocaleString();
    } catch {
      return 'Never';
    }
  };

  // Show cache status if enabled (even in browser mode for development)
  if (!cacheStatus.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact View */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
            transition-all duration-200 hover:shadow-xl
            ${cacheStatus.isUploading 
              ? 'bg-blue-500 text-white animate-pulse' 
              : cacheStatus.pendingChanges > 0
                ? 'bg-yellow-500 text-white'
                : 'bg-green-500 text-white'
            }
          `}
        >
          {cacheStatus.isUploading ? (
            <Upload className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          
          <span className="font-medium">
            {cacheStatus.pendingChanges} pending
          </span>
          
          {cacheStatus.isUploading && (
            <span className="text-xs">Uploading...</span>
          )}
        </button>
      )}

      {/* Expanded View */}
      {expanded && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-80 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Cache Status
              </h3>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Upload Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Upload Status
                </span>
                {cacheStatus.isUploading ? (
                  <span className="flex items-center gap-1 text-blue-500 text-sm">
                    <Upload className="w-4 h-4 animate-spin" />
                    Uploading
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Ready
                  </span>
                )}
              </div>

              {/* Pending Changes */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Changes
                </span>
                <span className={`
                  text-sm font-medium
                  ${cacheStatus.pendingChanges > 100 ? 'text-red-500' : 
                    cacheStatus.pendingChanges > 50 ? 'text-yellow-500' : 
                    'text-green-500'}
                `}>
                  {cacheStatus.pendingChanges}
                </span>
              </div>

              {/* Buffer Size */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Buffer Size
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {cacheStatus.bufferSize}
                </span>
              </div>
            </div>

            {/* Next Upload */}
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Next Upload</span>
              </div>
              
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {cacheStatus.timeUntilUpload 
                  ? formatTime(cacheStatus.timeUntilUpload)
                  : 'Calculating...'}
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatDateTime(cacheStatus.nextUpload)}
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {cacheStatus.totalChanges}
                </div>
              </div>
              
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Success</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {cacheStatus.successfulUploads}
                </div>
              </div>
              
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {cacheStatus.failedUploads}
                </div>
              </div>
            </div>

            {/* Last Upload */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last upload: {formatDateTime(cacheStatus.lastUpload)}
            </div>

            {/* Manual Upload Button */}
            <button
              onClick={handleManualUpload}
              disabled={cacheStatus.isUploading || cacheStatus.pendingChanges === 0}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                transition-colors duration-200 font-medium
                ${cacheStatus.isUploading || cacheStatus.pendingChanges === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
              `}
            >
              <Upload className="w-4 h-4" />
              {cacheStatus.isUploading 
                ? 'Uploading...' 
                : 'Upload Now'}
            </button>

            {/* Info */}
            <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-600 dark:text-gray-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
              <span>
                {cacheStatus.browserMode 
                  ? 'Browser mode: Changes saved to IndexedDB only. File system sync unavailable.'
                  : 'Changes are saved instantly to cache and uploaded to backend every 8 hours automatically.'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheStatusIndicator;
