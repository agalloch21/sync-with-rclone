#!/usr/bin/env node
/**
 * Platform-specific build script
 * Only includes the relevant rclone binary for the target platform
 * Automatically downloads missing binaries
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Map pkg targets to binary names and download URLs
const TARGET_TO_BINARY = {
  'node18-win-x64': {
    name: 'rclone-windows-amd64.exe',
    url: 'https://downloads.rclone.org/rclone-current-windows-amd64.zip',
    extractPath: 'rclone-*-windows-amd64/rclone.exe',
    finalName: 'rclone-windows-amd64.exe'
  },
  'node18-macos-x64': {
    name: 'rclone-osx-amd64',
    url: 'https://downloads.rclone.org/rclone-current-osx-amd64.zip',
    extractPath: 'rclone-*-osx-amd64/rclone',
    finalName: 'rclone-osx-amd64'
  },
  'node18-macos-arm64': {
    name: 'rclone-osx-arm64',
    url: 'https://downloads.rclone.org/rclone-current-osx-arm64.zip',
    extractPath: 'rclone-*-osx-arm64/rclone',
    finalName: 'rclone-osx-arm64'
  },
  'node18-linux-x64': {
    name: 'rclone-linux-amd64',
    url: 'https://downloads.rclone.org/rclone-current-linux-amd64.zip',
    extractPath: 'rclone-*-linux-amd64/rclone',
    finalName: 'rclone-linux-amd64'
  }
};

// Binaries directory (using resources/binaries for better organization)
const BINARIES_DIR = path.join('resources', 'binaries');

/**
 * Download a file
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * Extract binary from zip file
 */
function extractBinary(zipPath, extractPattern, outputPath, isExecutable = false) {
  try {
    // Try using unzip (Unix) or PowerShell (Windows)
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: Use PowerShell to extract
      const tempDir = path.join(path.dirname(zipPath), 'temp_extract');
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Extract using PowerShell Expand-Archive
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'ignore' });
      
      // Find the extracted file (handle wildcard pattern)
      const files = fs.readdirSync(tempDir, { recursive: true });
      const matchPattern = extractPattern.replace(/\*/g, '.*').replace(/\//g, path.sep);
      const regex = new RegExp(matchPattern);
      
      for (const file of files) {
        const fullPath = path.join(tempDir, file);
        if (fs.statSync(fullPath).isFile() && regex.test(file.replace(/\\/g, '/'))) {
          fs.copyFileSync(fullPath, outputPath);
          break;
        }
      }
      
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    } else {
      // Unix: Use unzip
      const tempDir = path.join(path.dirname(zipPath), 'temp_extract');
      fs.mkdirSync(tempDir, { recursive: true });
      
      execSync(`unzip -q -j "${zipPath}" "${extractPattern}" -d "${tempDir}"`, { stdio: 'ignore' });
      
      // Find extracted file
      const files = fs.readdirSync(tempDir);
      if (files.length > 0) {
        fs.copyFileSync(path.join(tempDir, files[0]), outputPath);
      }
      
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      if (isExecutable) {
        fs.chmodSync(outputPath, 0o755);
      }
    }
    
    // Remove zip file
    fs.unlinkSync(zipPath);
    return true;
  } catch (error) {
    console.error(`Error extracting binary: ${error.message}`);
    return false;
  }
}

/**
 * Download and extract binary for a specific target
 */
async function downloadBinary(target) {
  const binaryInfo = TARGET_TO_BINARY[target];
  if (!binaryInfo) {
    throw new Error(`Unknown target: ${target}`);
  }
  
  const binaryPath = path.join(BINARIES_DIR, binaryInfo.finalName);
  const zipPath = path.join(BINARIES_DIR, `${binaryInfo.finalName}.zip`);
  
  // Create binaries directory
  fs.mkdirSync(BINARIES_DIR, { recursive: true });
  
  console.log(`Downloading ${binaryInfo.finalName}...`);
  console.log(`URL: ${binaryInfo.url}`);
  
  try {
    // Download zip file
    await downloadFile(binaryInfo.url, zipPath);
    console.log(`Downloaded: ${zipPath}`);
    
    // Extract binary
    console.log(`Extracting binary...`);
    const isExecutable = process.platform !== 'win32';
    const success = extractBinary(zipPath, binaryInfo.extractPath, binaryPath, isExecutable);
    
    if (!success) {
      throw new Error('Failed to extract binary from zip');
    }
    
    console.log(`✅ Binary downloaded and extracted: ${binaryPath}`);
    return binaryPath;
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    throw error;
  }
}

// Get target from command line arguments
const target = process.argv[2];
const outputPath = process.argv[3] || 'dist';

if (!target) {
  console.error('Usage: node scripts/build/build-platform.js <target> [output-path]');
  console.error('Example: node scripts/build/build-platform.js node18-win-x64 dist');
  console.error('\nAvailable targets:');
  Object.keys(TARGET_TO_BINARY).forEach(t => console.error(`  - ${t}`));
  process.exit(1);
}

if (!TARGET_TO_BINARY[target]) {
  console.error(`Error: Unknown target: ${target}`);
  console.error('Available targets:', Object.keys(TARGET_TO_BINARY).join(', '));
  process.exit(1);
}

const binaryInfo = TARGET_TO_BINARY[target];
const binaryPath = path.join(BINARIES_DIR, binaryInfo.finalName);

// Main execution function
async function main() {
  // Check if binary exists, download if missing
  if (!fs.existsSync(binaryPath)) {
    console.log(`Binary not found: ${binaryPath}`);
    console.log('Attempting to download...\n');
    
    try {
      await downloadBinary(target);
    } catch (error) {
      console.error(`\n❌ Failed to download binary: ${error.message}`);
      console.error('\nYou can manually download it using:');
      console.error(`  npm run download-binaries`);
      console.error(`Or visit: ${binaryInfo.url}`);
      process.exit(1);
    }
  }

  // Read package.json (keep original bytes so we can restore exactly and avoid git diffs)
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const originalPackageJsonString = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(originalPackageJsonString);

  // Create platform-specific assets array
  const platformAssets = [
    binaryPath,
    'src/processors/**/*.js',
    'package.json'
  ];

  // Temporarily modify package.json (in-memory)
  const originalAssets = packageJson.pkg.assets;
  packageJson.pkg.assets = platformAssets;

  // Write modified package.json for this build only
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`\nBuilding for ${target}...`);
  console.log(`Including binary: ${binaryPath}`);
  console.log(`Output: ${outputPath}\n`);

  try {
    // Determine output filename
    let outputFile;
    if (target.includes('win')) {
      outputFile = path.join(outputPath, 'sync-with-remote-win.exe');
    } else if (target.includes('macos')) {
      const arch = target.includes('arm64') ? 'arm64' : 'amd64';
      outputFile = path.join(outputPath, `sync-with-remote-macos-${arch}`);
    } else {
      outputFile = path.join(outputPath, 'sync-with-remote-linux');
    }
    
    // Build with pkg
    const pkgCommand = `pkg . --targets ${target} --output ${outputFile}`;
    console.log(`Running: ${pkgCommand}`);
    execSync(pkgCommand, { stdio: 'inherit' });
    
    console.log(`\n✅ Build completed successfully!`);
    console.log(`Binary included: ${binaryInfo.finalName}`);
    
    // Get output file size
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`Output file: ${outputFile}`);
      console.log(`File size: ${sizeMB} MB`);
      
      // Compare with old size (if we had all binaries)
      const binarySize = fs.statSync(binaryPath).size;
      const savedMB = ((binarySize * 3) / (1024 * 1024)).toFixed(2); // Approximate savings
      console.log(`Estimated size reduction: ~${savedMB} MB (by excluding other platform binaries)`);
    }
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  } finally {
    // Restore original package.json bytes exactly to avoid any git noise
    // (including whitespace / key order changes across platforms)
    try {
      fs.writeFileSync(packageJsonPath, originalPackageJsonString);
      console.log('\nRestored package.json');
    } catch (restoreError) {
      console.error('\nWarning: failed to restore original package.json:', restoreError.message);
    }
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
