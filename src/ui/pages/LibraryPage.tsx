import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGenreMeta } from '@/domain/genres';
import type { Book, BookStatus } from '@/domain/models';
import { calculateDailyGoal, formatDuration } from '@/domain/planner';
import { db } from '@/infrastructure/db';
import {
  deleteBook,
  updateBookPlan,
  updateBookStatus,
} from '@/infrastructure/readingRepository';
import { useTimerStore } from '@/state/useTimerStore';

const TABS: { id: BookStatus; label: string }[] = [
  { id: 'reading', label: 'Leyendo' },
  { id: 'completed', label: 'Completados' },
  { id: 'paused', label: 'Pausados' },
];

function formatShortSpanishDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function LibraryPage() {
  const navigate = useNavigate();
  const activeBookId = useTimerStore((s) => s.activeBookId);
  const selectBook = useTimerStore((s) => s.selectBook);

  const [tab, setTab] = useState<BookStatus>('reading');
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');
  const [editTargetDate, setEditTargetDate] = useState('');

  const books = useLiveQuery(
    () => db.books.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  );

  const filteredBooks = books.filter((book) => book.status === tab);

  function startEditing(book: Book) {
    const total = book.remainingMinutes ?? 0;
    setEditingBookId(book.id);
    setEditHours(String(Math.floor(total / 60)));
    setEditMinutes(String(total % 60));
    setEditTargetDate(book.targetDate ?? '');
  }

  async function saveEdit(bookId: string) {
    const h = Math.max(0, Number.parseInt(editHours || '0', 10) || 0);
    const m = Math.max(0, Number.parseInt(editMinutes || '0', 10) || 0);
    await updateBookPlan(bookId, h * 60 + m, editTargetDate || undefined);
    setEditingBookId(null);
  }

  function handleReadNow(book: Book) {
    selectBook(book);
    navigate('/');
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Tu estantería local
          </p>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
            Biblioteca
          </h1>
        </div>

        <Link
          to="/add"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            add
          </span>
          <span>Añadir libro</span>
        </Link>
      </header>

      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Filtrar libros por estado"
        className="flex items-center gap-2 border-b border-outline-variant pb-3"
      >
        {TABS.map((item) => {
          const count = books.filter((b) => b.status === item.id).length;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>{item.label}</span>
              <span className="font-mono text-xs tabular-nums opacity-80">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Book list */}
      {filteredBooks.length === 0 ? (
        <article className="flex flex-col items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 text-center">
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            library_books
          </span>
          <p className="font-headline text-xl font-semibold text-on-surface">
            {tab === 'reading'
              ? 'Todavía no tienes libros en lectura'
              : tab === 'completed'
                ? 'Aún no has completado ningún libro'
                : 'No tienes libros pausados'}
          </p>
          <p className="max-w-sm text-sm text-on-surface-variant">
            Añade un libro con el tiempo restante de tu e-reader y la fecha
            objetivo para calcular tu meta diaria automáticamente.
          </p>
          {tab === 'reading' && (
            <Link
              to="/add"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-container"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                add
              </span>
              <span>Añadir primer libro</span>
            </Link>
          )}
        </article>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredBooks.map((book) => {
            const genreMeta = getGenreMeta(book.genre);
            const isActive = activeBookId === book.id;
            const isEditing = editingBookId === book.id;
            const plan =
              book.remainingMinutes !== undefined && book.targetDate
                ? calculateDailyGoal(book.remainingMinutes, book.targetDate)
                : null;

            return (
              <article
                key={book.id}
                className={`flex flex-col gap-4 rounded-2xl border p-5 ${
                  isActive
                    ? 'border-primary bg-surface-container-lowest'
                    : 'border-outline-variant bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-start gap-4">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="h-20 w-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface-container-low font-headline text-xl font-semibold text-primary">
                      {book.title.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-headline text-xl font-semibold leading-snug text-on-surface">
                        {book.title}
                      </h2>
                      <span className="shrink-0 rounded-full bg-secondary-container px-2.5 py-0.5 text-xs font-medium text-on-secondary-container">
                        {genreMeta.label}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {book.author}
                    </p>
                    {isActive && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          check_circle
                        </span>
                        Libro activo en el temporizador
                      </span>
                    )}
                  </div>
                </div>

                {/* Remaining time & daily goal */}
                {!isEditing ? (
                  <div className="flex flex-col gap-1.5 border-t border-outline-variant pt-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">
                        Restante en e-reader
                      </span>
                      <span className="font-mono font-medium tabular-nums text-on-surface">
                        {book.remainingMinutes !== undefined
                          ? formatDuration(book.remainingMinutes)
                          : 'Sin definir'}
                      </span>
                    </div>
                    {plan && book.status === 'reading' && (
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant">
                          Meta diaria (hasta {formatShortSpanishDate(book.targetDate!)})
                        </span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            plan.isOverdue ? 'text-warning' : 'text-tertiary'
                          }`}
                        >
                          {formatDuration(plan.dailyMinutes)} / día
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
                        Horas
                        <input
                          type="number"
                          min={0}
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 font-mono text-sm tabular-nums text-on-surface"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
                        Min
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={editMinutes}
                          onChange={(e) => setEditMinutes(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 font-mono text-sm tabular-nums text-on-surface"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
                        Día X
                        <input
                          type="date"
                          value={editTargetDate}
                          onChange={(e) => setEditTargetDate(e.target.value)}
                          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs tabular-nums text-on-surface"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingBookId(null)}
                        className="rounded-full px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(book.id)}
                        className="rounded-full bg-primary px-3.5 py-1 text-xs font-medium text-on-primary"
                      >
                        Guardar ajuste
                      </button>
                    </div>
                  </div>
                )}

                {/* Card actions */}
                <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {book.status === 'reading' && (
                      <button
                        type="button"
                        onClick={() => startEditing(book)}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-container"
                      >
                        Ajustar tiempo
                      </button>
                    )}
                    {book.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => updateBookStatus(book.id, 'completed')}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
                      >
                        Marcar completado
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateBookStatus(book.id, 'reading')}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
                      >
                        Volver a leer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteBook(book.id)}
                      aria-label={`Eliminar ${book.title}`}
                      className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-error"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        delete
                      </span>
                    </button>
                  </div>

                  {book.status === 'reading' && (
                    <button
                      type="button"
                      onClick={() => handleReadNow(book)}
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container"
                    >
                      Leer ahora
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
