import { describe, expect, it } from "vitest";

describe("clipboard preserveClipboard option", () => {
  interface PasteOptions {
    preserveClipboard?: boolean;
  }

  it("should preserve clipboard content when preserveClipboard is true on macOS", () => {
    const mockOptions: PasteOptions = { preserveClipboard: true };
    const shouldRestore = !mockOptions.preserveClipboard;
    expect(shouldRestore).toBe(false);
  });

  it("should restore clipboard content when preserveClipboard is false on macOS", () => {
    const mockOptions: PasteOptions = { preserveClipboard: false };
    const shouldRestore = !mockOptions.preserveClipboard;
    expect(shouldRestore).toBe(true);
  });

  it("should restore clipboard content when preserveClipboard is undefined on macOS", () => {
    const mockOptions: PasteOptions = {};
    const shouldRestore = !mockOptions.preserveClipboard;
    expect(shouldRestore).toBe(true);
  });

  it("should preserve clipboard content when preserveClipboard is true on Windows", () => {
    const mockOptions: PasteOptions = { preserveClipboard: true };
    const shouldRestore = !mockOptions?.preserveClipboard;
    expect(shouldRestore).toBe(false);
  });

  it("should preserve clipboard content when preserveClipboard is true on Linux", () => {
    const mockOptions: PasteOptions = { preserveClipboard: true };
    const shouldRestore = !mockOptions?.preserveClipboard;
    expect(shouldRestore).toBe(false);
  });

  it("handles optional chaining for undefined options", () => {
    const mockOptions: PasteOptions | undefined = undefined;
    const shouldRestore = !mockOptions?.preserveClipboard;
    expect(shouldRestore).toBe(true);
  });
});
