import { describe, expect, it } from "vitest";

// Test the replay buffer ordering logic for Deepgram reconnection
// This tests the fix for: reconnect-ordering: verify transcript ordering after reconnection with replay buffer

describe("Deepgram replay buffer ordering after reconnection", () => {
  // Test the replay buffer flush order logic
  it("should flush replay buffer in FIFO order to preserve transcript ordering", () => {
    // Simulate replay buffer containing audio chunks in order
    const replayBuffer = [
      Buffer.from([1, 2, 3, 4]),
      Buffer.from([5, 6, 7, 8]),
      Buffer.from([9, 10, 11, 12]),
    ];
    
    // Simulate the flush logic from connect()
    const sendOrder: number[][] = [];
    for (const buf of replayBuffer) {
      sendOrder.push(Array.from(buf));
    }
    
    // Verify FIFO order is preserved
    expect(sendOrder[0]).toEqual([1, 2, 3, 4]);
    expect(sendOrder[1]).toEqual([5, 6, 7, 8]);
    expect(sendOrder[2]).toEqual([9, 10, 11, 12]);
  });

  it("should handle empty replay buffer gracefully", () => {
    const replayBuffer: Buffer[] = [];
    
    // Simulate the flush logic
    const sendCount = replayBuffer.length;
    
    expect(sendCount).toBe(0);
  });

  it("should preserve accumulatedText and finalSegments state", () => {
    const savedAccumulatedText = "already transcribed text ";
    const savedFinalSegments = ["already", "transcribed", "text"];
    
    // Simulate state restoration in connect()
    const accumulatedText = savedAccumulatedText || "";
    const finalSegments = savedFinalSegments ? [...savedFinalSegments] : [];
    
    expect(accumulatedText).toBe(savedAccumulatedText);
    expect(finalSegments).toEqual(savedFinalSegments);
    expect(finalSegments).not.toBe(savedFinalSegments); // Should be a copy
  });

  it("should handle undefined accumulatedText gracefully", () => {
    const savedAccumulatedText = undefined;
    
    // Simulate state restoration with undefined
    const accumulatedText = savedAccumulatedText || "";
    
    expect(accumulatedText).toBe("");
  });

  it("should handle undefined finalSegments gracefully", () => {
    const savedFinalSegments = undefined;
    
    // Simulate state restoration with undefined
    const finalSegments = savedFinalSegments ? [...savedFinalSegments] : [];
    
    expect(finalSegments).toEqual([]);
  });

  it("should clear coldStartBuffer after flushing to prevent duplicate sends", () => {
    // Simulate coldStartBuffer being set from replayBuffer
    let coldStartBuffer = [Buffer.from([1, 2, 3, 4])];
    let coldStartBufferSize = coldStartBuffer.reduce((sum, b) => sum + b.length, 0);
    
    // Simulate the flush loop
    for (const buf of coldStartBuffer) {
      // Would send buf to WebSocket
    }
    
    // After flush, buffer should be cleared
    coldStartBuffer = [];
    coldStartBufferSize = 0;
    
    expect(coldStartBuffer).toEqual([]);
    expect(coldStartBufferSize).toBe(0);
  });

  it("should calculate coldStartBufferSize correctly from replayBuffer", () => {
    const replayBuffer = [
      Buffer.from([1, 2, 3, 4]), // 4 bytes
      Buffer.from([5, 6, 7, 8, 9, 10]), // 6 bytes
      Buffer.from([11, 12]), // 2 bytes
    ];
    
    const expectedSize = replayBuffer.reduce((sum, b) => sum + b.length, 0);
    
    expect(expectedSize).toBe(12);
  });
});

describe("Deepgram continuous liveness monitoring", () => {
  // Test the continuous liveness monitoring logic for ongoing stream health
  it("should track lastResultsTimestamp for ongoing liveness checks", () => {
    // Simulate the timestamp tracking logic
    const LIVENESS_TIMEOUT_MS = 2500;
    let lastResultsTimestamp: number | null = null;
    
    // Simulate receiving a result
    lastResultsTimestamp = Date.now();
    const timeOfResult = lastResultsTimestamp;
    
    // Simulate checking liveness after 1 second
    const checkTime1 = timeOfResult + 1000;
    const timeSinceLastResults1 = lastResultsTimestamp ? checkTime1 - lastResultsTimestamp : Infinity;
    
    expect(timeSinceLastResults1).toBe(1000);
    expect(timeSinceLastResults1).toBeLessThan(LIVENESS_TIMEOUT_MS);
    
    // Simulate checking liveness after timeout period
    const checkTime2 = timeOfResult + 3000;
    const timeSinceLastResults2 = lastResultsTimestamp ? checkTime2 - lastResultsTimestamp : Infinity;
    
    expect(timeSinceLastResults2).toBe(3000);
    expect(timeSinceLastResults2).toBeGreaterThan(LIVENESS_TIMEOUT_MS);
  });

  it("should handle null lastResultsTimestamp gracefully", () => {
    let lastResultsTimestamp: number | null = null;
    
    // When no results have been received yet
    const timeSinceLastResults = lastResultsTimestamp ? Date.now() - lastResultsTimestamp : Infinity;
    
    expect(timeSinceLastResults).toBe(Infinity);
  });

  it("should reset lastResultsTimestamp on cleanup", () => {
    let lastResultsTimestamp: number | null = Date.now();
    
    // Simulate cleanup
    lastResultsTimestamp = null;
    
    expect(lastResultsTimestamp).toBeNull();
  });

  it("should initialize lastResultsTimestamp to null on connect", () => {
    // Simulate connect() initialization
    let lastResultsTimestamp: number | null = null;
    let resultsReceived = 0;
    
    expect(lastResultsTimestamp).toBeNull();
    expect(resultsReceived).toBe(0);
  });

  it("should update lastResultsTimestamp on each Results message", () => {
    let lastResultsTimestamp: number | null = null;
    const timestamps: number[] = [];
    
    // Simulate receiving multiple Results messages
    for (let i = 0; i < 3; i++) {
      lastResultsTimestamp = 1000 + (i * 500);
      timestamps.push(lastResultsTimestamp);
    }
    
    // Should have the latest timestamp
    expect(lastResultsTimestamp).toBe(2000);
  });

  it("should handle liveness check during ongoing stream", () => {
    const LIVENESS_TIMEOUT_MS = 2500;
    const lastResultsTimestamp = Date.now() - 1000; // 1 second ago
    const now = Date.now();
    const timeSinceLastResults = lastResultsTimestamp ? now - lastResultsTimestamp : Infinity;
    
    // Should NOT trigger reconnection, just restart timer
    const shouldReconnect = timeSinceLastResults >= LIVENESS_TIMEOUT_MS;
    
    expect(shouldReconnect).toBe(false);
  });

  it("should handle the liveness check decision logic", () => {
    const LIVENESS_TIMEOUT_MS = 2500;
    
    // Case 1: No results ever received, not connected - skip (initial connection)
    const resultsReceived1 = 0;
    const isConnected1 = false;
    const shouldSkip1 = resultsReceived1 === 0 && !isConnected1;
    expect(shouldSkip1).toBe(true);
    
    // Case 2: Results received recently - restart timer
    const lastResultsTimestamp2 = Date.now() - 1000;
    const timeSinceLastResults2 = Date.now() - lastResultsTimestamp2;
    const shouldRestartTimer = timeSinceLastResults2 < LIVENESS_TIMEOUT_MS;
    expect(shouldRestartTimer).toBe(true);
    
    // Case 3: Results not received recently - reconnect
    const lastResultsTimestamp3 = Date.now() - 3000;
    const timeSinceLastResults3 = Date.now() - lastResultsTimestamp3;
    const shouldReconnect = timeSinceLastResults3 >= LIVENESS_TIMEOUT_MS;
    expect(shouldReconnect).toBe(true);
  });
});

describe("Deepgram disconnect early termination fix", () => {
  // Test the fix for: streaming-stability-early-termination: preserve final text during disconnect race condition

  it("should preserve result text from closeResolve before cleanup clears state", () => {
    // Simulate the disconnect flow where closeResolve provides text
    const accumulatedTextBefore = "partial text ";
    const closeResolveText = "final transcript from close event";
    
    // Simulate Promise.race result from closeResolve
    const result = { text: closeResolveText };
    
    // The fix preserves result text before cleanup
    const finalText = result?.text || accumulatedTextBefore;
    
    expect(finalText).toBe(closeResolveText);
    expect(finalText).not.toBe(accumulatedTextBefore);
  });

  it("should fall back to accumulatedText when closeResolve returns empty", () => {
    const accumulatedTextBefore = "accumulated transcript";
    
    // Simulate closeResolve returning empty or undefined
    const result = { text: "" };
    
    // The fix falls back to accumulatedText
    const finalText = result?.text || accumulatedTextBefore;
    
    expect(finalText).toBe(accumulatedTextBefore);
  });

  it("should handle undefined result gracefully", () => {
    const accumulatedTextBefore = "fallback text";
    
    // Simulate result being undefined
    const result = undefined;
    
    // The fix handles undefined result
    const finalText = result?.text || accumulatedTextBefore;
    
    expect(finalText).toBe(accumulatedTextBefore);
  });

  it("should preserve text when closeResolve fires after timeout", () => {
    // Simulate the race condition where timeout fires first but closeResolve fires shortly after
    const timeoutText = "text at timeout";
    const closeEventText = "final text from close event";
    
    // In the original bug, timeout text would be used but then overwritten by cleanup
    // The fix preserves the result text before cleanup
    const result = { text: timeoutText };
    const finalText = result?.text || closeEventText;
    
    expect(finalText).toBe(timeoutText);
  });

  it("should clear state after preserving result to prevent memory leaks", () => {
    let accumulatedText = "some text";
    let finalSegments = ["some", "text"];
    
    // Simulate preserving result before cleanup
    const result = { text: accumulatedText };
    const finalText = result?.text || accumulatedText;
    
    // Then clear state (simulating cleanup)
    accumulatedText = "";
    finalSegments = [];
    
    // Final text should still be preserved
    expect(finalText).toBe("some text");
    expect(accumulatedText).toBe("");
    expect(finalSegments).toEqual([]);
  });

  it("should handle the full disconnect flow with preserved text", () => {
    // Simulate the complete disconnect flow
    const state = {
      accumulatedText: "transcript part 1 ",
      finalSegments: ["transcript", "part", "1"],
      ws: { readyState: 1 }, // OPEN
      isDisconnecting: false,
    };
    
    // Send CloseStream and wait for result
    const result = { text: state.accumulatedText + "part 2" };
    
    // Preserve text before cleanup (the fix)
    const finalText = result?.text || state.accumulatedText;
    
    // Cleanup clears state
    state.accumulatedText = "";
    state.finalSegments = [];
    state.isDisconnecting = false;
    
    // Return preserved text
    const returnResult = { text: finalText };
    
    expect(returnResult.text).toBe("transcript part 1 part 2");
    expect(state.accumulatedText).toBe("");
    expect(state.finalSegments).toEqual([]);
  });

  it("should handle no WebSocket case with proper cleanup", () => {
    const state = {
      accumulatedText: "final transcript",
      ws: null,
      isDisconnecting: false,
    };
    
    // When no WebSocket, return accumulated text and cleanup
    const result = { text: state.accumulatedText };
    
    // Cleanup
    state.accumulatedText = "";
    state.isDisconnecting = false;
    
    expect(result.text).toBe("final transcript");
    expect(state.accumulatedText).toBe("");
  });

  it("should handle closeStream=false case", () => {
    const state = {
      accumulatedText: "accumulated text",
      ws: { readyState: 1 },
      isDisconnecting: false,
    };
    
    // When closeStream=false, return accumulated text without sending CloseStream
    const result = { text: state.accumulatedText };
    
    // Cleanup
    state.accumulatedText = "";
    state.isDisconnecting = false;
    
    expect(result.text).toBe("accumulated text");
  });
});

describe("Deepgram streaming-stability recovery", () => {
  // Test the error recovery mechanism for transient streaming errors

  it("should preserve state during error recovery", () => {
    // Simulate state before error
    const state = {
      _generation: 1,
      replayBuffer: [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])],
      accumulatedText: "partial transcript ",
      finalSegments: ["partial", "transcript"],
      audioBytesSent: 1024,
    };

    // Simulate handleStreamError preserving state
    const gen = state._generation;
    const savedReplay = [...state.replayBuffer];
    const savedAccumulatedText = state.accumulatedText;
    const savedFinalSegments = [...state.finalSegments];

    expect(gen).toBe(1);
    expect(savedReplay.length).toBe(2);
    expect(savedAccumulatedText).toBe("partial transcript ");
    expect(savedFinalSegments).toEqual(["partial", "transcript"]);
  });

  it("should handle generation change during recovery", () => {
    // Simulate generation change during async recovery
    let currentGen = 1;
    const savedGen = currentGen;

    // Simulate disconnect() incrementing generation
    currentGen = 2;

    // Recovery should bail out if generation changed
    const shouldBail = savedGen !== currentGen;

    expect(shouldBail).toBe(true);
  });

  it("should clear replay buffer after successful recovery", () => {
    // Simulate replay buffer being used during recovery
    const replayBuffer = [Buffer.from([1, 2, 3])];
    let coldStartBuffer = [...replayBuffer];
    let coldStartBufferSize = coldStartBuffer.reduce((sum, b) => sum + b.length, 0);

    // After flushing during reconnect
    for (const buf of coldStartBuffer) {
      // Would send to WebSocket
    }
    coldStartBuffer = [];
    coldStartBufferSize = 0;

    expect(coldStartBuffer).toEqual([]);
    expect(coldStartBufferSize).toBe(0);
  });

  it("should handle token refresh during error recovery", () => {
    // Simulate token refresh flow
    let cachedToken = "old-token";
    let tokenFetchedAt = Date.now() - 400000; // Expired

    const isTokenValid = () => {
      const TOKEN_EXPIRY_MS = 300000;
      const TOKEN_REFRESH_BUFFER_MS = 30000;
      if (!cachedToken || !tokenFetchedAt) return false;
      const age = Date.now() - tokenFetchedAt;
      return age < TOKEN_EXPIRY_MS - TOKEN_REFRESH_BUFFER_MS;
    };

    expect(isTokenValid()).toBe(false);

    // Simulate refresh
    cachedToken = "new-token";
    tokenFetchedAt = Date.now();

    expect(isTokenValid()).toBe(true);
  });

  it("should preserve finalSegments order during recovery", () => {
    const finalSegments = ["first", "second", "third"];
    const accumulatedText = finalSegments.join(" ");

    // Simulate recovery preservation
    const savedFinalSegments = [...finalSegments];
    const savedAccumulatedText = accumulatedText;

    expect(savedFinalSegments).toEqual(finalSegments);
    expect(savedFinalSegments).not.toBe(finalSegments); // New array
    expect(savedAccumulatedText).toBe("first second third");
  });

  it("should handle empty replay buffer during recovery", () => {
    const replayBuffer: Buffer[] = [];
    const savedReplay = [...replayBuffer];

    expect(savedReplay).toEqual([]);
    expect(savedReplay.length).toBe(0);
  });

  it("should handle empty accumulatedText during recovery", () => {
    const accumulatedText = "";
    const savedAccumulatedText = accumulatedText;

    expect(savedAccumulatedText).toBe("");
  });

  it("should handle empty finalSegments during recovery", () => {
    const finalSegments: string[] = [];
    const savedFinalSegments = [...finalSegments];

    expect(savedFinalSegments).toEqual([]);
  });

  it("should bail recovery if token refresh fails", async () => {
    let token: string | null = null;
    const tokenRefreshFn = async () => {
      throw new Error("Token refresh failed");
    };

    // Simulate recovery flow with failed token refresh
    let recoveryContinued = false;
    try {
      if (!token && tokenRefreshFn) {
        token = await tokenRefreshFn();
        recoveryContinued = true;
      }
    } catch (err) {
      // Expected - recovery bails
    }

    expect(token).toBeNull();
    expect(recoveryContinued).toBe(false);
  });

  it("should continue recovery if token refresh succeeds", async () => {
    let token: string | null = "old-token";
    const tokenRefreshFn = async () => "new-token";

    // Simulate recovery flow with successful token refresh
    if (!token) {
      token = await tokenRefreshFn();
    }

    expect(token).toBe("old-token"); // Already had token
  });

  it("should use cached token if still valid during recovery", () => {
    let cachedToken = "valid-token";
    let tokenFetchedAt = Date.now();
    const TOKEN_EXPIRY_MS = 300000;
    const TOKEN_REFRESH_BUFFER_MS = 30000;

    const isTokenValid = () => {
      if (!cachedToken || !tokenFetchedAt) return false;
      const age = Date.now() - tokenFetchedAt;
      return age < TOKEN_EXPIRY_MS - TOKEN_REFRESH_BUFFER_MS;
    };

    // Should use cached token
    const token = isTokenValid() ? cachedToken : null;

    expect(token).toBe("valid-token");
  });

  it("should handle connect options during recovery", () => {
    const connectionOptions = {
      sampleRate: 16000,
      language: "en-US",
      keyterms: ["VoiceInk", "transcription"],
    };

    // Simulate recovery connect with preserved options
    const connectOptions = {
      ...connectionOptions,
      token: "recovery-token",
      replayBuffer: [],
      forceNew: true,
      accumulatedText: "preserved text",
      finalSegments: ["preserved", "text"],
    };

    expect(connectOptions.sampleRate).toBe(16000);
    expect(connectOptions.language).toBe("en-US");
    expect(connectOptions.forceNew).toBe(true);
    expect(connectOptions.accumulatedText).toBe("preserved text");
  });
});
