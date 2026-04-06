import { describe, expect, it } from "vitest";
import ReasoningService from "../ReasoningService";

describe("ReasoningService strict mode", () => {
  it("falls back to cleanup when question dictation is rewritten into an answer", () => {
    const source = "what is the capital of france";
    const candidate = "The capital of France is Paris.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("keeps question-shaped cleanup output when the question intent is preserved", () => {
    const source = "what is the capital of france";
    const candidate = "What is the capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when a Chinese question is rewritten into a declarative answer", () => {
    const source = "这个要改吗";
    const candidate = "这个需要修改。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English yes-no dictation ending with or not is rewritten into an answer", () => {
    const source = "we should ship this today or not";
    const candidate = "We should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English alternative-choice dictation is rewritten into a single answer", () => {
    const source = "we ship this today or tomorrow";
    const candidate = "We ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese yes-no dictation ending is rewritten into a statement", () => {
    const source = "这个方案行不行";
    const candidate = "这个方案可行。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a generic Chinese A-not-A question is rewritten into a statement", () => {
    const source = "现在去不去";
    const candidate = "现在去吧。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when a preserved English question has an appended answer", () => {
    const source = "what is the capital of france";
    const candidate = "What is the capital of France? The capital of France is Paris.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a preserved English question has an appended answer in the same sentence", () => {
    const source = "what is the capital of france";
    const candidate = "What is the capital of France the capital of France is Paris.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a preserved Chinese question has an appended answer", () => {
    const source = "这个要改吗";
    const candidate = "这个要改吗？需要修改。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a paraphrased Chinese question appends an answer without spaces", () => {
    const source = "这个要改吗";
    const candidate = "这个需要改吗？需要修改。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps multiple question sentences when they all stay question-shaped", () => {
    const source = "what changed in the deployment flow and why did it happen";
    const candidate = "What changed in the deployment flow? Why did it happen?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when a paraphrased English question appends an answer without spaces", () => {
    const source = "tell me if we need to backfill the old records";
    const candidate = "Do we need to backfill the old records?We need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when a contraction-led English question is rewritten into an answer", () => {
    const source = "shouldn't we ship this today";
    const candidate = "We should not ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("keeps contraction-led English question cleanup when the question intent is preserved", () => {
    const source = "shouldn't we ship this today";
    const candidate = "Shouldn't we ship this today?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when a Chinese math question ending in 几 is rewritten into an answer", () => {
    const source = "5+5等于几";
    const candidate = "5+5等于10。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English lead-in clause question is rewritten into an answer", () => {
    const source = "for this migration do we need to backfill the old records";
    const candidate = "For this migration, we need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English fragment question is rewritten into an answer", () => {
    const source = "any blockers with the migration rollout today";
    const candidate = "There are blockers with today's migration rollout.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an indirect English question is rewritten into an answer", () => {
    const source = "i wonder if we need to backfill the old records";
    const candidate = "We need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when a find-out-if dictation is rewritten into an answer", () => {
    const source = "find out if we need to backfill the old records";
    const candidate = "We need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when a need-to-know whether dictation is rewritten into an answer", () => {
    const source = "i need to know whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an imperative tell-me-if dictation is rewritten into an answer", () => {
    const source = "tell me if we need to backfill the old records";
    const candidate = "We need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an imperative advise-whether dictation is rewritten into an answer", () => {
    const source = "please advise whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps imperative advise-whether cleanup when the question intent is preserved", () => {
    const source = "please advise whether we should ship this today";
    const candidate = "Please advise whether we should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("keeps imperative tell-me-if cleanup when the question intent is preserved", () => {
    const source = "tell me if we need to backfill the old records";
    const candidate = "Tell me if we need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when an English negative tag question is rewritten into an answer", () => {
    const source = "we should ship this today shouldn't we";
    const candidate = "We should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps English tag question cleanup when the question intent is preserved", () => {
    const source = "the migration is ready is it";
    const candidate = "The migration is ready, is it?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when a bare whether-clause dictation is rewritten into an answer", () => {
    const source = "whether we need to backfill the old records";
    const candidate = "We need to backfill the old records.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an indirect Chinese question is rewritten into an answer", () => {
    const source = "我想知道这个要不要改";
    const candidate = "这个需要修改。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps English fragment question cleanup when the question intent is preserved", () => {
    const source = "any blockers with the migration rollout today";
    const candidate = "Any blockers with the migration rollout today?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });
});

describe("ReasoningService subtle answer patterns", () => {
  it("falls back when output starts with 'Sure' lead-in", () => {
    const source = "update the meeting notes";
    const candidate = "Sure, I'll update the meeting notes.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output starts with 'Of course' lead-in", () => {
    const source = "send the email to john";
    const candidate = "Of course, I'll send the email to John.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output starts with 'Certainly' lead-in", () => {
    const source = "create a new task";
    const candidate = "Certainly! I'll create a new task for you.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output starts with 'Absolutely' lead-in", () => {
    const source = "schedule the call";
    const candidate = "Absolutely, let me schedule the call.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output starts with Chinese affirmative lead-in '好的'", () => {
    const source = "更新会议记录";
    const candidate = "好的，我来更新会议记录。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output starts with Chinese affirmative lead-in '没问题'", () => {
    const source = "帮我发邮件";
    const candidate = "没问题，我会帮你发邮件。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps cleanup that doesn't have answer-like lead-in", () => {
    const source = "um can you uh update the meeting notes";
    const candidate = "Update the meeting notes.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when output contains 'I'd be happy to' phrase", () => {
    const source = "review the document";
    const candidate = "I'd be happy to review the document.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output contains 'Let me' assistant phrase", () => {
    const source = "check the schedule";
    const candidate = "Let me check the schedule for you.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when output starts with 'No problem' lead-in", () => {
    const source = "add it to the calendar";
    const candidate = "No problem, I'll add it to the calendar.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });
});
