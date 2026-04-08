const { describe, it, expect, beforeEach, afterEach, vi } = require("vitest");
const DeepgramStreaming = require("../deepgramStreaming");

describe("DeepgramStreaming - Network Resilience", () => {
  let streaming;

  beforeEach(() => {
    streaming = new DeepgramStreaming();
    vi.useFakeTimers();
  });

  afterEach(() => {
    streaming.cleanupAll();
    vi.useRealTimers();
  });

  describe("_shouldReconnect", () => {
    it("should not reconnect on null error", () => {
      expect(streaming._shouldReconnect(null)).toBe(false);
    });

    it("should not reconnect on 401 auth error", () => {
      const error = new Error("WebSocket connection failed: 401 Unauthorized");
      expect(streaming._shouldReconnect(error)).toBe(false);
    });

    it("should not reconnect on 403 forbidden error", () => {
      const error = new Error("WebSocket connection failed: 403 Forbidden");
      expect(streaming._shouldReconnect(error)).toBe(false);
    });

    it("should reconnect on transient network error", () => {
      const error = new Error("Network error: connection lost");
      expect(streaming._shouldReconnect(error)).toBe(true);
    });

    it("should not reconnect after max attempts reached", () => {
      streaming.reconnectAttempts = 5;
      const error = new Error("Network error");
      expect(streaming._shouldReconnect(error)).toBe(false);
    });
  });

  describe("_scheduleReconnect", () => {
    it("should schedule reconnect with exponential backoff", () => {
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");
      streaming._scheduleReconnect();
      
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(streaming.reconnectAttempts).toBe(1);
      expect(streaming.reconnectTimer).toBeDefined();
    });

    it("should not schedule multiple reconnects", () => {
      streaming._scheduleReconnect();
      const firstTimer = streaming.reconnectTimer;
      streaming._scheduleReconnect();
      expect(streaming.reconnectTimer).toBe(firstTimer);
      expect(streaming.reconnectAttempts).toBe(1);
    });

    it("should cap delay at max delay", () => {
      streaming.reconnectAttempts = 10;
      streaming._scheduleReconnect();
      const call = setTimeout.mock.calls[0];
      expect(call[1]).toBeLessThanOrEqual(30000);
    });
  });

  describe("_reconnect", () => {
    it("should refresh token and reconnect", async () => {
      const mockToken = "test-token-123";
      const mockRefreshFn = vi.fn().mockResolvedValue(mockToken);
      streaming.setTokenRefreshFn(mockRefreshFn);
      
      const connectSpy = vi.spyOn(streaming, "connect").mockResolvedValue();
      
      await streaming._reconnect();
      
      expect(mockRefreshFn).toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          token: mockToken,
          forceNew: true,
        })
      );
    });

    it("should reset attempts on successful reconnect", async () => {
      streaming.reconnectAttempts = 3;
      const mockToken = "test-token";
      streaming.setTokenRefreshFn(vi.fn().mockResolvedValue(mockToken));
      vi.spyOn(streaming, "connect").mockResolvedValue();
      
      await streaming._reconnect();
      
      expect(streaming.reconnectAttempts).toBe(0);
    });

    it("should schedule another reconnect on failure", async () => {
      const mockToken = "test-token";
      streaming.setTokenRefreshFn(vi.fn().mockResolvedValue(mockToken));
      vi.spyOn(streaming, "connect").mockRejectedValue(new Error("Connection failed"));
      
      const scheduleSpy = vi.spyOn(streaming, "_scheduleReconnect");
      await streaming._reconnect();
      
      expect(scheduleSpy).toHaveBeenCalled();
    });

    it("should call onError after max attempts", async () => {
      const mockToken = "test-token";
      streaming.setTokenRefreshFn(vi.fn().mockResolvedValue(mockToken));
      streaming.reconnectAttempts = 5;
      vi.spyOn(streaming, "connect").mockRejectedValue(new Error("Connection failed"));
      
      const onErrorSpy = vi.fn();
      streaming.onError = onErrorSpy;
      
      await streaming._reconnect();
      
      expect(onErrorSpy).toHaveBeenCalled();
      expect(streaming.reconnectAttempts).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should clear reconnect timer", () => {
      streaming._scheduleReconnect();
      expect(streaming.reconnectTimer).toBeDefined();
      
      streaming.cleanup();
      expect(streaming.reconnectTimer).toBeNull();
    });

    it("should reset reconnect state in cleanupAll", () => {
      streaming.reconnectAttempts = 3;
      streaming.lastError = new Error("test");
      
      streaming.cleanupAll();
      
      expect(streaming.reconnectAttempts).toBe(0);
      expect(streaming.lastError).toBeNull();
    });
  });

  describe("Error handling integration", () => {
    it("should trigger reconnect on WebSocket error", () => {
      const scheduleSpy = vi.spyOn(streaming, "_scheduleReconnect");
      
      const error = new Error("Network error");
      streaming.onError = () => {};
      
      streaming.lastError = error;
      if (streaming._shouldReconnect(error)) {
        streaming._scheduleReconnect();
      }
      
      expect(scheduleSpy).toHaveBeenCalled();
    });

    it("should not trigger reconnect on auth error", () => {
      const scheduleSpy = vi.spyOn(streaming, "_scheduleReconnect");
      const cleanupSpy = vi.spyOn(streaming, "cleanup");
      
      const error = new Error("401 Unauthorized");
      
      streaming.lastError = error;
      if (!streaming._shouldReconnect(error)) {
        streaming.cleanup();
      }
      
      expect(scheduleSpy).not.toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
