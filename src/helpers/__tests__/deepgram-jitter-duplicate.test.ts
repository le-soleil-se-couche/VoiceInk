import { describe, it, expect, beforeEach, vi } from "vitest";
import DeepgramStreaming from "../deepgramStreaming";

describe("DeepgramStreaming - network jitter duplicate handling", () => {
  let streaming: DeepgramStreaming;

  beforeEach(() => {
    streaming = new DeepgramStreaming();
    streaming.onPartialTranscript = vi.fn();
    streaming.onFinalTranscript = vi.fn();
    streaming.onError = vi.fn();
  });

  it("should ignore duplicate Results messages with same sequence_id and transcript", async () => {
    const mockPartialTranscript = vi.fn();
    streaming.onPartialTranscript = mockPartialTranscript;

    // Simulate receiving a Results message
    const mockResultsMessage = {
      type: "Results",
      sequence_id: "seq-123",
      is_final: false,
      channel: {
        alternatives: [{ transcript: "hello world" }]
      }
    };

    // First reception - should process
    streaming.handleMessage(JSON.stringify(mockResultsMessage));
    expect(mockPartialTranscript).toHaveBeenCalledTimes(1);
    expect(mockPartialTranscript).toHaveBeenCalledWith("hello world");

    // Duplicate reception with same sequence_id - should be ignored
    streaming.handleMessage(JSON.stringify(mockResultsMessage));
    expect(mockPartialTranscript).toHaveBeenCalledTimes(1); // Still only 1 call
  });

  it("should process different transcripts even with same sequence_id", async () => {
    const mockPartialTranscript = vi.fn();
    streaming.onPartialTranscript = mockPartialTranscript;

    // First Results message
    const mockResultsMessage1 = {
      type: "Results",
      sequence_id: "seq-123",
      is_final: false,
      channel: {
        alternatives: [{ transcript: "hello" }]
      }
    };

    // Second Results message with different transcript
    const mockResultsMessage2 = {
      type: "Results",
      sequence_id: "seq-123",
      is_final: false,
      channel: {
        alternatives: [{ transcript: "hello world" }]
      }
    };

    streaming.handleMessage(JSON.stringify(mockResultsMessage1));
    streaming.handleMessage(JSON.stringify(mockResultsMessage2));

    // Both should be processed (different transcripts)
    expect(mockPartialTranscript).toHaveBeenCalledTimes(2);
    expect(mockPartialTranscript).toHaveBeenNthCalledWith(1, "hello");
    expect(mockPartialTranscript).toHaveBeenNthCalledWith(2, "hello world");
  });

  it("should process messages without sequence_id using transcript hash", async () => {
    const mockPartialTranscript = vi.fn();
    streaming.onPartialTranscript = mockPartialTranscript;

    // Results message without sequence_id
    const mockResultsMessage = {
      type: "Results",
      is_final: false,
      channel: {
        alternatives: [{ transcript: "test transcript" }]
      }
    };

    // First reception
    streaming.handleMessage(JSON.stringify(mockResultsMessage));
    expect(mockPartialTranscript).toHaveBeenCalledTimes(1);

    // Duplicate should be ignored
    streaming.handleMessage(JSON.stringify(mockResultsMessage));
    expect(mockPartialTranscript).toHaveBeenCalledTimes(1);
  });

  it("should handle out-of-order message simulation", async () => {
    const mockPartialTranscript = vi.fn();
    const mockFinalTranscript = vi.fn();
    streaming.onPartialTranscript = mockPartialTranscript;
    streaming.onFinalTranscript = mockFinalTranscript;

    // Simulate receiving messages in order
    const messages = [
      { type: "Results", sequence_id: "1", is_final: false, channel: { alternatives: [{ transcript: "first" }] } },
      { type: "Results", sequence_id: "2", is_final: false, channel: { alternatives: [{ transcript: "second" }] } },
      { type: "Results", sequence_id: "3", is_final: true, channel: { alternatives: [{ transcript: "third" }] } },
    ];

    // Process in order
    messages.forEach(msg => streaming.handleMessage(JSON.stringify(msg)));

    expect(mockPartialTranscript).toHaveBeenCalledTimes(2);
    expect(mockFinalTranscript).toHaveBeenCalledTimes(1);

    // Simulate network jitter: message 2 arrives again (duplicate)
    streaming.handleMessage(JSON.stringify(messages[1]));

    // Should still have same counts (duplicate ignored)
    expect(mockPartialTranscript).toHaveBeenCalledTimes(2);
    expect(mockFinalTranscript).toHaveBeenCalledTimes(1);
  });

  it("should limit processedTranscripts set size to prevent memory leaks", async () => {
    const mockPartialTranscript = vi.fn();
    streaming.onPartialTranscript = mockPartialTranscript;

    // Send 1005 unique transcripts
    for (let i = 0; i < 1005; i++) {
      const mockResultsMessage = {
        type: "Results",
        sequence_id: `seq-${i}`,
        is_final: false,
        channel: {
          alternatives: [{ transcript: `transcript ${i}` }]
        }
      };
      streaming.handleMessage(JSON.stringify(mockResultsMessage));
    }

    // Set should be capped at 1000
    expect((streaming as any).processedTranscripts.size).toBeLessThanOrEqual(1000);

    // All transcripts should have been processed
    expect(mockPartialTranscript).toHaveBeenCalledTimes(1005);
  });

  it("should handle final and interim Results separately", async () => {
    const mockPartialTranscript = vi.fn();
    const mockFinalTranscript = vi.fn();
    streaming.onPartialTranscript = mockPartialTranscript;
    streaming.onFinalTranscript = mockFinalTranscript;

    // Interim result
    const interimMessage = {
      type: "Results",
      sequence_id: "seq-1",
      is_final: false,
      channel: {
        alternatives: [{ transcript: "partial" }]
      }
    };

    // Final result with same transcript (different is_final flag)
    const finalMessage = {
      type: "Results",
      sequence_id: "seq-1",
      is_final: true,
      from_finalize: false,
      channel: {
        alternatives: [{ transcript: "partial" }]
      }
    };

    streaming.handleMessage(JSON.stringify(interimMessage));
    streaming.handleMessage(JSON.stringify(finalMessage));

    // Interim should be processed
    expect(mockPartialTranscript).toHaveBeenCalledTimes(1);
    // Final should also be processed (different hash due to is_final affecting finalSegments)
    expect(mockFinalTranscript).toHaveBeenCalledTimes(1);
  });
});
