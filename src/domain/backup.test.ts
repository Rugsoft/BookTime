import { describe, expect, it } from 'vitest';
import {
  BACKUP_VERSION,
  BackupError,
  createBackup,
  parseBackup,
  type BookTimeBackup,
} from './backup';
import type { Book, ReadingSession } from './models';

const book: Book = {
  id: 'book-1',
  title: 'Dune',
  author: 'Frank Herbert',
  genre: 'scifi',
  status: 'reading',
  remainingMinutes: 390,
  targetDate: '2026-12-31',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const session: ReadingSession = {
  id: 'session-1',
  bookId: 'book-1',
  startedAt: '2026-01-02T00:00:00.000Z',
  endedAt: '2026-01-02T00:30:00.000Z',
  durationMinutes: 30,
  mode: 'guided',
};

const validBackup: BookTimeBackup = {
  version: BACKUP_VERSION,
  exportedAt: '2026-01-03T00:00:00.000Z',
  books: [book],
  sessions: [session],
};

describe('createBackup', () => {
  it('builds a versioned snapshot with a parseable export date', () => {
    const backup = createBackup([book], [session]);

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.books).toEqual([book]);
    expect(backup.sessions).toEqual([session]);
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false);
  });
});

describe('parseBackup', () => {
  it('round-trips a valid JSON backup', () => {
    expect(parseBackup(JSON.stringify(validBackup))).toEqual(validBackup);
  });

  it('accepts an empty backup', () => {
    const empty: BookTimeBackup = {
      version: BACKUP_VERSION,
      exportedAt: '2026-01-03T00:00:00.000Z',
      books: [],
      sessions: [],
    };

    expect(parseBackup(JSON.stringify(empty))).toEqual(empty);
  });

  it('keeps sessions whose book is not in the backup', () => {
    const orphanSession = { ...session, bookId: 'deleted-book' };

    expect(
      parseBackup(
        JSON.stringify({ ...validBackup, books: [], sessions: [orphanSession] }),
      ).sessions,
    ).toEqual([orphanSession]);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseBackup('{ nope')).toThrow(BackupError);
  });

  it('rejects a root that is not a backup object', () => {
    expect(() => parseBackup('[]')).toThrow(BackupError);
    expect(() => parseBackup('null')).toThrow(BackupError);
  });

  it('rejects unsupported versions', () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, version: 2 })),
    ).toThrow(BackupError);
  });

  it('rejects missing book or session collections', () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, books: undefined })),
    ).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, sessions: {} })),
    ).toThrow(BackupError);
  });

  it('rejects books with invalid types or enum values', () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, books: [{ ...book, genre: 'unknown' }] })),
    ).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, books: [{ ...book, remainingMinutes: -5 }] })),
    ).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, books: [{ id: '', title: 'x' }] })),
    ).toThrow(BackupError);
  });

  it('rejects sessions with invalid types or enum values', () => {
    expect(() =>
      parseBackup(
        JSON.stringify({ ...validBackup, sessions: [{ ...session, mode: 'unknown' }] }),
      ),
    ).toThrow(BackupError);
    expect(() =>
      parseBackup(
        JSON.stringify({ ...validBackup, sessions: [{ ...session, durationMinutes: 0 }] }),
      ),
    ).toThrow(BackupError);
  });

  it('rejects duplicate ids inside either collection', () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, books: [book, book] })),
    ).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup, sessions: [session, session] })),
    ).toThrow(BackupError);
  });
});

describe('manual sessions in backups', () => {
  it('round-trips a session with mode manual', () => {
    const manualSession: ReadingSession = {
      id: 'manual-1',
      startedAt: '2026-01-02T15:00:00.000Z',
      endedAt: '2026-01-02T15:35:00.000Z',
      durationMinutes: 35,
      mode: 'manual',
    };

    expect(
      parseBackup(JSON.stringify({ ...validBackup, sessions: [manualSession] }))
        .sessions,
    ).toEqual([manualSession]);
  });
});
