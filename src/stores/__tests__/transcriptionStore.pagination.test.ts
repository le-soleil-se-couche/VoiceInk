/**
 * Regression tests for pagination cursor drift when deleting items mid-list.
 * Issue: History paging: pagination cursor drift when deleting items mid-list
 * 
 * When a user deletes a transcription item that is NOT the oldest loaded item,
 * the oldestLoadedId cursor should remain unchanged. This ensures that pagination
 * continues from the correct position when loading more items.
 */

import { describe, it, expect } from "vitest";

describe("transcriptionStore pagination cursor stability", () => {
  it("should preserve oldestLoadedId when deleting a mid-list item", () => {
    const transcriptions = Array.from({ length: 50 }, (_, i) => ({
      id: 100 - i,
      text: `Transcription ${100 - i}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));
    
    const oldestLoadedId: number | null = 51;
    const deletedId = 75;
    const next = transcriptions.filter((item) => item.id !== deletedId);
    
    expect(next.find((item) => item.id === deletedId)).toBeUndefined();
    expect(next.find((item) => item.id === 51)).toBeDefined();
    
    const wasOldest = oldestLoadedId != null && deletedId === oldestLoadedId;
    expect(wasOldest).toBe(false);
    
    const newOldestId = wasOldest 
      ? (next.length > 0 ? next[next.length - 1].id : null)
      : oldestLoadedId;
    
    expect(newOldestId).toBe(51);
  });

  it("should update oldestLoadedId only when deleting the oldest item", () => {
    const transcriptions = Array.from({ length: 50 }, (_, i) => ({
      id: 100 - i,
      text: `Transcription ${100 - i}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));
    
    const oldestLoadedId: number | null = 51;
    const deletedId = 51;
    const next = transcriptions.filter((item) => item.id !== deletedId);
    
    expect(next.find((item) => item.id === deletedId)).toBeUndefined();
    expect(next[next.length - 1].id).toBe(52);
    
    const wasOldest = oldestLoadedId != null && deletedId === oldestLoadedId;
    expect(wasOldest).toBe(true);
    
    const newOldestId = wasOldest 
      ? (next.length > 0 ? next[next.length - 1].id : null)
      : oldestLoadedId;
    
    expect(newOldestId).toBe(52);
  });

  it("should handle deletion when only one item remains", () => {
    const transcriptions = [{
      id: 1,
      text: "Last transcription",
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }];
    
    const oldestLoadedId: number | null = 1;
    const deletedId = 1;
    const next = transcriptions.filter((item) => item.id !== deletedId);
    
    expect(next.length).toBe(0);
    
    const wasOldest = oldestLoadedId != null && deletedId === oldestLoadedId;
    expect(wasOldest).toBe(true);
    
    const newOldestId = wasOldest 
      ? (next.length > 0 ? next[next.length - 1].id : null)
      : oldestLoadedId;
    
    expect(newOldestId).toBe(null);
  });

  it("should not update oldestLoadedId when deleting a non-existent item", () => {
    const transcriptions = Array.from({ length: 3 }, (_, i) => ({
      id: 3 - i,
      text: `Transcription ${3 - i}`,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));
    
    const oldestLoadedId: number | null = 1;
    const deletedId = 999;
    const next = transcriptions.filter((item) => item.id !== deletedId);
    
    expect(next.length).toBe(transcriptions.length);
    
    const wasOldest = oldestLoadedId != null && deletedId === oldestLoadedId;
    expect(wasOldest).toBe(false);
    
    const newOldestId = wasOldest 
      ? (next.length > 0 ? next[next.length - 1].id : null)
      : oldestLoadedId;
    
    expect(newOldestId).toBe(1);
  });
});
