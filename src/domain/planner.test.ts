import { describe, expect, it } from 'vitest';
import {
  calculateDailyGoal,
  countDaysRemainingInclusive,
  deductReadingSession,
  formatCountdown,
  formatDuration,
  toLocalDateKey,
} from './planner';

describe('planner domain logic', () => {
  it('formats local date keys as YYYY-MM-DD without UTC drift', () => {
    const date = new Date(2026, 10, 5, 23, 45, 0); // Nov 5, 2026 23:45 local
    expect(toLocalDateKey(date)).toBe('2026-11-05');
  });

  it('counts remaining days inclusively', () => {
    expect(countDaysRemainingInclusive('2026-11-21', '2026-11-21')).toBe(1);
    expect(countDaysRemainingInclusive('2026-11-21', '2026-11-25')).toBe(5);
    expect(countDaysRemainingInclusive('2026-11-21', '2026-11-18')).toBe(1);
  });

  it('calculates daily goal rounding up so target date is met', () => {
    const today = new Date(2026, 10, 21, 10, 0, 0); // 2026-11-21
    // 100 minutes over 3 inclusive days (21, 22, 23) => ceil(33.33) = 34 min/day
    const plan = calculateDailyGoal(100, '2026-11-23', today);
    expect(plan).toEqual({
      dailyMinutes: 34,
      daysRemaining: 3,
      isOverdue: false,
      isCompleted: false,
    });
  });

  it('marks overdue books as due today with all remaining minutes', () => {
    const today = new Date(2026, 10, 21, 10, 0, 0);
    const plan = calculateDailyGoal(95, '2026-11-19', today);
    expect(plan).toEqual({
      dailyMinutes: 95,
      daysRemaining: 1,
      isOverdue: true,
      isCompleted: false,
    });
  });

  it('handles completed books with 0 remaining minutes', () => {
    const today = new Date(2026, 10, 21, 10, 0, 0);
    const plan = calculateDailyGoal(0, '2026-11-25', today);
    expect(plan).toEqual({
      dailyMinutes: 0,
      daysRemaining: 5,
      isOverdue: false,
      isCompleted: true,
    });
  });

  it('deducts reading session minutes and clamps at zero', () => {
    expect(deductReadingSession(120, 35)).toBe(85);
    expect(deductReadingSession(20, 45)).toBe(0);
    expect(deductReadingSession(60, -10)).toBe(60);
  });

  it('formats durations in Xh Ym editorial format', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(35)).toBe('35m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(390)).toBe('6h 30m');
  });

  it('formats countdown seconds as MM:SS or H:MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(1800)).toBe('30:00');
    expect(formatCountdown(3661)).toBe('1:01:01');
  });
});
