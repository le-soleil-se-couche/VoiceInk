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

## Build Host Requirements

This section documents which operating system is required for building each installer type, along with platform-specific dependencies and toolchain requirements.

### Platform Build Matrix

| Installer Type | Required Build Host | Can Cross-Compile | Notes |
|---------------|---------------------|-------------------|-------|
| macOS DMG | macOS | No | Must build on macOS |
| macOS ZIP | macOS | No | Must build on macOS |
| Windows NSIS | Windows | Limited | Requires Wine for cross-compilation |
| Windows Portable | Windows | Limited | Requires Wine for cross-compilation |
| Linux AppImage | Linux | No | Must build on Linux |
| Linux DEB | Linux | No | Must build on Linux |
| Linux RPM | Linux | No | Must build on Linux |
| Linux TAR.GZ | Linux | Yes | Can be built on any platform |

### macOS Build Requirements

**Host OS:** macOS 10.15 (Catalina) or later

**Architecture Support:**
- Apple Silicon (arm64): macOS 11.0+ recommended
- Intel (x64): macOS 10.15+

**Required Tools:**
- Xcode Command Line Tools (`xcode-select --install`)
- Node.js 18+ (recommended via nvm)
- npm or yarn

**Optional (for universal builds):**
- Both arm64 and x64 Node.js installations for building universal binaries

**Native Dependencies:**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required packages
brew install node
```

**Build Commands:**
```bash
# Build for current architecture
npm run build:mac

# Build for Apple Silicon only
npm run build:mac:arm64

# Build for Intel only
npm run build:mac:x64

# Build universal binary (requires both architectures)
npm run build:mac:universal
```

**Notarization Requirements:**
- Apple Developer ID (for distribution outside Mac App Store)
- Xcode with notarytool for notarization
- Keychain access for storing credentials

### Windows Build Requirements

**Host OS:** Windows 10/11 (64-bit)

**Required Tools:**
- Node.js 18+ (LTS recommended)
- npm or yarn
- Visual Studio Build Tools 2019+ (for native modules)
- PowerShell 5.1+ or Windows Terminal

**Optional (for cross-compilation from Linux/macOS):**
- Wine 6.0+
- winetricks
- Node.js for Windows (via Wine)

**Native Dependencies:**
```powershell
# Install Chocolatey if not already installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install required packages
choco install nodejs-lts visualstudio2022buildtools
```

**Build Commands:**
```bash
# Build Windows installer (NSIS + Portable)
npm run build:win

# Build NSIS installer only
npm run build:win:nsis

# Build portable executable only
npm run build:win:portable
```

**NSIS Requirements:**
- NSIS 3.0+ (bundled with electron-builder)
- Custom NSIS scripts in `resources/nsis/`

### Linux Build Requirements

**Host OS:** Linux (tested on Ubuntu 20.04+, Fedora 35+)

**Required Tools:**
- Node.js 18+ (LTS recommended)
- npm or yarn
- GCC/G++ 9+ or Clang 12+
- Make, Python 3 (for native module compilation)

**Distribution-Specific Dependencies:**

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install build essentials and required packages
sudo apt install -y \
  build-essential \
  gcc \
  g++ \
  make \
  python3 \
  libx11-dev \
  libxtst-dev \
  libpng-dev \
  libjpeg-dev \
  libgif-dev \
  libfreetype6-dev \
  libfontconfig1-dev \
  icnsutils \
  graphicsmagick \
  xz-utils \
  libarchive-tools \
  fakeroot \
  desktop-file-utils \
  file \
  appstream \
  ydotool
```

**Fedora/RHEL:**
```bash
# Install development tools and required packages
sudo dnf groupinstall "Development Tools"
sudo dnf install -y \
  nodejs \
  npm \
  python3 \
  libX11-devel \
  libXtst-devel \
  libpng-devel \
  libjpeg-devel \
  freetype-devel \
  fontconfig-devel \
  icoutils \
  GraphicsMagick \
  xz \
  libarchive \
  rpm-build \
  desktop-file-utils \
  file \
  appstream \
  ydotool
```

**Build Commands:**
```bash
# Build all Linux targets
npm run build:linux

# Build AppImage only
npm run build:linux:appimage

# Build DEB package only
npm run build:linux:deb

# Build RPM package only
npm run build:linux:rpm

# Build tarball only
npm run build:linux:tar
```

**Distribution-Specific Notes:**

- **DEB packages:** Require `fakeroot`, `dpkg-deb`, and `lintian` for validation
- **RPM packages:** Require `rpm-build`, `rpmlint` for validation
- **AppImage:** Requires `appimagetool`, `desktop-file-validate`, and `libfuse2`

### Cross-Compilation Limitations

**macOS → Windows:**
- Not recommended due to code signing and native binary compatibility issues
- Requires Wine and Windows-specific toolchains
- Native binaries (whisper.cpp, llama-server) must be pre-built for Windows

**macOS → Linux:**
- Limited support via electron-builder's Linux target
- Requires pre-built Linux native binaries
- Not recommended for production builds

**Linux → Windows:**
- Possible with Wine and electron-builder
- Requires Windows native binaries to be pre-downloaded
- Code signing must be done on Windows or with cross-platform tools

**Windows → macOS:**
- Not supported (macOS requires macOS for code signing and notarization)

**Windows → Linux:**
- Possible via WSL2 (Windows Subsystem for Linux)
- Requires Linux environment setup within WSL2
- Native binaries must be built for Linux target

### Recommended Build Strategy

For production releases, build each platform on its native OS:

1. **macOS builds:** Run on macOS hardware or macOS VM
2. **Windows builds:** Run on Windows 10/11 VM or physical machine
3. **Linux builds:** Run on Ubuntu/Fedora VM or container

**CI/CD Integration:**
- Use GitHub Actions with matrix builds for each platform
- Use platform-specific runners (macos-latest, windows-latest, ubuntu-latest)
- Cache native binaries to speed up builds
- Upload artifacts to release assets automatically

### Native Binary Requirements

Native binaries must be built or downloaded for each target platform:

**Whisper.cpp:**
- macOS: `whisper-cpp-macos-arm64` / `whisper-cpp-macos-x64`
- Windows: `whisper-cpp-windows.exe`
- Linux: `whisper-cpp-linux`

**llama-server:**
- macOS: `llama-server-macos-arm64` / `llama-server-macos-x64`
- Windows: `llama-server-windows.exe`
- Linux: `llama-server-linux`

**sherpa-onnx:**
- macOS: `sherpa-onnx-macos`
- Windows: `sherpa-onnx-windows.dll`
- Linux: `sherpa-onnx-linux.so`

**Download Scripts:**
```bash
# Download for current platform
npm run download:whisper-cpp
npm run download:llama-server
npm run download:sherpa-onnx

# Download for all platforms (cross-compilation prep)
npm run download:whisper-cpp:all
npm run download:llama-server:all
npm run download:sherpa-onnx:all
```


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
