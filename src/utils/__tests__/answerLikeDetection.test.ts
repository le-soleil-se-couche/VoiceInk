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

  it("flags english assistant handoff output for question-like input", () => {
    const candidate = "Sure, what's your question?";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags soft english assistant handoff output for question-like input", () => {
    const candidate = "Happy to help. What do you need?";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags chinese assistant handoff output for question-like input", () => {
    const candidate = "好的，请告诉我你的问题。";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags soft english assistant promise output", () => {
    const candidate = "I'd be happy to rewrite this for you.";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags english polished-question labels without an assistant opener", () => {
    const candidate = "The polished question is: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("does not flag normal question cleanup output", () => {
    const candidate = "What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(false);
  });
});
