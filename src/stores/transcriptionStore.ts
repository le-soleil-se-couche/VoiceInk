import { create } from "zustand";
import type { TranscriptionItem } from "../types/electron";

interface TranscriptionState {
  transcriptions: TranscriptionItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  oldestLoadedId: number | null;
}

const useTranscriptionStore = create<TranscriptionState>()(() => ({
  transcriptions: [],
  hasMore: false,
  isLoadingMore: false,
  oldestLoadedId: null,
}));

let hasBoundIpcListeners = false;
const DEFAULT_LIMIT = 200;
let currentLimit = DEFAULT_LIMIT;
const PAGINATION_STORAGE_KEY = "voiceink_transcription_pagination";

interface PaginationState {
  hasMore: boolean;
  oldestLoadedId: number | null;
}

function savePaginationState(state: PaginationState) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(PAGINATION_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save pagination state:", e);
  }
}

function loadPaginationState(): PaginationState | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const stored = window.localStorage.getItem(PAGINATION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PaginationState;
  } catch (e) {
    console.warn("Failed to load pagination state:", e);
    return null;
  }
}


function mergeTranscriptions(
  existing: TranscriptionItem[],
  incoming: TranscriptionItem[]
): TranscriptionItem[] {
  const merged = [...existing];

  for (const item of incoming) {
    if (!merged.some((existingItem) => existingItem.id === item.id)) {
      merged.push(item);
    }
  }

  return merged;
}

function mergeTranscriptions(
  existing: TranscriptionItem[],
  incoming: TranscriptionItem[]
): TranscriptionItem[] {
  const merged = [...existing];

  for (const item of incoming) {
    if (!merged.some((existingItem) => existingItem.id === item.id)) {
      merged.push(item);
    }
  }

  return merged;
}

function ensureIpcListeners() {
  if (hasBoundIpcListeners || typeof window === "undefined") {
    return;
  }

  const disposers: Array<() => void> = [];

  if (window.electronAPI?.onTranscriptionAdded) {
    const dispose = window.electronAPI.onTranscriptionAdded((item) => {
      if (item) {
        addTranscription(item);
      }
    });
    if (typeof dispose === "function") {
      disposers.push(dispose);
    }
  }

  if (window.electronAPI?.onTranscriptionDeleted) {
    const dispose = window.electronAPI.onTranscriptionDeleted(({ id }) => {
      removeTranscription(id);
    });
    if (typeof dispose === "function") {
      disposers.push(dispose);
    }
  }

  if (window.electronAPI?.onTranscriptionsCleared) {
    const dispose = window.electronAPI.onTranscriptionsCleared(() => {
      clearTranscriptions();
    });
    if (typeof dispose === "function") {
      disposers.push(dispose);
    }
  }

  hasBoundIpcListeners = true;

  window.addEventListener("beforeunload", () => {
    disposers.forEach((dispose) => dispose());
  });
}

export async function initializeTranscriptions(limit = DEFAULT_LIMIT) {
  currentLimit = limit;
  ensureIpcListeners();
  const items = window.electronAPI.getTranscriptionsPage
    ? await window.electronAPI.getTranscriptionsPage({ limit })
    : await window.electronAPI.getTranscriptions(limit);
  useTranscriptionStore.setState({
    transcriptions: items,
    hasMore: items.length === limit,
    isLoadingMore: false,
    oldestLoadedId: items.length > 0 ? items[items.length - 1].id : null,
  });
  return items;
}

export async function loadMoreTranscriptions(limit = currentLimit) {
  const { hasMore, isLoadingMore, oldestLoadedId, transcriptions } = useTranscriptionStore.getState();
  if (!hasMore || isLoadingMore || oldestLoadedId == null || !window.electronAPI.getTranscriptionsPage) {
    return [];
  }

  useTranscriptionStore.setState({ isLoadingMore: true });
  try {
    const items = await window.electronAPI.getTranscriptionsPage({
      limit,
      beforeId: oldestLoadedId,
    });
    const merged = mergeTranscriptions(transcriptions, items);
    useTranscriptionStore.setState({
      transcriptions: merged,
      hasMore: items.length === limit,
      isLoadingMore: false,
      oldestLoadedId: merged.length > 0 ? merged[merged.length - 1].id : null,
    });
    return items;
  } catch (error) {
    useTranscriptionStore.setState({ isLoadingMore: false });
    throw error;
  }
}

export function addTranscription(item: TranscriptionItem) {
  if (!item) return;
  const { transcriptions, hasMore, isLoadingMore } = useTranscriptionStore.getState();
  const withoutDuplicate = transcriptions.filter((existing) => existing.id !== item.id);
  useTranscriptionStore.setState({
    transcriptions: [item, ...withoutDuplicate],
    hasMore,
    isLoadingMore,
    oldestLoadedId:
      withoutDuplicate.length > 0
        ? withoutDuplicate[withoutDuplicate.length - 1].id
        : item.id,
  });
}

export function removeTranscription(id: number) {
  if (id == null) return;
  const { transcriptions, hasMore, isLoadingMore } = useTranscriptionStore.getState();
  const next = transcriptions.filter((item) => item.id !== id);
  if (next.length === transcriptions.length) return;
  useTranscriptionStore.setState({
    transcriptions: next,
    hasMore,
    isLoadingMore,
    oldestLoadedId: next.length > 0 ? next[next.length - 1].id : null,
  });
}

export function clearTranscriptions() {
  if (useTranscriptionStore.getState().transcriptions.length === 0) return;
  useTranscriptionStore.setState({
    transcriptions: [],
    hasMore: false,
    isLoadingMore: false,
    oldestLoadedId: null,
  });
}

export function useTranscriptions() {
  return useTranscriptionStore((state) => state.transcriptions);
}

export function useHasMoreTranscriptions() {
  return useTranscriptionStore((state) => state.hasMore);
}

export function useIsLoadingMoreTranscriptions() {
  return useTranscriptionStore((state) => state.isLoadingMore);
}

export function getTranscriptionStoreState() {
  return useTranscriptionStore.getState();
}
