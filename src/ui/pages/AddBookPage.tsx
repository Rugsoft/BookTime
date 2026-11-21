import { type FormEvent, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES, getGenreMeta } from '@/domain/genres';
import type { GenreId } from '@/domain/models';
import {
  calculateDailyGoal,
  formatDuration,
  toLocalDateKey,
} from '@/domain/planner';
import {
  searchBooksOnline,
  type BookSearchResult,
} from '@/infrastructure/bookSearch';
import { createBook } from '@/infrastructure/readingRepository';
import { useTimerStore } from '@/state/useTimerStore';

export function AddBookPage() {
  const navigate = useNavigate();
  const selectBook = useTimerStore((s) => s.selectBook);

  // Online lookup state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [genre, setGenre] = useState<GenreId>('fantasia');
  const [hours, setHours] = useState('5');
  const [minutes, setMinutes] = useState('30');
  const [targetDate, setTargetDate] = useState(() => {
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);
    return toLocalDateKey(inTenDays);
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalRemainingMinutes = useMemo(() => {
    const h = Math.max(0, Number.parseInt(hours || '0', 10) || 0);
    const m = Math.max(0, Number.parseInt(minutes || '0', 10) || 0);
    return h * 60 + m;
  }, [hours, minutes]);

  const dailyPreview = useMemo(() => {
    if (totalRemainingMinutes <= 0 || !targetDate) return null;
    return calculateDailyGoal(totalRemainingMinutes, targetDate);
  }, [totalRemainingMinutes, targetDate]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchBooksOnline(query, controller.signal);
      setResults(found);
      if (found.length === 0) {
        setSearchError('No encontramos resultados. Puedes cargarlo manualmente abajo.');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setSearchError(
          'Sin conexión o error al buscar en Open Library. Puedes cargar los datos manualmente.',
        );
      }
    } finally {
      setSearching(false);
    }
  }

  function applySearchResult(book: BookSearchResult) {
    setTitle(book.title);
    setAuthor(book.author);
    setCoverUrl(book.coverUrl ?? '');
    setGenre(book.genre);
    setResults([]);
    setSearchError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Escribe al menos el título del libro.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const created = await createBook({
        title,
        author,
        coverUrl: coverUrl || undefined,
        genre,
        remainingMinutes:
          totalRemainingMinutes > 0 ? totalRemainingMinutes : undefined,
        targetDate: totalRemainingMinutes > 0 ? targetDate : undefined,
      });
      selectBook(created);
      navigate('/');
    } catch {
      setFormError('No se pudo guardar el libro en el almacenamiento local.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Nuevo libro
        </p>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
          Añadir libro
        </h1>
        <p className="text-sm text-on-surface-variant">
          Busca por título o autor para rellenar portada y género, o completa
          los datos manualmente.
        </p>
      </header>

      {/* Book lookup card */}
      <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-lg text-on-surface-variant"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar título o autor (ej. El nombre del viento, Dune...)"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2.5 pr-4 pl-10 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary-container px-5 py-2.5 text-sm font-medium text-on-secondary-container transition-colors duration-150 hover:bg-surface-container-high disabled:opacity-40"
          >
            <span>{searching ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {searchError && (
          <p className="mt-3 text-xs text-on-surface-variant">{searchError}</p>
        )}

        {results.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.map((item) => {
              const genreMeta = getGenreMeta(item.genre);
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3"
                >
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="h-16 w-11 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-surface-container-high text-on-surface-variant">
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">
                        book_2
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-base font-semibold text-on-surface">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {item.author}
                      {item.firstPublishYear ? ` · ${item.firstPublishYear}` : ''}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                      {genreMeta.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySearchResult(item)}
                    className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-container"
                  >
                    Usar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      {/* Main form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface">Título *</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. El nombre del viento"
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface">Autor</span>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Ej. Patrick Rothfuss"
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        {/* Genre chips */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-on-surface">
            Género y atmósfera visual
          </span>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((item) => {
              const selected = genre === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGenre(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    selected
                      ? 'bg-tertiary text-on-tertiary'
                      : 'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-base"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* E-reader remaining time + target date */}
        <div className="grid grid-cols-1 gap-4 border-t border-outline-variant pt-5 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface">
              Horas restantes (e-reader)
            </span>
            <input
              type="number"
              min={0}
              max={200}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2.5 font-mono text-sm tabular-nums text-on-surface focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface">
              Minutos restantes
            </span>
            <input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2.5 font-mono text-sm tabular-nums text-on-surface focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface">
              Fecha objetivo (día X)
            </span>
            <input
              type="date"
              value={targetDate}
              min={toLocalDateKey(new Date())}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm tabular-nums text-on-surface focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        {/* Live daily goal preview */}
        {dailyPreview && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <div className="flex items-center gap-2.5">
              <span
                className="material-symbols-outlined text-xl text-tertiary"
                aria-hidden="true"
              >
                calendar_clock
              </span>
              <span className="text-sm text-on-surface-variant">
                Meta diaria estimada ({dailyPreview.daysRemaining}{' '}
                {dailyPreview.daysRemaining === 1 ? 'día' : 'días'} restantes)
              </span>
            </div>
            <span className="font-mono text-lg font-semibold tabular-nums text-tertiary">
              {formatDuration(dailyPreview.dailyMinutes)} / día
            </span>
          </div>
        )}

        {formError && (
          <p className="text-sm font-medium text-error">{formError}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-container disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              bookmark_added
            </span>
            <span>{saving ? 'Guardando...' : 'Guardar libro'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
