import Dexie, { type EntityTable } from 'dexie';
import type { Book, ReadingSession } from '@/domain/models';

export class BookTimeDatabase extends Dexie {
  books!: EntityTable<Book, 'id'>;
  sessions!: EntityTable<ReadingSession, 'id'>;

  constructor(name = 'booktime-db') {
    super(name);
    this.version(1).stores({
      books: 'id, status, genre, createdAt, completedAt',
      sessions: 'id, bookId, startedAt, endedAt, mode',
    });
  }
}

export const db = new BookTimeDatabase();
