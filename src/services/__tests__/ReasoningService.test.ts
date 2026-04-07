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

  it("preserves lexical as-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "as you know we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical let-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "i will let you know tomorrow";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves nested let-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "let me let you know when it's ready";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves interrogative do-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "do you know where the file is";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves interrogative did-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "did you know we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves interrogative does-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "does you know where this setting is";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves contracted interrogative don't-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "don't you know where the file is";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves contracted interrogative didn't-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "didn't you know we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves contracted interrogative doesn't-you-know phrase during strict short-input fallback cleanup", async () => {
    const source = "doesn't you know where this setting is";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical whether-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "tell me whether you know the release owner";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical who-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "tell me who you know at the company";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical whom-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "tell me whom you know on that team";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical which-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "choose the option which you know works";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical whoever-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "ask whoever you know on the infra team";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical whatever-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "use whatever you know works in production";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical whichever-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "choose whichever you know best";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical whenever-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "share whenever you know works in production";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical wherever-you-know clause during strict short-input fallback cleanup", async () => {
    const source = "deploy wherever you know is stable";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical that-you-know relative clause during strict short-input fallback cleanup", async () => {
    const source = "share the runbook that you know works";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical everything-you-know object clause during strict short-input fallback cleanup", async () => {
    const source = "tell me everything you know about this release";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical anything-you-know object clause during strict short-input fallback cleanup", async () => {
    const source = "share anything you know about the outage";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical someone-you-know relative clause during strict short-input fallback cleanup", async () => {
    const source = "ask someone you know on the infra team";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical everyone-you-know relative clause during strict short-input fallback cleanup", async () => {
    const source = "everyone you know already approved this";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical people-you-know relative clause during strict short-input fallback cleanup", async () => {
    const source = "ask people you know on the infra team";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical folks-you-know relative clause during strict short-input fallback cleanup", async () => {
    const source = "the folks you know already approved this";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves content-bearing basically during strict short-input fallback cleanup", async () => {
    const source = "basically impossible to reproduce";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial bare well hesitation filler in strict short-input fallback cleanup", async () => {
    const source = "Well can we ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("can we ship today");
  });

  it("preserves lexical sentence-initial well phrasing in strict short-input fallback cleanup", async () => {
    const source = "Well this is the final draft";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial bare like hesitation filler in strict short-input fallback cleanup", async () => {
    const source = "Like we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes sentence-initial bare like before question-intent phrasing in strict short-input fallback cleanup", async () => {
    const source = "like can we ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("can we ship today");
  });

  it("preserves lexical sentence-initial like phrasing in strict short-input fallback cleanup", async () => {
    const source = "Like this design, not that one";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("removes sentence-initial bare i-mean hesitation filler in strict short-input fallback cleanup", async () => {
    const source = "I mean we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("preserves lexical sentence-initial i-mean phrasing in strict short-input fallback cleanup", async () => {
    const source = "I mean this design, not that one";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("still removes comma-marked basically hesitation filler during strict short-input fallback cleanup", async () => {
    const source = "basically, we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes parenthetical comma-marked basically hesitation filler without comma artifacts in strict fallback", async () => {
    const source = "we should, basically, ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("preserves lexical mm measurement units in strict short-input fallback", async () => {
    const source = "use a 5 mm drill bit";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves lexical uppercase abbreviation ER in strict short-input fallback", async () => {
    const source = "should we go to ER now";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("preserves all-caps technical acronym HMM in strict short-input fallback", async () => {
    const source = "HMM model works";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("still removes lowercase hmm hesitation filler in strict fallback", async () => {
    const source = "hmm, model works";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("model works");
  });

  it("still removes lowercase er hesitation filler in strict fallback", async () => {
    const source = "er, should we ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("should we ship today");
  });

  it("removes sentence-initial comma-marked mm hesitation filler in strict fallback", async () => {
    const source = "mm, send update today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("send update today");
  });

  it("removes sentence-final comma-appended mm hesitation filler in strict fallback", async () => {
    const source = "ship today, mm";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("ship today");
  });

  it("removes sentence-final comma-appended mm hesitation filler before a period in strict fallback", async () => {
    const source = "ship today, mm.";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("ship today.");
  });

  it("removes sentence-final comma-appended mm hesitation filler before a question mark in strict fallback", async () => {
    const source = "ship today, mm?";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("ship today?");
  });

  it("removes sentence-final comma-appended mm hesitation filler before a closing parenthesis in strict fallback", async () => {
    const source = "ship today, mm)";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("ship today)");
  });

  it("removes parenthetical comma-marked you know hesitation filler without comma artifacts in strict fallback", async () => {
    const source = "we should, you know, ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes sentence-final comma-appended you know hesitation filler in strict fallback", async () => {
    const source = "we should ship today, you know";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes sentence-initial comma-marked generic hesitation filler in strict fallback", async () => {
    const source = "um, send update today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("send update today");
  });

  it("removes parenthetical comma-marked generic hesitation filler without comma artifacts", async () => {
    const source = "we should, um, ship";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship");
  });

  it("removes sentence-final comma-appended generic hesitation filler in strict fallback", async () => {
    const source = "we should ship today, um";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-led you-know hesitation filler without closing comma in strict fallback", async () => {
    const source = "we should, you know ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-led basically hesitation filler without closing comma in strict fallback", async () => {
    const source = "we should, basically ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-led like hesitation filler without closing comma in strict fallback", async () => {
    const source = "we should, like ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("removes comma-led i-mean hesitation filler without closing comma in strict fallback", async () => {
    const source = "we should, i mean ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("preserves lexical comma clauses while cleaning comma-led discourse fillers in strict fallback", async () => {
    const source = "please review, then ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("collapses comma-separated repeated short English false-start fragments in strict fallback", async () => {
    const source = "we should, we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("collapses whitespace-separated repeated short English false-start fragments in strict fallback", async () => {
    const source = "i think i think we should wait";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("i think we should wait");
  });

  it("collapses ideographic-comma repeated short English false-start fragments in strict fallback", async () => {
    const source = "we should、we should ship today";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today");
  });

  it("preserves lexical repeated English content while collapsing false starts in strict fallback", async () => {
    const source = "very good very good point";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe(source);
  });

  it("removes dangling comma artifacts when sentence-final you-know filler precedes a question mark", async () => {
    const source = "we should ship today, you know?";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today?");
  });

  it("removes dangling comma artifacts when sentence-final generic filler precedes an exclamation mark", async () => {
    const source = "we should ship today, um!";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today!");
  });

  it("removes dangling comma artifacts when sentence-final you-know filler precedes a period", async () => {
    const source = "we should ship today, you know.";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today.");
  });

  it("removes dangling comma artifacts when sentence-final generic filler precedes a semicolon", async () => {
    const source = "we should ship today, um;";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today;");
  });

  it("removes dangling comma artifacts when sentence-final generic filler precedes a full-width semicolon", async () => {
    const source = "we should ship today, um；";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today；");
  });

  it("removes dangling comma artifacts when sentence-final generic filler precedes a full-width colon", async () => {
    const source = "we should ship today, um：";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today：");
  });

  it("removes dangling comma artifacts when sentence-final filler precedes a closing parenthesis", async () => {
    const source = "we should ship today, you know)";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today)");
  });

  it("removes dangling comma artifacts when sentence-final generic filler precedes a closing bracket", async () => {
    const source = "we should ship today, um]";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today]");
  });

  it("removes dangling comma artifacts when sentence-final filler precedes an ellipsis", async () => {
    const source = "we should ship today, you know…";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today…");
  });

  it("removes dangling comma artifacts when sentence-final filler precedes a newline", async () => {
    const source = "we should ship today, you know\nnext step";

    const result = await ReasoningService.enforceStrictMode(source, source, {
      strictMode: true,
      strictShortInputThreshold: 100,
    });

    expect(result).toBe("we should ship today\nnext step");
  });
});
