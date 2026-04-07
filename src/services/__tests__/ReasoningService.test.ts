import { afterEach, describe, expect, it, vi } from "vitest";
import ReasoningService from "../ReasoningService";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReasoningService strict mode", () => {
  it("falls back to cleanup when question dictation is rewritten into an answer", async () => {
    const source = "what is the capital of france";
    const candidate = "The capital of France is Paris.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("keeps question-shaped cleanup output when the question intent is preserved", async () => {
    const source = "what is the capital of france";
    const candidate = "What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when a Chinese question is rewritten into a declarative answer", async () => {
    const source = "这个要改吗";
    const candidate = "这个需要修改。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English yes-no dictation ending with or not is rewritten into an answer", async () => {
    const source = "we should ship this today or not";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese yes-no dictation ending is rewritten into a statement", async () => {
    const source = "这个方案行不行";
    const candidate = "这个方案可行。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is preserved and then answered in the same output", async () => {
    const source = "what is the capital of france";
    const candidate = "What is the capital of France? The capital of France is Paris.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when assistant-style wrapper keeps the question but shifts to dialogue tone", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure, what is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when sentence-style assistant acknowledgement is prepended to a question cleanup", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure. What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when assistant question-compliment preface is prepended to a question cleanup", async () => {
    const source = "what is the capital of france";
    const candidate = "Great question. What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when that's-a-great-question preface is prepended to a question cleanup", async () => {
    const source = "what is the capital of france";
    const candidate = "That's a great question. What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when acknowledgement preface is added without punctuation", async () => {
    const source = "we should update the api docs before launch this week";
    const candidate = "Yes we should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when definitely-preface is added before non-question cleanup", async () => {
    const source = "we should update the api docs before launch this week";
    const candidate = "Definitely, we should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when recommendation preface is added before non-question cleanup", async () => {
    const source =
      "we should schedule the release planning meeting with marketing and product for friday morning after qa review";
    const candidate =
      "I recommend we schedule the release planning meeting with marketing and product for Friday morning after QA review.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when answer-statement preface is added before non-question cleanup", async () => {
    const source = "we should update the api docs before launch this week";
    const candidate = "The answer is we should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when sentence-style negative answer preface is prepended to a question cleanup", async () => {
    const source = "what is the capital of france";
    const candidate = "No. What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when Chinese assistant wrapper question appears in strict mode", async () => {
    const source = "这个要改吗";
    const candidate = "好的，这个要改吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when Chinese sentence-style acknowledgement is prepended to question cleanup", async () => {
    const source = "这个要改吗";
    const candidate = "好的。这个要改吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("keeps dictated acknowledgement openings when they are present in source content", async () => {
    const source = "sure we should ship this today";
    const candidate = "Sure, we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("keeps dictated definitely openings when they are present in source content", async () => {
    const source = "definitely we should ship this today";
    const candidate = "Definitely, we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("keeps dictated recommendation openings when they are present in source content", async () => {
    const source =
      "i recommend we schedule the release planning meeting with marketing and product for friday morning after qa review";
    const candidate =
      "I recommend we schedule the release planning meeting with marketing and product for Friday morning after QA review.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("keeps dictated answer-statement openings when they are present in source content", async () => {
    const source = "the answer is we should update the api docs before launch this week";
    const candidate = "The answer is we should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("keeps dictated question-compliment openings when they are present in source content", async () => {
    const source = "great question what is the capital of france";
    const candidate = "Great question: what is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps dictated that's-a-great-question opening when present in source content", async () => {
    const source = "that's a great question what is the capital of france";
    const candidate = "That's a great question: what is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps dictated negative openings when they are present in source content", async () => {
    const source = "no we should not ship this today";
    const candidate = "No, we should not ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when non-question cleanup is prefaced with an assistant polished-version wrapper", async () => {
    const source = "we should update the api docs before launch this week";
    const candidate =
      "Sure, here's the polished version: We should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when Chinese polished-version wrapper is added before cleaned dictation", async () => {
    const source = "我们明天把版本说明发给测试组再上线";
    const candidate = "好的，这是整理后的版本：我们明天把版本说明发给测试组再上线。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when non-question cleanup is prefaced with a label wrapper", async () => {
    const source = "we should update the api docs before launch this week";
    const candidate = "Rewritten text: We should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when non-question cleanup is prefaced with an answer label", async () => {
    const source = "we should update the api docs before launch this week";
    const candidate = "Answer: We should update the API docs before launch this week.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when Chinese cleanup is prefaced with a label wrapper", async () => {
    const source = "我们明天把版本说明发给测试组再上线";
    const candidate = "润色后文本：我们明天把版本说明发给测试组再上线。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when Chinese cleanup is prefaced with an answer label", async () => {
    const source = "我们明天把版本说明发给测试组再上线";
    const candidate = "答案：我们明天把版本说明发给测试组再上线。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when Chinese cleanup is prefaced with an answer statement", async () => {
    const source = "我们明天把版本说明发给测试组再上线";
    const candidate = "答案是我们明天把版本说明发给测试组再上线。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps dictated Chinese answer-statement openings when they are present in source content", async () => {
    const source = "答案是我们明天把版本说明发给测试组再上线";
    const candidate = "答案是我们明天把版本说明发给测试组再上线。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("treats find-out-if dictation as question intent and blocks direct answers", async () => {
    const source = "i need to find out if we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats let-me-know-if dictation as question intent and blocks direct answers", async () => {
    const source = "let me know if we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats need-to-know-whether dictation as question intent and blocks direct answers", async () => {
    const source = "i need to know whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats i-wonder-whether dictation as question intent and blocks direct answers", async () => {
    const source = "i wonder whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats i’m-wondering-whether dictation as question intent and blocks direct answers", async () => {
    const source = "i’m wondering whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats i’m-curious-whether dictation as question intent and blocks direct answers", async () => {
    const source = "i'm curious whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats i'd-like-to-know-if dictation as question intent and blocks direct answers", async () => {
    const source = "i'd like to know if we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats statement-shaped confirm requests as question intent and blocks direct answers", async () => {
    const source = "please confirm we should ship this today";
    const candidate = "Yes, we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats advise-whether dictation as question intent and blocks direct answers", async () => {
    const source = "please advise whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats discourse-marker-prefixed yes-no dictation as question intent and blocks direct answers", async () => {
    const source = "yes should we ship this today";
    const candidate = "Yes, we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps let-me-know-if cleanup when indirect question intent is preserved", async () => {
    const source = "let me know if we should ship this today";
    const candidate = "Let me know if we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps discourse-marker-prefixed yes-no cleanup when question intent is preserved", async () => {
    const source = "yes should we ship this today";
    const candidate = "Should we ship this today?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("keeps need-to-know-whether cleanup when indirect question intent is preserved", async () => {
    const source = "i need to know whether we should ship this today";
    const candidate = "I need to know whether we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps i-wonder-whether cleanup when indirect question intent is preserved", async () => {
    const source = "i wonder whether we should ship this today";
    const candidate = "I wonder whether we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps i’m-wondering-whether cleanup when indirect question intent is preserved", async () => {
    const source = "i’m wondering whether we should ship this today";
    const candidate = "I’m wondering whether we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps i’m-curious-whether cleanup when indirect question intent is preserved", async () => {
    const source = "i'm curious whether we should ship this today";
    const candidate = "I'm curious whether we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps i'd-like-to-know-if cleanup when indirect question intent is preserved", async () => {
    const source = "i'd like to know if we should ship this today";
    const candidate = "I'd like to know if we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps statement-shaped confirm cleanup when question intent is preserved", async () => {
    const source = "please confirm we should ship this today";
    const candidate = "Please confirm we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("keeps advise-whether cleanup when indirect question intent is preserved", async () => {
    const source = "please advise whether we should ship this today";
    const candidate = "Please advise whether we should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("passes cleanup-only deletions even when overlap thresholds are aggressive", async () => {
    const source = "嗯我想说这个项目其实有很多问题";
    const candidate = "我想说这个项目有很多问题";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictOverlapThreshold: 0.95,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });

  it("recovers from answer-like cleanup via cleanup-only retry before falling back", async () => {
    const source = "这个要改吗";
    const candidate = "好的，这个需要修改。";
    const retrySpy = vi
      .spyOn(ReasoningService as any, "retryWithCleanupOnlyPrompt")
      .mockResolvedValue("这个要改吗？");

    const result = await ReasoningService.enforceStrictMode(
      source,
      candidate,
      { strictMode: true, strictShortInputThreshold: 1 },
      "openai",
      "gpt-test",
      null
    );

    expect(retrySpy).toHaveBeenCalledOnce();
    expect(result).toBe("这个要改吗？");
  });

  it("keeps short Chinese restart-question cleanup when overlap stays anchored", async () => {
    const source = "那个就是我的电我电脑上能跑吗";
    const candidate = "那个就是我的电脑上能跑吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 18,
      allowSafeShortPolish: true,
    });

    expect(result).toBe(candidate);
  });

  it("falls back when cleanup deletes later, more specific Chinese content", async () => {
    const source = "我电脑上，我的笔记本电脑上能做这个优化吗";
    const candidate = "我电脑上能做这个优化吗";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("keeps later, more specific Chinese self-correction when cleanup preserves it", async () => {
    const source = "我电脑上，我的笔记本电脑上能做这个优化吗";
    const candidate = "我的笔记本电脑上能做这个优化吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(candidate);
  });
});
