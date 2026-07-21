/**
 * Path Configuration Tester Component
 * Tests and displays all configured paths
 */

import React, { useState, useEffect } from 'react';
import pathManager from '../utils/pathManager';

const PathTester = () => {
  const [paths, setPaths] = useState({});
  const [isElectron, setIsElectron] = useState(false);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    const testPaths = async () => {
      // Wait for initialization
      await pathManager.waitForInitialization();
      
      // Get all paths
      const allPaths = pathManager.getAllPaths();
      setPaths(allPaths);
      setIsElectron(allPaths.isElectron);

      // Test directory creation if in Electron
      if (allPaths.isElectron) {
        const results = [];
        
        const testDirs = [
          { name: 'Main Data Path', path: allPaths.customDataPath },
          { name: 'Database Path', path: allPaths.databasePath },
          { name: 'Backup Path', path: allPaths.backupPath },
          { name: 'Exports Path', path: allPaths.exportsPath },
          { name: 'Logs Path', path: allPaths.logsPath }
        ];

        for (const testDir of testDirs) {
          try {
            const result = await pathManager.ensureDirectory(testDir.path);
            results.push({
              name: testDir.name,
              path: testDir.path,
              success: result,
              status: result ? '✅ Created/Verified' : '❌ Failed'
            });
          } catch (error) {
            results.push({
              name: testDir.name,
              path: testDir.path,
              success: false,
              status: `❌ Error: ${error.message}`
            });
          }
        }

        setTestResults(results);
      }
    };

    testPaths();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📁 Path Configuration Test
      </h3>

      {/* Environment Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Environment</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Platform:</span> {isElectron ? 'Electron Desktop' : 'Web Browser'}
          </div>
          <div>
            <span className="font-medium">Initialized:</span> {paths.initialized ? '✅ Yes' : '❌ No'}
          </div>
        </div>
      </div>

      {/* Configured Paths */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Configured Paths</h4>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex">
            <span className="w-32 text-gray-600">Data Path:</span>
            <span className="text-blue-600">{paths.customDataPath || 'Not set'}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Database:</span>
            <span className="text-blue-600">{paths.databasePath || 'Not set'}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Backups:</span>
            <span className="text-blue-600">{paths.backupPath || 'Not set'}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Exports:</span>
            <span className="text-blue-600">{paths.exportsPath || 'Not set'}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Logs:</span>
            <span className="text-blue-600">{paths.logsPath || 'Not set'}</span>
          </div>
        </div>
      </div>

      {/* Test Results (Electron only) */}
      {isElectron && testResults.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Directory Creation Tests</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">Directory</th>
                  <th className="text-left py-2 font-medium text-gray-700">Path</th>
                  <th className="text-left py-2 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{result.name}</td>
                    <td className="py-2 font-mono text-xs text-gray-600">
                      {result.path}
                    </td>
                    <td className="py-2">{result.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Web Environment Notice */}
      {!isElectron && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <h5 className="font-medium text-yellow-800">Web Environment Detected</h5>
              <p className="text-yellow-700 text-sm mt-1">
                Directory creation and file system operations are only available in the Electron desktop version.
                Data will be stored in browser IndexedDB.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isElectron && testResults.every(r => r.success) && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-600 mr-2">✅</div>
            <div>
              <h5 className="font-medium text-green-800">All Paths Configured Successfully!</h5>
              <p className="text-green-700 text-sm mt-1">
                Your Malwa CRM is ready to use with custom data directory at C:/malwa-crm/
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathTester;