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

  it("falls back when a Chinese yes-no dictation ending is rewritten into a statement", () => {
    const source = "这个方案行不行";
    const candidate = "这个方案可行。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese arithmetic question is rewritten into an answer", () => {
    const source = "5+5等于几";
    const candidate = "5+5等于10。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese quantity question is rewritten into a statement", () => {
    const source = "这个多少钱";
    const candidate = "这个要 20 元。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into an assistant follow-up question", () => {
    const source = "what is the capital of france";
    const candidate = "Would you like me to tell you the capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into a soft assistant handoff", () => {
    const source = "what is the capital of france";
    const candidate = "Happy to help. What do you need?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in an English assistant preface", () => {
    const source = "what is the capital of france";
    const candidate = "Sure, here's the polished question: What is the capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a polished-question label without an opener", () => {
    const source = "what is the capital of france";
    const candidate = "The polished question is: What is the capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a stronger English assistant preface", () => {
    const source = "what is the capital of france";
    const candidate = "Absolutely, here's the cleaned-up question: What is the capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a space-separated cleaned up label", () => {
    const source = "what is the capital of france";
    const candidate = "Sure, here's the cleaned up question: What is the capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a Chinese assistant preface", () => {
    const source = "这个要改吗";
    const candidate = "好的，这是润色后的问题：这个要改吗？";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into an english clarification prompt", () => {
    const source = "what is the capital of france";
    const candidate = "Please provide the text you'd like me to polish.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese question dictation is rewritten into an assistant help offer", () => {
    const source = "这个要改吗";
    const candidate = "需要我帮你修改这个吗？";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when long imperative dictation is rewritten into a Chinese assistant promise", () => {
    const source = "把这个段落整理清楚然后发给产品经理确认一下";
    const candidate = "我来帮你整理这个段落，然后发给产品经理确认。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when long imperative dictation is rewritten into an English assistant promise", () => {
    const source = "clean up this project update and send it to the product manager today";
    const candidate = "I'll clean up this project update and send it to the product manager today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });
});
