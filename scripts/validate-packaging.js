#!/usr/bin/env node
/**
 * Validates that required binaries and resources are present before packaging.
 * 
 * This script checks:
 * 1. Native binaries compiled from source (macos-*, linux-*, windows-*)
 * 2. Downloaded inference server binaries (whisper-server-*, llama-server-*, sherpa-onnx-*)
 * 3. Platform-specific resources (nircmd.exe for Windows)
 * 4. Asset files referenced in electron-builder.json
 * 
 * Exit codes:
 * - 0: All required binaries present
 * - 1: Missing critical binaries for current platform
 * - 2: Missing optional binaries (warning only)
 */

const fs = require("fs");
const path = require("path");

const BIN_DIR = path.join(__dirname, "..", "resources", "bin");
const ASSETS_DIR = path.join(__dirname, "..", "src", "assets");

// Platform detection
const platform = process.platform;
const arch = process.arch;
const platformArch = `${platform}-${arch}`;

// Required binaries for each platform (must exist)
const REQUIRED_BINARIES = {
  "darwin-arm64": [
    "macos-globe-listener",
    "macos-fast-paste",
    "macos-text-monitor",
  ],
  "darwin-x64": [
    "macos-globe-listener",
    "macos-fast-paste",
    "macos-text-monitor",
  ],
  "win32-x64": [
    "windows-key-listener.exe",
    "windows-text-monitor.exe",
    "windows-fast-paste.exe",
    "nircmd.exe",
  ],
  "linux-x64": [
    "linux-fast-paste",
    "linux-text-monitor",
  ],
};

// Optional binaries (inference servers - should exist for full builds)
const OPTIONAL_BINARIES = [
  "whisper-server",
  "llama-server",
  "sherpa-onnx",
];

// Required asset files
const REQUIRED_ASSETS = {
  darwin: ["icon.icns"],
  win32: ["icon.ico"],
  linux: ["icon.png"],
};

function checkBinaries() {
  const missingRequired = [];
  const missingOptional = [];
  const foundRequired = [];
  const foundOptional = [];

  // Check required binaries for current platform
  const requiredForPlatform = REQUIRED_BINARIES[platformArch] || [];
  
  for (const binary of requiredForPlatform) {
    const binaryPath = path.join(BIN_DIR, binary);
    if (fs.existsSync(binaryPath)) {
      foundRequired.push(binary);
    } else {
      missingRequired.push(binary);
    }
  }

  // Check optional binaries (any variant)
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const existingBinaries = fs.readdirSync(BIN_DIR);

  for (const prefix of OPTIONAL_BINARIES) {
    const found = existingBinaries.some((f) => f.startsWith(prefix));
    if (found) {
      const variants = existingBinaries.filter((f) => f.startsWith(prefix));
      foundOptional.push(...variants);
    } else {
      missingOptional.push(prefix);
    }
  }

  return { missingRequired, foundRequired, missingOptional, foundOptional };
}

function checkAssets() {
  const missingAssets = [];
  const foundAssets = [];

  const requiredForPlatform = REQUIRED_ASSETS[platform] || [];

  for (const asset of requiredForPlatform) {
    const assetPath = path.join(ASSETS_DIR, asset);
    if (fs.existsSync(assetPath)) {
      foundAssets.push(asset);
    } else {
      missingAssets.push(asset);
    }
  }

  return { missingAssets, foundAssets };
}

function printReport(binaries, assets) {
  console.log("\n=== VoiceInk Packaging Validation ===\n");
  console.log(`Platform: ${platformArch}`);
  console.log(`Bin directory: ${BIN_DIR}`);
  console.log(`Assets directory: ${ASSETS_DIR}\n`);

  // Required binaries
  console.log("Required Binaries:");
  if (binaries.foundRequired.length > 0) {
    console.log("  ✓ Found:");
    binaries.foundRequired.forEach((b) => console.log(`    - ${b}`));
  }
  if (binaries.missingRequired.length > 0) {
    console.log("  ✗ Missing:");
    binaries.missingRequired.forEach((b) => console.log(`    - ${b}`));
  }
  if (binaries.foundRequired.length === 0 && binaries.missingRequired.length === 0) {
    console.log("  (none for this platform)");
  }
  console.log();

  // Optional binaries
  console.log("Optional Binaries (Inference Servers):");
  if (binaries.foundOptional.length > 0) {
    console.log("  ✓ Found:");
    binaries.foundOptional.forEach((b) => console.log(`    - ${b}`));
  }
  if (binaries.missingOptional.length > 0) {
    console.log("  ⚠ Missing:");
    binaries.missingOptional.forEach((b) => console.log(`    - ${b}*`));
  }
  console.log();

  // Assets
  console.log("Required Assets:");
  if (assets.foundAssets.length > 0) {
    console.log("  ✓ Found:");
    assets.foundAssets.forEach((a) => console.log(`    - ${a}`));
  }
  if (assets.missingAssets.length > 0) {
    console.log("  ✗ Missing:");
    assets.missingAssets.forEach((a) => console.log(`    - ${a}`));
  }
  console.log();

  // Summary
  const hasCriticalIssues =
    binaries.missingRequired.length > 0 || assets.missingAssets.length > 0;
  const hasWarnings = binaries.missingOptional.length > 0;

  if (hasCriticalIssues) {
    console.log("❌ Validation FAILED: Missing critical binaries or assets");
    console.log("\nRun the following to download required binaries:");
    console.log("  npm run compile:native");
    if (platform === "win32") {
      console.log("  npm run download:nircmd");
    }
    console.log("  npm run download:whisper-cpp");
    console.log("  npm run download:llama-server");
    console.log("  npm run download:sherpa-onnx");
  } else if (hasWarnings) {
    console.log("⚠️  Validation PASSED with warnings");
    console.log("\nOptional inference server binaries are missing.");
    console.log("The app will build but may lack local inference capabilities.");
    console.log("\nTo download all binaries:");
    console.log("  npm run download:whisper-cpp:all");
    console.log("  npm run download:llama-server:all");
    console.log("  npm run download:sherpa-onnx:all");
  } else {
    console.log("✅ Validation PASSED: All required binaries and assets present");
  }
  console.log();
}

function main() {
  const binaries = checkBinaries();
  const assets = checkAssets();

  printReport(binaries, assets);

  // Exit with appropriate code
  if (binaries.missingRequired.length > 0 || assets.missingAssets.length > 0) {
    process.exit(1);
  } else if (binaries.missingOptional.length > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

main();
