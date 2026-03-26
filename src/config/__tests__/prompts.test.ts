import { describe, expect, it } from "vitest";
import {
  CLEANUP_PROMPT,
  isUnsafeUnifiedPrompt,
  sanitizeUnifiedPrompt,
  UNIFIED_SYSTEM_PROMPT,
} from "../prompts";

describe("prompt safety sanitization", () => {
  it("flags legacy full prompts that enable agent behavior", () => {
    expect(isUnsafeUnifiedPrompt('You operate in two modes.\n\nMODE 2: AGENT')).toBe(true);
  });

  it("flags legacy agent prompts that execute spoken instructions", () => {
    expect(
      isUnsafeUnifiedPrompt(
        "If I give you an instruction, execute it and remove the instruction from the output."
      )
    ).toBe(true);
  });

  it("keeps cleanup-only prompts unchanged", () => {
    expect(sanitizeUnifiedPrompt(CLEANUP_PROMPT)).toBe(CLEANUP_PROMPT);
  });

  it("resets unsafe unified prompts back to the cleanup default", () => {
    expect(
      sanitizeUnifiedPrompt(
        'You operate in two modes.\n\nMODE 2: AGENT\n\nAnswer questions directly.'
      )
    ).toBe(UNIFIED_SYSTEM_PROMPT);
  });

  it("falls back to the cleanup default for blank prompts", () => {
    expect(sanitizeUnifiedPrompt("   ")).toBe(UNIFIED_SYSTEM_PROMPT);
  });
});
