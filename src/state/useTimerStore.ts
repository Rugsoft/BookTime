import { create } from 'zustand';
import {
  genreToAtmosphere,
  type Book,
  type SessionMode,
} from '@/domain/models';
import { getElapsedMs, type TimerSnapshot } from '@/domain/timer';
import { useAtmosphereStore } from './useAtmosphereStore';

const ACTIVE_BOOK_KEY = 'booktime:activeBookId';

function readInitialActiveBookId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_BOOK_KEY);
}

interface TimerState {
  activeBookId: string | null;
  mode: SessionMode;
  customMinutes: number;
  snapshot: TimerSnapshot;
  sessionStartedAt: string | null;
  selectBook: (book: Book | null) => void;
  setMode: (mode: SessionMode) => void;
  setCustomMinutes: (minutes: number) => void;
  syncTargetSeconds: (targetSeconds: number) => void;
  start: (targetSeconds?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: (targetSeconds?: number) => void;
  markCompleted: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeBookId: readInitialActiveBookId(),
  mode: 'guided',
  customMinutes: 25,
  snapshot: {
    status: 'idle',
    targetSeconds: 25 * 60,
    accumulatedElapsedMs: 0,
    startedAtMs: null,
  },
  sessionStartedAt: null,

  selectBook: (book) => {
    const id = book?.id ?? null;
    if (typeof window !== 'undefined') {
      if (id) {
        window.localStorage.setItem(ACTIVE_BOOK_KEY, id);
      } else {
        window.localStorage.removeItem(ACTIVE_BOOK_KEY);
      }
    }
    if (book) {
      useAtmosphereStore.getState().setAtmosphere(genreToAtmosphere(book.genre));
    }
    set({ activeBookId: id });
  },

  setMode: (mode) => {
    const { snapshot, customMinutes } = get();
    if (snapshot.status === 'running') return;
    set({
      mode,
      snapshot:
        mode === 'free'
          ? {
              status: 'idle',
              targetSeconds: customMinutes * 60,
              accumulatedElapsedMs: 0,
              startedAtMs: null,
            }
          : {
              ...snapshot,
              status: 'idle',
              accumulatedElapsedMs: 0,
              startedAtMs: null,
            },
      sessionStartedAt: null,
    });
  },

  setCustomMinutes: (minutes) => {
    const safeMinutes = Math.max(1, Math.min(360, Math.round(minutes)));
    const { mode, snapshot } = get();
    set({
      customMinutes: safeMinutes,
      ...(mode === 'free' && snapshot.status === 'idle'
        ? {
            snapshot: {
              status: 'idle',
              targetSeconds: safeMinutes * 60,
              accumulatedElapsedMs: 0,
              startedAtMs: null,
            },
          }
        : {}),
    });
  },

  syncTargetSeconds: (targetSeconds) => {
    const { snapshot } = get();
    if (snapshot.status !== 'idle') return;
    const safeSeconds = Math.max(60, Math.round(targetSeconds));
    if (snapshot.targetSeconds === safeSeconds) return;
    set({
      snapshot: {
        ...snapshot,
        targetSeconds: safeSeconds,
      },
    });
  },

  start: (targetSeconds) => {
    const nowMs = Date.now();
    const { snapshot } = get();
    set({
      snapshot: {
        status: 'running',
        targetSeconds: targetSeconds ?? snapshot.targetSeconds,
        accumulatedElapsedMs: 0,
        startedAtMs: nowMs,
      },
      sessionStartedAt: new Date(nowMs).toISOString(),
    });
  },

  pause: () => {
    const { snapshot } = get();
    if (snapshot.status !== 'running') return;
    const nowMs = Date.now();
    set({
      snapshot: {
        ...snapshot,
        status: 'paused',
        accumulatedElapsedMs: getElapsedMs(snapshot, nowMs),
        startedAtMs: null,
      },
    });
  },

  resume: () => {
    const { snapshot } = get();
    if (snapshot.status !== 'paused') return;
    set({
      snapshot: {
        ...snapshot,
        status: 'running',
        startedAtMs: Date.now(),
      },
    });
  },

  reset: (targetSeconds) => {
    const { snapshot } = get();
    set({
      snapshot: {
        status: 'idle',
        targetSeconds: targetSeconds ?? snapshot.targetSeconds,
        accumulatedElapsedMs: 0,
        startedAtMs: null,
      },
      sessionStartedAt: null,
    });
  },

  markCompleted: () => {
    const { snapshot } = get();
    set({
      snapshot: {
        ...snapshot,
        status: 'completed',
        accumulatedElapsedMs: snapshot.targetSeconds * 1000,
        startedAtMs: null,
      },
    });
  },
}));
