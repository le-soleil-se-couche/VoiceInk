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

  it("falls back when a Chinese math question without punctuation is rewritten into an answer", () => {
    const source = "5+5等于几";
    const candidate = "5+5等于10。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese price question without punctuation is rewritten into a statement", () => {
    const source = "这个多少钱";
    const candidate = "这个价格是 99 元。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a colloquial Chinese question ending with 没 is rewritten into a statement", () => {
    const source = "这个接口有问题没";
    const candidate = "这个接口有问题。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question is rewritten into an answer-shaped sentence that still ends like a question", () => {
    const source = "what is the capital of france";
    const candidate = "The capital of France is Paris?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese math question is rewritten into a numeric answer with a question mark", () => {
    const source = "5+5等于几";
    const candidate = "答案是10？";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a long Chinese question is rewritten with a confirmation lead-in", () => {
    const source = "这个数据库迁移方案是不是应该今天晚上就开始执行";
    const candidate = "是的，这个数据库迁移方案应该今天晚上开始执行吗？";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a negative-contraction English question is rewritten into a statement", () => {
    const source = "isn't the staging deployment supposed to finish before we start migration";
    const candidate = "The staging deployment is supposed to finish before we start migration.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English trailing tag question is rewritten into a statement", () => {
    const source = "we already merged the fallback patch, didn't we";
    const candidate = "We already merged the fallback patch.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an inverted English yes-no question is rewritten into a subject-first answer with a question mark", () => {
    const source = "should we ship today";
    const candidate = "We should ship today?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English wh-question is rewritten into a noun-phrase question", () => {
    const source = "what is the capital of france";
    const candidate = "The capital of France?";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese price question is rewritten into an answer-shaped question", () => {
    const source = "这个多少钱";
    const candidate = "这个价格是99元？";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a long dictation is wrapped in an assistant-style polished-version preamble", () => {
    const source = "please deploy the patch to staging after lunch and monitor the logs for errors";
    const candidate =
      "Sure, here's the polished version: Please deploy the patch to staging after lunch and monitor the logs for errors.";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese dictation is wrapped in a polished-version preamble", () => {
    const source = "请把今天的发布说明整理好然后发到测试群里";
    const candidate = "好的，以下是润色后的版本：请把今天的发布说明整理好，然后发到测试群里。";

    const result = ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });
});
