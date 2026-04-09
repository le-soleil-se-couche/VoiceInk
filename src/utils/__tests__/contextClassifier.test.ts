import { describe, expect, it } from "vitest";
import { classifyContext } from "../contextClassifier";

const nonCodeApp = {
  appName: "Notes",
  processId: 42,
  platform: "darwin",
  source: "main-process" as const,
  capturedAt: "2026-03-31T00:00:00.000Z",
};

describe("classifyContext", () => {
  it("treats mixed-language shell command dictation as code content", () => {
    const result = classifyContext({
      text: "运行 npm install 然后打开 src/components/NoteEditor.tsx",
      targetApp: nonCodeApp,
    });

    expect(result.context).toBe("code");
  });

  it("treats API routes and package names as code content", () => {
    const result = classifyContext({
      text: "please check /api/health and @openai/agents in package.json",
      targetApp: nonCodeApp,
    });

    expect(result.context).toBe("code");
  });

  it("keeps non-technical prose in general context", () => {
    const result = classifyContext({
      text: "please check whether the quarterly report is ready",
      targetApp: nonCodeApp,
    });

    expect(result.context).toBe("general");
  });
});
