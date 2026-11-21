import { describe, expect, it } from 'vitest';
import {
  getElapsedMs,
  getElapsedWholeMinutes,
  getProgressRatio,
  getRemainingSeconds,
  type TimerSnapshot,
} from './timer';

describe('timestamp-based timer domain logic', () => {
  it('computes elapsed and remaining time accurately across background sleep', () => {
    const startMs = 1_700_000_000_000;
    const snapshot: TimerSnapshot = {
      status: 'running',
      targetSeconds: 1800, // 30m
      accumulatedElapsedMs: 60_000, // 1m already elapsed before pause/resume
      startedAtMs: startMs,
    };

    // 9 minutes pass while screen was locked
    const nowMs = startMs + 9 * 60_000;
    expect(getElapsedMs(snapshot, nowMs)).toBe(10 * 60_000);
    expect(getRemainingSeconds(snapshot, nowMs)).toBe(1200);
    expect(getProgressRatio(snapshot, nowMs)).toBeCloseTo(1 / 3, 5);
    expect(getElapsedWholeMinutes(snapshot, nowMs)).toBe(10);
  });

  it('freezes elapsed time while paused', () => {
    const snapshot: TimerSnapshot = {
      status: 'paused',
      targetSeconds: 600,
      accumulatedElapsedMs: 125_000,
      startedAtMs: null,
    };

    expect(getElapsedMs(snapshot, 9_999_999_999)).toBe(125_000);
    expect(getRemainingSeconds(snapshot, 9_999_999_999)).toBe(475);
    expect(getElapsedWholeMinutes(snapshot, 9_999_999_999)).toBe(2);
  });

  it('clamps remaining seconds at 0 and progress ratio at 1 when exceeded', () => {
    const startMs = 1_700_000_000_000;
    const snapshot: TimerSnapshot = {
      status: 'running',
      targetSeconds: 300, // 5m
      accumulatedElapsedMs: 0,
      startedAtMs: startMs,
    };

    const nowMs = startMs + 400_000;
    expect(getRemainingSeconds(snapshot, nowMs)).toBe(0);
    expect(getProgressRatio(snapshot, nowMs)).toBe(1);
  });
});
