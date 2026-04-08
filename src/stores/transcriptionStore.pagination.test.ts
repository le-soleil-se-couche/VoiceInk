import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const mockLocalStorageData = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockLocalStorageData.get(key) || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorageData.set(key, value); }),
  removeItem: vi.fn((key: string) => { mockLocalStorageData.delete(key); }),
  clear: vi.fn(() => { mockLocalStorageData.clear(); }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

// Mock window.electronAPI
const mockElectronAPI = {
  getTranscriptionsPage: vi.fn(),
  onTranscriptionAdded: vi.fn(),
  onTranscriptionDeleted: vi.fn(),
  onTranscriptionsCleared: vi.fn(),
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
  addEventListener: vi.fn(),
});

describe('transcriptionStore pagination persistence', () => {
  beforeEach(() => {
    mockLocalStorageData.clear();
    mockElectronAPI.getTranscriptionsPage.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should restore pagination state from localStorage on initialization', async () => {
    // Setup: simulate previously saved pagination state
    mockLocalStorageData.set('historyNextCursor', '123');
    mockLocalStorageData.set('historyHasMore', 'true');

    mockElectronAPI.getTranscriptionsPage.mockResolvedValue({
      transcriptions: [{ id: 1, text: 'test', timestamp: Date.now() }],
      hasMore: false,
      nextCursor: null,
    });

    const { initializeTranscriptions } = await import('./transcriptionStore');
    await initializeTranscriptions(50);

    // Verify that getTranscriptionsPage was called with the restored cursor
    expect(mockElectronAPI.getTranscriptionsPage).toHaveBeenCalledWith(50, 123);
  });

  it('should persist pagination state to localStorage after loading more', async () => {
    mockElectronAPI.getTranscriptionsPage.mockResolvedValue({
      transcriptions: [{ id: 1, text: 'test', timestamp: Date.now() }],
      hasMore: true,
      nextCursor: 456,
    });

    const { initializeTranscriptions, loadMoreTranscriptions } = await import('./transcriptionStore');
    await initializeTranscriptions(50);
    await loadMoreTranscriptions();

    // Verify that localStorage was updated
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('historyNextCursor', '456');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('historyHasMore', 'true');
  });

  it('should clear pagination state from localStorage when clearing transcriptions', async () => {
    mockLocalStorageData.set('historyNextCursor', '123');
    mockLocalStorageData.set('historyHasMore', 'true');

    mockElectronAPI.getTranscriptionsPage.mockResolvedValue({
      transcriptions: [{ id: 1, text: 'test', timestamp: Date.now() }],
      hasMore: false,
      nextCursor: null,
    });

    const { initializeTranscriptions, clearTranscriptions } = await import('./transcriptionStore');
    await initializeTranscriptions(50);
    clearTranscriptions();

    // Verify that localStorage was cleared
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('historyNextCursor');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('historyHasMore');
  });

  it('should initialize with null cursor when no localStorage data exists', async () => {
    mockElectronAPI.getTranscriptionsPage.mockResolvedValue({
      transcriptions: [{ id: 1, text: 'test', timestamp: Date.now() }],
      hasMore: false,
      nextCursor: null,
    });

    const { initializeTranscriptions } = await import('./transcriptionStore');
    await initializeTranscriptions(50);

    // Verify that getTranscriptionsPage was called with null cursor
    expect(mockElectronAPI.getTranscriptionsPage).toHaveBeenCalledWith(50, null);
  });
});
