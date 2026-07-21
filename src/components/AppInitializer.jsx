/**
 * App Initialization Component
 * Ensures all paths and directories are properly configured
 */

import React, { useEffect, useState } from 'react';
import pathManager from '../utils/pathManager';

const AppInitializer = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initStatus, setInitStatus] = useState('Initializing...');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setInitStatus('⚙️ Configuring paths...');
        
        // Wait for path manager to initialize
        await pathManager.waitForInitialization();
        
        setInitStatus('📁 Creating directories...');
        
        // Initialize directory structure
        await pathManager.initializeDirectoryStructure();
        
        setInitStatus('✅ Initialization complete!');
        
        // Show paths in console
        console.log('🚀 Malwa CRM Initialized with paths:', pathManager.getAllPaths());
        
        setTimeout(() => {
          setIsInitialized(true);
        }, 500);
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setInitStatus('❌ Initialization failed');
        
        // Still allow app to continue in case of non-critical errors
        setTimeout(() => {
          setIsInitialized(true);
        }, 2000);
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Malwa CRM
          </h2>
          <p className="text-gray-600">
            {initStatus}
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Setting up data directories...
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AppInitializer;