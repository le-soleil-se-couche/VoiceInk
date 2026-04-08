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

  it("preserves lexical whoever/whomever-you-know clauses while still removing bare filler usage", () => {
    expect(cleanup("ask whomever you know about the rollout")).toBe(
      "ask whomever you know about the rollout"
    );
    expect(cleanup("ask whoever you know about the rollout")).toBe(
      "ask whoever you know about the rollout"
    );
    expect(cleanup("you know we should ship today")).toBe("we should ship today");
  });
});
