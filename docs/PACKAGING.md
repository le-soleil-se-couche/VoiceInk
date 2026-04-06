# VoiceInk Packaging Guide

This document provides comprehensive packaging instructions for VoiceInk across macOS, Windows, and Linux platforms.

## Quick Start

### Build Commands by Platform

```bash
# macOS (Intel or Apple Silicon)
npm run build:mac           # Universal build
npm run build:mac:arm64     # Apple Silicon only
npm run build:mac:x64       # Intel only

# Windows (x64)
npm run build:win

# Linux (x64)
npm run build:linux         # All formats
npm run build:linux:appimage
npm run build:linux:deb
npm run build:linux:rpm
npm run build:linux:tar
```

## Artifact Naming Conventions

All installer artifacts follow consistent naming patterns:

### macOS
- **DMG**: `VoiceInk-{version}-macOS-{arch}.dmg`
- **ZIP**: `VoiceInk-{version}-macOS-{arch}.zip`

### Windows
- **NSIS Installer**: `VoiceInk-{version}-Windows-{arch}.exe`
- **Portable**: `VoiceInk-{version}-Windows-{arch}.exe`

### Linux
- **AppImage**: `VoiceInk-{version}-Linux-{arch}.AppImage`
- **DEB**: `VoiceInk-{version}-Linux-{arch}.deb`
- **RPM**: `VoiceInk-{version}-Linux-{arch}.rpm`
- **Tarball**: `VoiceInk-{version}-Linux-{arch}.tar.gz`

Where `{arch}` is `arm64`, `x64`, or `universal` depending on the platform and build target.

## Platform-Specific Requirements

### macOS

#### Prerequisites
- macOS 10.15+ (Intel) or macOS 11+ (Apple Silicon)
- Xcode Command Line Tools
- Apple Developer ID (for notarization, optional for development)

#### Build Process
1. Compile native binaries:
   ```bash
   npm run compile:native
   ```

2. Download inference server binaries:
   ```bash
   npm run download:whisper-cpp
   npm run download:llama-server
   npm run download:sherpa-onnx
   ```

3. Build the application:
   ```bash
   npm run build:mac
   ```

#### Native Binaries
- `macos-globe-listener`: Global hotkey listener
- `macos-fast-paste`: Optimized paste functionality
- `macos-text-monitor`: Text monitoring service

#### Notarization (Optional for Distribution)
For distribution outside the Mac App Store, notarize the DMG:
```bash
xcrun notarytool submit dist/VoiceInk-*.dmg --apple-id "your@email.com" --team-id "TEAM_ID" --keychain-profile "notary-profile"
```

### Windows

#### Prerequisites
- Windows 10/11 (x64)
- Visual Studio Build Tools 2019+ (for native compilation)
- PowerShell 5.1+

#### Build Process
1. Compile native binaries:
   ```bash
   npm run compile:native
   ```

2. Download Windows-specific binaries:
   ```bash
   npm run download:nircmd
   npm run download:windows-fast-paste
   npm run download:windows-key-listener
   ```

3. Download inference server binaries:
   ```bash
   npm run download:whisper-cpp
   npm run download:llama-server
   npm run download:sherpa-onnx
   ```

4. Build the application:
   ```bash
   npm run build:win
   ```

#### Native Binaries
- `windows-key-listener.exe`: Global hotkey listener
- `windows-text-monitor.exe`: Text monitoring service
- `windows-fast-paste.exe`: Optimized paste functionality
- `nircmd.exe`: NirCmd utility for system operations

#### Code Signing (Optional)
Sign the installer with a code signing certificate:
```bash
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 dist/VoiceInk-*.exe
```

### Linux

#### Prerequisites
- Ubuntu 20.04+ / Debian 11+ / Fedora 35+ (x64)
- GCC/G++ build tools
- pkg-config
- libx11-dev, libxkbfile-dev (for native compilation)

#### Build Process
1. Compile native binaries:
   ```bash
   npm run compile:native
   ```

2. Download inference server binaries:
   ```bash
   npm run download:whisper-cpp
   npm run download:llama-server
   npm run download:sherpa-onnx
   ```

3. Build the application:
   ```bash
   npm run build:linux
   ```

#### Native Binaries
- `linux-fast-paste`: Optimized paste functionality
- `linux-text-monitor`: Text monitoring service

#### Dependencies by Package Format

**DEB Package**
- Required: `ydotool`
- Suggested: `xdotool`, `wtype`
- Recommended: `wl-clipboard`

Install dependencies:
```bash
sudo apt install ydotool xdotool wl-clipboard
```

**RPM Package**
- Required: `ydotool`
- Suggested: `xdotool`, `wtype`
- Recommended: `wl-clipboard`

Install dependencies:
```bash
sudo dnf install ydotool xdotool wl-clipboard
```

**AppImage**
- No system dependencies required (self-contained)
- Requires FUSE for mounting: `sudo apt install libfuse2` (if not present)

#### Installation

**DEB**:
```bash
sudo dpkg -i VoiceInk-*.deb
sudo apt-get install -f  # Fix any missing dependencies
```

**RPM**:
```bash
sudo rpm -i VoiceInk-*.rpm
```

**AppImage**:
```bash
chmod +x VoiceInk-*.AppImage
./VoiceInk-*.AppImage
```

## Validation

Before distributing builds, validate the packaging:

```bash
npm run validate:packaging
```

This checks:
- Required native binaries are present
- Inference server binaries are downloaded
- Asset files (icons, etc.) exist
- Platform-specific resources are available

Exit codes:
- `0`: All required binaries and assets present
- `1`: Missing critical binaries or assets
- `2`: Missing optional binaries (warnings only)

## Troubleshooting

### Missing Native Binaries
```bash
npm run compile:native
```

### Missing Inference Servers
```bash
npm run download:whisper-cpp:all
npm run download:llama-server:all
npm run download:sherpa-onnx:all
```

### macOS Gatekeeper Issues
If the app won't open on macOS:
```bash
xattr -cr /Applications/VoiceInk.app
```

Or go to System Preferences > Security & Privacy > General and click "Open Anyway"

### Windows SmartScreen
If Windows SmartScreen blocks the installer:
1. Click "More info"
2. Click "Run anyway"
3. Consider code signing for production builds

### Linux Permission Issues
For AppImage:
```bash
chmod +x VoiceInk-*.AppImage
```

For Wayland compatibility, ensure:
```bash
sudo apt install wl-clipboard
```

## Build Host Recommendations

| Platform | Build Host | Target Architectures | Notes |
|----------|-----------|---------------------|-------|
| macOS    | macOS     | arm64, x64, universal | Build on target OS for best compatibility |
| Windows  | Windows   | x64                 | Requires Windows for native compilation |
| Linux    | Linux     | x64                 | Build on oldest supported distro for compatibility |

## Release Checklist

- [ ] Run `npm run validate:packaging`
- [ ] Build for all target platforms
- [ ] Test installers on clean VMs/containers
- [ ] Verify native binaries work (hotkeys, paste)
- [ ] Check auto-update functionality
- [ ] Validate model download on first run
- [ ] Review changelog and version numbers
- [ ] Sign binaries (if applicable)
- [ ] Notarize macOS build (if applicable)
- [ ] Create GitHub release with all artifacts

## License and Distribution

VoiceInk is released under the MIT License. See LICENSE file for details.

When redistributing bundled binaries (whisper.cpp, llama.cpp, sherpa-onnx), ensure compliance with their respective licenses.
