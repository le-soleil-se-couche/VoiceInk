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

  it("falls back when a long Chinese A-not-A question is rewritten into a statement", () => {
    const source = "我们这次发布前把监控只开核心告警稳不稳";
    const candidate = "我们这次发布前把监控只开核心告警很稳。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a long repeated-phrase Chinese A-not-A question is rewritten into a statement", () => {
    const source = "按照现在这个发布时间安排靠谱不靠谱";
    const candidate = "按照现在这个发布时间安排很靠谱。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });
});
