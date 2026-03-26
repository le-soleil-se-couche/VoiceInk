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
});
