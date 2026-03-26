import { describe, expect, it } from "vitest";
import { hasUnresolvedAlternativeChoice } from "../questionIntent";

describe("hasUnresolvedAlternativeChoice", () => {
  it("detects unresolved English or-choices", () => {
    expect(hasUnresolvedAlternativeChoice("should we ship this today or tomorrow")).toBe(true);
  });

  it("ignores filler-style English or-phrases", () => {
    expect(hasUnresolvedAlternativeChoice("we can test it or something")).toBe(false);
  });
});
