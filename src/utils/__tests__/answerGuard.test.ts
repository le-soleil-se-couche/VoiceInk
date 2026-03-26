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
    expect(isQuestionLikeDictation("他明天来不来")).toBe(true);
    expect(isQuestionLikeDictation("What time is the deploy?")).toBe(true);
    expect(isQuestionLikeDictation("Has the deploy finished")).toBe(true);
    expect(isQuestionLikeDictation("we should ship this today or not")).toBe(true);
    expect(isQuestionLikeDictation("we should ship this today yes or no")).toBe(true);
    expect(isQuestionLikeDictation("I wonder if this needs a migration")).toBe(true);
    expect(isQuestionLikeDictation("tell me if this needs a migration")).toBe(true);
    expect(isQuestionLikeDictation("明天继续部署")).toBe(false);
  });

  it("blocks question dictation when reasoning turns it into an answer", () => {
    expect(shouldBlockQuestionAnswerization("5+5等于几", "10")).toBe(true);
    expect(shouldBlockQuestionAnswerization("你明天会来吗", "我明天会来")).toBe(true);
    expect(shouldBlockQuestionAnswerization("他明天来不来", "他明天来")).toBe(true);
    expect(shouldBlockQuestionAnswerization("5+5等于几", "5 + 5 等于几？答案是 10。")).toBe(true);
    expect(shouldBlockQuestionAnswerization("他明天来不来", "他明天来不来？他明天来。")).toBe(true);
    expect(shouldBlockQuestionAnswerization("we should ship this today or not", "We should ship this today.")).toBe(
      true
    );
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "What time is the deploy? The deploy is at 5 PM."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization("I wonder if this needs a migration", "This needs a migration.")
    ).toBe(true);
    expect(shouldBlockQuestionAnswerization("What time is the deploy?", "The deploy is at 5 PM.")).toBe(
      true
    );
    expect(shouldBlockQuestionAnswerization("Has the deploy finished", "The deploy has finished.")).toBe(
      true
    );
  });

  it("allows outputs that preserve the original question intent", () => {
    expect(shouldBlockQuestionAnswerization("5+5等于几", "5 + 5 等于几？")).toBe(false);
    expect(shouldBlockQuestionAnswerization("他明天来不来", "他明天来不来？")).toBe(false);
    expect(shouldBlockQuestionAnswerization("What time is the deploy?", "What time is the deploy?")).toBe(
      false
    );
    expect(shouldBlockQuestionAnswerization("we should ship this today or not", "Should we ship this today?")).toBe(
      false
    );
    expect(shouldBlockQuestionAnswerization("明天继续部署", "明天继续部署。")).toBe(false);
  });

  it("blocks assistant-style follow-up questions for question dictation", () => {
    expect(shouldBlockQuestionAnswerization("5+5等于几", "你想知道五加五等于多少吗？")).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "Would you like me to tell you what time the deploy is?"
      )
    ).toBe(true);
  });
});
