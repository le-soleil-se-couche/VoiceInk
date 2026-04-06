import { describe, expect, it } from "vitest";
import { getSystemPrompt } from "../prompts";
import type { ContextClassification } from "../../utils/contextClassifier";
import type { TargetAppInfo } from "../../types/electron";

describe("getSystemPrompt code context protection", () => {
  const mockTargetApp: TargetAppInfo = {
    appName: "VSCode",
    processId: 12345,
    platform: "darwin",
    source: "renderer-fallback",
    capturedAt: null,
  };

  const codeContext: ContextClassification = {
    context: "code",
    intent: "cleanup",
    confidence: 0.85,
    strictMode: true,
    strictOverlapThreshold: 0.45,
    signals: ["app:code"],
    targetApp: mockTargetApp,
  };

  const generalContext: ContextClassification = {
    context: "general",
    intent: "cleanup",
    confidence: 0.55,
    strictMode: false,
    strictOverlapThreshold: 0.45,
    signals: [],
    targetApp: mockTargetApp,
  };

  it("includes CODE CONTEXT PROTECTION for code context", () => {
    const prompt = getSystemPrompt("Assistant", undefined, "en-US", undefined, "en", codeContext);
    
    expect(prompt).toContain("CODE CONTEXT PROTECTION");
    expect(prompt).toContain("Preserve command names, module names, product names, function names, and technical identifiers exactly as spoken");
    expect(prompt).toContain("Do not rewrite code snippets, paths, or CLI commands into natural language");
    expect(prompt).toContain("Keep technical terminology intact even if it sounds like regular words");
  });

  it("does not include CODE CONTEXT PROTECTION for general context", () => {
    const prompt = getSystemPrompt("Assistant", undefined, "en-US", undefined, "en", generalContext);
    
    expect(prompt).not.toContain("CODE CONTEXT PROTECTION");
  });

  it("does not include CODE CONTEXT PROTECTION when context is undefined", () => {
    const prompt = getSystemPrompt("Assistant", undefined, "en-US", undefined, "en", undefined);
    
    expect(prompt).not.toContain("CODE CONTEXT PROTECTION");
  });

  it("preserves technical terms in code context prompt", () => {
    const prompt = getSystemPrompt("Assistant", undefined, "en-US", undefined, "en", codeContext);
    
    // Verify all three protection rules are present
    const protectionSection = prompt.split("CODE CONTEXT PROTECTION:")[1];
    expect(protectionSection).toBeDefined();
    expect(protectionSection!.split("\n").filter(line => line.trim().startsWith("-")).length).toBeGreaterThanOrEqual(3);
  });

  it("includes code-specific focus hint", () => {
    const prompt = getSystemPrompt("Assistant", undefined, "en-US", undefined, "en", codeContext);
    
    expect(prompt).toContain("Preserve syntax, symbols, casing, and code blocks exactly where possible");
  });

  it("maintains context label for code", () => {
    const prompt = getSystemPrompt("Assistant", undefined, "en-US", undefined, "en", codeContext);
    
    expect(prompt).toContain("code or technical content");
  });
});
