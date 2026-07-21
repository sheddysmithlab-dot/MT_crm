import { useState, useEffect } from 'react';
import unifiedSyncManager from '@/utils/unifiedSyncManager';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Note: unifiedSyncManager doesn't have subscribe method - using native events only
    // const unsubscribe = unifiedSyncManager.subscribe((online) => {
    //   setIsOnline(online);
    // });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // unsubscribe();
    };
  }, []);

  return isOnline;
};

export default useOfflineStatus;
