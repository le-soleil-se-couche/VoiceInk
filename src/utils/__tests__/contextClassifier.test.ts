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

describe("classifyContext software environment detection", () => {
  it("classifies package manager mentions as code context", () => {
    const result = classifyContext({
      text: "install with npm",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:package-manager");
  });

  it("classifies pnpm mention as code context", () => {
    const result = classifyContext({
      text: "use pnpm for workspace",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:package-manager");
  });

  it("classifies git command as code context", () => {
    const result = classifyContext({
      text: "run git push origin main",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:vcs");
  });

  it("classifies docker mention as code context", () => {
    const result = classifyContext({
      text: "build docker container",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:container");
  });

  it("classifies kubectl as code context", () => {
    const result = classifyContext({
      text: "apply kubernetes with kubectl",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:k8s");
  });

  it("classifies curl as code context", () => {
    const result = classifyContext({
      text: "test endpoint with curl",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:http");
  });

  it("classifies ssh as code context", () => {
    const result = classifyContext({
      text: "connect via ssh to server",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:transfer");
  });

  it("classifies vim as code context", () => {
    const result = classifyContext({
      text: "edit config in vim",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:editor");
  });

  it("classifies python runtime as code context", () => {
    const result = classifyContext({
      text: "run with python three",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:runtime");
  });

  it("classifies webpack as code context", () => {
    const result = classifyContext({
      text: "bundle with webpack",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:bundler");
  });

  it("classifies react framework as code context", () => {
    const result = classifyContext({
      text: "build component in react",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:framework");
  });

  it("classifies express server as code context", () => {
    const result = classifyContext({
      text: "create api with express",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:server");
  });

  it("classifies mongodb database as code context", () => {
    const result = classifyContext({
      text: "store data in mongodb",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:database");
  });

  it("classifies aws cloud as code context", () => {
    const result = classifyContext({
      text: "deploy to aws",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:cloud");
  });

  it("classifies github as code context", () => {
    const result = classifyContext({
      text: "push to github repository",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:productivity");
  });

  it("classifies next.js framework as code context", () => {
    const result = classifyContext({
      text: "build app with next",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:framework");
  });

  it("classifies typescript as code context", () => {
    const result = classifyContext({
      text: "write in typescript",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:bundler");
  });

  it("classifies postgres database as code context", () => {
    const result = classifyContext({
      text: "query postgres database",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:database");
  });

  it("classifies vercel deployment as code context", () => {
    const result = classifyContext({
      text: "deploy on vercel",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:cloud");
  });

  it("classifies node runtime as code context", () => {
    const result = classifyContext({
      text: "run on node",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:runtime");
  });
});

describe("classifyContext extended technical patterns", () => {
  it("classifies jest testing framework as code context", () => {
    const result = classifyContext({
      text: "run jest test suite",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:testing");
  });

  it("classifies vitest as code context", () => {
    const result = classifyContext({
      text: "vitest run coverage",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:testing");
  });

  it("classifies cypress e2e testing as code context", () => {
    const result = classifyContext({
      text: "run cypress e2e tests",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:testing");
  });

  it("classifies eslint linting as code context", () => {
    const result = classifyContext({
      text: "eslint fix all files",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:linting");
  });

  it("classifies prettier formatting as code context", () => {
    const result = classifyContext({
      text: "prettier write config",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:linting");
  });

  it("classifies pm2 process management as code context", () => {
    const result = classifyContext({
      text: "pm2 start application",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:process");
  });

  it("classifies jenkins CI/CD as code context", () => {
    const result = classifyContext({
      text: "jenkins build pipeline",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:cicd");
  });

  it("classifies circleci as code context", () => {
    const result = classifyContext({
      text: "circleci config workflow",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:cicd");
  });

  it("classifies github actions as code context", () => {
    const result = classifyContext({
      text: "github actions workflow",
      targetApp: notesApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:cicd");
  });

  it("classifies gitlab CI as code context", () => {
    const result = classifyContext({
      text: "gitlab CI pipeline",
      targetApp: textEditApp,
      agentName: "VoiceInk",
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:cicd");
  });
});
