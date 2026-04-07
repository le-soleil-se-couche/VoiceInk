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

  it("falls back when Chinese assistant wrapper question appears in strict mode", async () => {
    const source = "这个要改吗";
    const candidate = "好的，这个要改吗？";

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

  it("removes sentence-initial Chinese discourse filler in strict short-input fallback", async () => {
    const source = "就是，今天发版";
    const candidate = "就是，今天发版。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("今天发版");
  });

  it("removes parenthetical Chinese discourse filler in strict short-input fallback", async () => {
    const source = "我们，那个，今天发版";
    const candidate = "我们，那个，今天发版。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes comma-appended sentence-final Chinese discourse filler 就是 in strict short-input fallback", async () => {
    const source = "我们今天发版，就是";
    const candidate = "我们今天发版，就是。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes comma-appended sentence-final Chinese discourse filler 那个 in strict short-input fallback", async () => {
    const source = "我们今天发版，那个";
    const candidate = "我们今天发版，那个。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("keeps lexical Chinese demonstrative phrase in strict short-input fallback", async () => {
    const source = "那个文件今天发版";
    const candidate = "那个文件今天发版。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler 你懂吗 in strict short-input fallback", async () => {
    const source = "你懂吗，今天发版";
    const candidate = "你懂吗，今天发版。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("今天发版");
  });

  it("removes parenthetical discourse filler 你懂吗 in strict short-input fallback", async () => {
    const source = "这个方案，你懂吗，今天发版";
    const candidate = "这个方案，你懂吗，今天发版。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("这个方案今天发版");
  });

  it("removes comma-appended sentence-final discourse filler 你懂吗 in strict short-input fallback", async () => {
    const source = "这个方案今天发版，你懂吗";
    const candidate = "这个方案今天发版，你懂吗。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("这个方案今天发版");
  });

  it("keeps lexical direct question 你懂吗 in strict short-input fallback", async () => {
    const source = "这个方案你懂吗";
    const candidate = "这个方案你懂吗？";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler like in strict short-input fallback", async () => {
    const source = "like, send update today";
    const candidate = "Like, send update today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler like with full-width comma in strict short-input fallback", async () => {
    const source = "like，send update today";
    const candidate = "Like，send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler like with ideographic comma in strict short-input fallback", async () => {
    const source = "like、send update today";
    const candidate = "Like、send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes parenthetical discourse filler like in strict short-input fallback", async () => {
    const source = "we should, like, ship";
    const candidate = "We should, like, ship.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical discourse filler like with full-width commas in strict short-input fallback", async () => {
    const source = "we should，like，ship";
    const candidate = "We should，like，ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical discourse filler like with ideographic commas in strict short-input fallback", async () => {
    const source = "we should、like、ship";
    const candidate = "We should、like、ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes comma-appended sentence-final discourse filler like in strict short-input fallback", async () => {
    const source = "we should ship today, like";
    const candidate = "We should ship today, like.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-appended sentence-final discourse filler like with full-width comma in strict short-input fallback", async () => {
    const source = "我们今天发版，like";
    const candidate = "我们今天发版，like。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes comma-appended sentence-final discourse filler like with ideographic comma in strict short-input fallback", async () => {
    const source = "我们今天发版、like";
    const candidate = "我们今天发版、like。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("keeps question-form sentence-final like in strict short-input fallback", async () => {
    const source = "we should ship today, like?";
    const candidate = "We should ship today, like?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("keeps lexical like in strict short-input fallback", async () => {
    const source = "i like apples";
    const candidate = "I like apples.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler you know in strict short-input fallback", async () => {
    const source = "you know, send update today";
    const candidate = "You know, send update today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler you know with full-width comma in strict short-input fallback", async () => {
    const source = "you know，send update today";
    const candidate = "You know，send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler you know with ideographic comma in strict short-input fallback", async () => {
    const source = "you know、send update today";
    const candidate = "You know、send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes parenthetical discourse filler you know in strict short-input fallback", async () => {
    const source = "we should, you know, ship";
    const candidate = "We should, you know, ship.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical discourse filler you know with full-width commas in strict short-input fallback", async () => {
    const source = "we should，you know，ship";
    const candidate = "We should，you know，ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical discourse filler you know with ideographic commas in strict short-input fallback", async () => {
    const source = "we should、you know、ship";
    const candidate = "We should、you know、ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes comma-appended sentence-final discourse filler you know in strict short-input fallback", async () => {
    const source = "we should ship today, you know";
    const candidate = "We should ship today, you know.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-appended sentence-final discourse filler you know with full-width comma in strict short-input fallback", async () => {
    const source = "我们今天发版，you know";
    const candidate = "我们今天发版，you know。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes comma-appended sentence-final discourse filler you know with ideographic comma in strict short-input fallback", async () => {
    const source = "我们今天发版、you know";
    const candidate = "我们今天发版、you know。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("keeps question-form sentence-final you know in strict short-input fallback", async () => {
    const source = "we should ship today, you know?";
    const candidate = "We should ship today, you know?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("keeps lexical as you know phrase in strict short-input fallback", async () => {
    const source = "as you know we are shipping friday";
    const candidate = "As you know, we are shipping Friday.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler i mean in strict short-input fallback", async () => {
    const source = "i mean, send update today";
    const candidate = "I mean, send update today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler i mean with full-width comma in strict short-input fallback", async () => {
    const source = "i mean，send update today";
    const candidate = "I mean，send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler i mean with ideographic comma in strict short-input fallback", async () => {
    const source = "i mean、send update today";
    const candidate = "I mean、send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes parenthetical discourse filler i mean in strict short-input fallback", async () => {
    const source = "we should, i mean, ship";
    const candidate = "We should, I mean, ship.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical discourse filler i mean with ideographic commas in strict short-input fallback", async () => {
    const source = "we should、i mean、ship";
    const candidate = "We should、I mean、ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes comma-appended sentence-final discourse filler i mean in strict short-input fallback", async () => {
    const source = "we should ship today, i mean";
    const candidate = "We should ship today, I mean.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-appended sentence-final discourse filler i mean with ideographic comma in strict short-input fallback", async () => {
    const source = "我们今天发版、i mean";
    const candidate = "我们今天发版、i mean。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes comma-appended sentence-final discourse filler i mean with full-width comma in strict short-input fallback", async () => {
    const source = "我们今天发版，i mean";
    const candidate = "我们今天发版，i mean。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("keeps question-form sentence-final i mean in strict short-input fallback", async () => {
    const source = "we should ship today, i mean?";
    const candidate = "We should ship today, I mean?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("keeps lexical what i mean phrase in strict short-input fallback", async () => {
    const source = "what i mean is we should ship today";
    const candidate = "What I mean is we should ship today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler basically in strict short-input fallback", async () => {
    const source = "basically, send update today";
    const candidate = "Basically, send update today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes parenthetical discourse filler basically with ideographic commas in strict short-input fallback", async () => {
    const source = "we should、basically、ship today";
    const candidate = "We should、basically、ship today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-appended sentence-final discourse filler basically in strict short-input fallback", async () => {
    const source = "we should ship today, basically";
    const candidate = "We should ship today, basically.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("keeps lexical basically usage in strict short-input fallback", async () => {
    const source = "this is basically the final draft";
    const candidate = "This is basically the final draft.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler well without punctuation in strict short-input fallback", async () => {
    const source = "well we should ship today";
    const candidate = "Well we should ship today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler well before modal question without punctuation in strict short-input fallback", async () => {
    const source = "well can we ship today";
    const candidate = "Well can we ship today?";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("can we ship today");
  });

  it("removes sentence-initial discourse filler well before imperative please without punctuation in strict short-input fallback", async () => {
    const source = "well please send the update today";
    const candidate = "Well please send the update today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("please send the update today");
  });

  it("removes sentence-initial discourse filler well before let's action lead-in without punctuation in strict short-input fallback", async () => {
    const source = "well let's review this section";
    const candidate = "Well let's review this section.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("let's review this section");
  });

  it("keeps lexical sentence-initial well usage in strict short-input fallback", async () => {
    const source = "Well this is the final draft";
    const candidate = "Well this is the final draft.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial discourse filler mm in strict short-input fallback", async () => {
    const source = "mm, send update today";
    const candidate = "Mm, send update today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler mm with full-width comma in strict short-input fallback", async () => {
    const source = "mm，send update today";
    const candidate = "Mm，send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-initial discourse filler mm with ideographic comma in strict short-input fallback", async () => {
    const source = "mm、send update today";
    const candidate = "Mm、send update today。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("send update today");
  });

  it("removes parenthetical discourse filler mm with full-width commas in strict short-input fallback", async () => {
    const source = "we should，mm，ship";
    const candidate = "We should，mm，ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical discourse filler mm with ideographic commas in strict short-input fallback", async () => {
    const source = "we should、mm、ship";
    const candidate = "We should、mm、ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes comma-appended sentence-final discourse filler mm in strict short-input fallback", async () => {
    const source = "we should ship today, mm";
    const candidate = "We should ship today, mm.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-appended sentence-final discourse filler mm with full-width comma in strict short-input fallback", async () => {
    const source = "我们今天发版，mm";
    const candidate = "我们今天发版，mm。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes comma-appended sentence-final discourse filler mm with ideographic comma in strict short-input fallback", async () => {
    const source = "我们今天发版、mm";
    const candidate = "我们今天发版、mm。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("keeps measurement unit mm in strict short-input fallback", async () => {
    const source = "use a 5 mm drill bit";
    const candidate = "Use a 5 mm drill bit.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("keeps lexical uppercase abbreviation ER in strict short-input fallback", async () => {
    const source = "should we go to ER now";
    const candidate = "We should go to ER now.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
  });

  it("still removes lowercase er hesitation filler in strict short-input fallback", async () => {
    const source = "er we should ship today";
    const candidate = "Er we should ship today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes dangling trailing Chinese comma after sentence-final filler stripping in strict short-input fallback", async () => {
    const source = "我们今天发版，啊";
    const candidate = "我们今天发版，啊。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("我们今天发版");
  });

  it("removes dangling trailing comma after sentence-final English filler stripping in strict short-input fallback", async () => {
    const source = "we should ship today, um";
    const candidate = "We should ship today, um.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes parenthetical hesitation filler um without leaving comma artifacts in strict short-input fallback", async () => {
    const source = "we should, um, ship";
    const candidate = "We should, um, ship.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("removes parenthetical hesitation filler uh with full-width commas in strict short-input fallback", async () => {
    const source = "we should，uh，ship";
    const candidate = "We should，uh，ship。";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship");
  });

  it("collapses adjacent repeated English fragment in strict short-input fallback", async () => {
    const source = "we should, we should ship today";
    const candidate = "We should ship today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("collapses adjacent repeated English fragment with ideographic comma in strict short-input fallback", async () => {
    const source = "we should、we should ship today";
    const candidate = "We should ship today.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe("we should ship today");
  });

  it("keeps content-led repeated phrase in strict short-input fallback", async () => {
    const source = "very good very good point";
    const candidate = "Very good point.";

    const result = await ReasoningService.enforceStrictMode(source, candidate, {
      strictMode: true,
      strictShortInputThreshold: 80,
    });

    expect(result).toBe(source);
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
