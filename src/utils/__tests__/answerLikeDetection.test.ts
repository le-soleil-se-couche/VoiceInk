import { describe, expect, it } from "vitest";
import { isAnswerLikeText } from "../answerLikeDetection";

describe("isAnswerLikeText", () => {
  it("flags english assistant-prefaced polished-question output", () => {
    const candidate = "Sure, here's the polished question: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags chinese assistant-prefaced polished-question output", () => {
    const candidate = "好的，这是润色后的问题：这个要改吗？";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("does not flag normal question cleanup output", () => {
    const candidate = "What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(false);
  });
});
