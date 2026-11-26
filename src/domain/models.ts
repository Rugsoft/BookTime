export type AtmosphereId =
  | 'editorial'
  | 'editorial-dark'
  | 'fantasia'
  | 'scifi'
  | 'misterio'
  | 'terror';

export type GenreId =
  | 'fantasia'
  | 'scifi'
  | 'misterio'
  | 'terror'
  | 'romance'
  | 'historico'
  | 'no-ficcion'
  | 'general';

export type BookStatus = 'reading' | 'completed' | 'paused';
export type SessionMode = 'guided' | 'free' | 'manual';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  genre: GenreId;
  status: BookStatus;
  remainingMinutes?: number;
  targetDate?: string; // ISO date string YYYY-MM-DD
  createdAt: string;
  completedAt?: string;
}

export interface ReadingSession {
  id: string;
  bookId?: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  mode: SessionMode;
}

export interface AtmosphereMeta {
  id: AtmosphereId;
  label: string;
  icon: string;
}

export const ATMOSPHERES: readonly AtmosphereMeta[] = [
  { id: 'editorial', label: 'Editorial', icon: 'menu_book' },
  { id: 'editorial-dark', label: 'Noche', icon: 'dark_mode' },
  { id: 'fantasia', label: 'Fantasía', icon: 'auto_awesome' },
  { id: 'scifi', label: 'Ciencia ficción', icon: 'rocket_launch' },
  { id: 'misterio', label: 'Misterio', icon: 'search' },
  { id: 'terror', label: 'Terror', icon: 'nights_stay' },
] as const;

export function genreToAtmosphere(
  genre: GenreId,
  fallback: 'editorial' | 'editorial-dark' = 'editorial',
): AtmosphereId {
  switch (genre) {
    case 'fantasia':
    case 'scifi':
    case 'misterio':
    case 'terror':
      return genre;
    default:
      return fallback;
  }
}
