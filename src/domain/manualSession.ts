import type { ReadingSession } from './models';

export interface ManualSessionInput {
  durationMinutes: number;
  date: string; // YYYY-MM-DD from an <input type="date">
  time: string; // HH:mm from an <input type="time">, local end time
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** Builds a manual session without touching a book's remaining e-reader time. */
export function buildManualSession(
  input: ManualSessionInput,
  id: string = crypto.randomUUID(),
): ReadingSession {
  const durationMinutes = Math.round(input.durationMinutes);
  if (!Number.isFinite(input.durationMinutes) || durationMinutes < 1) {
    throw new Error('La duración debe ser al menos 1 minuto.');
  }
  if (!DATE_PATTERN.test(input.date) || !TIME_PATTERN.test(input.time)) {
    throw new Error('Fecha u hora no válidas.');
  }

  const endedAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(endedAt.getTime())) {
    throw new Error('Fecha u hora no válidas.');
  }

  return {
    id,
    startedAt: new Date(endedAt.getTime() - durationMinutes * 60_000).toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes,
    mode: 'manual',
  };
}
