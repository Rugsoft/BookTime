import {
  buildManualSession,
  type ManualSessionInput,
} from '@/domain/manualSession';
import type { Book, BookStatus, GenreId, SessionMode } from '@/domain/models';
import { deductReadingSession } from '@/domain/planner';
import { db } from './db';

export interface CreateBookInput {
  title: string;
  author: string;
  coverUrl?: string;
  genre: GenreId;
  remainingMinutes?: number;
  targetDate?: string;
}

export async function createBook(input: CreateBookInput): Promise<Book> {
  const book: Book = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    author: input.author.trim() || 'Autor desconocido',
    coverUrl: input.coverUrl?.trim() || undefined,
    genre: input.genre,
    status: 'reading',
    remainingMinutes:
      input.remainingMinutes !== undefined && input.remainingMinutes > 0
        ? Math.round(input.remainingMinutes)
        : undefined,
    targetDate: input.targetDate?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  await db.books.add(book);
  return book;
}

export async function updateBookPlan(
  bookId: string,
  remainingMinutes: number | undefined,
  targetDate: string | undefined,
): Promise<void> {
  const cleanMinutes =
    remainingMinutes !== undefined && remainingMinutes >= 0
      ? Math.round(remainingMinutes)
      : undefined;

  await db.books.update(bookId, {
    remainingMinutes: cleanMinutes,
    targetDate: targetDate?.trim() || undefined,
    ...(cleanMinutes === 0
      ? { status: 'completed' as BookStatus, completedAt: new Date().toISOString() }
      : {}),
  });
}

export async function updateBookStatus(
  bookId: string,
  status: BookStatus,
): Promise<void> {
  await db.books.update(bookId, {
    status,
    completedAt: status === 'completed' ? new Date().toISOString() : undefined,
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  await db.books.delete(bookId);
}

export interface RecordSessionInput {
  bookId?: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  mode: SessionMode;
}

export interface RecordSessionResult {
  loggedMinutes: number;
  updatedRemainingMinutes?: number;
  bookCompleted: boolean;
}

/**
 * Persists a reading session and automatically deducts elapsed minutes
 * from the linked book's remaining e-reader time in a single transaction.
 */
export async function recordReadingSession(
  input: RecordSessionInput,
): Promise<RecordSessionResult> {
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  let updatedRemainingMinutes: number | undefined;
  let bookCompleted = false;

  await db.transaction('rw', db.sessions, db.books, async () => {
    await db.sessions.add({
      id: crypto.randomUUID(),
      bookId: input.bookId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMinutes,
      mode: input.mode,
    });

    if (!input.bookId) return;

    const book = await db.books.get(input.bookId);
    if (!book || book.remainingMinutes === undefined) return;

    const nextRemaining = deductReadingSession(
      book.remainingMinutes,
      durationMinutes,
    );
    updatedRemainingMinutes = nextRemaining;

    if (nextRemaining === 0 && book.status !== 'completed') {
      bookCompleted = true;
      await db.books.update(book.id, {
        remainingMinutes: 0,
        status: 'completed',
        completedAt: input.endedAt,
      });
    } else {
      await db.books.update(book.id, {
        remainingMinutes: nextRemaining,
      });
    }
  });

  return {
    loggedMinutes: durationMinutes,
    updatedRemainingMinutes,
    bookCompleted,
  };
}

export interface ManualSessionRecordInput extends ManualSessionInput {
  bookId: string;
}

/** Applies a signed minute delta, reopening a book that regains remaining time. */
async function adjustBookTime(bookId: string, minutesDelta: number): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book || book.remainingMinutes === undefined) return;

  const remainingMinutes = Math.max(0, book.remainingMinutes + minutesDelta);
  const completed = remainingMinutes === 0;

  await db.books.update(bookId, {
    remainingMinutes,
    ...(book.status === 'completed' && !completed
      ? { status: 'reading' as BookStatus, completedAt: undefined }
      : {}),
    ...(book.status !== 'completed' && completed
      ? { status: 'completed' as BookStatus, completedAt: new Date().toISOString() }
      : {}),
  });
}

export async function addManualSession(
  input: ManualSessionRecordInput,
): Promise<void> {
  const session = buildManualSession(input);
  await recordReadingSession({
    bookId: input.bookId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes: session.durationMinutes,
    mode: 'manual',
  });
}

export async function updateManualSession(
  id: string,
  input: ManualSessionRecordInput,
): Promise<void> {
  const existing = await db.sessions.get(id);
  if (!existing || existing.mode !== 'manual') {
    throw new Error('Solo se pueden editar sesiones manuales.');
  }

  const updated = buildManualSession(input, id);
  await db.transaction('rw', db.sessions, db.books, async () => {
    await db.sessions.put({ ...existing, ...updated, bookId: input.bookId });

    if (existing.bookId && existing.bookId !== input.bookId) {
      await adjustBookTime(existing.bookId, existing.durationMinutes);
    }
    const delta =
      existing.bookId === input.bookId
        ? existing.durationMinutes - updated.durationMinutes
        : -updated.durationMinutes;
    await adjustBookTime(input.bookId, delta);
  });
}

export async function deleteManualSession(id: string): Promise<void> {
  const existing = await db.sessions.get(id);
  if (!existing || existing.mode !== 'manual') {
    throw new Error('Solo se pueden borrar sesiones manuales.');
  }
  await db.transaction('rw', db.sessions, db.books, async () => {
    await db.sessions.delete(id);
    if (existing.bookId) {
      await adjustBookTime(existing.bookId, existing.durationMinutes);
    }
  });
}
