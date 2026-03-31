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
});
