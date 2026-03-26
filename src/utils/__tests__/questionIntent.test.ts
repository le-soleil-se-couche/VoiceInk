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

  it("detects pronoun-led Chinese alternative choices", () => {
    expect(hasUnresolvedAlternativeChoice("我们今天发还是明天发")).toBe(true);
  });

  it("ignores Chinese narrative still-usage phrases", () => {
    expect(hasUnresolvedAlternativeChoice("我们后来还是决定今天发")).toBe(false);
  });
});

describe("isQuestionLikeDictation", () => {
  it("treats unresolved English multi-option choices as question-like", () => {
    expect(isQuestionLikeDictation("should we ship this today or tomorrow or Monday")).toBe(true);
  });

  it("treats English negative-contraction questions as question-like", () => {
    expect(isQuestionLikeDictation("shouldn't we ship this today")).toBe(true);
  });

  it("treats irregular English negative-contraction questions as question-like", () => {
    expect(isQuestionLikeDictation("can't we ship this today")).toBe(true);
    expect(isQuestionLikeDictation("wont this break production")).toBe(true);
  });

  it("treats contractionless English what's-questions as question-like", () => {
    expect(isQuestionLikeDictation("whats the capital of france")).toBe(true);
  });

  it("treats indirect English wonder-if dictation as question-like", () => {
    expect(isQuestionLikeDictation("i wonder if we should ship this today")).toBe(true);
  });

  it("treats indirect English wondering-whether dictation as question-like", () => {
    expect(isQuestionLikeDictation("i'm wondering whether we should ship this today")).toBe(true);
  });

  it("treats indirect English uncertainty dictation as question-like", () => {
    expect(isQuestionLikeDictation("not sure whether we should ship this today")).toBe(true);
  });

  it("treats indirect English uncertainty-if dictation as question-like", () => {
    expect(isQuestionLikeDictation("not sure if we should ship this today")).toBe(true);
  });

  it("treats let-me-know indirect English dictation as question-like", () => {
    expect(isQuestionLikeDictation("let me know if we should ship this today")).toBe(true);
  });

  it("treats tell-me-whether indirect English dictation as question-like", () => {
    expect(isQuestionLikeDictation("tell me whether we should ship this today")).toBe(true);
  });

  it("treats polite indirect English request dictation as question-like", () => {
    expect(isQuestionLikeDictation("please let me know if we should ship this today")).toBe(true);
    expect(isQuestionLikeDictation("kindly confirm whether we should ship this today")).toBe(
      true
    );
  });

  it("treats pronoun-led Chinese alternative choices as question-like", () => {
    expect(isQuestionLikeDictation("我们今天发还是明天发")).toBe(true);
  });

  it("treats Chinese duration questions as question-like", () => {
    expect(isQuestionLikeDictation("这个多久能上线")).toBe(true);
  });
});
