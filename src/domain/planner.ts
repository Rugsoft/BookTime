const MS_PER_DAY = 86_400_000;

export interface DailyGoalPlan {
  dailyMinutes: number;
  daysRemaining: number;
  isOverdue: boolean;
  isCompleted: boolean;
}

/**
 * Formats a Date into a local calendar key (`YYYY-MM-DD`) without UTC shift.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKeyToUtcMs(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Counts inclusive calendar days from `todayKey` to `targetDateKey`.
 * Always returns at least `1` (same day or overdue).
 */
export function countDaysRemainingInclusive(
  todayKey: string,
  targetDateKey: string,
): number {
  const diffDays = Math.round(
    (parseDateKeyToUtcMs(targetDateKey) - parseDateKeyToUtcMs(todayKey)) /
      MS_PER_DAY,
  );
  return Math.max(1, diffDays + 1);
}

export function calculateDailyGoal(
  remainingMinutes: number,
  targetDate: string,
  today: Date = new Date(),
): DailyGoalPlan {
  const todayKey = toLocalDateKey(today);
  const diffDays = Math.round(
    (parseDateKeyToUtcMs(targetDate) - parseDateKeyToUtcMs(todayKey)) /
      MS_PER_DAY,
  );
  const daysRemaining = Math.max(1, diffDays + 1);
  const isOverdue = diffDays < 0 && remainingMinutes > 0;

  if (remainingMinutes <= 0) {
    return {
      dailyMinutes: 0,
      daysRemaining,
      isOverdue: false,
      isCompleted: true,
    };
  }

  return {
    dailyMinutes: Math.ceil(remainingMinutes / daysRemaining),
    daysRemaining,
    isOverdue,
    isCompleted: false,
  };
}

export function deductReadingSession(
  remainingMinutes: number,
  sessionMinutes: number,
): number {
  const safeRemaining = Math.max(0, remainingMinutes);
  const safeSession = Math.max(0, sessionMinutes);
  return Math.max(0, safeRemaining - safeSession);
}

export function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatCountdown(remainingSeconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(remainingSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
