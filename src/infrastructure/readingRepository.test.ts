import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessions, books, transaction } = vi.hoisted(() => ({
  sessions: {
    get: vi.fn(),
    add: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  books: { get: vi.fn(), update: vi.fn() },
  transaction: vi.fn(
    async (
      _mode: string,
      _sessionsTable: unknown,
      _booksTable: unknown,
      fn: () => Promise<void>,
    ) => fn(),
  ),
}));

vi.mock('./db', () => ({ db: { sessions, books, transaction } }));

import {
  addManualSession,
  deleteManualSession,
  updateManualSession,
} from './readingRepository';

const input = {
  durationMinutes: 20,
  date: '2026-11-25',
  time: '10:00',
  bookId: 'book-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  books.get.mockResolvedValue({
    id: 'book-1',
    remainingMinutes: 100,
    status: 'reading',
  });
});

describe('manual session repository', () => {
  it('deducts the logged minutes from the chosen book', async () => {
    await addManualSession(input);

    expect(sessions.add).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'book-1',
        mode: 'manual',
        durationMinutes: 20,
      }),
    );
    expect(books.update).toHaveBeenCalledWith(
      'book-1',
      expect.objectContaining({ remainingMinutes: 80 }),
    );
  });

  it('adjusts the book by the duration difference when editing', async () => {
    sessions.get.mockResolvedValue({
      id: 's1',
      mode: 'manual',
      bookId: 'book-1',
      durationMinutes: 20,
    });
    books.get.mockResolvedValue({
      id: 'book-1',
      remainingMinutes: 80,
      status: 'reading',
    });

    await updateManualSession('s1', { ...input, durationMinutes: 30 });

    expect(books.update).toHaveBeenCalledWith(
      'book-1',
      expect.objectContaining({ remainingMinutes: 70 }),
    );
    expect(sessions.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', durationMinutes: 30, bookId: 'book-1' }),
    );
  });

  it('moves the time to the new book when the selection changes', async () => {
    sessions.get.mockResolvedValue({
      id: 's1',
      mode: 'manual',
      bookId: 'book-1',
      durationMinutes: 20,
    });
    books.get.mockImplementation(async (id: string) =>
      id === 'book-1'
        ? { id, remainingMinutes: 80, status: 'reading' }
        : { id, remainingMinutes: 50, status: 'reading' },
    );

    await updateManualSession('s1', { ...input, durationMinutes: 30, bookId: 'book-2' });

    expect(books.update).toHaveBeenCalledWith(
      'book-1',
      expect.objectContaining({ remainingMinutes: 100 }),
    );
    expect(books.update).toHaveBeenCalledWith(
      'book-2',
      expect.objectContaining({ remainingMinutes: 20 }),
    );
  });

  it('restores the minutes and reactivates the book when deleting', async () => {
    sessions.get.mockResolvedValue({
      id: 's1',
      mode: 'manual',
      bookId: 'book-1',
      durationMinutes: 20,
    });
    books.get.mockResolvedValue({
      id: 'book-1',
      remainingMinutes: 0,
      status: 'completed',
      completedAt: '2026-11-25T10:00:00.000Z',
    });

    await deleteManualSession('s1');

    expect(sessions.delete).toHaveBeenCalledWith('s1');
    expect(books.update).toHaveBeenCalledWith(
      'book-1',
      expect.objectContaining({
        remainingMinutes: 20,
        status: 'reading',
        completedAt: undefined,
      }),
    );
  });

  it('refuses to edit a session that is not manual', async () => {
    sessions.get.mockResolvedValue({ id: 'timer-1', mode: 'guided' });

    await expect(updateManualSession('timer-1', input)).rejects.toThrow(
      'Solo se pueden editar sesiones manuales.',
    );
    expect(sessions.put).not.toHaveBeenCalled();
  });

  it('refuses to delete a session that is not manual', async () => {
    sessions.get.mockResolvedValue({ id: 'timer-1', mode: 'guided' });

    await expect(deleteManualSession('timer-1')).rejects.toThrow(
      'Solo se pueden borrar sesiones manuales.',
    );
    expect(sessions.delete).not.toHaveBeenCalled();
  });
});
