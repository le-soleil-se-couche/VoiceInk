import { describe, expect, it } from "vitest";
import { getSystemPrompt } from "../prompts";

describe("getSystemPrompt question-intent safety", () => {
  it("adds question preservation guidance for English question-like dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "what is the capital of france", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
    expect(prompt).toContain(
      "do not convert the dictation into an answer, explanation, advice, or resolution."
    );
  });

  it("adds question preservation guidance for English negative-contraction dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "shouldn't we ship this today", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for irregular English negative contractions", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "can't we ship this today", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for contractionless English what's dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "whats the capital of france", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for indirect English wonder-if dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "i wonder if we should ship this today",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for bare whether-led English dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "whether we should ship this today", "en");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for let-me-know indirect English dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "let me know if we should ship this today",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for polite indirect English dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "please let me know if we should ship this today",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for advise-style indirect English dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "please advise whether we should ship this today",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for indirect English uncertainty-if dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "not sure if we should ship this today",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("adds question preservation guidance for Chinese A-not-A dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "这个方案行不行", "zh-CN");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
  });

  it("adds unresolved-choice guidance for Chinese alternative dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "zh-CN",
      "这个需求我们今天发还是明天发比较稳妥",
      "zh-CN"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form, unresolved alternatives, and punctuation");
  });

  it("adds unresolved-choice guidance for English multi-option dictation", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "should we ship this today or tomorrow or Monday",
      "en"
    );

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form, unresolved alternatives, and punctuation");
  });

  it("adds question preservation guidance for Chinese quantity questions using 几", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "5+5等于几", "zh-CN");

    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("preserve the question form and punctuation when cleaning.");
  });

  it("does not add question preservation guidance for non-question dictation", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "please ship this today", "en");

    expect(prompt).not.toContain("QUESTION INTENT SAFETY:");
  });
});

describe("getSystemPrompt code context protection", () => {
  it("adds code context protection guidance when context is code", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:code"],
      targetApp: {
        appName: "VSCode",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "run npm install", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Preserve command names, module names, product names");
    expect(prompt).toContain("Do not rewrite code snippets, paths, or CLI commands");
    expect(prompt).toContain("Keep technical terminology intact");
  });

  it("does not add code context protection for non-code contexts", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Outlook",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "send an email", "en", context);

    expect(prompt).not.toContain("CODE CONTEXT PROTECTION:");
  });

  it("does not add code context protection when context is undefined", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "run npm install", "en");

    expect(prompt).not.toContain("CODE CONTEXT PROTECTION:");
  });

  it("includes code context protection alongside other safety instructions", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:code"],
      targetApp: {
        appName: "VSCode",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "should we run npm install or yarn add",
      "en",
      context
    );

    expect(prompt).toContain("STRICT TRANSCRIPTION SAFETY:");
    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
  });
});

describe("getSystemPrompt email context protection", () => {
  it("adds email context protection guidance when context is email", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Outlook",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "send an email to john@example.com", "en", context);

    expect(prompt).toContain("EMAIL PROTECTION:");
    expect(prompt).toContain("Preserve recipient names, email addresses, and subject lines");
    expect(prompt).toContain("Do not rewrite email structure");
    expect(prompt).toContain("Keep salutations and sign-offs intact");
  });

  it("does not add email context protection for non-email contexts", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:code"],
      targetApp: {
        appName: "VSCode",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "run npm install", "en", context);

    expect(prompt).not.toContain("EMAIL PROTECTION:");
  });

  it("does not add email context protection when context is undefined", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "send an email", "en");

    expect(prompt).not.toContain("EMAIL PROTECTION:");
  });

  it("includes email context protection alongside other safety instructions", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Gmail",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en",
      "should we send this email today or tomorrow",
      "en",
      context
    );

    expect(prompt).toContain("STRICT TRANSCRIPTION SAFETY:");
    expect(prompt).toContain("QUESTION INTENT SAFETY:");
    expect(prompt).toContain("EMAIL PROTECTION:");
  });
});


describe("getSystemPrompt mixed-language preservation", () => {
  it("includes mixed-language preservation guidance for en-US when transcript contains Chinese", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en-US",
      "这个 API 返回了三百个 error",
      "en-US"
    );

    expect(prompt).toContain("preserve English words, acronyms, product names");
    expect(prompt).toContain("Do not translate or paraphrase Latin-script tokens");
  });

  it("includes mixed-language preservation guidance for en-US with technical identifiers", () => {
    const prompt = getSystemPrompt(
      "VoiceInk",
      [],
      "en-US",
      "调用 npm install 命令",
      "en-US"
    );

    expect(prompt).toContain("preserve English words, acronyms, product names");
    expect(prompt).toContain("module names, function names, and technical identifiers");
  });

  it("does not include mixed-language guidance for non-English locales", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "zh-CN", "这个 API 返回错误", "zh-CN");

    expect(prompt).not.toContain("preserve English words, acronyms, product names");
  });
});

describe("getSystemPrompt context-specific focus hints", () => {
  it("includes email-specific focus hint for email context", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Outlook",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "send an email", "en", context);

    expect(prompt).toContain("Context hint: email drafting");
    expect(prompt).toContain("Preserve recipient intent and structure it like a clear, professional email");
  });

  it("includes chat-specific focus hint for chat context", () => {
    const context = {
      context: "chat" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:chat"],
      targetApp: {
        appName: "Slack",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "send a message", "en", context);

    expect(prompt).toContain("Context hint: chat/message writing");
    expect(prompt).toContain("Keep it concise and conversational, but still polished");
  });

  it("includes document-specific focus hint for document context", () => {
    const context = {
      context: "document" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:document"],
      targetApp: {
        appName: "Notion",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "write a document", "en", context);

    expect(prompt).toContain("Context hint: document or notes writing");
    expect(prompt).toContain("Preserve headings, bullets, and list structure when they aid readability");
  });

  it("includes general writing focus hint for general context", () => {
    const context = {
      context: "general" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: null,
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "write something", "en", context);

    expect(prompt).toContain("Context hint: general writing");
    expect(prompt).toContain("Keep output natural and concise");
  });

  it("includes target app name in context hint when available", () => {
    const context = {
      context: "email" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["app:email"],
      targetApp: {
        appName: "Spark",
        processId: 12345,
        platform: "darwin",
        source: "main-process" as const,
        capturedAt: null,
      },
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "send an email", "en", context);

    expect(prompt).toContain("Target app: Spark");
  });

  it("includes intent hint for cleanup mode", () => {
    const context = {
      context: "general" as const,
      intent: "cleanup" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: null,
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "write something", "en", context);

    expect(prompt).toContain("Likely cleanup mode; stay anchored to user content");
  });

  it("includes intent hint for instruction mode", () => {
    const context = {
      context: "general" as const,
      intent: "instruction" as const,
      confidence: 0.75,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: [],
      targetApp: null,
    };

    const prompt = getSystemPrompt("VoiceInk", [], "en", "do something", "en", context);

    expect(prompt).toContain("Likely direct instruction mode");
  });
});

describe("getSystemPrompt technical dictation protection", () => {
  it("includes code context protection for npm commands", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["tool:package-manager"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "run npm install", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Preserve command names, module names, product names");
    expect(prompt).toContain("technical identifiers exactly as spoken");
  });

  it("includes code context protection for git commands", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["tool:vcs"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "git add .", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Do not rewrite code snippets, paths, or CLI commands into natural language");
  });

  it("includes code context protection for docker commands", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["tool:container"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "docker build -t myapp", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Keep technical terminology intact");
  });

  it("includes code context protection for kubectl commands", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["tool:k8s"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "kubectl apply -f deployment.yaml", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
  });

  it("includes code context protection for build error messages", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["text:code"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "error: module not found", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Preserve command names, module names, product names");
  });

  it("includes code context protection for file paths", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["text:code"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "check src/utils/contextClassifier.ts", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Do not rewrite code snippets, paths, or CLI commands into natural language");
  });

  it("includes code context protection for error codes", () => {
    const context = {
      context: "code" as const,
      intent: "cleanup" as const,
      confidence: 0.8,
      strictMode: true,
      strictOverlapThreshold: 0.45,
      signals: ["text:code"],
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback" as const, capturedAt: null },
    };
    const prompt = getSystemPrompt("VoiceInk", [], "en", "got ENOENT error", "en", context);

    expect(prompt).toContain("CODE CONTEXT PROTECTION:");
    expect(prompt).toContain("Keep technical terminology intact");
  });

});
