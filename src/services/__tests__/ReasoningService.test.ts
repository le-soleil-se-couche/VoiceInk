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

  it("falls back when an English negative-contraction question is rewritten into a statement", () => {
    const source = "shouldn't we ship this today";
    const candidate = "We should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an irregular English negative-contraction question is rewritten into a statement", () => {
    const source = "can't we ship this today";
    const candidate = "We should ship this today.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a contractionless English what's-question is rewritten into an answer", () => {
    const source = "whats the capital of france";
    const candidate = "The capital of France is Paris.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese question is rewritten into a declarative answer", () => {
    const source = "这个要改吗";
    const candidate = "这个需要修改。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese why-question is rewritten into a statement", () => {
    const source = "为什么会这样";
    const candidate = "这是系统延迟导致的。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an inline Chinese what-question is rewritten into an explanation", () => {
    const source = "这个是什么原因";
    const candidate = "这是网络配置问题。";

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

  it("falls back when a Chinese alternative-choice dictation is rewritten into a resolved statement", () => {
    const source = "这个需求我们今天发还是明天发比较稳妥";
    const candidate = "这个需求我们今天发比较稳妥。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a pronoun-led Chinese alternative choice is rewritten into a single option", () => {
    const source = "我们今天发还是明天发";
    const candidate = "我们今天发。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English alternative-choice question is rewritten into a single option", () => {
    const source = "should we ship this today or tomorrow";
    const candidate = "Should we ship this today?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English multi-option choice is rewritten into a single option", () => {
    const source = "should we ship this today or tomorrow or Monday";
    const candidate = "Should we ship this today?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a long Chinese quantity question using 几 is rewritten into a resolved answer", () => {
    const source = "我们这个接口在正式发布之前一共要重试几次才比较稳妥";
    const candidate = "我们这个接口在正式发布之前一共要重试三次才比较稳妥。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese duration question is rewritten into a resolved answer", () => {
    const source = "这个多久能上线";
    const candidate = "这个明天能上线。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });
});
