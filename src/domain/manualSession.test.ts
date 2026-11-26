import { describe, expect, it } from 'vitest';
import { buildManualSession } from './manualSession';

describe('buildManualSession', () => {
  it('ends at the given local date and time and starts one duration earlier', () => {
    const session = buildManualSession(
      { durationMinutes: 35, date: '2026-11-25', time: '15:30' },
      'manual-1',
    );

    expect(session.id).toBe('manual-1');
    expect(session.mode).toBe('manual');
    expect(session.durationMinutes).toBe(35);

    const endedAt = new Date(session.endedAt);
    expect(endedAt.getFullYear()).toBe(2026);
    expect(endedAt.getMonth()).toBe(10);
    expect(endedAt.getDate()).toBe(25);
    expect(endedAt.getHours()).toBe(15);
    expect(endedAt.getMinutes()).toBe(30);
    expect(Date.parse(session.endedAt) - Date.parse(session.startedAt)).toBe(
      35 * 60_000,
    );
  });

  it('rejects a duration below one minute', () => {
    expect(() =>
      buildManualSession(
        { durationMinutes: 0, date: '2026-11-25', time: '15:30' },
        'x',
      ),
    ).toThrow('La duración debe ser al menos 1 minuto.');
  });

  it('rejects malformed dates and times', () => {
    expect(() =>
      buildManualSession(
        { durationMinutes: 10, date: '25-11-2026', time: '15:30' },
        'x',
      ),
    ).toThrow('Fecha u hora no válidas.');
    expect(() =>
      buildManualSession(
        { durationMinutes: 10, date: '2026-11-25', time: '25:99' },
        'x',
      ),
    ).toThrow('Fecha u hora no válidas.');
  });
});
