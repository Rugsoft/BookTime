import type { Book, ReadingSession } from './models';
import { toLocalDateKey } from './planner';

export interface DailyBucket {
  dateKey: string;
  label: string;
  minutes: number;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

function sessionDateKey(session: ReadingSession): string {
  return toLocalDateKey(new Date(session.endedAt || session.startedAt));
}

function getMondayOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay(); // 0 = Sunday, 1 = Monday, ...
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offsetToMonday);
  return copy;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function aggregateMinutesByDate(
  sessions: ReadingSession[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (session.durationMinutes <= 0) continue;
    const key = sessionDateKey(session);
    totals.set(key, (totals.get(key) ?? 0) + session.durationMinutes);
  }
  return totals;
}

export function calculateMinutesToday(
  sessions: ReadingSession[],
  now: Date = new Date(),
): number {
  const todayKey = toLocalDateKey(now);
  return aggregateMinutesByDate(sessions).get(todayKey) ?? 0;
}

export function getWeeklyBreakdown(
  sessions: ReadingSession[],
  now: Date = new Date(),
): DailyBucket[] {
  const totals = aggregateMinutesByDate(sessions);
  const monday = getMondayOfWeek(now);
  const todayKey = toLocalDateKey(now);

  return WEEKDAY_LABELS.map((label, index) => {
    const dateKey = toLocalDateKey(addDays(monday, index));
    return {
      dateKey,
      label,
      minutes: totals.get(dateKey) ?? 0,
      isToday: dateKey === todayKey,
    };
  });
}

export function calculateMinutesThisWeek(
  sessions: ReadingSession[],
  now: Date = new Date(),
): number {
  return getWeeklyBreakdown(sessions, now).reduce(
    (sum, bucket) => sum + bucket.minutes,
    0,
  );
}

/**
 * Counts consecutive days with >0 reading minutes.
 * Keeps the streak alive if the user read yesterday and has not yet read today.
 */
export function calculateStreak(
  sessions: ReadingSession[],
  now: Date = new Date(),
): number {
  const totals = aggregateMinutesByDate(sessions);
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = toLocalDateKey(todayDate);
  const yesterdayDate = addDays(todayDate, -1);
  const yesterdayKey = toLocalDateKey(yesterdayDate);

  let cursor: Date;
  if ((totals.get(todayKey) ?? 0) > 0) {
    cursor = todayDate;
  } else if ((totals.get(yesterdayKey) ?? 0) > 0) {
    cursor = yesterdayDate;
  } else {
    return 0;
  }

  let streak = 0;
  while ((totals.get(toLocalDateKey(cursor)) ?? 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function countCompletedBooks(books: Book[]): number {
  return books.filter((book) => book.status === 'completed').length;
}
