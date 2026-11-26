import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { ReadingSession } from '@/domain/models';
import { formatDuration } from '@/domain/planner';
import {
  calculateMinutesThisWeek,
  calculateMinutesToday,
  calculateStreak,
  countCompletedBooks,
  getWeeklyBreakdown,
} from '@/domain/stats';
import { db } from '@/infrastructure/db';
import {
  addManualSession,
  deleteManualSession,
  updateManualSession,
} from '@/infrastructure/readingRepository';

interface ManualForm {
  durationMinutes: string;
  date: string;
  time: string;
  bookId: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formFromDate(
  date: Date,
  durationMinutes: number,
  bookId = '',
): ManualForm {
  return {
    durationMinutes: String(durationMinutes),
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
    bookId,
  };
}

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

  const [showManualForm, setShowManualForm] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState<ManualForm>(() =>
    formFromDate(new Date(), 30),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const selectedManualBook = books.find((book) => book.id === manualForm.bookId);

  function openNewForm() {
    setEditingManualId(null);
    setManualForm(formFromDate(new Date(), 30));
    setFormError(null);
    setShowManualForm(true);
  }

  function openEditForm(session: ReadingSession) {
    setEditingManualId(session.id);
    setManualForm(
      formFromDate(
        new Date(session.endedAt),
        session.durationMinutes,
        session.bookId ?? '',
      ),
    );
    setFormError(null);
    setShowManualForm(true);
  }

  function closeForm() {
    setShowManualForm(false);
    setEditingManualId(null);
    setFormError(null);
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const input = {
      durationMinutes: Number.parseInt(manualForm.durationMinutes, 10),
      date: manualForm.date,
      time: manualForm.time,
      bookId: manualForm.bookId,
    };
    if (!input.bookId) {
      setFormError('Elegí un libro para la sesión.');
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (editingManualId) {
        await updateManualSession(editingManualId, input);
      } else {
        await addManualSession(input);
      }
      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo guardar la sesión.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleManualDelete(session: ReadingSession) {
    if (!window.confirm('¿Borrar esta sesión manual?')) return;
    try {
      await deleteManualSession(session.id);
      if (editingManualId === session.id) closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo borrar la sesión.',
      );
    }
  }

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
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-headline text-xl font-semibold text-on-surface">
            Sesiones recientes
          </h2>
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-on-primary hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
            <span>Registrar sesión</span>
          </button>
        </div>

        {showManualForm && (
          <form
            onSubmit={(event) => void handleManualSubmit(event)}
            className="grid gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2 lg:grid-cols-4 sm:items-end"
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
              Libro
              <select
                required
                value={manualForm.bookId}
                onChange={(event) =>
                  setManualForm((form) => ({ ...form, bookId: event.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">Elegí un libro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
              {selectedManualBook?.remainingMinutes === undefined &&
                manualForm.bookId && (
                  <span className="text-[11px] font-normal text-on-surface-variant">
                    Sin tiempo de e-reader: sumará a las estadísticas pero no
                    descontará del libro.
                  </span>
                )}
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
              Minutos
              <input
                type="number"
                min={1}
                required
                value={manualForm.durationMinutes}
                onChange={(event) =>
                  setManualForm((form) => ({
                    ...form,
                    durationMinutes: event.target.value,
                  }))
                }
                className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
              Fecha
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(event) =>
                  setManualForm((form) => ({ ...form, date: event.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
              Hora de fin
              <input
                type="time"
                required
                value={manualForm.time}
                onChange={(event) =>
                  setManualForm((form) => ({ ...form, time: event.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"
              >
                {editingManualId ? 'Guardar cambios' : 'Guardar sesión'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {formError && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}

        {recentSessions.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Todavía no hay sesiones registradas. Completa una sesión en el
            temporizador o regístrala manualmente con el botón de arriba.
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
              const modeLabel =
                session.mode === 'guided'
                  ? 'Meta diaria'
                  : session.mode === 'free'
                    ? 'Timer libre'
                    : 'Manual';
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
                      {dateLabel} · {modeLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono font-semibold tabular-nums text-tertiary">
                      {formatDuration(session.durationMinutes)}
                    </span>
                    {session.mode === 'manual' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(session)}
                          title="Editar sesión manual"
                          aria-label="Editar sesión manual"
                          className="material-symbols-outlined rounded-full p-1 text-base text-primary hover:bg-surface-container"
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleManualDelete(session)}
                          title="Borrar sesión manual"
                          aria-label="Borrar sesión manual"
                          className="material-symbols-outlined rounded-full p-1 text-base text-on-surface-variant hover:bg-surface-container"
                        >
                          delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}
