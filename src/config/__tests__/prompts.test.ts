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

  it("adds question preservation guidance for English negative-contraction dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "shouldn't we ship this today", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for irregular English negative contractions", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "can't we ship this today", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for contractionless English what's dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "whats the capital of france", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for indirect English wonder-if dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "i wonder if we should ship this today",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
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

  it("adds unresolved-choice guidance for English multi-option dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "should we ship this today or tomorrow or Monday",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form, unresolved alternatives, and punctuation");
  });

  it("adds question preservation guidance for Chinese quantity questions using 几", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "5+5等于几", "zh-CN");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("does not add question preservation guidance for non-question dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "please ship this today", "en");

    expect(prompt).not.toContain("QUESTION INTENT SAFETY:");
  });
});
