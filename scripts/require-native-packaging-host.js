#!/usr/bin/env node

const PLATFORM_ALIASES = {
  darwin: "darwin",
  linux: "linux",
  mac: "darwin",
  macos: "darwin",
  osx: "darwin",
  win: "win32",
  windows: "win32",
  win32: "win32",
};

const PLATFORM_LABELS = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows",
};

function normalizePlatformName(name) {
  if (!name) {
    return null;
  }

  return PLATFORM_ALIASES[name.toLowerCase()] ?? null;
}

const requestedTarget = process.argv[2];
const targetPlatform = normalizePlatformName(requestedTarget);

if (!targetPlatform) {
  console.error(
    "[packaging-host] Usage: node scripts/require-native-packaging-host.js <macos|linux|windows>"
  );
  process.exit(1);
}

const detectedHost = process.env.VOICEINK_HOST_PLATFORM || process.platform;
const hostPlatform = normalizePlatformName(detectedHost);

if (!hostPlatform) {
  console.error(`[packaging-host] Unsupported host platform: ${detectedHost}`);
  process.exit(1);
}

if (hostPlatform !== targetPlatform) {
  const targetLabel = PLATFORM_LABELS[targetPlatform];
  const hostLabel = PLATFORM_LABELS[hostPlatform];

  console.error(`[packaging-host] ${targetLabel} packaging must be run on ${targetLabel}.`);
  console.error(
    `[packaging-host] Current host is ${hostLabel}; this repository stages native ${targetLabel} helpers locally, so cross-host packaging would produce an incomplete installer.`
  );
  process.exit(1);
}
