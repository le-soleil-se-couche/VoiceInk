import { describe, expect, it } from "vitest";
import { classifyContext } from "../contextClassifier";
import type { TargetAppInfo } from "../../types/electron";

const notesApp: TargetAppInfo = {
  appName: "Notes",
  processId: 1,
  platform: "darwin",
  source: "renderer-fallback",
  capturedAt: null,
};

const textEditApp: TargetAppInfo = {
  appName: "TextEdit",
  processId: 42,
  platform: "darwin",
  source: "main-process",
  capturedAt: "2026-04-08T00:00:00.000Z",
};

describe("classifyContext technical dictation detection", () => {
  it("classifies npm command dictation as code context", () => {
    const result = classifyContext({
      text: "npm run build failed to compile",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
    expect(result.intent).toBe("cleanup");
  });

  it("classifies pnpm command dictation as code context", () => {
    const result = classifyContext({
      text: "pnpm install --save-dev vitest",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies yarn command dictation as code context", () => {
    const result = classifyContext({
      text: "yarn add @types/node",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies bun command dictation as code context", () => {
    const result = classifyContext({
      text: "bun run dev",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies npx command dictation as code context", () => {
    const result = classifyContext({
      text: "npx create-react-app my-app",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies file path dictation as code context", () => {
    const result = classifyContext({
      text: "open ./src/components/App.tsx",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies module resolution error as code context", () => {
    const result = classifyContext({
      text: "cannot find module ./utils/helper.ts",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies build failed error as code context", () => {
    const result = classifyContext({
      text: "build failed to compile in src/App.tsx",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies syntax error as code context", () => {
    const result = classifyContext({
      text: "syntaxerror: unexpected token",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies typeerror as code context", () => {
    const result = classifyContext({
      text: "typeerror: cannot read property of undefined",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("classifies referenceerror as code context", () => {
    const result = classifyContext({
      text: "referenceerror: x is not defined",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code_command");
  });

  it("keeps ordinary prose in general context", () => {
    const result = classifyContext({
      text: "Please send the updated project plan after lunch today.",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("general");
    expect(result.signals).toEqual([]);
  });

  it("classifies email drafting as email context", () => {
    const result = classifyContext({
      text: "Hi John, Best regards, Jane",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("email");
    expect(result.signals).toContain("text:email");
  });

  it("classifies code syntax keywords as code context", () => {
    const result = classifyContext({
      text: "function handleClick() { return true; }",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });
});
