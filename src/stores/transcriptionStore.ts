import { create } from "zustand";
import type { TranscriptionItem } from "../types/electron";

interface TranscriptionState {
  transcriptions: TranscriptionItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

const useTranscriptionStore = create<TranscriptionState>()(() => ({
  transcriptions: [],
  hasMore: false,
  nextCursor: null,
}));

let hasBoundIpcListeners = false;
const DEFAULT_LIMIT = 50;
let currentLimit = DEFAULT_LIMIT;

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
  
  // Restore pagination state from localStorage if available
  let initialCursor: number | null = null;
  let initialHasMore = false;
  if (typeof window !== 'undefined') {
    const savedCursor = localStorage.getItem('historyNextCursor');
    const savedHasMore = localStorage.getItem('historyHasMore');
    if (savedCursor && savedCursor !== '') {
      initialCursor = parseInt(savedCursor, 10);
      initialHasMore = savedHasMore === 'true';
    }
  }
  
  const result = await window.electronAPI.getTranscriptionsPage(limit, initialCursor);
  useTranscriptionStore.setState({ 
    transcriptions: result.transcriptions,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor 
  });
  return result.transcriptions;
}

export function addTranscription(item: TranscriptionItem) {
  if (!item) return;
  const { transcriptions } = useTranscriptionStore.getState();
  const withoutDuplicate = transcriptions.filter((existing) => existing.id !== item.id);
  useTranscriptionStore.setState({
    transcriptions: [item, ...withoutDuplicate].slice(0, currentLimit),
  });
}

export function removeTranscription(id: number) {
  if (id == null) return;
  const { transcriptions } = useTranscriptionStore.getState();
  const next = transcriptions.filter((item) => item.id !== id);
  if (next.length === transcriptions.length) return;
  useTranscriptionStore.setState({ transcriptions: next });
}

export function clearTranscriptions() {
  if (useTranscriptionStore.getState().transcriptions.length === 0) return;
  useTranscriptionStore.setState({ transcriptions: [] });
  // Clear persisted pagination state
  if (typeof window !== 'undefined') {
    localStorage.removeItem('historyNextCursor');
    localStorage.removeItem('historyHasMore');
  }
}

export async function loadMoreTranscriptions() {
  const state = useTranscriptionStore.getState();
  if (!state.hasMore || state.nextCursor === null) return [];
  
  const result = await window.electronAPI.getTranscriptionsPage(currentLimit, state.nextCursor);
  const newTranscriptions = [...state.transcriptions, ...result.transcriptions];
  useTranscriptionStore.setState({ 
    transcriptions: newTranscriptions,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor 
  });
  // Persist pagination state to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('historyNextCursor', String(result.nextCursor ?? ''));
    localStorage.setItem('historyHasMore', String(result.hasMore));
  }
  return result.transcriptions;
}

export function useTranscriptions() {
  return useTranscriptionStore((state) => state.transcriptions);
}

export function useTranscriptionStoreSelector<T>(selector: (state: TranscriptionState) => T): T {
  return useTranscriptionStore(selector);
}
