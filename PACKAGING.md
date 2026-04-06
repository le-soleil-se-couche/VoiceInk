# VoiceInk Packaging Guide

This guide covers building and validating VoiceInk installers for macOS, Windows, and Linux.

## Prerequisites

- Node.js (version specified in `.nvmrc`)
- npm
- Platform-specific requirements (see below)

## Quick Start

```bash
# Validate packaging configuration before building
npm run validate:packaging

# Build for current platform
npm run build

# Build for specific platform
npm run build:mac
npm run build:win
npm run build:linux
```

## Platform-Specific Requirements

### macOS

**Required for building:**
- macOS 10.15+ (Catalina or later)
- Xcode Command Line Tools
- Swift compiler (for native binaries)

**Build commands:**
```bash
npm run build:mac           # Build DMG and ZIP for current architecture
npm run build:mac:arm64     # Build for Apple Silicon (M1/M2/M3)
npm run build:mac:x64       # Build for Intel Macs
```

**Output artifacts:**
- `dist/VoiceInk-{version}.dmg` - Disk image installer
- `dist/VoiceInk-{version}-mac.zip` - Portable ZIP archive

**Required resources:**
- `src/assets/icon.icns` - Application icon
- `resources/mac/entitlements.mac.plist` - macOS entitlements for sandboxing
- Native binaries (built automatically during prebuild):
  - `resources/bin/macos-globe-listener`
  - `resources/bin/macos-fast-paste`
  - `resources/bin/macos-text-monitor`

**Notarization:**
For distribution outside the Mac App Store, the DMG must be notarized by Apple. Configure notarization in `electron-builder.json` or via environment variables:

```bash
export APPLE_ID=your-apple-id
export APPLE_APP_SPECIFIC_PASSWORD=your-password
export APPLE_TEAM_ID=your-team-id
```

### Windows

**Required for building:**
- Windows 10/11
- Visual Studio Build Tools or Visual Studio Community (for native modules)
- PowerShell

**Build commands:**
```bash
npm run build:win    # Build NSIS installer and portable executable
```

**Output artifacts:**
- `dist/VoiceInk Setup {version}.exe` - NSIS installer
- `dist/VoiceInk-{version}-win-portable.exe` - Portable executable

**Required resources:**
- `src/assets/icon.ico` - Application icon
- `resources/nsis/cleanup-models.nsh` - NSIS script for cleanup
- Native binaries (built automatically during prebuild):
  - `resources/bin/windows-key-listener.exe`
  - `resources/bin/windows-text-monitor.exe`
  - `resources/bin/windows-fast-paste.exe`
  - `resources/bin/nircmd.exe` (optional, for clipboard operations)

### Linux

**Required for building:**
- Linux (tested on Ubuntu 22.04+)
- Build essentials (`build-essential`, `gcc`, `g++`)
- Additional tools depending on target format

**Build commands:**
```bash
npm run build:linux            # Build all Linux formats
npm run build:linux:appimage   # Build AppImage
npm run build:linux:deb        # Build Debian/Ubuntu package
npm run build:linux:rpm        # Build RPM package (Fedora/RHEL)
npm run build:linux:tar        # Build tar.gz archive
```

**Output artifacts:**
- `dist/VoiceInk-{version}.AppImage` - AppImage portable executable
- `dist/VoiceInk_{version}_amd64.deb` - Debian/Ubuntu package
- `dist/VoiceInk-{version}.x86_64.rpm` - RPM package
- `dist/VoiceInk-{version}-linux.tar.gz` - Tarball archive

**Required resources:**
- `src/assets/icon.png` - Application icon
- `resources/linux/after-remove.sh` - Post-removal script for deb/rpm
- Native binaries (built automatically during prebuild):
  - `resources/bin/linux-fast-paste`
  - `resources/bin/linux-text-monitor`

**Runtime dependencies (deb/rpm):**
- `ydotool` (required) - System-wide keyboard/mouse input
- `xdotool` (suggested) - X11 keyboard/mouse control
- `wtype` (suggested) - Wayland keyboard input
- `wl-clipboard` (recommended) - Wayland clipboard operations

Install dependencies on Ubuntu/Debian:
```bash
sudo apt install ydotool xdotool wl-clipboard
```

## Packaging Validation

Run the validation script before building to ensure all required resources are present:

```bash
npm run validate:packaging
```

This checks:
- ✅ electron-builder configuration
- ✅ Platform-specific icons and entitlements
- ✅ Native binaries (optional, built during prebuild)
- ✅ Build scripts in package.json
- ✅ Critical application files

## Build Process

The build process runs these steps automatically:

1. **Prebuild** (`prebuild:*` scripts):
   - Compile native binaries (`npm run compile:native`)
   - Download whisper.cpp, llama-server, sherpa-onnx binaries
   - Download platform-specific dependencies

2. **Build renderer** (`npm run build:renderer`):
   - Build React frontend with Vite
   - Output to `src/dist/`

3. **Package** (`electron-builder`):
   - Bundle application files
   - Create platform-specific installers
   - Sign binaries (if configured)

## Troubleshooting

### Native binary compilation fails

Ensure you have the required compilers:

**macOS:**
```bash
xcode-select --install
```

**Windows:**
Install Visual Studio Build Tools with C++ workload.

**Linux:**
```bash
sudo apt install build-essential
```

### Missing resources

Run `npm run validate:packaging` to identify missing files. Resources should be placed in:
- `src/assets/` - Icons
- `resources/` - Platform-specific resources
- `resources/bin/` - Native binaries (auto-generated)

### Build size too large

The build excludes dev dependencies automatically. If size is still an issue:
1. Check `electron-builder.json` `files` array for exclusions
2. Ensure `node_modules` doesn't include unnecessary packages
3. Run `npm prune --production` before building

## Release Checklist

Before publishing a release:

- [ ] Run `npm run validate:packaging`
- [ ] Build for target platform(s)
- [ ] Test installer on clean VM/machine
- [ ] Verify auto-update functionality
- [ ] Check all native features work (paste, text monitoring)
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release with artifacts

## License

MIT License - See LICENSE file for details.
