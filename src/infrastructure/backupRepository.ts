import { createBackup, type BookTimeBackup } from '@/domain/backup';
import { db } from './db';

export type ImportMode = 'replace' | 'merge';

export interface ImportSummary {
  books: number;
  sessions: number;
  skipped: number;
}

export async function downloadBackup(): Promise<{ books: number; sessions: number }> {
  const [books, sessions] = await Promise.all([
    db.books.toArray(),
    db.sessions.toArray(),
  ]);
  const backup = createBackup(books, sessions);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `booktime-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return { books: books.length, sessions: sessions.length };
}

/**
 * Applies a validated backup in one transaction: nothing is written if any
 * bulk operation fails. Replace clears both tables; merge keeps existing ids.
 */
export async function importBackup(
  backup: BookTimeBackup,
  mode: ImportMode,
): Promise<ImportSummary> {
  let summary: ImportSummary = { books: 0, sessions: 0, skipped: 0 };

  await db.transaction('rw', db.books, db.sessions, async () => {
    if (mode === 'replace') {
      await db.books.clear();
      await db.sessions.clear();
      await db.books.bulkAdd(backup.books);
      await db.sessions.bulkAdd(backup.sessions);
      summary = {
        books: backup.books.length,
        sessions: backup.sessions.length,
        skipped: 0,
      };
      return;
    }

    const [books, sessions] = await Promise.all([
      db.books.toArray(),
      db.sessions.toArray(),
    ]);
    const bookIds = new Set(books.map((book) => book.id));
    const sessionIds = new Set(sessions.map((session) => session.id));
    const newBooks = backup.books.filter((book) => !bookIds.has(book.id));
    const newSessions = backup.sessions.filter(
      (session) => !sessionIds.has(session.id),
    );

    await db.books.bulkAdd(newBooks);
    await db.sessions.bulkAdd(newSessions);
    summary = {
      books: newBooks.length,
      sessions: newSessions.length,
      skipped:
        backup.books.length - newBooks.length + (backup.sessions.length - newSessions.length),
    };
  });

  return summary;
}
