import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, HardDrive, FolderOpen, FileText, Settings } from 'lucide-react';
import windowsInstallationManager from '@/utils/windowsInstallationManager';

const InstallationStatusIndicator = ({ onComplete }) => {
  const [installationStatus, setInstallationStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkInstallationStatus();
  }, []);

  const checkInstallationStatus = async () => {
    try {
      setIsChecking(true);
      const status = await windowsInstallationManager.getInstallationStatus();
      setInstallationStatus(status);
      
      // Auto-complete after 3 seconds if installation is complete
      if (status.installed && status.complete) {
        setTimeout(() => {
          onComplete?.(true);
        }, 3000);
      } else if (status.installed) {
        // Partial installation - complete after 5 seconds
        setTimeout(() => {
          onComplete?.(true);
        }, 5000);
      } else {
        // Not installed or has errors - let user proceed after 8 seconds
        setTimeout(() => {
          onComplete?.(false);
        }, 8000);
      }
      
    } catch (error) {
      console.error('Failed to check installation status:', error);
      setInstallationStatus({ installed: false, error: error.message });
      setTimeout(() => {
        onComplete?.(false);
      }, 5000);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = () => {
    if (!installationStatus) return 'text-gray-500';
    if (installationStatus.error) return 'text-red-500';
    if (installationStatus.installed && installationStatus.complete) return 'text-green-500';
    if (installationStatus.installed) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getStatusIcon = () => {
    if (isChecking) return <Settings className="w-6 h-6 animate-spin" />;
    if (!installationStatus) return <AlertCircle className="w-6 h-6" />;
    if (installationStatus.error) return <AlertCircle className="w-6 h-6" />;
    if (installationStatus.installed && installationStatus.complete) return <CheckCircle className="w-6 h-6" />;
    if (installationStatus.installed) return <AlertCircle className="w-6 h-6" />;
    return <HardDrive className="w-6 h-6" />;
  };

  const getStatusMessage = () => {
    if (isChecking) return 'Checking Windows installation...';
    if (!installationStatus) return 'Unable to check installation status';
    if (installationStatus.error) return `Installation check failed: ${installationStatus.error}`;
    if (installationStatus.installed && installationStatus.complete) {
      return 'Installation complete - All files and folders ready';
    }
    if (installationStatus.installed) {
      return 'Partial installation detected - Some files may be missing';
    }
    return 'Fresh installation required';
  };

  const getProgressPercentage = () => {
    if (!installationStatus || !installationStatus.installed) return 0;
    
    const folderProgress = installationStatus.folders ? 
      (installationStatus.folders.existing / installationStatus.folders.required) * 50 : 0;
    const fileProgress = installationStatus.files ? 
      (installationStatus.files.existing / installationStatus.files.required) * 50 : 0;
    
    return Math.round(folderProgress + fileProgress);
  };

  if (!isChecking && (!installationStatus || !window.electron)) {
    return null; // Don't show in browser mode or if check failed silently
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Windows Installation
                </p>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </button>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {getStatusMessage()}
              </p>
              
              {installationStatus && installationStatus.installed && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Progress</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressPercentage()}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-1.5 rounded-full ${
                        getProgressPercentage() === 100 
                          ? 'bg-green-500' 
                          : getProgressPercentage() > 50 
                            ? 'bg-yellow-500' 
                            : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              )}
              
              <AnimatePresence>
                {showDetails && installationStatus && installationStatus.installed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <FolderOpen className="w-3 h-3" />
                          <span>Folders</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {installationStatus.folders?.existing || 0}/{installationStatus.folders?.required || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>Files</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {installationStatus.files?.existing || 0}/{installationStatus.files?.required || 0}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 break-all">
                        📁 {installationStatus.path}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallationStatusIndicator;