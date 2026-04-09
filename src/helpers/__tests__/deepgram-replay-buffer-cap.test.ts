import { describe, it, expect, beforeEach, vi } from "vitest";
import DeepgramStreaming from "../deepgramStreaming";

describe("DeepgramStreaming - replay buffer memory cap", () => {
  let streaming: DeepgramStreaming;

  beforeEach(() => {
    streaming = new DeepgramStreaming();
    streaming.onPartialTranscript = vi.fn();
    streaming.onFinalTranscript = vi.fn();
    streaming.onError = vi.fn();
  });

  it("should cap replay buffer to MAX_REPLAY_BUFFER_BYTES to prevent OOM", async () => {
    // Mock WebSocket so sendAudio will work
    const mockWs = {
      readyState: 1, // WebSocket.OPEN
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    
    // Set up liveness timer state (simulating post-connect state)
    (streaming as any).livenessTimer = setTimeout(() => {}, 100);
    
    // Calculate expected max buffer size
    const sampleRate = 16000;
    const maxSeconds = 30;
    const maxBytes = maxSeconds * sampleRate * 2; // 16-bit mono
    
    // Send audio chunks that exceed the cap
    const chunkSize = 1024; // 1KB chunks
    const numChunks = Math.ceil(maxBytes / chunkSize) + 10; // Send more than cap allows
    
    for (let i = 0; i < numChunks; i++) {
      const mockAudioBuffer = Buffer.alloc(chunkSize);
      streaming.sendAudio(mockAudioBuffer);
    }
    
    // Verify buffer is capped and doesn't grow unbounded
    const actualBufferSize = (streaming as any).replayBufferSize;
    expect(actualBufferSize).toBeLessThanOrEqual(maxBytes);
    
    // Verify oldest chunks were dropped (circular buffer behavior)
    const bufferLength = (streaming as any).replayBuffer.length;
    expect(bufferLength).toBeLessThan(numChunks);
    
    // Cleanup
    if ((streaming as any).livenessTimer) {
      clearTimeout((streaming as any).livenessTimer);
    }
  });

  it("should preserve recent audio when buffer cap is reached", async () => {
    // Mock WebSocket
    const mockWs = {
      readyState: 1,
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    (streaming as any).livenessTimer = setTimeout(() => {}, 100);
    
    const sampleRate = 16000;
    const maxSeconds = 30;
    const maxBytes = maxSeconds * sampleRate * 2;
    const chunkSize = 1024;
    
    // Fill buffer past cap
    const numChunks = Math.ceil(maxBytes / chunkSize) + 5;
    const chunks: Buffer[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const mockAudioBuffer = Buffer.alloc(chunkSize, i); // Fill with unique byte pattern
      chunks.push(mockAudioBuffer);
      streaming.sendAudio(mockAudioBuffer);
    }
    
    // Verify the buffer contains the most recent chunks (oldest were dropped)
    const buffer = (streaming as any).replayBuffer;
    const bufferSize = (streaming as any).replayBufferSize;
    
    // Buffer should be at or near cap
    expect(bufferSize).toBeLessThanOrEqual(maxBytes);
    expect(bufferSize).toBeGreaterThan(maxBytes - chunkSize * 2); // Should be close to cap
    
    // Most recent chunk should still be in buffer
    const lastChunk = buffer[buffer.length - 1];
    expect(lastChunk).toBeDefined();
    
    // Cleanup
    if ((streaming as any).livenessTimer) {
      clearTimeout((streaming as any).livenessTimer);
    }
  });

  it("should not cap buffer when liveness timer is not active", async () => {
    // Mock WebSocket without liveness timer
    const mockWs = {
      readyState: 1,
      send: () => {},
    };
    (streaming as any).ws = mockWs;
    (streaming as any).isConnected = true;
    (streaming as any).livenessTimer = null; // No liveness timer
    
    const chunkSize = 1024;
    const numChunks = 100;
    
    for (let i = 0; i < numChunks; i++) {
      const mockAudioBuffer = Buffer.alloc(chunkSize);
      streaming.sendAudio(mockAudioBuffer);
    }
    
    // Without liveness timer, replay buffer should not be populated
    expect((streaming as any).replayBuffer.length).toBe(0);
    expect((streaming as any).replayBufferSize).toBe(0);
  });
});
