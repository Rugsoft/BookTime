import { describe, expect, it } from 'vitest';
import type { Book, ReadingSession } from './models';
import {
  calculateMinutesThisWeek,
  calculateMinutesToday,
  calculateStreak,
  countCompletedBooks,
  getWeeklyBreakdown,
} from './stats';

function makeSession(
  id: string,
  localYear: number,
  localMonthIndex: number,
  localDay: number,
  durationMinutes: number,
): ReadingSession {
  const start = new Date(localYear, localMonthIndex, localDay, 19, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    id,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMinutes,
    mode: 'guided',
  };
}

describe('stats domain logic', () => {
  // Saturday 2026-11-21
  const now = new Date(2026, 10, 21, 21, 0, 0);

  it('sums minutes read today only', () => {
    const sessions = [
      makeSession('1', 2026, 10, 21, 20),
      makeSession('2', 2026, 10, 21, 15),
      makeSession('3', 2026, 10, 20, 40),
    ];
    expect(calculateMinutesToday(sessions, now)).toBe(35);
  });

  it('sums minutes read in the current Monday-to-Sunday week', () => {
    // Week of Sat 2026-11-21 starts Mon 2026-11-16 and ends Sun 2026-11-22
    const sessions = [
      makeSession('prev-sun', 2026, 10, 15, 50), // previous week
      makeSession('mon', 2026, 10, 16, 25),
      makeSession('thu', 2026, 10, 19, 30),
      makeSession('sat', 2026, 10, 21, 20),
    ];
    expect(calculateMinutesThisWeek(sessions, now)).toBe(75);
  });

  it('builds a 7-day Monday-to-Sunday weekly breakdown with today flagged', () => {
    const sessions = [
      makeSession('mon', 2026, 10, 16, 25),
      makeSession('sat-1', 2026, 10, 21, 15),
      makeSession('sat-2', 2026, 10, 21, 10),
    ];
    const breakdown = getWeeklyBreakdown(sessions, now);
    expect(breakdown).toHaveLength(7);
    expect(breakdown[0]).toMatchObject({
      dateKey: '2026-11-16',
      label: 'L',
      minutes: 25,
      isToday: false,
    });
    expect(breakdown[5]).toMatchObject({
      dateKey: '2026-11-21',
      label: 'S',
      minutes: 25,
      isToday: true,
    });
    expect(breakdown[6]).toMatchObject({
      dateKey: '2026-11-22',
      label: 'D',
      minutes: 0,
      isToday: false,
    });
  });

  it('calculates active streak including today', () => {
    const sessions = [
      makeSession('1', 2026, 10, 21, 15),
      makeSession('2', 2026, 10, 20, 20),
      makeSession('3', 2026, 10, 19, 30),
      makeSession('gap', 2026, 10, 17, 45),
    ];
    expect(calculateStreak(sessions, now)).toBe(3);
  });

  it('preserves streak when user read yesterday but not yet today', () => {
    const sessions = [
      makeSession('1', 2026, 10, 20, 20),
      makeSession('2', 2026, 10, 19, 30),
    ];
    expect(calculateStreak(sessions, now)).toBe(2);
  });

  it('resets streak to 0 when both today and yesterday were missed', () => {
    const sessions = [makeSession('1', 2026, 10, 19, 30)];
    expect(calculateStreak(sessions, now)).toBe(0);
  });

  it('counts completed books', () => {
    const books: Book[] = [
      {
        id: '1',
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'scifi',
        status: 'completed',
        createdAt: '2026-10-01T00:00:00Z',
        completedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'El nombre del viento',
        author: 'Patrick Rothfuss',
        genre: 'fantasia',
        status: 'reading',
        createdAt: '2026-11-10T00:00:00Z',
      },
    ];
    expect(countCompletedBooks(books)).toBe(1);
  });
});
