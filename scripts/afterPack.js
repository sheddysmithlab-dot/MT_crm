// Post-packaging script for Malwa CRM
// Handles file operations after Electron packaging

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  console.log('🔧 Post-pack processing for Malwa CRM...');
  
  const { electronPlatformName, appOutDir } = context;
  
  try {
    // Create additional directories in the package
    const resourcesPath = path.join(appOutDir, 'resources');
    
    // Ensure resources directory exists
    if (!fs.existsSync(resourcesPath)) {
      fs.mkdirSync(resourcesPath, { recursive: true });
    }
    
    // Copy additional files
    const buildPath = path.join(__dirname, '..', 'build');
    const readmePath = path.join(buildPath, 'README.txt');
    
    if (fs.existsSync(readmePath)) {
      fs.copyFileSync(readmePath, path.join(appOutDir, 'README.txt'));
      console.log('✅ README.txt copied to package');
    }
    
    // Set file permissions for Windows
    if (electronPlatformName === 'win32') {
      console.log('🔐 Setting Windows file permissions...');
      // Additional Windows-specific post-processing can be added here
    }
    
    console.log('✅ Post-pack processing completed successfully');
    
  } catch (error) {
    console.error('❌ Post-pack processing failed:', error);
    throw error;
  }
};