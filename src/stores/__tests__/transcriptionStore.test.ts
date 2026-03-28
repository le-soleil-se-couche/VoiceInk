import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTranscriptions,
  getTranscriptionStoreState,
  initializeTranscriptions,
  loadMoreTranscriptions,
} from "../transcriptionStore";

if (!globalThis.window) {
  Object.defineProperty(globalThis, "window", {
    value: { addEventListener: vi.fn() },
    configurable: true,
    writable: true,
  });
}

describe("transcriptionStore pagination", () => {
  beforeEach(() => {
    clearTranscriptions();
    Object.assign(globalThis.window, {
      electronAPI: {
        getTranscriptions: vi.fn(),
        getTranscriptionsPage: vi.fn(),
        onTranscriptionAdded: vi.fn(() => () => {}),
        onTranscriptionDeleted: vi.fn(() => () => {}),
        onTranscriptionsCleared: vi.fn(() => () => {}),
      },
    });
  });

  it("loads the first page and appends older pages", async () => {
    const firstPage = [
      { id: 5, text: "five", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 4, text: "four", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 3, text: "three", timestamp: "2026-03-28", created_at: "2026-03-28" },
    ];
    const secondPage = [
      { id: 2, text: "two", timestamp: "2026-03-27", created_at: "2026-03-27" },
      { id: 1, text: "one", timestamp: "2026-03-27", created_at: "2026-03-27" },
    ];

    vi.mocked(window.electronAPI.getTranscriptionsPage!)
      .mockResolvedValueOnce(firstPage as any)
      .mockResolvedValueOnce(secondPage as any);

    await initializeTranscriptions(3);
    expect(getTranscriptionStoreState().transcriptions.map((item) => item.id)).toEqual([5, 4, 3]);
    expect(getTranscriptionStoreState().hasMore).toBe(true);
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(3);

    await loadMoreTranscriptions(3);
    expect(getTranscriptionStoreState().transcriptions.map((item) => item.id)).toEqual([
      5, 4, 3, 2, 1,
    ]);
    expect(getTranscriptionStoreState().hasMore).toBe(false);
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(1);
  });
});
