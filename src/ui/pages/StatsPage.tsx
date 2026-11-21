import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { formatDuration } from '@/domain/planner';
import {
  calculateMinutesThisWeek,
  calculateMinutesToday,
  calculateStreak,
  countCompletedBooks,
  getWeeklyBreakdown,
} from '@/domain/stats';
import { db } from '@/infrastructure/db';

export function StatsPage() {
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('endedAt').reverse().toArray(),
    [],
    [],
  );
  const books = useLiveQuery(() => db.books.toArray(), [], []);

  const booksById = useMemo(
    () => new Map(books.map((book) => [book.id, book])),
    [books],
  );

  const minutesToday = calculateMinutesToday(sessions);
  const minutesThisWeek = calculateMinutesThisWeek(sessions);
  const streak = calculateStreak(sessions);
  const completedBooks = countCompletedBooks(books);
  const weekly = getWeeklyBreakdown(sessions);
  const maxWeeklyMinutes = Math.max(30, ...weekly.map((d) => d.minutes));

  const recentSessions = sessions.slice(0, 10);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Tu registro de lectura
        </p>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
          Estadísticas
        </h1>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <article className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <span className="text-xs font-medium text-on-surface-variant">
            Tiempo leído hoy
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums text-on-surface">
            {formatDuration(minutesToday)}
          </span>
        </article>

        <article className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <span className="text-xs font-medium text-on-surface-variant">
            Esta semana
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums text-on-surface">
            {formatDuration(minutesThisWeek)}
          </span>
        </article>

        <article className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <span className="text-xs font-medium text-on-surface-variant">
            Racha actual
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums text-tertiary">
            {streak} {streak === 1 ? 'día' : 'días'}
          </span>
        </article>

        <article className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <span className="text-xs font-medium text-on-surface-variant">
            Libros terminados
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums text-primary">
            {completedBooks}
          </span>
        </article>
      </div>

      {/* Weekly activity bar chart */}
      <article className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-xl font-semibold text-on-surface">
            Actividad de la semana
          </h2>
          <span className="font-mono text-xs tabular-nums text-on-surface-variant">
            Total: {formatDuration(minutesThisWeek)}
          </span>
        </div>

        <div className="grid h-44 grid-cols-7 items-end gap-3 pt-4">
          {weekly.map((day) => {
            const heightPercent =
              day.minutes > 0
                ? Math.max(10, Math.round((day.minutes / maxWeeklyMinutes) * 100))
                : 4;
            return (
              <div
                key={day.dateKey}
                className="flex h-full flex-col items-center justify-end gap-2"
              >
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {day.minutes > 0 ? `${day.minutes}m` : ''}
                </span>
                <div className="flex w-full max-w-10 flex-1 items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      day.minutes === 0
                        ? 'bg-surface-container-high'
                        : day.isToday
                          ? 'bg-primary'
                          : 'bg-tertiary'
                    }`}
                    title={`${day.label}: ${formatDuration(day.minutes)}`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    day.isToday
                      ? 'font-semibold text-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      {/* Recent sessions log */}
      <article className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="font-headline text-xl font-semibold text-on-surface">
          Sesiones recientes
        </h2>

        {recentSessions.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Todavía no hay sesiones registradas. Completa tu primera sesión en
            el temporizador para ver tu historial aquí.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {recentSessions.map((session) => {
              const book = session.bookId
                ? booksById.get(session.bookId)
                : undefined;
              const dateLabel = new Date(session.endedAt).toLocaleDateString(
                'es-ES',
                { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
              );
              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">
                      {book ? book.title : 'Sesión libre'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {dateLabel} ·{' '}
                      {session.mode === 'guided' ? 'Meta diaria' : 'Timer libre'}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-semibold tabular-nums text-tertiary">
                    {formatDuration(session.durationMinutes)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}
