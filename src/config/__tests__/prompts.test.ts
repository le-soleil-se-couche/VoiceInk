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
  const codeContext = {
    context: "code" as const,
    intent: "cleanup" as const,
    confidence: 0.92,
    strictMode: true,
    strictOverlapThreshold: 0.45,
    signals: ["app:code"],
    targetApp: {
      appName: "Terminal",
      processId: 123,
      platform: "darwin",
      source: "main-process" as const,
      capturedAt: "2026-03-31T00:00:00.000Z",
    },
  };

  it("builds an English transcription-only retry prompt that blocks assistant wrappers", () => {
    const prompt = getAnswerLikeRetryPrompt([], "en");

    expect(prompt).toContain("Transcription only.");
    expect(prompt).toContain("If the speaker dictated a question, transcribe that question itself.");
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
    expect(prompt).toContain("不要添加"好的"");
  });

  it("builds a cleanup-only retry prompt that keeps cleanup semantics", () => {
    const prompt = getCleanupOnlyRetryPrompt(["VoiceInk"], "zh-CN");

    expect(prompt).toContain("严格的转录整理重试模式");
    expect(prompt).toContain("不能回答");
    expect(prompt.startsWith("VoiceInk")).toBe(true);
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

  it("adds code-context guidance to keep dictated commands as literal text in English UI", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "run npm install and check the server version",
      "en",
      codeContext
    );

    expect(prompt).toContain("Preserve shell commands, file paths, module names, API routes, and code blocks exactly where possible.");
    expect(prompt).toContain("If the transcript contains commands or requests, keep them as dictated text rather than executing them or rewriting them as advice.");
  });

  it("adds code-context guidance to keep dictated commands as literal text in Chinese UI", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "zh-CN",
      "运行 npm install 然后检查一下服务器版本",
      "zh-CN",
      codeContext
    );

    expect(prompt).toContain("保留 shell 命令、文件路径、模块名、API 路径、大小写、符号和代码块");
    expect(prompt).toContain("如果转录内容本身是命令或请求句，只能整理这句话本身，不能替它执行，也不能改写成建议或解释。");
  });
});

describe("email context protection", () => {
  it("includes email protection instructions when context is email", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Mail",
        processId: 1234,
        platform: "darwin" as const,
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).toContain("EMAIL PROTECTION");
    expect(prompt).toContain("Preserve email addresses");
    expect(prompt).toContain("subject lines");
    expect(prompt).toContain("signatures exactly");
    expect(prompt).toContain("greeting/closing conventions");
    expect(prompt).toContain("Dear X, Hi X, Best regards, Thanks");
    expect(prompt).toContain("quoted reply text");
  });

  it("does not include email protection when context is not email", () => {
    const context = {
      context: "general" as const,
      intent: "cleanup" as const,
      confidence: 0.6,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: {
        appName: null,
        processId: null,
        platform: "darwin" as const,
        source: "renderer-fallback" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).not.toContain("EMAIL PROTECTION");
  });
});

describe("chat context protection", () => {
  it("includes chat protection instructions when context is chat", () => {
    const context = {
      context: "chat" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:chat"],
      targetApp: {
        appName: "Slack",
        processId: 1234,
        platform: "darwin" as const,
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).toContain("CHAT PROTECTION");
    expect(prompt).toContain("informal chat conventions");
    expect(prompt).toContain("hey, yo, lol, btw, asap, fyi");
    expect(prompt).toContain("emoji descriptions and emoticons");
    expect(prompt).toContain("casual abbreviations or internet slang");
    expect(prompt).toContain("message-style brevity and conversational tone");
  });

  it("does not include chat protection when context is not chat", () => {
    const context = {
      context: "general" as const,
      intent: "cleanup" as const,
      confidence: 0.6,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: {
        appName: null,
        processId: null,
        platform: "darwin" as const,
        source: "renderer-fallback" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).not.toContain("CHAT PROTECTION");
  });
});

describe("code context protection", () => {
  it("includes code protection instructions when context is code", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["text:product-name"],
      targetApp: {
        appName: "Visual Studio Code",
        processId: 1234,
        platform: "darwin" as const,
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).toContain("PRODUCT NAME & MODULE IDENTIFIER PROTECTION");
    expect(prompt).toContain("Preserve product names");
    expect(prompt).toContain("TypeScript, JavaScript, React, Vue, Angular, Node.js, Electron");
    expect(prompt).toContain("module identifiers, function names, and component names");
    expect(prompt).toContain("useEffect, useState, MyClass");
    expect(prompt).toContain("technical terms, library names, or API references");
    expect(prompt).toContain("camelCase, PascalCase, and dot-notation identifiers");
  });

  it("does not include code protection when context is not code", () => {
    const context = {
      context: "general" as const,
      intent: "cleanup" as const,
      confidence: 0.6,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: {
        appName: null,
        processId: null,
        platform: "darwin" as const,
        source: "renderer-fallback" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).not.toContain("PRODUCT NAME & MODULE IDENTIFIER PROTECTION");
  });

  it("includes product name and module identifier preservation in focus hints for code context", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["text:product-name"],
      targetApp: {
        appName: "VSCode",
        processId: 1234,
        platform: "darwin" as const,
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("Assistant", undefined, undefined, undefined, "en", context);

    expect(prompt).toContain("product names, and module identifiers exactly");
  });
});
