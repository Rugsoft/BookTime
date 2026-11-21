import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGenreMeta } from '@/domain/genres';
import {
  calculateDailyGoal,
  formatCountdown,
  formatDuration,
} from '@/domain/planner';
import { calculateMinutesToday } from '@/domain/stats';
import {
  getElapsedWholeMinutes,
  getProgressRatio,
  getRemainingSeconds,
} from '@/domain/timer';
import { db } from '@/infrastructure/db';
import {
  recordReadingSession,
  type RecordSessionResult,
} from '@/infrastructure/readingRepository';
import {
  playCompletionChime,
  readSoundPreference,
  saveSoundPreference,
  unlockAudioContext,
} from '@/infrastructure/soundAlert';
import { useTimerStore } from '@/state/useTimerStore';
import { AtmosphereSwitcher } from '@/ui/components/AtmosphereSwitcher';

const FREE_PRESETS = [15, 25, 30, 45, 60] as const;
const RING_RADIUS = 108;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function TimerPage() {
  const activeBookId = useTimerStore((s) => s.activeBookId);
  const mode = useTimerStore((s) => s.mode);
  const customMinutes = useTimerStore((s) => s.customMinutes);
  const snapshot = useTimerStore((s) => s.snapshot);
  const sessionStartedAt = useTimerStore((s) => s.sessionStartedAt);
  const selectBook = useTimerStore((s) => s.selectBook);
  const setMode = useTimerStore((s) => s.setMode);
  const setCustomMinutes = useTimerStore((s) => s.setCustomMinutes);
  const syncTargetSeconds = useTimerStore((s) => s.syncTargetSeconds);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const markCompleted = useTimerStore((s) => s.markCompleted);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastResult, setLastResult] = useState<RecordSessionResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => readSoundPreference());
  const autoFinishingRef = useRef(false);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    saveSoundPreference(next);
    if (next) {
      unlockAudioContext();
      playCompletionChime();
    }
  }

  const readingBooks = useLiveQuery(
    () => db.books.where('status').equals('reading').toArray(),
    [],
    [],
  );
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const minutesToday = calculateMinutesToday(sessions);

  const activeBook = useMemo(() => {
    if (readingBooks.length === 0) return null;
    return readingBooks.find((b) => b.id === activeBookId) ?? readingBooks[0];
  }, [readingBooks, activeBookId]);

  // Ensure store has an active book selected when books exist
  useEffect(() => {
    if (activeBook && activeBook.id !== activeBookId) {
      selectBook(activeBook);
    }
  }, [activeBook, activeBookId, selectBook]);

  const dailyPlan = useMemo(() => {
    if (
      !activeBook ||
      activeBook.remainingMinutes === undefined ||
      !activeBook.targetDate
    ) {
      return null;
    }
    return calculateDailyGoal(activeBook.remainingMinutes, activeBook.targetDate);
  }, [activeBook]);

  const plannedTargetSeconds = useMemo(() => {
    if (mode === 'free') return customMinutes * 60;
    if (dailyPlan && dailyPlan.dailyMinutes > 0) {
      return dailyPlan.dailyMinutes * 60;
    }
    return customMinutes * 60;
  }, [mode, customMinutes, dailyPlan]);

  // Keep idle timer target synced with active book's daily goal or custom duration
  useEffect(() => {
    syncTargetSeconds(plannedTargetSeconds);
  }, [plannedTargetSeconds, syncTargetSeconds]);

  // Timestamp-driven tick + immediate refresh when returning from screen lock
  useEffect(() => {
    if (snapshot.status !== 'running') return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [snapshot.status]);

  const remainingSeconds = getRemainingSeconds(snapshot, nowMs);
  const progressRatio = getProgressRatio(snapshot, nowMs);
  const elapsedMinutes = getElapsedWholeMinutes(snapshot, nowMs);

  const handleFinishSession = useCallback(
    async (minutesToLog: number) => {
      const endedAt = new Date().toISOString();
      const startedAt =
        sessionStartedAt ??
        new Date(Date.now() - minutesToLog * 60_000).toISOString();

      const result = await recordReadingSession({
        bookId: activeBook?.id,
        startedAt,
        endedAt,
        durationMinutes: Math.max(1, minutesToLog),
        mode,
      });

      setLastResult(result);
      reset();
    },
    [activeBook?.id, mode, reset, sessionStartedAt],
  );

  // Auto-complete when countdown hits zero
  useEffect(() => {
    if (
      snapshot.status === 'running' &&
      remainingSeconds === 0 &&
      !autoFinishingRef.current
    ) {
      autoFinishingRef.current = true;
      if (soundEnabled) {
        playCompletionChime();
      }
      markCompleted();
      const plannedMinutes = Math.max(1, Math.round(snapshot.targetSeconds / 60));
      void handleFinishSession(plannedMinutes).finally(() => {
        autoFinishingRef.current = false;
      });
    }
  }, [
    snapshot.status,
    snapshot.targetSeconds,
    remainingSeconds,
    soundEnabled,
    markCompleted,
    handleFinishSession,
  ]);

  const strokeOffset = RING_CIRCUMFERENCE * (1 - progressRatio);
  const isRunningOrPaused =
    snapshot.status === 'running' || snapshot.status === 'paused';

  return (
    <section className="flex flex-col gap-6">
      {/* Header + Book switcher */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Sesión de lectura · Hoy: {formatDuration(minutesToday)}
          </p>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
            Temporizador activo
          </h1>
        </div>

        {readingBooks.length > 0 ? (
          <label className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
            <span>Libro activo:</span>
            <select
              value={activeBook?.id ?? ''}
              disabled={isRunningOrPaused}
              onChange={(e) => {
                const chosen =
                  readingBooks.find((b) => b.id === e.target.value) ?? null;
                selectBook(chosen);
              }}
              className="rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-1.5 text-sm font-medium text-on-surface focus:border-primary focus:outline-none disabled:opacity-50"
            >
              {readingBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
            <span>Añadir libro</span>
          </Link>
        )}
      </header>

      {/* Completion feedback banner */}
      {lastResult && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="material-symbols-outlined text-xl text-success"
              aria-hidden="true"
            >
              check_circle
            </span>
            <span>
              Sesión guardada:{' '}
              <strong className="font-mono tabular-nums">
                {formatDuration(lastResult.loggedMinutes)}
              </strong>
              {lastResult.bookCompleted
                ? ' · ¡Libro completado!'
                : lastResult.updatedRemainingMinutes !== undefined
                  ? ` · Restante en e-reader: ${formatDuration(lastResult.updatedRemainingMinutes)}`
                  : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastResult(null)}
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Main grid: Timer focus card + Active book context */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Timer Card */}
        <article className="flex flex-col items-center gap-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 lg:col-span-7">
          {/* Mode selector + Sound alert toggle */}
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Modo de temporizador"
              className="inline-flex rounded-full border border-outline-variant bg-surface-container-low p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'guided'}
                disabled={isRunningOrPaused}
                onClick={() => setMode('guided')}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-150 disabled:opacity-50 ${
                  mode === 'guided'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Meta diaria
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'free'}
                disabled={isRunningOrPaused}
                onClick={() => setMode('free')}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-150 disabled:opacity-50 ${
                  mode === 'free'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Timer libre
              </button>
            </div>

            <button
              type="button"
              aria-pressed={soundEnabled}
              onClick={toggleSound}
              title={
                soundEnabled
                  ? 'Aviso sonoro activado (click para silenciar)'
                  : 'Aviso sonoro silenciado (click para activar y probar)'
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                soundEnabled
                  ? 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {soundEnabled ? 'notifications_active' : 'notifications_off'}
              </span>
              <span>{soundEnabled ? 'Aviso sonoro' : 'Silenciado'}</span>
            </button>
          </div>

          {/* Free mode duration presets */}
          {mode === 'free' && !isRunningOrPaused && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {FREE_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setCustomMinutes(mins)}
                  className={`rounded-full px-3 py-1 font-mono text-xs font-medium tabular-nums transition-colors duration-150 ${
                    customMinutes === mins
                      ? 'bg-tertiary text-on-tertiary'
                      : 'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {mins}m
                </button>
              ))}
              <label className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs text-on-surface-variant">
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={customMinutes}
                  onChange={(e) =>
                    setCustomMinutes(Number.parseInt(e.target.value || '1', 10))
                  }
                  aria-label="Minutos personalizados"
                  className="w-12 bg-transparent text-center font-mono text-xs font-medium tabular-nums text-on-surface focus:outline-none"
                />
                <span>min</span>
              </label>
            </div>
          )}

          {/* SVG Progress Ring */}
          <div className="relative flex h-64 w-64 items-center justify-center">
            <svg
              viewBox="0 0 240 240"
              className="h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="120"
                cy="120"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-surface-container-high"
              />
              <circle
                cx="120"
                cy="120"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeOffset}
                className="text-primary transition-[stroke-dashoffset] duration-200"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-5xl font-semibold tracking-tight tabular-nums text-on-surface">
                {formatCountdown(remainingSeconds)}
              </span>
              <span className="mt-1.5 text-xs font-medium text-on-surface-variant">
                {snapshot.status === 'running'
                  ? 'Leyendo...'
                  : snapshot.status === 'paused'
                    ? 'Sesión en pausa'
                    : mode === 'guided' && dailyPlan
                      ? `Meta diaria · ${formatDuration(dailyPlan.dailyMinutes)}`
                      : `Objetivo · ${formatDuration(Math.round(snapshot.targetSeconds / 60))}`}
              </span>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {snapshot.status === 'idle' && (
              <button
                type="button"
                onClick={() => {
                  setLastResult(null);
                  if (soundEnabled) unlockAudioContext();
                  start(plannedTargetSeconds);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  play_arrow
                </span>
                <span>Iniciar lectura</span>
              </button>
            )}

            {snapshot.status === 'running' && (
              <button
                type="button"
                onClick={pause}
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-high px-6 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-highest"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  pause
                </span>
                <span>Pausar</span>
              </button>
            )}

            {snapshot.status === 'paused' && (
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) unlockAudioContext();
                  resume();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  play_arrow
                </span>
                <span>Reanudar</span>
              </button>
            )}

            {isRunningOrPaused && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void handleFinishSession(Math.max(1, elapsedMinutes))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-tertiary px-5 py-3 text-sm font-medium text-on-tertiary"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    task_alt
                  </span>
                  <span>Finalizar y guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => reset(plannedTargetSeconds)}
                  className="rounded-full px-4 py-3 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </article>

        {/* Active Book & Atmosphere Side Panel */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {activeBook ? (
            <article className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="flex items-start gap-4">
                {activeBook.coverUrl ? (
                  <img
                    src={activeBook.coverUrl}
                    alt={activeBook.title}
                    className="h-24 w-16 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface-container-low font-headline text-2xl font-semibold text-primary">
                    {activeBook.title.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-full bg-secondary-container px-2.5 py-0.5 text-xs font-medium text-on-secondary-container">
                    {getGenreMeta(activeBook.genre).label}
                  </span>
                  <h2 className="mt-1.5 font-headline text-2xl font-semibold leading-snug text-on-surface">
                    {activeBook.title}
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    {activeBook.author}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-outline-variant pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">
                    Tiempo restante en e-reader
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-on-surface">
                    {activeBook.remainingMinutes !== undefined
                      ? formatDuration(activeBook.remainingMinutes)
                      : 'Sin plan'}
                  </span>
                </div>

                {dailyPlan && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">
                        Días restantes
                      </span>
                      <span className="font-mono tabular-nums text-on-surface">
                        {dailyPlan.daysRemaining}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Meta diaria</span>
                      <span className="font-mono font-semibold tabular-nums text-tertiary">
                        {formatDuration(dailyPlan.dailyMinutes)} / día
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end border-t border-outline-variant pt-3">
                <Link
                  to="/library"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ajustar tiempo en Biblioteca →
                </Link>
              </div>
            </article>
          ) : (
            <article className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
              <h2 className="font-headline text-xl font-semibold text-on-surface">
                Sin libro activo
              </h2>
              <p className="text-sm text-on-surface-variant">
                Puedes usar el temporizador libre ahora mismo o añadir un libro
                para activar su atmósfera y calcular tu meta diaria.
              </p>
              <div>
                <Link
                  to="/add"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-on-primary hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    add
                  </span>
                  <span>Añadir libro</span>
                </Link>
              </div>
            </article>
          )}

          {/* Atmosphere quick selector */}
          <article className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">
                Atmósfera visual
              </h3>
              <span className="text-xs text-on-surface-variant">
                Cambia automáticamente según el libro
              </span>
            </div>
            <AtmosphereSwitcher />
          </article>
        </div>
      </div>
    </section>
  );
}
