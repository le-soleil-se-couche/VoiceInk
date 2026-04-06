#!/usr/bin/env node
/**
 * Validate cross-platform packaging readiness for VoiceInk
 * 
 * This script checks that all required resources, binaries, and configuration
 * files are present for macOS, Windows, and Linux builds.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ELECTRON_BUILDER_CONFIG = path.join(ROOT, 'electron-builder.json');

let exitCode = 0;

function log(message, type = 'info') {
  const prefix = {
    info: 'i',
    warn: '!',
    error: 'x',
    success: '+'
  }[type] || 'i';
  
  const color = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m'
  }[type] || '';
  
  const reset = '\x1b[0m';
  console.log(prefix + ' ' + message + reset);
}

function checkFile(filePath, description, required = true) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (!exists && required) {
    log('Missing ' + description + ': ' + filePath, 'error');
    exitCode = 1;
    return false;
  } else if (!exists) {
    log('Optional file not found: ' + filePath, 'warn');
    return false;
  } else {
    log('Found ' + description + ': ' + filePath, 'success');
    return true;
  }
}

function validateConfig() {
  log('\nValidating electron-builder configuration...', 'info');
  
  if (!fs.existsSync(ELECTRON_BUILDER_CONFIG)) {
    log('electron-builder.json not found', 'error');
    exitCode = 1;
    return null;
  }
  
  const config = JSON.parse(fs.readFileSync(ELECTRON_BUILDER_CONFIG, 'utf8'));
  log('Configuration loaded successfully', 'success');
  return config;
}

function validateMacOS(config) {
  log('\nValidating macOS packaging...', 'info');
  
  const macConfig = config.mac || {};
  const targets = macConfig.target || [];
  
  log('Targets: ' + targets.join(', '), 'info');
  
  if (macConfig.icon) {
    checkFile(macConfig.icon, 'macOS icon');
  }
  
  if (macConfig.entitlements) {
    checkFile(macConfig.entitlements, 'macOS entitlements');
  }
  
  if (macConfig.entitlementsInherit) {
    checkFile(macConfig.entitlementsInherit, 'macOS inherit entitlements');
  }
  
  const nativeBins = [
    'resources/bin/macos-globe-listener',
    'resources/bin/macos-fast-paste',
    'resources/bin/macos-text-monitor'
  ];
  
  nativeBins.forEach(bin => {
    checkFile(bin, 'macOS binary ' + path.basename(bin));
  });
  
  const extendInfo = macConfig.extendInfo || {};
  if (extendInfo.NSMicrophoneUsageDescription) {
    log('Microphone usage description present', 'success');
  } else {
    log('Missing NSMicrophoneUsageDescription', 'warn');
  }
  
  if (extendInfo.NSAccessibilityUsageDescription) {
    log('Accessibility usage description present', 'success');
  } else {
    log('Missing NSAccessibilityUsageDescription', 'warn');
  }
}

function validateWindows(config) {
  log('\nValidating Windows packaging...', 'info');
  
  const winConfig = config.win || {};
  const targets = winConfig.target || [];
  
  log('Targets: ' + targets.join(', '), 'info');
  
  if (winConfig.icon) {
    checkFile(winConfig.icon, 'Windows icon');
  }
  
  if (targets.includes('nsis')) {
    const nsisConfig = config.nsis || {};
    if (nsisConfig.include) {
      checkFile(nsisConfig.include, 'NSIS include script');
    }
  }
  
  const nativeBins = [
    'resources/bin/windows-key-listener',
    'resources/bin/windows-text-monitor',
    'resources/bin/windows-fast-paste'
  ];
  
  nativeBins.forEach(bin => {
    checkFile(bin, 'Windows binary ' + path.basename(bin), false);
  });
  
  const extraResources = winConfig.extraResources || [];
  extraResources.forEach(resource => {
    if (resource.from) {
      checkFile(resource.from, 'Windows extra resource ' + path.basename(resource.from));
    }
  });
}

function validateLinux(config) {
  log('\nValidating Linux packaging...', 'info');
  
  const linuxConfig = config.linux || {};
  const targets = linuxConfig.target || [];
  
  log('Targets: ' + targets.join(', '), 'info');
  
  if (linuxConfig.icon) {
    checkFile(linuxConfig.icon, 'Linux icon');
  }
  
  if (targets.includes('deb')) {
    const debConfig = config.deb || {};
    if (debConfig.afterRemove) {
      checkFile(debConfig.afterRemove, 'DEB after-remove script');
    }
  }
  
  const nativeBins = [
    'resources/bin/linux-fast-paste',
    'resources/bin/linux-text-monitor'
  ];
  
  nativeBins.forEach(bin => {
    checkFile(bin, 'Linux binary ' + path.basename(bin));
  });
}

function validateCommonResources(config) {
  log('\nValidating common resources...', 'info');
  
  const extraResources = config.extraResources || [];
  
  extraResources.forEach(resource => {
    if (typeof resource === 'string') {
      checkFile(resource, 'Extra resource ' + resource, false);
    } else if (resource.from) {
      const sourcePath = path.join(ROOT, resource.from);
      if (fs.existsSync(sourcePath)) {
        log('Extra resource directory exists: ' + resource.from, 'success');
      } else {
        log('Extra resource directory not found: ' + resource.from, 'warn');
      }
    }
  });
  
  const files = config.files || [];
  const criticalFiles = ['main.js', 'preload.js', 'package.json'];
  
  criticalFiles.forEach(file => {
    checkFile(file, 'Critical file ' + file);
  });
}

function main() {
  log('VoiceInk Packaging Validation', 'info');
  log('==================================================', 'info');
  
  const config = validateConfig();
  if (!config) {
    process.exit(1);
  }
  
  validateMacOS(config);
  validateWindows(config);
  validateLinux(config);
  validateCommonResources(config);
  
  log('\n==================================================', 'info');
  if (exitCode === 0) {
    log('All packaging requirements validated successfully!', 'success');
  } else {
    log('Some packaging requirements are missing. See errors above.', 'error');
  }
  
  process.exit(exitCode);
}

main();
