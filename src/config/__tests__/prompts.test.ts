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
    expect(prompt).toContain(
      "If the speaker dictated a question, transcribe that question itself, including indirect requests such as 'i wonder whether ...', 'i'm wondering whether ...', 'i'm curious whether ...', 'i'd like to know if ...', or 'please advise whether ...', and discourse-marker lead-ins before a question such as 'yes should we ...', 'well can we ...', or 'okay what is ...'."
    );
    expect(prompt).toContain("Do not add assistant wrappers");
    expect(prompt).toContain("standalone acknowledgement prefaces");
    expect(prompt).toContain("Sure.");
    expect(prompt).toContain("Yes.");
    expect(prompt).toContain("No.");
    expect(prompt).toContain("Definitely.");
    expect(prompt).toContain("Totally.");
    expect(prompt).toContain("Exactly.");
    expect(prompt).toContain("Precisely.");
    expect(prompt).toContain("Indeed.");
    expect(prompt).toContain("Agreed.");
    expect(prompt).toContain("Correct.");
    expect(prompt).toContain("That's right.");
    expect(prompt).toContain("That is right.");
    expect(prompt).toContain("That's correct.");
    expect(prompt).toContain("That is correct.");
    expect(prompt).toContain("You're right.");
    expect(prompt).toContain("You are right.");
    expect(prompt).toContain("You're correct.");
    expect(prompt).toContain("You are correct.");
    expect(prompt).toContain("You're absolutely right.");
    expect(prompt).toContain("You are absolutely right.");
    expect(prompt).toContain("You're totally right.");
    expect(prompt).toContain("You are totally right.");
    expect(prompt).toContain("你说得对。");
    expect(prompt).toContain("Great question.");
    expect(prompt).toContain("Good question.");
    expect(prompt).toContain("That's a great question.");
    expect(prompt).toContain("I recommend ...");
    expect(prompt).toContain("I strongly recommend ...");
    expect(prompt).toContain("My recommendation is ...");
    expect(prompt).toContain("My recommendation: ...");
    expect(prompt).toContain("I'd suggest ...");
    expect(prompt).toContain("The answer is ...");
    expect(prompt).toContain("The short answer is ...");
    expect(prompt).toContain("答案是...");
    expect(prompt).toContain("Yes we should ...");
    expect(prompt).toContain("Definitely we should ...");
    expect(prompt).toContain("Totally we should ...");
    expect(prompt).toContain("Exactly we should ...");
    expect(prompt).toContain("Precisely we should ...");
    expect(prompt).toContain("Indeed we should ...");
    expect(prompt).toContain("Agreed we should ...");
    expect(prompt).toContain("Correct we should ...");
    expect(prompt).toContain("That's right we should ...");
    expect(prompt).toContain("That is right we should ...");
    expect(prompt).toContain("That's correct we should ...");
    expect(prompt).toContain("That is correct we should ...");
    expect(prompt).toContain("You're right we should ...");
    expect(prompt).toContain("You are right we should ...");
    expect(prompt).toContain("You're correct we should ...");
    expect(prompt).toContain("You are correct we should ...");
    expect(prompt).toContain("You're absolutely right we should ...");
    expect(prompt).toContain("You are absolutely right we should ...");
    expect(prompt).toContain("You're totally right we should ...");
    expect(prompt).toContain("You are totally right we should ...");
    expect(prompt).toContain("你说得对我们...");
    expect(prompt).toContain("Answer:");
    expect(prompt).toContain("Final answer:");
    expect(prompt).toContain("Rewritten text:");
    expect(prompt).toContain("Cleaned transcript:");
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

  it("builds an English cleanup-only retry prompt with contraction indirect-question protection", () => {
    const prompt = getCleanupOnlyRetryPrompt([], "en");

    expect(prompt).toContain("strict transcript-cleanup retry mode");
    expect(prompt).toContain("'i'm wondering whether ...'");
    expect(prompt).toContain("'i'm curious whether ...'");
    expect(prompt).toContain("'i'd like to know if ...'");
    expect(prompt).toContain("'please advise whether ...'");
    expect(prompt).toContain("'yes should we ...'");
    expect(prompt).toContain("'well can we ...'");
    expect(prompt).toContain("'okay what is ...'");
    expect(prompt).toContain("I recommend ...");
    expect(prompt).toContain("I strongly recommend ...");
    expect(prompt).toContain("My recommendation is ...");
    expect(prompt).toContain("My recommendation: ...");
    expect(prompt).toContain("I'd suggest ...");
    expect(prompt).toContain("Exactly.");
    expect(prompt).toContain("Precisely.");
    expect(prompt).toContain("Totally.");
    expect(prompt).toContain("Indeed.");
    expect(prompt).toContain("Agreed.");
    expect(prompt).toContain("You're right.");
    expect(prompt).toContain("That's right.");
    expect(prompt).toContain("That is right.");
    expect(prompt).toContain("That's correct.");
    expect(prompt).toContain("That is correct.");
    expect(prompt).toContain("You are right.");
    expect(prompt).toContain("You're correct.");
    expect(prompt).toContain("You are correct.");
    expect(prompt).toContain("You're absolutely right.");
    expect(prompt).toContain("You are absolutely right.");
    expect(prompt).toContain("You're totally right.");
    expect(prompt).toContain("You are totally right.");
    expect(prompt).toContain("Exactly we should ...");
    expect(prompt).toContain("Precisely we should ...");
    expect(prompt).toContain("Totally we should ...");
    expect(prompt).toContain("Indeed we should ...");
    expect(prompt).toContain("Agreed we should ...");
    expect(prompt).toContain("你说得对。");
    expect(prompt).toContain("The answer is ...");
    expect(prompt).toContain("The short answer is ...");
    expect(prompt).toContain("答案是...");
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

  it("keeps question-protection guidance in the English cleanup prompt", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "should we ship this today", "en");

    expect(prompt).toContain("Question protection:");
    expect(prompt).toContain("output must remain a cleaned-up question");
    expect(prompt).toContain("not \"Yes, ship it today.\"");
    expect(prompt).toContain("indirect question requests");
    expect(prompt).toContain("\"i need to know whether we should ship this today\"");
    expect(prompt).toContain("\"i'm wondering whether we should ship this today\"");
    expect(prompt).toContain("\"i'm curious whether we should ship this today\"");
    expect(prompt).toContain("\"i'd like to know if we should ship this today\"");
    expect(prompt).toContain("\"please advise whether we should ship this today\"");
    expect(prompt).toContain("\"yes should we ship this today\"");
    expect(prompt).toContain("\"well can we ship this today\"");
    expect(prompt).toContain("\"okay what is the fallback plan\"");
    expect(prompt).toContain("statement-shaped confirmation requests");
    expect(prompt).toContain("\"please confirm we should ship this today\"");
  });

  it("keeps assistant-wrapper ban guidance in the English cleanup prompt", () => {
    const prompt = getSystemPrompt("VoiceInk", [], "en", "we should update docs", "en");

    expect(prompt).toContain("NEVER include assistant wrappers");
    expect(prompt).toContain("standalone acknowledgement prefaces");
    expect(prompt).toContain("\"Sure.\"");
    expect(prompt).toContain("\"Yes.\"");
    expect(prompt).toContain("\"No.\"");
    expect(prompt).toContain("\"Definitely.\"");
    expect(prompt).toContain("\"Totally.\"");
    expect(prompt).toContain("\"Exactly.\"");
    expect(prompt).toContain("\"Precisely.\"");
    expect(prompt).toContain("\"Indeed.\"");
    expect(prompt).toContain("\"Agreed.\"");
    expect(prompt).toContain("\"Correct.\"");
    expect(prompt).toContain("\"That's right.\"");
    expect(prompt).toContain("\"That is right.\"");
    expect(prompt).toContain("\"That's correct.\"");
    expect(prompt).toContain("\"That is correct.\"");
    expect(prompt).toContain("\"You're right.\"");
    expect(prompt).toContain("\"You are right.\"");
    expect(prompt).toContain("\"You're correct.\"");
    expect(prompt).toContain("\"You are correct.\"");
    expect(prompt).toContain("\"You're absolutely right.\"");
    expect(prompt).toContain("\"You are absolutely right.\"");
    expect(prompt).toContain("\"You're totally right.\"");
    expect(prompt).toContain("\"You are totally right.\"");
    expect(prompt).toContain("\"你说得对。\"");
    expect(prompt).toContain("\"Great question.\"");
    expect(prompt).toContain("\"Good question.\"");
    expect(prompt).toContain("\"That's a great question.\"");
    expect(prompt).toContain("\"I recommend ...\"");
    expect(prompt).toContain("\"I strongly recommend ...\"");
    expect(prompt).toContain("\"My recommendation is ...\"");
    expect(prompt).toContain("\"My recommendation: ...\"");
    expect(prompt).toContain("\"I'd suggest ...\"");
    expect(prompt).toContain("\"建议...\"");
    expect(prompt).toContain("\"The answer is ...\"");
    expect(prompt).toContain("\"The short answer is ...\"");
    expect(prompt).toContain("\"答案是...\"");
    expect(prompt).toContain("\"Yes we should ...\"");
    expect(prompt).toContain("\"Definitely we should ...\"");
    expect(prompt).toContain("\"Totally we should ...\"");
    expect(prompt).toContain("\"Exactly we should ...\"");
    expect(prompt).toContain("\"Precisely we should ...\"");
    expect(prompt).toContain("\"Indeed we should ...\"");
    expect(prompt).toContain("\"Agreed we should ...\"");
    expect(prompt).toContain("\"Correct we should ...\"");
    expect(prompt).toContain("\"That's right we should ...\"");
    expect(prompt).toContain("\"That is right we should ...\"");
    expect(prompt).toContain("\"That's correct we should ...\"");
    expect(prompt).toContain("\"That is correct we should ...\"");
    expect(prompt).toContain("\"You're right we should ...\"");
    expect(prompt).toContain("\"You are right we should ...\"");
    expect(prompt).toContain("\"You're correct we should ...\"");
    expect(prompt).toContain("\"You are correct we should ...\"");
    expect(prompt).toContain("\"You're absolutely right we should ...\"");
    expect(prompt).toContain("\"You are absolutely right we should ...\"");
    expect(prompt).toContain("\"You're totally right we should ...\"");
    expect(prompt).toContain("\"You are totally right we should ...\"");
    expect(prompt).toContain("\"你说得对我们...\"");
    expect(prompt).toContain("Sure, here's the polished version:");
    expect(prompt).toContain("Answer:");
    expect(prompt).toContain("Final answer:");
    expect(prompt).toContain("Rewritten text:");
    expect(prompt).toContain("Cleaned transcript:");
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

  it("ignores custom unified prompts that contain multi-mode assistant answering directives", () => {
    globalThis.localStorage.setItem(
      "customUnifiedPrompt",
      JSON.stringify(
        [
          "You operate in two modes.",
          "MODE 2: AGENT",
          "Answer questions directly: output just the answer.",
        ].join("\n")
      )
    );

    const prompt = getSystemPrompt("VoiceInk", [], "en", "what is five plus five", "en");

    expect(prompt).toContain('You are "VoiceInk", an AI integrated into a speech-to-text dictation app.');
    expect(prompt).toContain("Process transcribed speech into clean, polished text.");
    expect(prompt).not.toContain("MODE 2: AGENT");
    expect(prompt).not.toContain("Answer questions directly");
  });
});
