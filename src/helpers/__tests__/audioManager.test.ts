import { describe, expect, it } from "vitest";
import AudioManager from "../audioManager.js";

describe("AudioManager basicDictationCleanup", () => {
  const cleanup = (text: string) => AudioManager.prototype.basicDictationCleanup.call({}, text);

  it("preserves numeric mm units", () => {
    expect(cleanup("use a 5 mm screw and keep a 0.8mm gap")).toBe(
      "use a 5 mm screw and keep a 0.8mm gap"
    );
  });

  it("removes comma-led one-sided English filler without leaving dangling comma", () => {
    expect(cleanup("we should, um ship this today")).toBe("we should ship this today");
  });

  it("removes sentence-initial mm hesitation filler", () => {
    expect(cleanup("mm we should ship this today")).toBe("we should ship this today");
  });
});
