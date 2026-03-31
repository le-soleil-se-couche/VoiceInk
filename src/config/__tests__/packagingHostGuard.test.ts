import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const hostGuardScript = fileURLToPath(
  new URL("../../../scripts/require-native-packaging-host.js", import.meta.url)
);

describe("native packaging host guard", () => {
  it("rejects Linux packaging on non-Linux hosts", () => {
    const result = spawnSync(process.execPath, [hostGuardScript, "linux"], {
      env: {
        ...process.env,
        VOICEINK_HOST_PLATFORM: "darwin",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain("Linux packaging must be run on Linux");
  });

  it("allows Linux packaging on Linux hosts", () => {
    const result = spawnSync(process.execPath, [hostGuardScript, "linux"], {
      env: {
        ...process.env,
        VOICEINK_HOST_PLATFORM: "linux",
      },
    });

    expect(result.status).toBe(0);
  });
});
