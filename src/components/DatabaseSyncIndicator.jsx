import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import enhancedDbOperations from '@/utils/enhancedDbOperations';

const DatabaseSyncIndicator = ({ className = '' }) => {
  const [syncStatus, setSyncStatus] = useState({ active: false, lastSync: null });
  const [syncInfo, setSyncInfo] = useState(null);

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        if (enhancedDbOperations?.sync?.isAvailable?.()) {
          const info = await enhancedDbOperations.sync.getInfo();
          setSyncInfo(info);
          setSyncStatus({
            active: true,
            lastSync: info.lastSyncTime
          });
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
      }
    };

    checkSyncStatus();
    
    // Check sync status every minute
    const interval = setInterval(checkSyncStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (!enhancedDbOperations?.sync?.isAvailable?.()) {
    return null; // Don't show indicator if not in Electron
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {syncStatus.active ? (
        <>
          <div className="flex items-center gap-1">
            <HardDrive className="w-4 h-4 text-green-500" />
            <CheckCircle className="w-3 h-3 text-green-500" />
          </div>
          <span className="text-green-600 dark:text-green-400 text-xs">
            File Sync Active
          </span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <HardDrive className="w-4 h-4 text-orange-500" />
            <AlertCircle className="w-3 h-3 text-orange-500" />
          </div>
          <span className="text-orange-600 dark:text-orange-400 text-xs">
            File Sync Disabled
          </span>
        </>
      )}
    </div>
  );
};

export default DatabaseSyncIndicator;