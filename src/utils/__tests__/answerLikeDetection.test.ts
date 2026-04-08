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

  it("flags chinese assistant help-offer questions without an acknowledgement prefix", () => {
    const candidate = "请问有什么可以帮您的吗？";

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

  // New tests for strengthened answer-like detection patterns
  it("flags english 'I've prepared' assistant wrapper output", () => {
    const candidate = "I've prepared the polished version: What is the capital of France?";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english 'I have created' assistant wrapper output", () => {
    const candidate = "I have created a rewritten version of your text.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english 'I've drafted' assistant wrapper output", () => {
    const candidate = "I've drafted the cleaned-up message for you.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english 'Here's what I have prepared' assistant introduction", () => {
    const candidate = "Here's what I have prepared for your dictation.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english 'Here is how we have written' assistant introduction", () => {
    const candidate = "Here is how we have written the polished text.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags chinese '我已经准备好' assistant promise output", () => {
    const candidate = "我已经准备好修改后的版本了。";

    expect(isAnswerLikeText(candidate, 10)).toBe(true);
  });

  it("flags chinese '我已帮你写好' assistant promise output", () => {
    const candidate = "我已帮你写好整理好的内容。";

    expect(isAnswerLikeText(candidate, 10)).toBe(true);
  });

  it("flags chinese '我替你整理好' assistant promise output", () => {
    const candidate = "我替你整理好润色后的文本了。";

    expect(isAnswerLikeText(candidate, 10)).toBe(true);
  });

  it("flags english 'Below you will find' assistant wrapper output", () => {
    const candidate = "Below you will find the polished version of your text.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags english 'Below is what' assistant wrapper output", () => {
    const candidate = "Below is what I have prepared for your review.";

    expect(isAnswerLikeText(candidate, 20)).toBe(true);
  });

  it("flags chinese '以下是我准备' assistant wrapper output", () => {
    const candidate = "以下是我准备修改后的内容：";

    expect(isAnswerLikeText(candidate, 10)).toBe(true);
  });

  it("flags chinese '下面是我为您整理' assistant wrapper output", () => {
    const candidate = "下面是我为您整理的版本：";

    expect(isAnswerLikeText(candidate, 10)).toBe(true);
  });

  it("flags chinese '以下是我润色好的' assistant wrapper output", () => {
    const candidate = "以下是我润色好的文本。";

    expect(isAnswerLikeText(candidate, 10)).toBe(true);
  });
});