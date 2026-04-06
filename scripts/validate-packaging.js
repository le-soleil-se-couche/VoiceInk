#!/usr/bin/env node

/**
 * Packaging Validation Script
 * 
 * Validates electron-builder configuration and required resources
 * before building installers for macOS, Windows, and Linux.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const ELECTRON_BUILDER_CONFIG = path.join(ROOT_DIR, 'electron-builder.json');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description, required = true) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description}: ${path.relative(ROOT_DIR, filePath)}`, 'green');
    return true;
  } else {
    if (required) {
      log(`✗ ${description}: Missing ${path.relative(ROOT_DIR, filePath)}`, 'red');
    } else {
      log(`⚠ ${description}: Optional ${path.relative(ROOT_DIR, filePath)}`, 'yellow');
    }
    return required ? false : true;
  }
}

function validateElectronBuilderConfig() {
  log('\n📦 Validating electron-builder configuration...', 'cyan');
  
  if (!fs.existsSync(ELECTRON_BUILDER_CONFIG)) {
    log('✗ electron-builder.json not found', 'red');
    return false;
  }
  
  const config = JSON.parse(fs.readFileSync(ELECTRON_BUILDER_CONFIG, 'utf8'));
  let valid = true;
  
  // Check required fields
  if (!config.appId) {
    log('✗ Missing appId in electron-builder.json', 'red');
    valid = false;
  } else {
    log(`✓ appId: ${config.appId}`, 'green');
  }
  
  if (!config.productName) {
    log('✗ Missing productName in electron-builder.json', 'red');
    valid = false;
  } else {
    log(`✓ productName: ${config.productName}`, 'green');
  }
  
  // Check platform configurations
  if (!config.mac) {
    log('✗ Missing mac configuration', 'red');
    valid = false;
  } else {
    log('✓ macOS configuration present', 'green');
    if (config.mac.target) {
      log(`  Targets: ${config.mac.target.join(', ')}`, 'blue');
    }
  }
  
  if (!config.win) {
    log('✗ Missing win configuration', 'red');
    valid = false;
  } else {
    log('✓ Windows configuration present', 'green');
    if (config.win.target) {
      log(`  Targets: ${config.win.target.join(', ')}`, 'blue');
    }
  }
  
  if (!config.linux) {
    log('✗ Missing linux configuration', 'red');
    valid = false;
  } else {
    log('✓ Linux configuration present', 'green');
    if (config.linux.target) {
      log(`  Targets: ${config.linux.target.join(', ')}`, 'blue');
    }
  }
  
  return valid;
}

function validateMacResources() {
  log('\n🍎 Validating macOS resources...', 'cyan');
  let valid = true;
  
  // Check entitlements
  const entitlementsPath = path.join(ROOT_DIR, 'resources/mac/entitlements.mac.plist');
  if (!checkFileExists(entitlementsPath, 'macOS entitlements')) {
    valid = false;
  }
  
  // Check icon
  const iconPath = path.join(ROOT_DIR, 'src/assets/icon.icns');
  if (!checkFileExists(iconPath, 'macOS icon')) {
    valid = false;
  }
  
  // Check native binaries (optional - built during compile step)
  const macBinaries = [
    'resources/bin/macos-globe-listener',
    'resources/bin/macos-fast-paste',
    'resources/bin/macos-text-monitor',
  ];
  
  macBinaries.forEach(bin => {
    checkFileExists(path.join(ROOT_DIR, bin), `macOS binary: ${bin}`, false);
  });
  
  return valid;
}

function validateWindowsResources() {
  log('\n🪟 Validating Windows resources...', 'cyan');
  let valid = true;
  
  // Check icon
  const iconPath = path.join(ROOT_DIR, 'src/assets/icon.ico');
  if (!checkFileExists(iconPath, 'Windows icon')) {
    valid = false;
  }
  
  // Check NSIS script
  const nsisScript = path.join(ROOT_DIR, 'resources/nsis/cleanup-models.nsh');
  if (!checkFileExists(nsisScript, 'NSIS cleanup script')) {
    valid = false;
  }
  
  // Check Windows binaries (optional - built during compile step)
  const winBinaries = [
    'resources/bin/windows-key-listener.exe',
    'resources/bin/windows-text-monitor.exe',
    'resources/bin/windows-fast-paste.exe',
  ];
  
  winBinaries.forEach(bin => {
    checkFileExists(path.join(ROOT_DIR, bin), `Windows binary: ${bin}`, false);
  });
  
  // Check NirCmd (optional)
  const nircmdPath = path.join(ROOT_DIR, 'resources/bin/nircmd.exe');
  checkFileExists(nircmdPath, 'NirCmd', false);
  
  return valid;
}

function validateLinuxResources() {
  log('\n🐧 Validating Linux resources...', 'cyan');
  let valid = true;
  
  // Check icon
  const iconPath = path.join(ROOT_DIR, 'src/assets/icon.png');
  if (!checkFileExists(iconPath, 'Linux icon')) {
    valid = false;
  }
  
  // Check after-remove script
  const afterRemoveScript = path.join(ROOT_DIR, 'resources/linux/after-remove.sh');
  if (!checkFileExists(afterRemoveScript, 'Linux after-remove script')) {
    valid = false;
  }
  
  // Check Linux binaries (optional - built during compile step)
  const linuxBinaries = [
    'resources/bin/linux-fast-paste',
    'resources/bin/linux-text-monitor',
  ];
  
  linuxBinaries.forEach(bin => {
    checkFileExists(path.join(ROOT_DIR, bin), `Linux binary: ${bin}`, false);
  });
  
  return valid;
}

function validatePackageJsonScripts() {
  log('\n📜 Validating package.json build scripts...', 'cyan');
  
  if (!fs.existsSync(PACKAGE_JSON)) {
    log('✗ package.json not found', 'red');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  let valid = true;
  
  const requiredScripts = [
    'build:mac',
    'build:win',
    'build:linux',
    'build:linux:appimage',
    'build:linux:deb',
    'build:linux:rpm',
    'build:linux:tar',
  ];
  
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      log(`✓ Script present: ${script}`, 'green');
    } else {
      log(`✗ Script missing: ${script}`, 'red');
      valid = false;
    }
  });
  
  return valid;
}

function validateCriticalFiles() {
  log('\n📄 Validating critical application files...', 'cyan');
  let valid = true;
  
  const criticalFiles = [
    'main.js',
    'preload.js',
  ];
  
  criticalFiles.forEach(file => {
    if (!checkFileExists(path.join(ROOT_DIR, file), file)) {
      valid = false;
    }
  });
  
  // src/dist is built, so just check src exists
  if (!fs.existsSync(path.join(ROOT_DIR, 'src'))) {
    log('✗ src directory not found', 'red');
    valid = false;
  } else {
    log('✓ src directory present', 'green');
  }
  
  return valid;
}

function main() {
  log('🔍 VoiceInk Packaging Validation', 'cyan');
  log('='.repeat(50), 'cyan');
  
  const results = [
    validateElectronBuilderConfig(),
    validateMacResources(),
    validateWindowsResources(),
    validateLinuxResources(),
    validatePackageJsonScripts(),
    validateCriticalFiles(),
  ];
  
  log('\n' + '='.repeat(50), 'cyan');
  
  const allValid = results.every(r => r);
  
  if (allValid) {
    log('✅ All packaging validations passed!', 'green');
    log('\nYou can now run: npm run build:mac, npm run build:win, or npm run build:linux', 'blue');
    process.exit(0);
  } else {
    log('❌ Some packaging validations failed.', 'red');
    log('Please fix the issues above before building installers.', 'yellow');
    process.exit(1);
  }
}

main();
