/**
 * Data Management Settings Tab
 * Shows file system status and sync controls based on indexeddb_file_mapping.json
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, FolderOpen, Cloud, Settings, CheckCircle, AlertTriangle, 
  RefreshCw, Download, Upload, Users, HardDrive, Activity 
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import unifiedSyncManager from '@/utils/unifiedSyncManager';
import pageDataManager from '@/utils/pageDataManager';
import enhancedDbOperations from '@/utils/enhancedDbOperations';

const DataManagementTab = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load initial status
  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      setLoading(true);
      
      // Get sync status
      const status = await unifiedSyncManager.getStatus();
      setSyncStatus(status);
      
      // Get system health
      const health = await unifiedSyncManager.getQueueStats();
      setSystemHealth(health);
      
      setLastUpdate(new Date().toISOString());
      
    } catch (error) {
      console.error('Failed to load system status:', error);
      toast.error('Failed to load system status');
    } finally {
      setLoading(false);
    }
  };

  const initializeSystem = async () => {
    try {
      setLoading(true);
      toast.loading('Initializing file system structure...');
      
      const result = await unifiedSyncManager.initialize();
      
      if (result.success) {
        toast.success('System initialized successfully!');
        await loadSystemStatus();
      } else {
        toast.error('System initialization failed: ' + (result.error || 'Unknown error'));
      }
      
    } catch (error) {
      console.error('Initialization failed:', error);
      toast.error('Initialization failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const performFullSync = async () => {
    try {
      setLoading(true);
      toast.loading('Performing full data sync...');
      
      const result = await unifiedSyncManager.manualSync();
      
      if (result) {
        toast.success('Full sync completed successfully!');
        await loadSystemStatus();
      } else {
        toast.error('Full sync failed');
      }
      
    } catch (error) {
      console.error('Full sync failed:', error);
      toast.error('Full sync failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = async () => {
    try {
      setLoading(true);
      toast.loading('Exporting all data...');
      
      const result = await unifiedSyncManager.manualBackup();
      
      if (result.success) {
        toast.success(`Data exported successfully! ${result.total_records} records exported.`);
      } else {
        toast.error('Data export failed: ' + result.error);
      }
      
    } catch (error) {
      console.error('Data export failed:', error);
      toast.error('Data export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'pass':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'needs_attention':
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'pass':
      case 'healthy':
        return 'text-green-600';
      case 'needs_attention':
      case 'partial':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            File system integration and sync management based on page structure
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={loadSystemStatus}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemHealth.overall)}
              <h3 className="text-lg font-semibold">System Health</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemHealth.overall)} bg-white dark:bg-gray-800`}>
              {systemHealth.overall}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">File System</p>
                <p className={`text-xs ${getStatusColor(systemHealth.checks.file_system)}`}>
                  {systemHealth.checks.file_system}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Database className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Page System</p>
                <p className={`text-xs ${getStatusColor(systemHealth.checks.page_system)}`}>
                  {systemHealth.checks.page_system}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Sync System</p>
                <p className={`text-xs ${getStatusColor(systemHealth.checks.sync_system)}`}>
                  {systemHealth.checks.sync_system}
                </p>
              </div>
            </div>
          </div>

          {systemHealth.recommendations && systemHealth.recommendations.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Recommendations:</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {systemHealth.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* File System Status */}
      {syncStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File System Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FolderOpen className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold">File System Status</h3>
              {getStatusIcon(syncStatus.file_system?.available ? 'pass' : 'fail')}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`text-sm font-medium ${syncStatus.file_system?.available ? 'text-green-600' : 'text-red-600'}`}>
                  {syncStatus.file_system?.available ? 'Available' : 'Not Available'}
                </span>
              </div>
              
              {syncStatus.file_system?.modules && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Modules:</span>
                    <span className="text-sm font-medium">
                      {Object.keys(syncStatus.file_system.modules).length}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Module Status:</p>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {Object.entries(syncStatus.file_system.modules).map(([module, info]) => (
                        <div key={module} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <span>{module}</span>
                          {getStatusIcon(info.exists ? 'pass' : 'fail')}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Page System Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold">Page System Status</h3>
              {getStatusIcon(syncStatus.page_system?.available ? 'pass' : 'fail')}
            </div>

            <div className="space-y-3">
              {syncStatus.page_system?.page_mapping && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Pages:</span>
                    <span className="text-sm font-medium">
                      {syncStatus.page_system.page_mapping.total_pages}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Main Pages:</span>
                    <span className="text-sm font-medium">
                      {syncStatus.page_system.page_mapping.main_pages}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mapped Stores:</span>
                    <span className="text-sm font-medium">
                      {syncStatus.page_system.page_mapping.mapped_stores}
                    </span>
                  </div>
                </>
              )}
              
              {syncStatus.last_sync && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Sync:</span>
                  <span className="text-sm font-medium">
                    {new Date(syncStatus.last_sync).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* System Information */}
      {syncStatus?.system_info && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-gray-500" />
            <h3 className="text-lg font-semibold">System Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Database className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">v4.0</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">CRM Version</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <FolderOpen className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {syncStatus.file_system?.available ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">File System</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Cloud className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">Ready</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Google Drive</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Users className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">Multi</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">User Support</p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Management Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={initializeSystem}
            disabled={loading || (syncStatus?.file_system?.available && syncStatus?.overall_status === 'active')}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Settings className="w-4 h-4" />
            Initialize System
          </Button>
          
          <Button
            onClick={performFullSync}
            disabled={loading || !syncStatus?.file_system?.available}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Full Sync
          </Button>
          
          <Button
            onClick={exportAllData}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          
          <Button
            onClick={async () => {
              try {
                setLoading(true);
                toast.loading('Testing Electron file system...');
                
                // Test if we're in Electron
                if (window.electron?.fs || window.electron?.ensureDirectory) {
                  toast.success('🎉 Electron detected! File system available.');
                  
                  // Test file operations
                  const testPath = 'C:/malwa-crm/Test';
                  const testResult = await window.electron.ensureDirectory(testPath);
                  
                  if (testResult.success) {
                    toast.success('✅ File system test passed!');
                    
                    // Test our system initialization
                    const result = await initializeSystem();
                    console.log('System test result:', result);
                  } else {
                    toast.error('❌ File system test failed: ' + testResult.error);
                  }
                } else {
                  toast.error('❌ Not running in Electron environment');
                }
              } catch (error) {
                toast.error('Test failed: ' + error.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Cloud className="w-4 h-4" />
            Test Electron
          </Button>
        </div>
      </Card>

      {/* Status Footer */}
      {lastUpdate && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date(lastUpdate).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default DataManagementTab;
