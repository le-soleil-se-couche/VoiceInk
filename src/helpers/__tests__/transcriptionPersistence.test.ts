import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock localStorage
const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.data.get(key) || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage.data.set(key, value); }),
  removeItem: vi.fn((key: string) => { mockLocalStorage.data.delete(key); }),
  clear: vi.fn(() => { mockLocalStorage.data.clear(); }),
};

vi.stubGlobal("localStorage", mockLocalStorage);

// Mock window.electronAPI
const mockSaveTranscription = vi.fn();
vi.stubGlobal("window", {
  electronAPI: {
    saveTranscription: mockSaveTranscription,
  },
});

// Mock logger
vi.mock("../utils/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Transcription Persistence", () => {
  const PENDING_TRANSCRIPTIONS_KEY = "voiceink_pending_transcriptions";
  const MAX_PENDING_TRANSCRIPTIONS = 100;

  beforeEach(() => {
    mockLocalStorage.data.clear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockSaveTranscription.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingTranscriptions", () => {
    it("should return empty array when no pending transcriptions", () => {
      const audioManager = new (require("../audioManager").default)();
      const result = audioManager.getPendingTranscriptions();
      expect(result).toEqual([]);
    });

    it("should return pending transcriptions from localStorage", () => {
      const pendingData = [
        { text: "test transcription 1", timestamp: 1234567890 },
        { text: "test transcription 2", timestamp: 1234567891 },
      ];
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, JSON.stringify(pendingData));

      const audioManager = new (require("../audioManager").default)();
      const result = audioManager.getPendingTranscriptions();

      expect(result).toEqual(pendingData);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(PENDING_TRANSCRIPTIONS_KEY);
    });

    it("should return empty array for invalid JSON", () => {
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, "invalid json");

      const audioManager = new (require("../audioManager").default)();
      const result = audioManager.getPendingTranscriptions();

      expect(result).toEqual([]);
    });

    it("should return empty array when localStorage is not an array", () => {
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, JSON.stringify({ not: "an array" }));

      const audioManager = new (require("../audioManager").default)();
      const result = audioManager.getPendingTranscriptions();

      expect(result).toEqual([]);
    });
  });

  describe("savePendingTranscription", () => {
    it("should save a transcription to localStorage", () => {
      const audioManager = new (require("../audioManager").default)();
      const result = audioManager.savePendingTranscription("test text");

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      const stored = JSON.parse(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY) || "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].text).toBe("test text");
      expect(stored[0].timestamp).toBeDefined();
    });

    it("should append to existing pending transcriptions", () => {
      const existing = [{ text: "existing", timestamp: 1234567890 }];
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, JSON.stringify(existing));

      const audioManager = new (require("../audioManager").default)();
      audioManager.savePendingTranscription("new text");

      const stored = JSON.parse(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY) || "[]");
      expect(stored).toHaveLength(2);
      expect(stored[1].text).toBe("new text");
    });

    it("should limit the number of pending transcriptions", () => {
      const audioManager = new (require("../audioManager").default)();

      // Add more than MAX_PENDING_TRANSCRIPTIONS
      for (let i = 0; i < MAX_PENDING_TRANSCRIPTIONS + 10; i++) {
        audioManager.savePendingTranscription(`text ${i}`);
      }

      const stored = JSON.parse(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY) || "[]");
      expect(stored).toHaveLength(MAX_PENDING_TRANSCRIPTIONS);
      // Should keep the most recent ones
      expect(stored[0].text).toBe("text 10");
      expect(stored[stored.length - 1].text).toBe(`text ${MAX_PENDING_TRANSCRIPTIONS + 9}`);
    });
  });

  describe("flushPendingTranscriptions", () => {
    it("should return zeros when no pending transcriptions", async () => {
      const audioManager = new (require("../audioManager").default)();
      const result = await audioManager.flushPendingTranscriptions();

      expect(result).toEqual({ flushed: 0, failed: 0 });
      expect(mockSaveTranscription).not.toHaveBeenCalled();
    });

    it("should flush all pending transcriptions", async () => {
      const pendingData = [
        { text: "transcription 1", timestamp: 1234567890 },
        { text: "transcription 2", timestamp: 1234567891 },
      ];
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, JSON.stringify(pendingData));
      mockSaveTranscription.mockResolvedValue({ success: true });

      const audioManager = new (require("../audioManager").default)();
      const result = await audioManager.flushPendingTranscriptions();

      expect(result.flushed).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockSaveTranscription).toHaveBeenCalledTimes(2);
      expect(mockSaveTranscription).toHaveBeenCalledWith("transcription 1");
      expect(mockSaveTranscription).toHaveBeenCalledWith("transcription 2");
      expect(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY)).toBeUndefined();
    });

    it("should handle partial failures during flush", async () => {
      const pendingData = [
        { text: "success text", timestamp: 1234567890 },
        { text: "fail text", timestamp: 1234567891 },
      ];
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, JSON.stringify(pendingData));
      mockSaveTranscription
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error("Network error"));

      const audioManager = new (require("../audioManager").default)();
      const result = await audioManager.flushPendingTranscriptions();

      expect(result.flushed).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY)).toBeUndefined();
    });
  });

  describe("clearPendingTranscriptions", () => {
    it("should clear all pending transcriptions", () => {
      mockLocalStorage.data.set(PENDING_TRANSCRIPTIONS_KEY, JSON.stringify([{ text: "test" }]));

      const audioManager = new (require("../audioManager").default)();
      const result = audioManager.clearPendingTranscriptions();

      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(PENDING_TRANSCRIPTIONS_KEY);
      expect(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY)).toBeUndefined();
    });
  });

  describe("saveTranscription with fallback", () => {
    it("should queue transcription when save fails", async () => {
      mockSaveTranscription.mockRejectedValueOnce(new Error("IPC failed"));

      const audioManager = new (require("../audioManager").default)();
      const result = await audioManager.saveTranscription("test text");

      expect(result).toBe(false);
      expect(mockSaveTranscription).toHaveBeenCalledWith("test text");

      // Should have queued for retry
      const pending = JSON.parse(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY) || "[]");
      expect(pending).toHaveLength(1);
      expect(pending[0].text).toBe("test text");
    });

    it("should return true when save succeeds", async () => {
      mockSaveTranscription.mockResolvedValueOnce({ success: true });

      const audioManager = new (require("../audioManager").default)();
      const result = await audioManager.saveTranscription("test text");

      expect(result).toBe(true);
      expect(mockSaveTranscription).toHaveBeenCalledWith("test text");
      expect(mockLocalStorage.data.get(PENDING_TRANSCRIPTIONS_KEY)).toBeUndefined();
    });
  });
});
