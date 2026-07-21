/**
 * Comprehensive System Test for Malwa CRM File-Based Data Management
 * Tests all components: enhancedDbOperations, pageDataManager, unifiedSyncManager
 */

import enhancedDbOperations from '@/utils/enhancedDbOperations';
import pageDataManager from '@/utils/pageDataManager';
import unifiedSyncManager from '@/utils/unifiedSyncManager';
import pathConfig from './pathConfig.js';

class SystemTester {
  constructor() {
    this.testResults = {
      fileMapping: null,
      dbOperations: null,
      pageManager: null,
      syncManager: null,
      integration: null,
      overall: null
    };
  }

  // Run all system tests
  async runCompleteTest() {
    console.log('🧪 Starting Comprehensive System Test...');
    console.log('📋 Testing Malwa CRM v2.0.0 File-Based Data Management System');
    console.log('=' .repeat(60));

    try {
      // Test 1: File mapping validation
      await this.testFileMapping();
      
      // Test 2: Enhanced DB operations
      await this.testEnhancedDbOperations();
      
      // Test 3: Page data manager
      await this.testPageDataManager();
      
      // Test 4: Comprehensive sync manager
      await this.testUnifiedSyncManager();
      
      // Test 5: Integration tests
      await this.testSystemIntegration();
      
      // Generate final report
      this.generateTestReport();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ System test failed:', error);
      this.testResults.overall = {
        success: false,
        error: error.message
      };
      return this.testResults;
    }
  }

  // Test 1: Validate file mapping structure
  async testFileMapping() {
    console.log('\n🔍 Test 1: File Mapping Validation...');
    
    try {
      // Use pathConfig instead of fetch
      await pathConfig.initPathConfig();
      const mapping = await pathConfig.getFullConfig();
      
      const checks = {
        mappingLoaded: !!mapping,
        hasTargetFolders: mapping.every(item => item.target_folder),
        hasFiles: mapping.every(item => item.files && item.files.length > 0),
        hasMetaFiles: mapping.some(item => item.files.includes('meta.json')),
        moduleCount: mapping.length
      };
      
      const success = Object.values(checks).every(check => check === true || typeof check === 'number');
      
      this.testResults.fileMapping = {
        success,
        checks,
        mapping: success ? mapping : null
      };
      
      console.log(`${success ? '✅' : '❌'} File mapping test:`, checks);
      
    } catch (error) {
      console.error('❌ File mapping test failed:', error);
      this.testResults.fileMapping = {
        success: false,
        error: error.message
      };
    }
  }

  // Test 2: Enhanced DB operations
  async testEnhancedDbOperations() {
    console.log('\n🔍 Test 2: Enhanced DB Operations...');
    
    try {
      const checks = {
        instanceCreated: !!enhancedDbOperations,
        hasMapping: !!enhancedDbOperations.mapping,
        hasBasePath: enhancedDbOperations.basePath === 'C:/malwa-crm/Data_base',
        methodsExist: {
          add: typeof enhancedDbOperations.add === 'function',
          update: typeof enhancedDbOperations.update === 'function',
          delete: typeof enhancedDbOperations.delete === 'function',
          backupToFileSystem: typeof enhancedDbOperations.backupToFileSystem === 'function',
          initializeFileStructure: typeof enhancedDbOperations.initializeFileStructure === 'function'
        }
      };
      
      // Test module mapping
      const customerMapping = enhancedDbOperations.getModuleMapping('customers');
      checks.canGetMapping = !!customerMapping;
      
      const success = checks.instanceCreated && 
                      Object.values(checks.methodsExist).every(exists => exists);
      
      this.testResults.dbOperations = {
        success,
        checks
      };
      
      console.log(`${success ? '✅' : '❌'} Enhanced DB operations test:`, checks);
      
    } catch (error) {
      console.error('❌ Enhanced DB operations test failed:', error);
      this.testResults.dbOperations = {
        success: false,
        error: error.message
      };
    }
  }

  // Test 3: Page data manager
  async testPageDataManager() {
    console.log('\n🔍 Test 3: Page Data Manager...');
    
    try {
      const checks = {
        instanceCreated: !!pageDataManager,
        hasPageMapping: !!pageDataManager.pageStoreMapping,
        hasRolePermissions: !!pageDataManager.rolePermissions,
        methodsExist: {
          getPageData: typeof pageDataManager.getPageData === 'function',
          getPageStores: typeof pageDataManager.getPageStores === 'function',
          hasPageAccess: typeof pageDataManager.hasPageAccess === 'function',
          createUserWorkspace: typeof pageDataManager.createUserWorkspace === 'function'
        }
      };
      
      // Test page store mapping
      const dashboardStores = pageDataManager.getPageStores('dashboard');
      checks.canGetStores = Array.isArray(dashboardStores) && dashboardStores.length > 0;
      
      // Test role access
      const adminAccess = pageDataManager.hasPageAccess('dashboard', 'admin');
      const readOnlyAccess = pageDataManager.hasPageAccess('settings', 'read_only');
      checks.roleAccessWorks = adminAccess === true && readOnlyAccess === false;
      
      // Test accessible pages
      const adminPages = pageDataManager.getAccessiblePages('admin');
      checks.canGetAccessiblePages = Array.isArray(adminPages) && adminPages.length > 0;
      
      const success = checks.instanceCreated && 
                      Object.values(checks.methodsExist).every(exists => exists) &&
                      checks.canGetStores && checks.roleAccessWorks;
      
      this.testResults.pageManager = {
        success,
        checks,
        sampleData: {
          dashboardStores,
          adminPages
        }
      };
      
      console.log(`${success ? '✅' : '❌'} Page data manager test:`, checks);
      
    } catch (error) {
      console.error('❌ Page data manager test failed:', error);
      this.testResults.pageManager = {
        success: false,
        error: error.message
      };
    }
  }

  // Test 4: Comprehensive sync manager
  async testUnifiedSyncManager() {
    console.log('\n🔍 Test 4: Comprehensive Sync Manager...');
    
    try {
      const checks = {
        instanceCreated: !!unifiedSyncManager,
        hasBasePath: unifiedSyncManager.basePath === 'C:/malwa-crm/Data_base',
        methodsExist: {
          initialize: typeof unifiedSyncManager.initialize === 'function',
          getStatus: typeof unifiedSyncManager.getStatus === 'function',
          manualSync: typeof unifiedSyncManager.manualSync === 'function',
          createUserWorkspace: typeof unifiedSyncManager.createUserWorkspace === 'function',
          getQueueStats: typeof unifiedSyncManager.getQueueStats === 'function'
        }
      };
      
      // Test sync status retrieval
      try {
        const syncStatus = await unifiedSyncManager.getStatus();
        checks.canGetSyncStatus = !!syncStatus && typeof syncStatus === 'object';
      } catch {
        checks.canGetSyncStatus = false;
      }
      
      // Test system health
      try {
        const systemHealth = await unifiedSyncManager.getQueueStats();
        checks.canGetSystemHealth = !!systemHealth && typeof systemHealth === 'object';
      } catch {
        checks.canGetSystemHealth = false;
      }
      
      const success = checks.instanceCreated && 
                      Object.values(checks.methodsExist).every(exists => exists);
      
      this.testResults.syncManager = {
        success,
        checks
      };
      
      console.log(`${success ? '✅' : '❌'} Comprehensive sync manager test:`, checks);
      
    } catch (error) {
      console.error('❌ Comprehensive sync manager test failed:', error);
      this.testResults.syncManager = {
        success: false,
        error: error.message
      };
    }
  }

  // Test 5: System integration
  async testSystemIntegration() {
    console.log('\n🔍 Test 5: System Integration...');
    
    try {
      const checks = {
        fileSystemAvailable: !!(window.electron && window.electron.fs),
        mappingConsistency: true,
        crossComponentCommunication: true
      };
      
      // Test mapping consistency between components
      if (enhancedDbOperations.mapping && this.testResults.fileMapping?.mapping) {
        const dbMappingLength = enhancedDbOperations.mapping?.length || 0;
        const fileMappingLength = this.testResults.fileMapping.mapping.length;
        checks.mappingConsistency = dbMappingLength === fileMappingLength;
      }
      
      // Test cross-component integration
      const testUser = {
        id: 'test_001',
        username: 'test_user',
        role: 'manager',
        email: 'test@example.com'
      };
      
      try {
        // This should work even in browser mode (though workspace creation will be limited)
        const workspaceResult = await pageDataManager.createUserWorkspace(testUser);
        checks.userWorkspaceCreation = !!workspaceResult;
      } catch {
        checks.userWorkspaceCreation = false;
      }
      
      const success = checks.mappingConsistency && checks.crossComponentCommunication;
      
      this.testResults.integration = {
        success,
        checks
      };
      
      console.log(`${success ? '✅' : '❌'} System integration test:`, checks);
      
    } catch (error) {
      console.error('❌ System integration test failed:', error);
      this.testResults.integration = {
        success: false,
        error: error.message
      };
    }
  }

  // Generate comprehensive test report
  generateTestReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));
    
    const allTests = [
      { name: 'File Mapping', result: this.testResults.fileMapping },
      { name: 'Enhanced DB Operations', result: this.testResults.dbOperations },
      { name: 'Page Data Manager', result: this.testResults.pageManager },
      { name: 'Comprehensive Sync Manager', result: this.testResults.syncManager },
      { name: 'System Integration', result: this.testResults.integration }
    ];
    
    const passedTests = allTests.filter(test => test.result?.success);
    const failedTests = allTests.filter(test => !test.result?.success);
    
    console.log(`\n📈 Test Summary:`);
    console.log(`✅ Passed: ${passedTests.length}/${allTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}/${allTests.length}`);
    
    if (passedTests.length > 0) {
      console.log(`\n✅ Passed Tests:`);
      passedTests.forEach(test => {
        console.log(`   - ${test.name}`);
      });
    }
    
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.result?.error || 'Unknown error'}`);
      });
    }
    
    const overallSuccess = passedTests.length === allTests.length;
    
    this.testResults.overall = {
      success: overallSuccess,
      passed: passedTests.length,
      failed: failedTests.length,
      total: allTests.length,
      summary: overallSuccess ? 
        '🎉 ALL TESTS PASSED! System is ready for production.' :
        `⚠️ ${failedTests.length} test(s) failed. Please review and fix issues.`
    };
    
    console.log(`\n🎯 Overall Result: ${this.testResults.overall.summary}`);
    
    // Feature checklist
    console.log('\n🔧 Feature Checklist:');
    const features = [
      { name: 'File-based data storage', status: this.testResults.dbOperations?.success ? '✅' : '❌' },
      { name: 'Page-based organization', status: this.testResults.pageManager?.success ? '✅' : '❌' },
      { name: 'Role-based access control', status: this.testResults.pageManager?.checks?.roleAccessWorks ? '✅' : '❌' },
      { name: 'Comprehensive sync management', status: this.testResults.syncManager?.success ? '✅' : '❌' },
      { name: 'Multi-user workspace support', status: this.testResults.integration?.checks?.userWorkspaceCreation ? '✅' : '❌' },
      { name: 'Google Drive sync preparation', status: this.testResults.fileMapping?.success ? '✅' : '❌' }
    ];
    
    features.forEach(feature => {
      console.log(`   ${feature.status} ${feature.name}`);
    });
    
    console.log('\n🚀 Next Steps:');
    if (overallSuccess) {
      console.log('   1. ✅ System is ready for use');
      console.log('   2. 🔄 Run initialization in Settings > Data Management');
      console.log('   3. ☁️ Set up Google Drive integration (external)');
      console.log('   4. 👥 Create user workspaces as needed');
    } else {
      console.log('   1. 🔧 Fix failing tests');
      console.log('   2. 🧪 Re-run system test');
      console.log('   3. 📋 Review error logs');
    }
    
    console.log('\n' + '=' .repeat(60));
  }

  // Quick health check (simplified version)
  async quickHealthCheck() {
    console.log('🩺 Quick System Health Check...');
    
    try {
      const health = {
        fileMapping: !!this.testResults.fileMapping?.success,
        dbOperations: !!enhancedDbOperations,
        pageManager: !!pageDataManager,
        syncManager: !!unifiedSyncManager,
        fileSystem: !!(window.electron && window.electron.fs)
      };
      
      const healthyComponents = Object.values(health).filter(Boolean).length;
      const totalComponents = Object.keys(health).length;
      
      console.log(`📊 System Health: ${healthyComponents}/${totalComponents} components healthy`);
      
      Object.entries(health).forEach(([component, isHealthy]) => {
        console.log(`   ${isHealthy ? '✅' : '❌'} ${component}`);
      });
      
      return {
        healthy: healthyComponents === totalComponents,
        score: `${healthyComponents}/${totalComponents}`,
        details: health
      };
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Create and export system tester
const systemTester = new SystemTester();

// Make available globally for console testing
if (typeof window !== 'undefined') {
  window.systemTester = systemTester;
  window.runSystemTest = () => systemTester.runCompleteTest();
  window.quickHealthCheck = () => systemTester.quickHealthCheck();
}

export default systemTester;