import { describe, expect, it } from "vitest";
import { getSystemPrompt } from "../prompts";

describe("getSystemPrompt question-intent safety", () => {
  it("adds question preservation guidance for English question-like dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "what is the capital of france", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
    expect(prompt).toContain(
      "do not convert the dictation into an answer, explanation, advice, or resolution."
    );
  });

  it("adds question preservation guidance for Chinese A-not-A dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "这个方案行不行", "zh-CN");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
  });

  it("adds unresolved-choice guidance for Chinese alternative dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "zh-CN",
      "这个需求我们今天发还是明天发比较稳妥",
      "zh-CN"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form, unresolved alternatives, and punctuation");
  });

  it("does not add question preservation guidance for non-question dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "please ship this today", "en");

    expect(prompt).not.toContain("QUESTION INTENT SAFETY:");
  });
});
