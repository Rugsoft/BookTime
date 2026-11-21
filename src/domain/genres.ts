import type { GenreId } from './models';

export interface GenreMeta {
  id: GenreId;
  label: string;
  icon: string;
}

export const GENRES: readonly GenreMeta[] = [
  { id: 'fantasia', label: 'Fantasía', icon: 'auto_awesome' },
  { id: 'scifi', label: 'Ciencia ficción', icon: 'rocket_launch' },
  { id: 'misterio', label: 'Misterio', icon: 'search' },
  { id: 'terror', label: 'Terror', icon: 'nights_stay' },
  { id: 'romance', label: 'Romance', icon: 'favorite' },
  { id: 'historico', label: 'Histórico', icon: 'history_edu' },
  { id: 'no-ficcion', label: 'No ficción', icon: 'menu_book' },
  { id: 'general', label: 'General', icon: 'book_2' },
] as const;

export function getGenreMeta(genre: GenreId): GenreMeta {
  return GENRES.find((item) => item.id === genre) ?? GENRES[GENRES.length - 1];
}
