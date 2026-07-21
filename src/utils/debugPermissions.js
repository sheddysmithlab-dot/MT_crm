/**
 * Permission Debugging Utility
 * Run this in browser console to debug permission issues
 */

export const debugUserPermissions = async (userId) => {
  console.log('🔍 ===== PERMISSION DEBUG START =====');
  console.log('User ID:', userId);
  
  try {
    // Import dependencies
    const { dbOperations } = await import('@/lib/db.js');
    const { ROLE_PRESETS } = await import('./permissionCatalog.js');
    
    // Get profile
    console.log('\n📋 Step 1: Fetching Profile...');
    const profile = await dbOperations.getById('profiles', userId);
    
    if (!profile) {
      console.error('❌ Profile not found for userId:', userId);
      return;
    }
    
    console.log('✅ Profile found:', {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status
    });
    
    // Check permissions in profile
    console.log('\n🔐 Step 2: Checking Profile Permissions...');
    console.log('Permissions field type:', typeof profile.permissions);
    console.log('Is array:', Array.isArray(profile.permissions));
    console.log('Permissions value:', profile.permissions);
    
    // Check role preset
    console.log('\n👥 Step 3: Checking Role Preset...');
    console.log('User role:', profile.role);
    console.log('Available roles:', Object.keys(ROLE_PRESETS));
    
    const rolePreset = ROLE_PRESETS[profile.role];
    if (rolePreset) {
      console.log('✅ Role preset found:', rolePreset.label);
      console.log('Description:', rolePreset.description);
      console.log('Permissions count:', rolePreset.permissions.length);
      console.log('First 10 permissions:', rolePreset.permissions.slice(0, 10));
    } else {
      console.error('❌ Role preset NOT found for role:', profile.role);
    }
    
    // Final permission resolution
    console.log('\n✨ Step 4: Final Permission Resolution...');
    let finalPermissions = [];
    
    if (profile.permissions && Array.isArray(profile.permissions)) {
      finalPermissions = profile.permissions;
      console.log('✅ Using permissions from profile array');
    } else if (rolePreset) {
      finalPermissions = rolePreset.permissions;
      console.log('✅ Using permissions from role preset');
    } else {
      console.warn('⚠️ No permissions found - will use empty array');
    }
    
    console.log('\n📊 FINAL RESULT:');
    console.log('Total permissions:', finalPermissions.length);
    console.log('Has DASHBOARD_VIEW:', finalPermissions.includes('DASHBOARD_VIEW'));
    console.log('Has JOBS_VIEW:', finalPermissions.includes('JOBS_VIEW'));
    console.log('Has CUSTOMER_VIEW:', finalPermissions.includes('CUSTOMER_VIEW'));
    console.log('Has SETTINGS_VIEW:', finalPermissions.includes('SETTINGS_VIEW'));
    console.log('All permissions:', finalPermissions);
    
    console.log('\n🔍 ===== PERMISSION DEBUG END =====');
    return {
      profile,
      rolePreset,
      finalPermissions
    };
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    console.error('Stack:', error.stack);
  }
};

// Make it available globally for console access
if (typeof window !== 'undefined') {
  window.debugUserPermissions = debugUserPermissions;
}

export default debugUserPermissions;
