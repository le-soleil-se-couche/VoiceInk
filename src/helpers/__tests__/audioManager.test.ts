import { describe, expect, it } from "vitest";
import AudioManager from "../audioManager";

const basicDictationCleanup = (input: string) =>
  AudioManager.prototype.basicDictationCleanup.call({}, input);

describe("AudioManager basicDictationCleanup", () => {
  it("preserves uppercase ER abbreviation in lexical medical context", () => {
    expect(basicDictationCleanup("should we go to ER now")).toBe("should we go to ER now");
  });

  it("still removes lowercase er hesitation filler", () => {
    expect(basicDictationCleanup("er, we should ship today")).toBe("we should ship today");
  });

  it("preserves lexical measurement unit mm in numeric context", () => {
    expect(basicDictationCleanup("use a 5 mm drill bit")).toBe("use a 5 mm drill bit");
  });

  it("still removes sentence-initial mm hesitation filler", () => {
    expect(basicDictationCleanup("mm, we should ship today")).toBe("we should ship today");
  });

  it("removes parenthetical um filler without leaving comma artifacts", () => {
    expect(basicDictationCleanup("we should, um, ship today")).toBe("we should ship today");
  });

  it("preserves all-caps technical acronyms that collide with filler patterns", () => {
    expect(basicDictationCleanup("HMM model works")).toBe("HMM model works");
  });

  it("still removes lowercase hesitation fillers", () => {
    expect(basicDictationCleanup("hmm model works")).toBe("model works");
  });

  it("preserves lexical as-you-know phrase", () => {
    expect(basicDictationCleanup("as you know we should ship today")).toBe(
      "as you know we should ship today"
    );
  });

  it("preserves interrogative do-you-know phrase", () => {
    expect(basicDictationCleanup("do you know where the file is")).toBe(
      "do you know where the file is"
    );
  });

  it("preserves interrogative did-you-know phrase", () => {
    expect(basicDictationCleanup("did you know we should ship today")).toBe(
      "did you know we should ship today"
    );
  });

  it("preserves lexical if-you-know clause", () => {
    expect(basicDictationCleanup("if you know the answer tell me")).toBe(
      "if you know the answer tell me"
    );
  });

  it("still removes sentence-initial you-know hesitation filler", () => {
    expect(basicDictationCleanup("you know we should ship today")).toBe("we should ship today");
  });

  it("removes parenthetical you-know filler without leaving comma artifacts", () => {
    expect(basicDictationCleanup("we should, you know, ship today")).toBe("we should ship today");
  });

  it("preserves content-bearing basically without comma-marked filler punctuation", () => {
    expect(basicDictationCleanup("basically impossible to reproduce")).toBe(
      "basically impossible to reproduce"
    );
  });

  it("still removes comma-marked basically hesitation filler", () => {
    expect(basicDictationCleanup("basically, we should ship today")).toBe("we should ship today");
  });

  it("removes parenthetical basically filler without leaving comma artifacts", () => {
    expect(basicDictationCleanup("we should, basically, ship today")).toBe("we should ship today");
  });

  it("preserves lexical commas when no filler is removed", () => {
    expect(basicDictationCleanup("please review, then ship today")).toBe(
      "please review, then ship today"
    );
  });
});
