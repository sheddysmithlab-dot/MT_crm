/**
 * Unified Admin Management Utility for Malwa CRM
 * Creates, manages and auto-initializes admin users
 * Combines: adminSetup.js + autoAdminInitializer.js + resetAdmin.js
 */

import { dbOperations } from '@/lib/db';
import { authService } from '@/lib/auth';

class AdminSetup {
  constructor() {
    this.defaultAdmin = {
      email: 'Shahidmultaniii',
      password: 'S#d_8224',
      name: 'Sheddy Smith',
      role: 'Super Admin',
      permissions: ['*']
    };
    this.initialized = false;
    
    // Auto-initialization disabled to prevent async errors
    // this.autoInitialize();
  }

  // Check if admin exists
  async checkAdminExists() {
    try {
      const users = await dbOperations.getByIndex('users', 'email', this.defaultAdmin.email);
      return users.length > 0;
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  }

  // Create admin user
  async createAdmin() {
    try {
      console.log('🔄 Creating Super Admin...');
      
      const result = await authService.signUp({
        email: this.defaultAdmin.email,
        password: this.defaultAdmin.password,
        name: this.defaultAdmin.name,
        role: this.defaultAdmin.role
      });

      if (result.error) {
        console.error('❌ Failed to create admin:', result.error);
        return false;
      }

      console.log('✅ Super Admin created successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error creating admin:', error);
      return false;
    }
  }

  // Reset admin (clear and recreate)
  async resetAdmin() {
    try {
      console.log('🔄 Resetting admin user...');
      
      // Clear existing users
      await dbOperations.clear('users');
      await dbOperations.clear('profiles');
      
      console.log('✅ Cleared existing users');
      
      // Create fresh admin
      const success = await this.createAdmin();
      
      if (success) {
        console.log('🎉 Admin reset complete!');
        console.log('📧 Email/Username:', this.defaultAdmin.email);
        console.log('🔑 Password:', this.defaultAdmin.password);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error resetting admin:', error);
      return false;
    }
  }

  // Initialize admin if not exists
  async initializeAdmin() {
    try {
      const adminExists = await this.checkAdminExists();
      
      if (!adminExists) {
        console.log('⚠️ Admin not found, creating...');
        return await this.createAdmin();
      } else {
        console.log('✅ Admin already exists');
        return true;
      }
    } catch (error) {
      console.error('❌ Error initializing admin:', error);
      return false;
    }
  }

  // Test login with admin credentials
  async testAdminLogin() {
    try {
      console.log('🔍 Testing admin login...');
      
      const result = await authService.signIn({
        email: this.defaultAdmin.email,
        password: this.defaultAdmin.password
      });

      if (result.error) {
        console.error('❌ Login test failed:', result.error.message);
        return false;
      }

      console.log('✅ Login test successful!');
      console.log('👤 User:', result.user);
      console.log('📋 Profile:', result.profile);
      return true;
    } catch (error) {
      console.error('❌ Login test error:', error);
      return false;
    }
  }

  // Get all users for debugging
  async getAllUsers() {
    try {
      const users = await dbOperations.getAll('users');
      const profiles = await dbOperations.getAll('profiles');
      
      console.log('👥 All Users:', users);
      console.log('📋 All Profiles:', profiles);
      
      return { users, profiles };
    } catch (error) {
      console.error('❌ Error getting users:', error);
      return { users: [], profiles: [] };
    }
  }

  // Complete setup with debugging
  async completeSetup() {
    try {
      console.log('🚀 Starting complete admin setup...');
      
      // Step 1: Check current state
      console.log('\n📊 Step 1: Checking current state...');
      await this.getAllUsers();
      
      // Step 2: Initialize admin
      console.log('\n👤 Step 2: Initializing admin...');
      await this.initializeAdmin();
      
      // Step 3: Test login
      console.log('\n🔍 Step 3: Testing login...');
      const loginSuccess = await this.testAdminLogin();
      
      // Step 4: Final state check
      console.log('\n📊 Step 4: Final state check...');
      await this.getAllUsers();
      
      if (loginSuccess) {
        console.log('\n🎉 Setup completed successfully!');
        console.log('You can now login with:');
        console.log('📧 Username:', this.defaultAdmin.email);
        console.log('🔑 Password:', this.defaultAdmin.password);
      } else {
        console.log('\n❌ Setup completed but login test failed');
      }
      
      return loginSuccess;
    } catch (error) {
      console.error('❌ Complete setup failed:', error);
      return false;
    }
  }

  // Auto-initialize admin on startup (from autoAdminInitializer)
  async autoInitialize() {
    if (this.initialized) return true;
    
    try {
      // Small delay to ensure DB is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔄 Auto-initializing admin user...');
      
      // Check if any users exist
      const allUsers = await dbOperations.getAll('users');
      console.log('Current user count:', allUsers.length);
      
      if (allUsers.length === 0) {
        console.log('🆕 No users found, creating admin user...');
        await this.createAdmin();
      } else {
        // Check if our specific admin exists
        const adminExists = allUsers.some(user => user.email === this.defaultAdmin.email);
        if (!adminExists) {
          console.log('🔧 Admin user not found, creating...');
          await this.createAdmin();
        } else {
          console.log('✅ Admin user already exists');
        }
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Auto admin initialization failed:', error);
      return false;
    }
  }

  // Legacy reset function (from resetAdmin.js)
  async resetSuperAdmin() {
    return await this.resetAdmin();
  }
}

// Create singleton instance
const adminSetup = new AdminSetup();

// Expose methods to window for console access
window.adminSetup = {
  check: () => adminSetup.checkAdminExists(),
  create: () => adminSetup.createAdmin(),
  reset: () => adminSetup.resetAdmin(),
  test: () => adminSetup.testAdminLogin(),
  users: () => adminSetup.getAllUsers(),
  setup: () => adminSetup.completeSetup(),
  force: () => adminSetup.forceCreateAdmin(),
  credentials: () => adminSetup.getCredentials(),
  // Legacy support
  resetSuperAdmin: () => adminSetup.resetSuperAdmin()
};

// Also expose legacy functions for backward compatibility
window.resetSuperAdmin = () => adminSetup.resetSuperAdmin();
window.autoAdmin = {
  init: () => adminSetup.autoInitialize(),
  create: () => adminSetup.createAdmin(),
  force: () => adminSetup.forceCreateAdmin(),
  test: () => adminSetup.testAdminLogin(),
  credentials: () => adminSetup.getCredentials()
};

console.log('🔧 Admin Setup Utility loaded!');
console.log('Available commands:');
console.log('  • window.adminSetup.check() - Check if admin exists');
console.log('  • window.adminSetup.create() - Create admin user');
console.log('  • window.adminSetup.reset() - Reset admin user');
console.log('  • window.adminSetup.test() - Test admin login');
console.log('  • window.adminSetup.users() - Show all users');
console.log('  • window.adminSetup.setup() - Complete setup');

export default adminSetup;