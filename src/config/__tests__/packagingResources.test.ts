import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ExtraResource =
  | string
  | {
      from: string;
      to?: string;
      filter?: string[];
    };

type ElectronBuilderConfig = {
  extraResources?: ExtraResource[];
  mac?: { extraResources?: ExtraResource[] };
  win?: { extraResources?: ExtraResource[] };
  linux?: { extraResources?: ExtraResource[] };
};

const electronBuilderConfig = JSON.parse(
  readFileSync(new URL("../../../electron-builder.json", import.meta.url), "utf8")
) as ElectronBuilderConfig;

function findResourceObject(resources: ExtraResource[] | undefined, from: string) {
  return resources?.find(
    (resource): resource is Exclude<ExtraResource, string> =>
      typeof resource !== "string" && resource.from === from
  );
}

describe("electron-builder helper staging", () => {
  it("keeps platform-specific native helpers out of the global resource list", () => {
    const globalResources = electronBuilderConfig.extraResources ?? [];

    expect(globalResources).not.toContain("resources/bin/macos-globe-listener");
    expect(globalResources).not.toContain("resources/bin/macos-fast-paste");
    expect(globalResources).not.toContain("resources/bin/macos-text-monitor");
    expect(globalResources).not.toContain("resources/bin/linux-fast-paste");
    expect(globalResources).not.toContain("resources/bin/linux-text-monitor");

    expect(electronBuilderConfig.mac?.extraResources ?? []).toEqual(
      expect.arrayContaining([
        "resources/bin/macos-globe-listener",
        "resources/bin/macos-fast-paste",
        "resources/bin/macos-text-monitor",
      ])
    );

    const windowsHelpers = findResourceObject(
      electronBuilderConfig.win?.extraResources,
      "resources/bin/"
    );
    expect(windowsHelpers?.to).toBe("bin/");
    expect(windowsHelpers?.filter ?? []).toEqual(
      expect.arrayContaining([
        "windows-key-listener*",
        "windows-text-monitor*",
        "windows-fast-paste*",
      ])
    );

    const linuxHelpers = findResourceObject(
      electronBuilderConfig.linux?.extraResources,
      "resources/bin/"
    );
    expect(linuxHelpers?.to).toBe("bin/");
    expect(linuxHelpers?.filter ?? []).toEqual(
      expect.arrayContaining(["linux-fast-paste", "linux-text-monitor"])
    );

    const linuxFallback = findResourceObject(
      electronBuilderConfig.linux?.extraResources,
      "resources/"
    );
    expect(linuxFallback).toEqual({
      from: "resources/",
      to: ".",
      filter: ["linux-text-monitor.py"],
    });
  });
});
