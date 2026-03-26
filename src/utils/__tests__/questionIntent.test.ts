import { describe, expect, it } from "vitest";
import { hasUnresolvedAlternativeChoice, isQuestionLikeDictation } from "../questionIntent";

describe("hasUnresolvedAlternativeChoice", () => {
  it("detects unresolved English or-choices", () => {
    expect(hasUnresolvedAlternativeChoice("should we ship this today or tomorrow")).toBe(true);
  });

  it("ignores filler-style English or-phrases", () => {
    expect(hasUnresolvedAlternativeChoice("we can test it or something")).toBe(false);
  });

  it("detects unresolved English multi-option choices", () => {
    expect(hasUnresolvedAlternativeChoice("should we ship this today or tomorrow or Monday")).toBe(
      true
    );
  });

  it("detects unresolved Chinese multi-option choices", () => {
    expect(hasUnresolvedAlternativeChoice("这个需求今天发还是明天发还是周一发")).toBe(true);
  });
});

describe("isQuestionLikeDictation", () => {
  it("treats unresolved English multi-option choices as question-like", () => {
    expect(isQuestionLikeDictation("should we ship this today or tomorrow or Monday")).toBe(true);
  });
});
