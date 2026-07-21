// Post-build script for Malwa CRM installer
// Handles operations after all artifacts are built

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  console.log('🏗️ Post-build processing for Malwa CRM installer...');
  
  const { outDir, artifactPaths } = context;
  
  try {
    console.log('📦 Built artifacts:');
    
    // Log all built artifacts
    artifactPaths.forEach(artifactPath => {
      const fileName = path.basename(artifactPath);
      const fileSize = fs.statSync(artifactPath).size;
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      
      console.log(`  ✅ ${fileName} (${fileSizeMB} MB)`);
    });
    
    // Create build summary
    const buildSummary = {
      buildTime: new Date().toISOString(),
      artifacts: artifactPaths.map(artifactPath => ({
        name: path.basename(artifactPath),
        path: artifactPath,
        size: fs.statSync(artifactPath).size,
        sizeMB: (fs.statSync(artifactPath).size / (1024 * 1024)).toFixed(2)
      })),
      totalArtifacts: artifactPaths.length,
      outputDirectory: outDir
    };
    
    // Write build summary
    const summaryPath = path.join(outDir, 'build-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(buildSummary, null, 2));
    
    // Create installer info file
    const installerInfo = `# Malwa CRM Installer Information

## Build Details
- **Build Date**: ${new Date().toLocaleString()}
- **Version**: 2.0.0
- **Total Installers**: ${artifactPaths.length}

## Available Installers

${buildSummary.artifacts.map(artifact => 
  `- **${artifact.name}**: ${artifact.sizeMB} MB`
).join('\n')}

## Installation Instructions

1. **Full Installer (NSIS)**: 
   - Download: \`Malwa-CRM-Setup-2.0.0-x64.exe\`
   - Provides complete installation with start menu and desktop shortcuts
   - Requires administrator privileges for system-wide installation

2. **Portable Version**:
   - Download: \`Malwa-CRM-Portable-2.0.0-x64.exe\`
   - No installation required - run directly
   - Perfect for USB drives or temporary use

3. **Archive Version**:
   - Download: \`Malwa-CRM-2.0.0-x64.zip\`
   - Extract and run - minimal setup
   - Good for manual deployment

## System Requirements
- Windows 7 or later
- 4GB RAM (8GB recommended)
- 500MB disk space
- 1280x720 display resolution

## Support
- Email: malwatrolley@gmail.com
- Website: https://malwatrolley.com

---
*Built with Electron Builder - Professional Windows Deployment*
`;
    
    fs.writeFileSync(path.join(outDir, 'INSTALLER-INFO.md'), installerInfo);
    
    console.log('✅ Build summary and installer info created');
    console.log(`📂 Output directory: ${outDir}`);
    console.log('🎉 All installer artifacts ready for distribution!');
    
  } catch (error) {
    console.error('❌ Post-build processing failed:', error);
    throw error;
  }
};