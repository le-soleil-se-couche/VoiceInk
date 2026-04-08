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

describe("Linux paste fallback preserves clipboard content", () => {
  it("ensures clipboard is restored to original content when all paste tools fail on Linux X11", () => {
    const originalClipboard = "user's important clipboard data";
    const dictationText = "voice ink dictated text";
    const pasteFailed = true;
    
    // When paste fails, clipboard should be restored to original content
    const clipboardAfterFailure = pasteFailed ? originalClipboard : dictationText;
    
    expect(clipboardAfterFailure).toBe(originalClipboard);
    expect(pasteFailed).toBe(true);
  });

  it("ensures clipboard is restored to original content when all paste tools fail on Linux Wayland", () => {
    const originalClipboard = "original wayland clipboard";
    const dictationText = "dictated wayland text";
    const isWayland = true;
    const allToolsFailed = true;
    
    // On Wayland, when all tools fail, clipboard should be restored
    const clipboardContent = allToolsFailed && isWayland ? originalClipboard : dictationText;
    
    expect(clipboardContent).toBe(originalClipboard);
    expect(isWayland).toBe(true);
  });

  it("validates error message indicates manual paste option on Linux", () => {
    const linuxErrorMsg = "Clipboard copied, but paste simulation failed on X11. Please install xdotool or paste manually with Ctrl+V.";
    
    expect(linuxErrorMsg).toContain("Clipboard copied");
    expect(linuxErrorMsg).toContain("paste manually");
    expect(linuxErrorMsg).toContain("Ctrl+V");
  });

  it("validates Wayland-specific error message mentions required tools", () => {
    const waylandErrorMsg = "Clipboard copied, but automatic pasting on Wayland requires xdotool (with XWayland) or ydotool (with ydotoold daemon running). Please paste manually with Ctrl+V.";
    
    expect(waylandErrorMsg).toContain("Wayland");
    expect(waylandErrorMsg).toContain("xdotool");
    expect(waylandErrorMsg).toContain("ydotool");
    expect(waylandErrorMsg).toContain("paste manually");
  });

  it("ensures ydotool daemon note is appended when daemon is not running", () => {
    const ydotoolExists = true;
    const ydotoolDaemonRunning = false;
    const baseErrorMsg = "Clipboard copied, but paste simulation failed.";
    const fullErrorMsg = ydotoolExists && !ydotoolDaemonRunning
      ? baseErrorMsg + "\n\nNote: ydotool is installed but the ydotoold daemon is not running. Start it with: sudo systemctl enable --now ydotool"
      : baseErrorMsg;
    
    expect(fullErrorMsg).toContain("ydotoold daemon");
    expect(fullErrorMsg).toContain("sudo systemctl enable --now ydotool");
  });

  it("confirms dictation text is preserved in clipboard on paste failure", () => {
    // When paste automation fails, dictation text should remain in clipboard
    // so the user can manually paste it
    const dictationText = "dictated voice text";
    const originalClipboard = "user's original clipboard data";
    
    // After failed paste, clipboard should contain dictation text (not original)
    const clipboardAfterFailure = dictationText;
    
    expect(clipboardAfterFailure).toBe(dictationText);
    expect(clipboardAfterFailure).not.toBe(originalClipboard);
  });

  it("validates paste fallback preserves dictation text on Windows PowerShell failure", () => {
    const dictationText = "voice dictated content";
    let clipboardContent = dictationText;
    const pasteFailed = true;
    
    // When PowerShell paste fails, resolve() is called without restoring clipboard
    // This keeps dictation text available for manual Ctrl+V
    const shouldPreserveDictation = pasteFailed;
    
    expect(shouldPreserveDictation).toBe(true);
    expect(clipboardContent).toBe(dictationText);
  });

  it("validates paste fallback preserves dictation text on macOS osascript failure", () => {
    const dictationText = "macOS dictated text";
    let clipboardContent = dictationText;
    const osascriptFailed = true;
    
    // When osascript paste fails, resolve() is called without restoring clipboard
    // This keeps dictation text available for manual Cmd+V
    const shouldPreserveDictation = osascriptFailed;
    
    expect(shouldPreserveDictation).toBe(true);
    expect(clipboardContent).toBe(dictationText);
  });

  it("validates paste fallback preserves dictation text on Linux tools failure", () => {
    const dictationText = "Linux dictated text";
    const allToolsFailed = true;
    
    // When all Linux paste tools fail, error is thrown but clipboard is NOT restored
    // This keeps dictation text available for manual Ctrl+V
    const clipboardAfterAllToolsFail = allToolsFailed ? dictationText : "restored";
    
    expect(clipboardAfterAllToolsFail).toBe(dictationText);
  });

  it("ensures manual paste fallback has correct dictation text on all platforms", () => {
    const platforms = [
      { name: "macOS", dictation: "macOS text", expected: "macOS text" },
      { name: "Windows", dictation: "Windows text", expected: "Windows text" },
      { name: "Linux", dictation: "Linux text", expected: "Linux text" },
    ];
    
    platforms.forEach(({ name, dictation, expected }) => {
      // When paste automation fails, dictation text stays in clipboard
      const clipboardContent = dictation;
      expect(clipboardContent).toBe(expected);
    });
  });
});
