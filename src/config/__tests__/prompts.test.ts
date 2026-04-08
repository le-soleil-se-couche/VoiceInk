import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCleanupUserMessage,
  getAnswerLikeRetryPrompt,
  getCleanupOnlyRetryPrompt,
  getSystemPrompt,
} from "../prompts";

const createStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
};

afterEach(() => {
  globalThis.localStorage?.clear?.();
  vi.restoreAllMocks();
});

if (!globalThis.localStorage) {
  const storage = createStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

if (!globalThis.window) {
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: globalThis.localStorage },
    configurable: true,
  });
}

describe("getAnswerLikeRetryPrompt", () => {
  it("builds an English transcription-only retry prompt that blocks assistant wrappers", () => {
    const prompt = getAnswerLikeRetryPrompt([], "en");

    expect(prompt).toContain("Transcription only.");
    expect(prompt).toContain("If the speaker dictated a question, transcribe that question itself.");
    expect(prompt).toContain("let me/us know if/whether");
    expect(prompt).toContain("tell me/us if/whether");
    expect(prompt).toContain("i wonder if/whether");
    expect(prompt).toContain("i have/I've been wondering if/whether");
    expect(prompt).toContain("Do not add assistant wrappers");
  });

  it("preserves dictionary hints ahead of retry instructions", () => {
    const prompt = getAnswerLikeRetryPrompt(["VoiceInk", "API"], "en");

    expect(prompt.startsWith("VoiceInk, API")).toBe(true);
    expect(prompt).toContain("Return only the spoken words.");
  });

  it("builds a Chinese retry prompt for Chinese UI", () => {
    const prompt = getAnswerLikeRetryPrompt(["VoiceInk"], "zh-CN");

    expect(prompt).toContain("仅做语音转写。");
    expect(prompt).toContain("如果用户说的是问题，就直接转写这个问题本身。");
    expect(prompt).toContain("不要添加“好的”");
  });

  it("builds a cleanup-only retry prompt that keeps cleanup semantics", () => {
    const prompt = getCleanupOnlyRetryPrompt(["VoiceInk"], "zh-CN");

    expect(prompt).toContain("严格的转录整理重试模式");
    expect(prompt).toContain("不能回答");
    expect(prompt.startsWith("VoiceInk")).toBe(true);
  });

  it("builds an English cleanup-only retry prompt that preserves indirect-question stems", () => {
    const prompt = getCleanupOnlyRetryPrompt([], "en");

    expect(prompt).toContain("strict transcript-cleanup retry mode");
    expect(prompt).toContain("let me/us know if/whether");
    expect(prompt).toContain("tell me/us if/whether");
    expect(prompt).toContain("i wonder if/whether");
    expect(prompt).toContain("i have/I've been wondering if/whether");
    expect(prompt).toContain("do not rewrite them into direct answers");
  });

  it("keeps short Chinese restart-question guidance in the zh cleanup prompt", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "那个就是我的电我电脑上能跑吗", "zh-CN");

    expect(prompt).toContain("问句保护不等于保留问句里的口吃、重启和误切内容");
    expect(prompt).toContain("那个就是我的电脑上能跑吗？");
  });

  it("keeps later-more-specific self-correction guidance in the zh cleanup prompt", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "zh-CN",
      "我电脑上，我的笔记本电脑上能做这个优化吗",
      "zh-CN"
    );

    expect(prompt).toContain("后面版本如果更完整、更具体，优先保留后面那一版");
    expect(prompt).toContain("我的笔记本电脑上能做这个优化吗？");
  });

  it("wraps cleanup user input in transcript tags", () => {
    expect(buildCleanupUserMessage("这个要改吗")).toBe(
      "<transcript>\n这个要改吗\n</transcript>"
    );
  });

  it("uses the stored custom unified prompt in the main cleanup pipeline", () => {
    globalThis.localStorage.setItem("customUnifiedPrompt", JSON.stringify("自定义 {{agentName}} 提示"));

    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "测试", "zh-CN");

    expect(prompt).toContain("自定义 VoiceInk 提示");
  });
});
