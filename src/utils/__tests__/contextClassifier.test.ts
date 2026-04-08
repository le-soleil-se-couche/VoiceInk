
import { describe, expect, it } from "vitest";
import { classifyContext } from "../contextClassifier";

describe("classifyContext technical dictation", () => {
  it("detects npm commands as code context", () => {
    const result = classifyContext({
      text: "run npm install",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:package-manager");
  });

  it("detects pnpm commands as code context", () => {
    const result = classifyContext({
      text: "pnpm add react",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:package-manager");
  });

  it("detects yarn commands as code context", () => {
    const result = classifyContext({
      text: "yarn build",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:package-manager");
  });

  it("detects git commands as code context", () => {
    const result = classifyContext({
      text: "git commit -m fix",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:vcs");
  });

  it("detects docker commands as code context", () => {
    const result = classifyContext({
      text: "docker build -t myapp",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:container");
  });

  it("detects kubectl commands as code context", () => {
    const result = classifyContext({
      text: "kubectl apply -f deployment.yaml",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:k8s");
  });

  it("detects curl commands as code context", () => {
    const result = classifyContext({
      text: "curl -X POST https://api.example.com",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("tool:http");
  });

  it("detects error messages as code context", () => {
    const result = classifyContext({
      text: "error: module not found",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });

  it("detects file paths as code context", () => {
    const result = classifyContext({
      text: "check src/utils/contextClassifier.ts",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });

  it("detects error codes as code context", () => {
    const result = classifyContext({
      text: "got ENOENT error",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });

  it("detects node_modules paths as code context", () => {
    const result = classifyContext({
      text: "delete node_modules/react folder",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });

  it("detects ReferenceError as code context", () => {
    const result = classifyContext({
      text: "ReferenceError: x is not defined",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });

  it("detects stack trace patterns as code context", () => {
    const result = classifyContext({
      text: "at Object.<anonymous> (src/index.ts:10:5)",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });

  it("detects npm ERR as code context", () => {
    const result = classifyContext({
      text: "npm ERR! code ENOENT",
      targetApp: { appName: null, processId: null, platform: "darwin", source: "renderer-fallback", capturedAt: null },
      agentName: null,
    });

    expect(result.context).toBe("code");
    expect(result.signals).toContain("text:code");
  });
});
