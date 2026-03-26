import { describe, expect, it } from "vitest";
import {
  isAnswerLikeTranscriptionOutput,
  isQuestionLikeDictation,
  shouldBlockQuestionAnswerization,
} from "../answerGuard";

describe("answerGuard", () => {
  it("detects existing assistant-style ASR disclaimers", () => {
    expect(
      isAnswerLikeTranscriptionOutput("As an AI language model, I can't help with that request directly.")
    ).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("short text")).toBe(false);
  });

  it("detects Chinese and English question-like dictation", () => {
    expect(isQuestionLikeDictation("5+5等于几")).toBe(true);
    expect(isQuestionLikeDictation("你明天会来吗")).toBe(true);
    expect(isQuestionLikeDictation("What time is the deploy?")).toBe(true);
    expect(isQuestionLikeDictation("明天继续部署")).toBe(false);
  });

  it("blocks question dictation when reasoning turns it into an answer", () => {
    expect(shouldBlockQuestionAnswerization("5+5等于几", "10")).toBe(true);
    expect(shouldBlockQuestionAnswerization("你明天会来吗", "我明天会来")).toBe(true);
    expect(shouldBlockQuestionAnswerization("What time is the deploy?", "The deploy is at 5 PM.")).toBe(
      true
    );
  });

  it("allows outputs that preserve the original question intent", () => {
    expect(shouldBlockQuestionAnswerization("5+5等于几", "5 + 5 等于几？")).toBe(false);
    expect(shouldBlockQuestionAnswerization("What time is the deploy?", "What time is the deploy?")).toBe(
      false
    );
    expect(shouldBlockQuestionAnswerization("明天继续部署", "明天继续部署。")).toBe(false);
  });
});
