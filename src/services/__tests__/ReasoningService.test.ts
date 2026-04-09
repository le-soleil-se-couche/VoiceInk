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

  it("falls back when apostrophe-less English question dictation is rewritten into an answer", async () => {
    const source = "whats the capital of france";
    const candidate = "The capital of France is Paris.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("keeps apostrophe-less English question cleanup output when question intent is preserved", async () => {
    const source = "hows that migration plan looking to you right now";
    const candidate = "How's that migration plan looking to you right now?";

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

  it("falls back when a Chinese arithmetic question is rewritten into a numeric answer", async () => {
    const source = "5+5等于几";
    const candidate = "5+5等于10。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese value question ending with shi duoshao is rewritten into a value", async () => {
    const source = "这个版本号是多少";
    const candidate = "这个版本号是3.2.1。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
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

  it("falls back when a Chinese arithmetic question is rewritten into an answer", async () => {
    const source = "5+5等于几";
    const candidate = "5+5等于10。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese quantity question is rewritten into a statement", async () => {
    const source = "这个多少钱";
    const candidate = "这个要 20 元。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into an assistant follow-up question", async () => {
    const source = "what is the capital of france";
    const candidate = "Would you like me to tell you the capital of France?";

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

  it("falls back when a question dictation is rewritten into a soft assistant handoff", async () => {
    const source = "what is the capital of france";
    const candidate = "Happy to help. What do you need?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an English assistant wrapper question omits punctuation after the wrapper", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure what is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese question dictation is rewritten into a Chinese assistant help-offer question", async () => {
    const source = "这个要改吗";
    const candidate = "请问有什么可以帮您的吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an indirect English question dictation is rewritten into an answer", async () => {
    const source = "I wonder if this needs to change";
    const candidate = "This needs to change.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when an indirect Chinese question dictation is rewritten into an answer", async () => {
    const source = "我想知道这个要不要改";
    const candidate = "这个需要修改。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in an English assistant preface", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure, here's the polished question: What is the capital of France?";

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

  it("falls back when a question dictation is wrapped in a polished-question label without an opener", async () => {
    const source = "what is the capital of france";
    const candidate = "The polished question is: What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a stronger English assistant preface", async () => {
    const source = "what is the capital of france";
    const candidate = "Absolutely, here's the cleaned-up question: What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a space-separated cleaned up label", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure, here's the cleaned up question: What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a more polished version label", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure, here's the more polished version: What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a clearer version label", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure, here's a clearer version: What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a bare english polished-question label", async () => {
    const source = "what is the capital of france";
    const candidate = "Polished question: What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a Chinese assistant preface", async () => {
    const source = "这个要改吗";
    const candidate = "好的，这是润色后的问题：这个要改吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is wrapped in a bare Chinese polished-question label", async () => {
    const source = "这个要改吗";
    const candidate = "润色后的问题：这个要改吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese question dictation is wrapped in a more natural label", async () => {
    const source = "这个要改吗";
    const candidate = "这是更自然的说法：这个要改吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into an english clarification prompt", async () => {
    const source = "what is the capital of france";
    const candidate = "Please provide the text you'd like me to polish.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into a question-shaped assistant clarifier", async () => {
    const source = "what is the capital of france";
    const candidate = "What would you like to know?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten into an assistant next-step prompt", async () => {
    const source = "what is the capital of france";
    const candidate = "Let me know what you'd like me to do.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a question dictation is rewritten with a bare english acknowledgement prefix", async () => {
    const source = "what is the capital of france";
    const candidate = "Sure. What is the capital of France?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese question dictation is rewritten into an assistant help offer", async () => {
    const source = "这个要改吗";
    const candidate = "需要我帮你修改这个吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when a Chinese assistant wrapper question omits punctuation after the wrapper", async () => {
    const source = "这个要改吗";
    const candidate = "好的这个要改吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when long imperative dictation is rewritten into a Chinese assistant promise", async () => {
    const source = "把这个段落整理清楚然后发给产品经理确认一下";
    const candidate = "我来帮你整理这个段落，然后发给产品经理确认。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("falls back when long imperative dictation is rewritten into an English assistant promise", async () => {
    const source = "clean up this project update and send it to the product manager today";
    const candidate = "I'll clean up this project update and send it to the product manager today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats find-out-if dictation as question intent and blocks direct answers", async () => {
    const source = "i need to find out if we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats tell-me-whether dictation as question intent and blocks direct answers", async () => {
    const source = "tell me whether we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats check-if dictation as question intent and blocks direct answers", async () => {
    const source = "check if we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats i-wonder-if dictation as question intent and blocks direct answers", async () => {
    const source = "i wonder if we should ship this today";
    const candidate = "We should ship this today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("treats Chinese want-to-know dictation as question intent and blocks direct answers", async () => {
    const source = "我想知道为什么我们今天还不能把这个版本发出去";
    const candidate = "我想知道为什么我们今天还不能把这个版本发出去，因为还有几个阻塞 bug 没修完。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 1,
    });

    expect(result).toBe(source);
  });

  it("falls back when an indirect dictation question is rewritten into assistant dialogue", async () => {
    const source = "i need to find out if we should ship this today";
    const candidate = "Can you tell me if we should ship this today?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("passes cleanup-only deletions even when overlap thresholds are aggressive", async () => {
    const source = "嘟我想说这个项目其实有很多问题";
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

describe("over-optimization prevention", () => {
  it("preserves Chinese numeral in casual context when source uses Han characters", async () => {
    const source = "我需要三个人来处理这个项目";
    const candidate = "我需要 3 个人来处理这个项目";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("preserves Chinese numeral phrase for quantity in casual speech", async () => {
    const source = "这件事有两个解决方案";
    const candidate = "这件事有 2 个解决方案";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("preserves Chinese ordinal expression in casual context", async () => {
    const source = "这是第三种方法";
    const candidate = "这是第 3 种方法";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("preserves English conversational number when dictated as word", async () => {
    const source = "I have one thing to add";
    const candidate = "I have 1 thing to add";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("preserves English two people casual phrasing", async () => {
    const source = "two people volunteered";
    const candidate = "2 people volunteered";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("preserves formal date when strict mode cannot verify safety", async () => {
    const source = "January fifteenth twenty twenty-six";
    const candidate = "January 15, 2026";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("allows formal time conversion", async () => {
    const source = "meeting at five thirty PM";
    const candidate = "meeting at 5:30 PM";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(candidate);
  });

  it("preserves formal currency when strict mode cannot verify safety", async () => {
    const source = "costs three hundred dollars";
    const candidate = "costs $300";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });
});
