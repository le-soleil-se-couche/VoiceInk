import { describe, expect, it } from "vitest";
import AudioManager from "../audioManager";

const cleanup = (text: string) => AudioManager.prototype.basicDictationCleanup.call({}, text);

describe("AudioManager basicDictationCleanup", () => {
  it("preserves uppercase ER lexical abbreviation in dictated text", () => {
    expect(cleanup("should we go to ER now")).toBe("should we go to ER now");
    expect(cleanup("route this to the ER team")).toBe("route this to the ER team");
  });

  it("still removes lowercase/title-case er hesitation filler", () => {
    expect(cleanup("er we should ship today")).toBe("we should ship today");
    expect(cleanup("Er, we should ship today")).toBe("we should ship today");
  });
});
