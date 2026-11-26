import type {
  Book,
  BookStatus,
  GenreId,
  ReadingSession,
  SessionMode,
} from './models';

export const BACKUP_VERSION = 1;

export interface BookTimeBackup {
  version: number;
  exportedAt: string;
  books: Book[];
  sessions: ReadingSession[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const GENRES = new Set<GenreId>([
  'fantasia',
  'scifi',
  'misterio',
  'terror',
  'romance',
  'historico',
  'no-ficcion',
  'general',
]);
const STATUSES = new Set<BookStatus>(['reading', 'completed', 'paused']);
const MODES = new Set<SessionMode>(['guided', 'free', 'manual']);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new BackupError(`El campo "${key}" debe ser un texto no vacío.`);
  }
  return value;
}

function optionalString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new BackupError(`El campo "${key}" debe ser un texto.`);
  }
  return value;
}

function optionalMinNumber(
  record: UnknownRecord,
  key: string,
  min: number,
): number | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new BackupError(`El campo "${key}" debe ser un número válido.`);
  }
  return value;
}

function parseEnum<T extends string>(
  record: UnknownRecord,
  key: string,
  allowed: ReadonlySet<T>,
): T {
  const value = record[key];
  if (typeof value !== 'string' || !allowed.has(value as T)) {
    throw new BackupError(`El campo "${key}" tiene un valor no soportado.`);
  }
  return value as T;
}

function parseBook(value: unknown): Book {
  if (!isRecord(value)) throw new BackupError('Hay un libro inválido en el backup.');

  const coverUrl = optionalString(value, 'coverUrl');
  const remainingMinutes = optionalMinNumber(value, 'remainingMinutes', 0);
  const targetDate = optionalString(value, 'targetDate');
  const completedAt = optionalString(value, 'completedAt');

  return {
    id: requiredString(value, 'id'),
    title: requiredString(value, 'title'),
    author: requiredString(value, 'author'),
    genre: parseEnum(value, 'genre', GENRES),
    status: parseEnum(value, 'status', STATUSES),
    createdAt: requiredString(value, 'createdAt'),
    ...(coverUrl !== undefined ? { coverUrl } : {}),
    ...(remainingMinutes !== undefined ? { remainingMinutes } : {}),
    ...(targetDate !== undefined ? { targetDate } : {}),
    ...(completedAt !== undefined ? { completedAt } : {}),
  };
}

function parseSession(value: unknown): ReadingSession {
  if (!isRecord(value)) throw new BackupError('Hay una sesión inválida en el backup.');

  const bookId = optionalString(value, 'bookId');
  const durationMinutes = value.durationMinutes;
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new BackupError('El campo "durationMinutes" debe ser mayor que cero.');
  }

  return {
    id: requiredString(value, 'id'),
    startedAt: requiredString(value, 'startedAt'),
    endedAt: requiredString(value, 'endedAt'),
    durationMinutes,
    mode: parseEnum(value, 'mode', MODES),
    ...(bookId !== undefined ? { bookId } : {}),
  };
}

function parseCollection<T extends { id: string }>(
  value: unknown,
  key: string,
  parse: (item: unknown) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new BackupError(`El campo "${key}" debe ser una lista.`);
  }

  const seen = new Set<string>();
  return value.map((item) => {
    const parsed = parse(item);
    if (seen.has(parsed.id)) {
      throw new BackupError(`Hay identificadores duplicados en "${key}".`);
    }
    seen.add(parsed.id);
    return parsed;
  });
}

export function createBackup(books: Book[], sessions: ReadingSession[]): BookTimeBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    books,
    sessions,
  };
}

export function parseBackup(text: string): BookTimeBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no contiene JSON válido.');
  }

  if (!isRecord(raw)) {
    throw new BackupError('El archivo no es un backup de BookTime.');
  }
  if (raw.version !== BACKUP_VERSION) {
    throw new BackupError(
      `Versión de backup no soportada (se esperaba ${BACKUP_VERSION}).`,
    );
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: requiredString(raw, 'exportedAt'),
    books: parseCollection(raw.books, 'books', parseBook),
    sessions: parseCollection(raw.sessions, 'sessions', parseSession),
  };
}
