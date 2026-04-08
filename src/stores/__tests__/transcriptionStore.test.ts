import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTranscriptions,
  getTranscriptionStoreState,
  initializeTranscriptions,
  loadMoreTranscriptions,
  removeTranscription,
} from "../transcriptionStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

if (!globalThis.window) {
  Object.defineProperty(globalThis, "window", {
    value: { 
      addEventListener: vi.fn(),
      localStorage: localStorageMock,
    },
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

  it("persists pagination state to localStorage and restores on re-initialization", async () => {
    const firstPage = [
      { id: 5, text: "five", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 4, text: "four", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 3, text: "three", timestamp: "2026-03-28", created_at: "2026-03-28" },
    ];
    const secondPage = [
      { id: 2, text: "two", timestamp: "2026-03-27", created_at: "2026-03-27" },
      { id: 1, text: "one", timestamp: "2026-03-27", created_at: "2026-03-27" },
    ];

    // Clear beforeEach calls
    vi.mocked(window.localStorage.setItem).mockClear();
    vi.mocked(window.localStorage.removeItem).mockClear();

    vi.mocked(window.electronAPI.getTranscriptionsPage!)
      .mockResolvedValueOnce(firstPage as any)
      .mockResolvedValueOnce(secondPage as any)
      .mockResolvedValueOnce([] as any);

    // First initialization - persists initial state
    await initializeTranscriptions(3);
    expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
    let savedState = JSON.parse(vi.mocked(window.localStorage.setItem).mock.calls[0][1]);
    expect(savedState.hasMore).toBe(true);
    expect(savedState.oldestLoadedId).toBe(3);

    // Load more to update persistence
    vi.mocked(window.localStorage.setItem).mockClear();
    await loadMoreTranscriptions(3);
    expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
    savedState = JSON.parse(vi.mocked(window.localStorage.setItem).mock.calls[0][1]);
    expect(savedState.hasMore).toBe(false);
    expect(savedState.oldestLoadedId).toBe(1);

    // Clear localStorage mock calls for next test
    vi.mocked(window.localStorage.setItem).mockClear();
    vi.mocked(window.localStorage.getItem).mockClear();
    vi.mocked(window.localStorage.removeItem).mockClear();

    // Simulate page reload: mock localStorage to return the saved state
    vi.mocked(window.localStorage.getItem).mockReturnValue(JSON.stringify(savedState));

    // Re-initialize (simulating page reload)
    clearTranscriptions();
    await initializeTranscriptions(3);

    // Should have restored pagination state from localStorage
    expect(window.localStorage.getItem).toHaveBeenCalledTimes(1);
    expect(getTranscriptionStoreState().hasMore).toBe(false);
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(1);
  });

  it("clears localStorage pagination state when transcriptions are cleared", async () => {
    const firstPage = [
      { id: 5, text: "five", timestamp: "2026-03-28", created_at: "2026-03-28" },
    ];

    vi.mocked(window.electronAPI.getTranscriptionsPage!).mockResolvedValueOnce(firstPage as any);

    await initializeTranscriptions(3);
    await loadMoreTranscriptions(3);

    // Clear localStorage mock calls from beforeEach
    vi.mocked(window.localStorage.removeItem).mockClear();

    // Clear transcriptions
    clearTranscriptions();

    expect(window.localStorage.removeItem).toHaveBeenCalledTimes(1);
  });

  it("maintains stable cursor when deleting items mid-list", async () => {
    const items = [
      { id: 5, text: "five", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 4, text: "four", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 3, text: "three", timestamp: "2026-03-28", created_at: "2026-03-28" },
      { id: 2, text: "two", timestamp: "2026-03-27", created_at: "2026-03-27" },
      { id: 1, text: "one", timestamp: "2026-03-27", created_at: "2026-03-27" },
    ];

    vi.mocked(window.electronAPI.getTranscriptionsPage!).mockResolvedValueOnce(items as any);

    await initializeTranscriptions(5);
    
    // Initial state: oldestLoadedId should be 1 (the last item)
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(1);
    
    // Delete item in the middle (id: 3)
    removeTranscription(3);
    
    // Cursor should update to the new last item (id: 1 is still last)
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(1);
    expect(getTranscriptionStoreState().transcriptions.map((item) => item.id)).toEqual([5, 4, 2, 1]);
    
    // Delete the oldest item (id: 1)
    removeTranscription(1);
    
    // Cursor should update to the new last item (id: 2)
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(2);
    expect(getTranscriptionStoreState().transcriptions.map((item) => item.id)).toEqual([5, 4, 2]);
    
    // Delete another item (id: 4)
    removeTranscription(4);
    
    // Cursor should still point to the last item (id: 2)
    expect(getTranscriptionStoreState().oldestLoadedId).toBe(2);
    expect(getTranscriptionStoreState().transcriptions.map((item) => item.id)).toEqual([5, 2]);
  });
});
