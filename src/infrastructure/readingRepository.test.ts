import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessions, books } = vi.hoisted(() => ({
  sessions: {
    get: vi.fn(),
    add: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  books: { update: vi.fn() },
}));

vi.mock('./db', () => ({ db: { sessions, books } }));

import {
  addManualSession,
  deleteManualSession,
  updateManualSession,
} from './readingRepository';

const input = { durationMinutes: 20, date: '2026-11-25', time: '10:00' };

beforeEach(() => vi.clearAllMocks());

describe('manual session repository', () => {
  it('adds a manual session without touching the book plan', async () => {
    const session = await addManualSession(input);

    expect(session.mode).toBe('manual');
    expect(sessions.add).toHaveBeenCalledTimes(1);
    expect(sessions.add.mock.calls[0][0]).toMatchObject({
      mode: 'manual',
      durationMinutes: 20,
    });
    expect(books.update).not.toHaveBeenCalled();
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
