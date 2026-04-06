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

import { getSystemPrompt } from "../prompts";

describe("email context protection", () => {
  it("includes email protection instructions when context is email", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Mail",
        processId: 1234,
        platform: "darwin" as const,
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).toContain("EMAIL PROTECTION");
    expect(prompt).toContain("Preserve email addresses");
    expect(prompt).toContain("subject lines");
    expect(prompt).toContain("signatures exactly");
    expect(prompt).toContain("greeting/closing conventions");
    expect(prompt).toContain("Dear X, Hi X, Best regards, Thanks");
    expect(prompt).toContain("quoted reply text");
  });

  it("does not include email protection when context is not email", () => {
    const context = {
      context: "general" as const,
      intent: "cleanup" as const,
      confidence: 0.6,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: {
        appName: null,
        processId: null,
        platform: "darwin" as const,
        source: "renderer-fallback" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).not.toContain("EMAIL PROTECTION");
  });
});
