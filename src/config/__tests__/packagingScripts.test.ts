import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8")
) as {
  scripts: Record<string, string>;
};

describe("packaging script staging", () => {
  it("keeps Windows nircmd staging in generic packaging entrypoints", () => {
    for (const scriptName of ["prebuild", "prepack", "predist"]) {
      expect(packageJson.scripts[scriptName], `${scriptName} should stage nircmd for Windows packaging`)
        .toContain("download:nircmd");
    }
  });

  it("blocks macOS packaging entrypoints on non-macOS hosts", () => {
    const macHostGuard = "node scripts/require-native-packaging-host.js macos";

    for (const scriptName of ["prebuild:mac", "build:mac", "build:mac:arm64", "build:mac:x64"]) {
      expect(packageJson.scripts[scriptName], `${scriptName} should enforce a macOS host`)
        .toContain(macHostGuard);
    }
  });

  it("blocks Windows packaging entrypoints on non-Windows hosts", () => {
    const windowsHostGuard = "node scripts/require-native-packaging-host.js windows";

    for (const scriptName of ["prebuild:win", "build:win"]) {
      expect(packageJson.scripts[scriptName], `${scriptName} should enforce a Windows host`)
        .toContain(windowsHostGuard);
    }
  });

  it("blocks Linux packaging entrypoints on non-Linux hosts", () => {
    const linuxHostGuard = "node scripts/require-native-packaging-host.js linux";

    for (const scriptName of [
      "prebuild:linux",
      "build:linux",
      "build:linux:appimage",
      "build:linux:deb",
      "build:linux:rpm",
      "build:linux:tar",
    ]) {
      expect(packageJson.scripts[scriptName], `${scriptName} should enforce a Linux host`)
        .toContain(linuxHostGuard);
    }
  });
});
