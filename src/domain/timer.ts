export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerSnapshot {
  status: TimerStatus;
  targetSeconds: number;
  accumulatedElapsedMs: number;
  startedAtMs: number | null;
}

export function getElapsedMs(
  snapshot: TimerSnapshot,
  nowMs: number = Date.now(),
): number {
  if (snapshot.status === 'running' && snapshot.startedAtMs !== null) {
    const liveDelta = Math.max(0, nowMs - snapshot.startedAtMs);
    return snapshot.accumulatedElapsedMs + liveDelta;
  }
  return snapshot.accumulatedElapsedMs;
}

export function getRemainingSeconds(
  snapshot: TimerSnapshot,
  nowMs: number = Date.now(),
): number {
  const targetMs = Math.max(0, snapshot.targetSeconds * 1000);
  const remainingMs = Math.max(0, targetMs - getElapsedMs(snapshot, nowMs));
  return Math.ceil(remainingMs / 1000);
}

export function getProgressRatio(
  snapshot: TimerSnapshot,
  nowMs: number = Date.now(),
): number {
  if (snapshot.targetSeconds <= 0) return 1;
  const ratio = getElapsedMs(snapshot, nowMs) / (snapshot.targetSeconds * 1000);
  return Math.min(1, Math.max(0, ratio));
}

export function getElapsedWholeMinutes(
  snapshot: TimerSnapshot,
  nowMs: number = Date.now(),
): number {
  return Math.floor(getElapsedMs(snapshot, nowMs) / 60_000);
}
