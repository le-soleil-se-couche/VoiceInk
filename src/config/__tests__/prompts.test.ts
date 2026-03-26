import { describe, expect, it } from "vitest";
import { getAnswerLikeRetryPrompt } from "../prompts";

describe("getAnswerLikeRetryPrompt", () => {
  it("builds an English transcription-only retry prompt that blocks assistant wrappers", () => {
    const prompt = getAnswerLikeRetryPrompt([], "en");

    expect(prompt).toContain("Transcription only.");
    expect(prompt).toContain("If the speaker dictated a question, transcribe that question itself.");
    expect(prompt).toContain("Do not add assistant wrappers");
  });

  it("preserves dictionary hints ahead of retry instructions", () => {
    const prompt = getAnswerLikeRetryPrompt(["VoiceInk", "API"], "en");

    expect(prompt.startsWith("VoiceInk, API")).toBe(true);
    expect(prompt).toContain("Return only the spoken words.");
  });

  it("builds a Chinese retry prompt for Chinese UI", () => {
    const prompt = getAnswerLikeRetryPrompt(["VoiceInk"], "zh-CN");

    expect(prompt).toContain("仅做语音转写。");
    expect(prompt).toContain("如果用户说的是问题，就直接转写这个问题本身。");
    expect(prompt).toContain("不要添加“好的”");
  });
});
