#!/usr/bin/env node
/**
 * macOS Notarization Script for VoiceInk
 * 
 * This script notarizes macOS builds after packaging.
 * It should be run after `npm run build:mac` to prepare the DMG for distribution.
 * 
 * Usage: node scripts/notarize-macos.js <path-to-dmg>
 * 
 * Prerequisites:
 * - Apple Developer ID with notarization access
 * - Xcode Command Line Tools (for xcrun notarytool)
 * - Notarization credentials configured via environment variables:
 *   - APPLE_ID: Apple ID email
 *   - APPLE_APP_SPECIFIC_PASSWORD: App-specific password
 *   - APPLE_TEAM_ID: Apple Developer Team ID
 * 
 * Alternatively, credentials can be stored in keychain:
 *   xcrun notarytool store-credentials "notary-profile" --apple-id "email@example.com" --team-id "TEAM_ID" --password "app-password"
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dmgPath = process.argv[2];

if (!dmgPath) {
  console.error("Usage: node scripts/notarize-macos.js <path-to-dmg>");
  process.exit(1);
}

if (!fs.existsSync(dmgPath)) {
  console.error(`DMG file not found: ${dmgPath}`);
  process.exit(1);
}

// Check if running on macOS
if (process.platform !== "darwin") {
  console.error("Notarization must be run on macOS");
  process.exit(1);
}

// Check for xcrun
try {
  execSync("which xcrun", { stdio: "ignore" });
} catch (e) {
  console.error("xcrun not found. Please install Xcode Command Line Tools");
  process.exit(1);
}

// Get credentials from environment or keychain profile
const teamId = process.env.APPLE_TEAM_ID || "";
const appleId = process.env.APPLE_ID || "";
const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD || "";

let notarizeCmd;

if (teamId && appleId && appleIdPassword) {
  // Use environment variables
  notarizeCmd = `xcrun notarytool submit "${dmgPath}" --apple-id "${appleId}" --team-id "${teamId}" --password "${appleIdPassword}" --wait`;
} else {
  // Use keychain profile (recommended for CI/CD)
  notarizeCmd = `xcrun notarytool submit "${dmgPath}" --keychain-profile "notary-profile" --wait`;
}

console.log(`Notarizing ${path.basename(dmgPath)}...`);
console.log(`Command: ${notarizeCmd}`);

try {
  execSync(notarizeCmd, { stdio: "inherit" });
  console.log("\n✅ Successfully notarized: " + dmgPath);
  
  // Optionally staple the ticket
  const stapleCmd = `xcrun stapler staple "${dmgPath}"`;
  console.log("\nStapling notarization ticket...");
  execSync(stapleCmd, { stdio: "inherit" });
  console.log("✅ Stapling complete");
  
} catch (e) {
  console.error("\n❌ Notarization failed");
  console.error("Check your Apple Developer credentials and try again");
  process.exit(1);
}
