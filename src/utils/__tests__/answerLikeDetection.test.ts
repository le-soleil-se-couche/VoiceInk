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

  it("flags english cleaned up labels with a space-separated assistant wrapper", () => {
    const candidate = "Sure, here's the cleaned up question: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english assistant wrappers that say more polished version", () => {
    const candidate = "Sure, here's the more polished version: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english assistant wrappers that present a clearer version", () => {
    const candidate = "Sure, here's a clearer version: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags bare english polished-question labels without an assistant opener", () => {
    const candidate = "Polished question: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english clarification prompts that ask for text to polish", () => {
    const candidate = "Please provide the text you'd like me to polish.";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags question-shaped english assistant clarification prompts", () => {
    const candidate = "What would you like to know?";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags english assistant follow-up prompts that ask what to do next", () => {
    const candidate = "Let me know what you'd like me to do.";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags english assistant option prompts for a polished version", () => {
    const candidate = "Would you like the polished version?";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("flags english acknowledgement wrappers before a direct rewritten question", () => {
    const candidate = "Sure. What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags short arithmetic answers even when the minimum length is high", () => {
    const candidate = "5+5等于10。";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags short english answer labels even when the minimum length is high", () => {
    const candidate = "Answer is 10.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags bare chinese polished-question labels without an assistant opener", () => {
    const candidate = "润色后的问题：这个要改吗？";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags chinese assistant wrappers that present a more natural version", () => {
    const candidate = "这是更自然的说法：这个要改吗？";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags chinese acknowledgement wrappers before a direct rewritten question", () => {
    const candidate = "好的，这个要改吗？";

    expect(isAnswerLikeText(candidate, 6)).toBe(true);
  });

  it("does not flag normal question cleanup output", () => {
    const candidate = "What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(false);
  });
});
