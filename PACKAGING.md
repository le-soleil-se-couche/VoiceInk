# VoiceInk Cross-Platform Packaging Guide

This document describes the cross-platform packaging configuration for VoiceInk and provides guidance for building and validating installers.

## Build Configuration

VoiceInk uses `electron-builder` to create installers for macOS, Windows, and Linux. The configuration is defined in `electron-builder.json`.

### Supported Targets

#### macOS
- **DMG** (`dmg`) - Standard macOS installer disk image
- **ZIP** (`zip`) - Compressed archive for manual installation

#### Windows
- **NSIS** (`nsis`) - Windows installer with uninstall support
- **Portable** (`portable`) - Standalone executable, no installation required

#### Linux
- **AppImage** - Universal Linux package
- **DEB** (`deb`) - Debian/Ubuntu package
- **RPM** (`rpm`) - Red Hat/Fedora package
- **TAR.GZ** (`tar.gz`) - Compressed tarball

## Building

### Prerequisites

Before building, ensure all native binaries are compiled:

```bash
npm run compile:native
```

### Download Required Binaries

Download Whisper.cpp, llama-server, and sherpa-onnx binaries:

```bash
# Download for current platform
npm run download:whisper-cpp
npm run download:llama-server
npm run download:sherpa-onnx

# Download for all platforms (for cross-compilation)
npm run download:whisper-cpp:all
npm run download:llama-server:all
npm run download:sherpa-onnx:all
```

### Platform-Specific Builds

```bash
# macOS
npm run build:mac
npm run build:mac:arm64    # Apple Silicon
npm run build:mac:x64      # Intel

# Windows
npm run build:win

# Linux
npm run build:linux
npm run build:linux:appimage
npm run build:linux:deb
npm run build:linux:rpm
npm run build:linux:tar
```

## Packaging Validation

Run the packaging validation script to check that all required resources are present:

```bash
node scripts/validate-packaging.js
```

This script validates:
- Electron-builder configuration
- Platform-specific icons and entitlements
- Native binaries for each platform
- NSIS/DEB/RPM configuration scripts
- Critical application files

## Platform-Specific Configuration

### macOS

**Entitlements**: `resources/mac/entitlements.mac.plist`

The macOS build includes:
- Hardened runtime enabled
- Accessibility usage description for paste functionality
- Microphone usage description for speech-to-text
- Custom entitlements for unsigned executable memory and JIT

**Native Binaries Required**:
- `resources/bin/macos-globe-listener`
- `resources/bin/macos-fast-paste`
- `resources/bin/macos-text-monitor`

### Windows

**NSIS Configuration**: `resources/nsis/cleanup-models.nsh`

The Windows build includes:
- NSIS installer with cleanup script for cached models
- Portable executable option
- Optional nircmd.exe integration

**Native Binaries Required** (optional, downloaded at build time):
- `resources/bin/windows-key-listener`
- `resources/bin/windows-text-monitor`
- `resources/bin/windows-fast-paste`

### Linux

**DEB Post-Remove Script**: `resources/linux/after-remove.sh`

The Linux build includes:
- DEB package with ydotool dependency
- RPM package with equivalent dependencies
- AppImage for universal Linux compatibility
- Suggested dependencies: xdotool, wtype, wl-clipboard

**Native Binaries Required**:
- `resources/bin/linux-fast-paste`
- `resources/bin/linux-text-monitor`

## Resource Inclusion

The `extraResources` configuration in `electron-builder.json` specifies additional files to include:

```json
{
  "extraResources": [
    "src/assets/**/*",
    "resources/bin/macos-globe-listener",
    "resources/bin/macos-fast-paste",
    "resources/bin/macos-text-monitor",
    "resources/bin/linux-fast-paste",
    "resources/bin/linux-text-monitor",
    {
      "from": "resources/bin/",
      "to": "bin/",
      "filter": [
        "whisper-cpp-*",
        "whisper-server-*",
        "llama-server-*",
        "sherpa-onnx-*",
        "windows-key-listener*",
        "windows-text-monitor*",
        "windows-fast-paste*",
        "*.dylib",
        "*.dll",
        "*.so*"
      ]
    }
  ]
}
```

## Known Issues and Considerations

1. **Native Binary Compilation**: Native binaries must be compiled on their target platform or cross-compiled with appropriate toolchains.

2. **Windows Binaries**: Windows native binaries are downloaded at build time and are not required to be present in the source repository.

3. **Linux Dependencies**: The DEB and RPM packages declare ydotool as a required dependency. Users must install it separately or through the package manager.

4. **macOS Notarization**: The macOS build has hardened runtime enabled but requires external notarization for distribution outside the App Store.

5. **Model Caching**: All platforms include cleanup scripts to remove cached models during uninstallation.

## Testing Checklist

Before releasing, verify:

- [ ] All platform builds complete successfully
- [ ] Packaging validation script passes
- [ ] Installers launch the application correctly
- [ ] Native binaries are included in packaged builds
- [ ] Uninstallation removes cached models
- [ ] Platform-specific features work (paste, key listening, etc.)
