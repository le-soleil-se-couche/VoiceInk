import { describe, it, expect, beforeEach, vi } from "vitest";
import DeepgramStreaming from "../deepgramStreaming";

describe("DeepgramStreaming - chunk boundary stabilization", () => {
  let streaming: DeepgramStreaming;

  beforeEach(() => {
    streaming = new DeepgramStreaming();
    streaming.onPartialTranscript = vi.fn();
    streaming.onFinalTranscript = vi.fn();
    streaming.onError = vi.fn();
  });

  it("should add cold start buffer chunks to replay buffer when flushing", async () => {
    // Mock WebSocket in OPEN state
    const mockWs = {
      readyState: 1, // WebSocket.OPEN
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    
    // Set up liveness timer (simulating post-connect state where replay buffer is active)
    (streaming as any).livenessTimer = setTimeout(() => {}, 100);
    
    // Simulate cold start: audio was buffered while WebSocket was CONNECTING
    const chunkSize = 1024;
    const coldStartChunks = [
      Buffer.alloc(chunkSize, 1),
      Buffer.alloc(chunkSize, 2),
      Buffer.alloc(chunkSize, 3),
    ];
    
    // Manually populate cold start buffer (simulating what happens during CONNECTING state)
    (streaming as any).coldStartBuffer = [...coldStartChunks];
    (streaming as any).coldStartBufferSize = coldStartChunks.reduce((sum, b) => sum + b.length, 0);
    
    // Verify initial state
    expect((streaming as any).coldStartBuffer.length).toBe(3);
    expect((streaming as any).replayBuffer.length).toBe(0);
    
    // Send new audio - this should flush cold start buffer AND add to replay buffer
    const newAudioBuffer = Buffer.alloc(chunkSize, 4);
    streaming.sendAudio(newAudioBuffer);
    
    // Cold start buffer should be cleared
    expect((streaming as any).coldStartBuffer.length).toBe(0);
    
    // Replay buffer should contain all flushed cold start chunks plus the new chunk
    const replayBuffer = (streaming as any).replayBuffer;
    expect(replayBuffer.length).toBe(4); // 3 cold start + 1 new
    
    // Verify the flushed chunks are in the replay buffer (first 3)
    expect(replayBuffer[0]).toEqual(coldStartChunks[0]);
    expect(replayBuffer[1]).toEqual(coldStartChunks[1]);
    expect(replayBuffer[2]).toEqual(coldStartChunks[2]);
    
    // And the new chunk is also there
    expect(replayBuffer[3]).toEqual(newAudioBuffer);
    
    // Cleanup
    if ((streaming as any).livenessTimer) {
      clearTimeout((streaming as any).livenessTimer);
    }
  });

  it("should stabilize chunk boundary by preserving cold start chunks in replay buffer", async () => {
    // This test verifies the fix for chunk boundary handling:
    // When cold start buffer is flushed, those chunks should be added to replay buffer
    // to ensure consistent recovery if connection becomes unresponsive.
    
    const mockWs = {
      readyState: 1,
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    (streaming as any).livenessTimer = setTimeout(() => {}, 100);
    
    const chunkSize = 1024;
    
    // Simulate cold start with 5 chunks
    const coldStartChunks = Array.from({ length: 5 }, (_, i) => Buffer.alloc(chunkSize, i + 1));
    (streaming as any).coldStartBuffer = [...coldStartChunks];
    (streaming as any).coldStartBufferSize = coldStartChunks.length * chunkSize;
    
    // Send audio to trigger flush
    streaming.sendAudio(Buffer.alloc(chunkSize, 99));
    
    // Verify all cold start chunks were added to replay buffer
    const replayBuffer = (streaming as any).replayBuffer;
    expect(replayBuffer.length).toBe(6); // 5 cold start + 1 new
    
    // Verify chunk order is preserved (important for boundary stability)
    for (let i = 0; i < coldStartChunks.length; i++) {
      expect(replayBuffer[i]).toEqual(coldStartChunks[i]);
    }
    
    // Cleanup
    if ((streaming as any).livenessTimer) {
      clearTimeout((streaming as any).livenessTimer);
    }
  });

  it("should not add cold start chunks to replay buffer when liveness timer is inactive", async () => {
    // Mock WebSocket in OPEN state, but no liveness timer
    const mockWs = {
      readyState: 1,
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    (streaming as any).livenessTimer = null; // No liveness timer
    
    const chunkSize = 1024;
    
    // Simulate cold start
    (streaming as any).coldStartBuffer = [Buffer.alloc(chunkSize, 1)];
    (streaming as any).coldStartBufferSize = chunkSize;
    
    // Send audio to trigger flush
    streaming.sendAudio(Buffer.alloc(chunkSize, 2));
    
    // Without liveness timer, replay buffer should NOT be populated
    expect((streaming as any).replayBuffer.length).toBe(0);
    expect((streaming as any).replayBufferSize).toBe(0);
    
    // Cold start buffer should still be cleared
    expect((streaming as any).coldStartBuffer.length).toBe(0);
  });

  it("should respect MAX_REPLAY_BUFFER_BYTES cap when flushing cold start buffer", async () => {
    const mockWs = {
      readyState: 1,
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    (streaming as any).livenessTimer = setTimeout(() => {}, 100);
    
    const sampleRate = 16000;
    const maxSeconds = 30;
    const maxBytes = maxSeconds * sampleRate * 2; // MAX_REPLAY_BUFFER_BYTES
    
    // Create cold start chunks that exceed the cap when combined with new audio
    const chunkSize = maxBytes / 2; // Each chunk is half the cap
    const coldStartChunks = [
      Buffer.alloc(chunkSize, 1),
      Buffer.alloc(chunkSize, 2),
    ];
    
    (streaming as any).coldStartBuffer = [...coldStartChunks];
    (streaming as any).coldStartBufferSize = coldStartChunks.length * chunkSize;
    
    // Send new audio
    const newAudioBuffer = Buffer.alloc(chunkSize, 3);
    streaming.sendAudio(newAudioBuffer);
    
    // Replay buffer should be capped at MAX_REPLAY_BUFFER_BYTES
    const replayBufferSize = (streaming as any).replayBufferSize;
    expect(replayBufferSize).toBeLessThanOrEqual(maxBytes);
    
    // Oldest chunks should have been dropped to stay under cap
    const replayBuffer = (streaming as any).replayBuffer;
    expect(replayBuffer.length).toBeLessThan(3); // Should have dropped some chunks
    
    // Cleanup
    if ((streaming as any).livenessTimer) {
      clearTimeout((streaming as any).livenessTimer);
    }
  });
});
