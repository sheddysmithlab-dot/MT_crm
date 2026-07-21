/**
 * Admin Setup Component
 * UI for setting up and testing admin credentials
 */

import React, { useState } from 'react';
import { UserPlus, CheckCircle, XCircle, RefreshCw, User, Key, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import adminSetup from '../utils/adminSetup';

const AdminSetupComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState({
    adminExists: null,
    loginTest: null,
    userCount: 0
  });

  const handleCompleteSetup = async () => {
    setIsLoading(true);
    try {
      toast.info('🔄 Setting up admin user...', { duration: 2000 });
      
      const success = await adminSetup.setup();
      
      if (success) {
        toast.success('✅ Admin setup completed successfully!', { duration: 4000 });
        setSetupStatus(prev => ({ ...prev, adminExists: true, loginTest: true }));
      } else {
        toast.error('❌ Admin setup failed', { duration: 4000 });
        setSetupStatus(prev => ({ ...prev, adminExists: false, loginTest: false }));
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('❌ Setup error: ' + error.message, { duration: 4000 });
    }
    setIsLoading(false);
  };

  const handleResetAdmin = async () => {
    setIsLoading(true);
    try {
      toast.info('🔄 Resetting admin user...', { duration: 2000 });
      
      const success = await adminSetup.reset();
      
      if (success) {
        toast.success('✅ Admin reset completed!', { duration: 4000 });
        setSetupStatus(prev => ({ ...prev, adminExists: true, loginTest: null }));
      } else {
        toast.error('❌ Admin reset failed', { duration: 4000 });
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('❌ Reset error: ' + error.message, { duration: 4000 });
    }
    setIsLoading(false);
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      toast.info('🔍 Testing admin login...', { duration: 2000 });
      
      const success = await adminSetup.test();
      
      if (success) {
        toast.success('✅ Login test successful!', { duration: 4000 });
        setSetupStatus(prev => ({ ...prev, loginTest: true }));
      } else {
        toast.error('❌ Login test failed', { duration: 4000 });
        setSetupStatus(prev => ({ ...prev, loginTest: false }));
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('❌ Test error: ' + error.message, { duration: 4000 });
    }
    setIsLoading(false);
  };

  const handleCheckStatus = async () => {
    setIsLoading(true);
    try {
      const adminExists = await adminSetup.check();
      const { users } = await adminSetup.users();
      
      setSetupStatus({
        adminExists,
        loginTest: null,
        userCount: users.length
      });
      
      toast.success(`Status updated: ${users.length} users found`, { duration: 2000 });
    } catch (error) {
      console.error('Status check error:', error);
      toast.error('❌ Status check failed', { duration: 2000 });
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <UserPlus className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Admin Setup</h3>
          <p className="text-sm text-gray-600">Setup and test admin credentials</p>
        </div>
      </div>

      {/* Credentials Display */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Default Admin Credentials:</h4>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">Username:</span>
            <span className="font-semibold text-blue-800">Shahidmultaniii</span>
          </div>
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">Password:</span>
            <span className="font-semibold text-blue-800">S#d_8224</span>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Admin Exists:</span>
          {setupStatus.adminExists === true && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Yes</span>
            </div>
          )}
          {setupStatus.adminExists === false && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">No</span>
            </div>
          )}
          {setupStatus.adminExists === null && (
            <span className="text-sm text-gray-500">Unknown</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Login Test:</span>
          {setupStatus.loginTest === true && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Passed</span>
            </div>
          )}
          {setupStatus.loginTest === false && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Failed</span>
            </div>
          )}
          {setupStatus.loginTest === null && (
            <span className="text-sm text-gray-500">Not tested</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Total Users:</span>
          <span className="text-sm text-blue-600 font-medium">{setupStatus.userCount}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCompleteSetup}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Complete Setup
        </button>

        <button
          onClick={handleResetAdmin}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Reset Admin
        </button>

        <button
          onClick={handleTestLogin}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="h-4 w-4" />
          )}
          Test Login
        </button>

        <button
          onClick={handleCheckStatus}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Check Status
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h5 className="font-medium text-yellow-800 mb-1">Instructions:</h5>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. Click "Complete Setup" to create admin user</li>
          <li>2. Click "Test Login" to verify credentials work</li>
          <li>3. If login fails, click "Reset Admin" to recreate</li>
          <li>4. Use "Check Status" to see current state</li>
        </ol>
      </div>
    </div>
  );
};

export default AdminSetupComponent;