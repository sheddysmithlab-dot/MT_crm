import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useSettingsStore from '@/store/settingsStore';
import offlineDB from '@/utils/offlineDatabase';
import enhancedDbOperations from '@/utils/enhancedDbOperations';
import { Database, Download, Upload, FolderOpen, Save, RefreshCw, HardDrive, CheckCircle, XCircle, Clock, Folder } from 'lucide-react';
import { toast } from 'sonner';

const BackupSettingsTab = () => {
  const { backupSettings, updateBackupSettings } = useSettingsStore();
  const [settings, setSettings] = useState(backupSettings);
  const [backupStatus, setBackupStatus] = useState({});
  const [backupFiles, setBackupFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupPath, setBackupPath] = useState('C:/malwa-crm/Data_base/');
  const [syncInfo, setSyncInfo] = useState(null);

  useEffect(() => {
    loadBackupInfo();
    loadStatistics();
    loadSyncInfo();
  }, []);

  const loadSyncInfo = async () => {
    try {
      if (enhancedDbOperations?.sync?.isAvailable?.()) {
        const info = await enhancedDbOperations.sync.getInfo();
        setSyncInfo(info);
        
        // Update backup path from sync info
        if (info.customDbPath) {
          setBackupPath(info.customDbPath);
        }
      }
    } catch (error) {
      console.error('Error loading sync info:', error);
    }
  };

  const loadBackupInfo = async () => {
    // Get backup path
    if (window.electron && window.electron.fs) {
      const result = await window.electron.fs.getBackupPath();
      if (result.success) {
        setBackupPath(result.path);
      }

      // List backup files
      const filesResult = await window.electron.fs.listFiles();
      if (filesResult.success) {
        setBackupFiles(filesResult.files);
      }
    }
  };

  const loadStatistics = async () => {
    try {
      await offlineDB.initializeAll();
      const statistics = await offlineDB.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleSave = () => {
    updateBackupSettings(settings);
    toast.success('Backup settings saved successfully!');
  };

  const handleBackupSingleModule = async (moduleName) => {
    try {
      toast.loading(`Backing up ${moduleName}...`, { id: moduleName });

      const result = await offlineDB.backupDatabase(moduleName);

      if (result.success) {
        toast.success(`${moduleName} backed up successfully!`, { id: moduleName });
        setBackupStatus(prev => ({ ...prev, [moduleName]: 'success' }));
        await loadBackupInfo();
      } else {
        toast.error(`Failed to backup ${moduleName}: ${result.error}`, { id: moduleName });
        setBackupStatus(prev => ({ ...prev, [moduleName]: 'failed' }));
      }
    } catch (error) {
      toast.error(`Error backing up ${moduleName}: ${error.message}`, { id: moduleName });
      setBackupStatus(prev => ({ ...prev, [moduleName]: 'failed' }));
    }
  };

  const handleBackupAll = async () => {
    if (isBackingUp) return;

    setIsBackingUp(true);
    toast.loading('Starting full backup...', { id: 'full-backup' });

    try {
      await offlineDB.initializeAll();
      const results = await offlineDB.backupAllDatabases();

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;

      if (successCount === totalCount) {
        toast.success(`✅ All ${totalCount} databases backed up successfully!`, { id: 'full-backup' });
        updateBackupSettings({ ...settings, lastBackupDate: new Date().toISOString() });
      } else {
        toast.warning(`⚠️ Backup completed with errors: ${successCount}/${totalCount} succeeded`, { id: 'full-backup' });
      }

      setBackupStatus(results);
      await loadBackupInfo();
    } catch (error) {
      toast.error(`❌ Backup failed: ${error.message}`, { id: 'full-backup' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreSingleModule = async (moduleName) => {
    if (!window.confirm(`Restore ${moduleName} database? This will overwrite existing data.`)) {
      return;
    }

    try {
      toast.loading(`Restoring ${moduleName}...`, { id: `restore-${moduleName}` });

      const result = await offlineDB.restoreDatabase(moduleName);

      if (result.success) {
        toast.success(`${moduleName} restored successfully!`, { id: `restore-${moduleName}` });
        await loadStatistics();
      } else {
        toast.error(`Failed to restore ${moduleName}: ${result.error}`, { id: `restore-${moduleName}` });
      }
    } catch (error) {
      toast.error(`Error restoring ${moduleName}: ${error.message}`, { id: `restore-${moduleName}` });
    }
  };

  const handleRestoreAll = async () => {
    if (!window.confirm('⚠️ RESTORE ALL DATABASES?\n\nThis will overwrite ALL existing data with backup files. This action cannot be undone!\n\nAre you absolutely sure?')) {
      return;
    }

    setIsRestoring(true);
    toast.loading('Restoring all databases...', { id: 'full-restore' });

    try {
      await offlineDB.initializeAll();
      const results = await offlineDB.restoreAllDatabases();

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;

      if (successCount === totalCount) {
        toast.success(`✅ All ${totalCount} databases restored successfully!`, { id: 'full-restore' });
      } else {
        toast.warning(`⚠️ Restore completed with errors: ${successCount}/${totalCount} succeeded`, { id: 'full-restore' });
      }

      await loadStatistics();
      await loadBackupInfo();
    } catch (error) {
      toast.error(`❌ Restore failed: ${error.message}`, { id: 'full-restore' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenBackupFolder = async () => {
    if (window.electron && window.electron.fs) {
      const result = await window.electron.fs.openBackupFolder();
      if (result.success) {
        toast.success('Backup folder opened');
      } else {
        toast.error('Failed to open backup folder');
      }
    } else {
      toast.info('File system access only available in desktop app');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const moduleNames = [
    'customers', 'sales', 'inventory', 'jobs',
    'employees', 'vendors', 'ledger', 'reports',
    'settings', 'system'
  ];

  return (
    <div className="space-y-6">
      {/* File System Sync Status */}
      {enhancedDbOperations?.sync?.isAvailable?.() && (
        <Card className="p-6 border-green-200 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <HardDrive className="text-green-600" size={24} />
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                  File System Sync Active
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Data is automatically saved to: C:/malwa-crm/Data_base/
                </p>
              </div>
            </div>
            <Button
              onClick={async () => {
                try {
                  await enhancedDbOperations.sync.backup();
                  toast.success('Manual backup completed!');
                } catch (error) {
                  toast.error('Backup failed: ' + error.message);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download size={16} className="mr-2" />
              Force Backup
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-green-700 dark:text-green-300">Auto-sync enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-green-500" size={16} />
              <span className="text-green-700 dark:text-green-300">Saves every 30 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <Folder className="text-green-500" size={16} />
              <span className="text-green-700 dark:text-green-300">Persistent storage</span>
            </div>
          </div>
        </Card>
      )}

      {/* Traditional Backup Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold">Manual Backup Configuration</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={20} className="text-blue-600" />
              <h4 className="font-semibold">Backup Location</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">{backupPath}</p>
            <p className="text-xs text-gray-500 mt-1">All databases are automatically saved as JSON files in this folder</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Auto Backup Frequency</label>
            <select
              value={settings.autoBackup}
              onChange={(e) => setSettings({ ...settings, autoBackup: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Manual</option>
            </select>
          </div>

          {settings.lastBackupDate && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium">Last Full Backup:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(settings.lastBackupDate)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <RefreshCw className="text-green-600" size={24} />
          <h3 className="text-xl font-bold">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={handleBackupAll}
            disabled={isBackingUp}
            className="bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Download size={18} />
            {isBackingUp ? 'Backing Up...' : 'Backup All Databases'}
          </Button>

          <Button
            onClick={handleRestoreAll}
            disabled={isRestoring}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {isRestoring ? 'Restoring...' : 'Restore All Databases'}
          </Button>

          <Button
            onClick={handleOpenBackupFolder}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Folder size={18} />
            Open Backup Folder
          </Button>

          <Button
            onClick={loadBackupInfo}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh Status
          </Button>
        </div>
      </Card>

      {/* Database Statistics */}
      {stats && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-purple-600" size={24} />
            <h3 className="text-xl font-bold">Database Statistics</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats).map(([moduleName, moduleStats]) => {
              const totalRecords = Object.values(moduleStats.stores).reduce((sum, store) => sum + store.count, 0);
              const totalSize = Object.values(moduleStats.stores).reduce((sum, store) => sum + store.size, 0);

              return (
                <div key={moduleName} className="p-4 border rounded-lg dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold capitalize">{moduleName}</h4>
                    {backupStatus[moduleName] === 'success' && (
                      <CheckCircle size={18} className="text-green-600" />
                    )}
                    {backupStatus[moduleName] === 'failed' && (
                      <XCircle size={18} className="text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {totalRecords} records
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(totalSize)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleBackupSingleModule(moduleName)}
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Backup
                    </Button>
                    <Button
                      onClick={() => handleRestoreSingleModule(moduleName)}
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Backup Files */}
      {backupFiles.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <FolderOpen className="text-orange-600" size={24} />
            <h3 className="text-xl font-bold">Backup Files ({backupFiles.length})</h3>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {backupFiles.map((file, index) => (
              <div key={index} className="p-3 border rounded-lg dark:border-gray-700 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.name}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                    <span>Size: {formatBytes(file.size)}</span>
                    <span>Modified: {formatDate(file.modified)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (window.electron && window.electron.fs && window.confirm(`Delete ${file.name}?`)) {
                      const result = await window.electron.fs.deleteFile(file.name);
                      if (result.success) {
                        toast.success('File deleted');
                        await loadBackupInfo();
                      }
                    }
                  }}
                  className="text-red-600"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          <Save size={18} /> Save Settings
        </Button>
      </div>
    </div>
  );
};

export default BackupSettingsTab;

