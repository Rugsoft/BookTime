import type { GenreId } from '@/domain/models';

export interface BookSearchResult {
  key: string;
  title: string;
  author: string;
  coverUrl?: string;
  genre: GenreId;
  firstPublishYear?: number;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  subject?: string[];
  first_publish_year?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

export function inferGenreFromSubjects(subjects: string[] = []): GenreId {
  const joined = subjects.join(' ').toLowerCase();

  if (/\b(fantasy|fantas[ií]a|magic|dragons?|wizards?|epic fantasy)\b/.test(joined)) {
    return 'fantasia';
  }
  if (/\b(science fiction|sci-fi|space|cyberpunk|dystopia|aliens?|time travel)\b/.test(joined)) {
    return 'scifi';
  }
  if (/\b(horror|terror|ghosts?|haunted|vampires?|gothic|supernatural)\b/.test(joined)) {
    return 'terror';
  }
  if (/\b(mystery|misterio|detective|thriller|crime|suspense|murder|noir)\b/.test(joined)) {
    return 'misterio';
  }
  if (/\b(romance|love stories|romantic)\b/.test(joined)) {
    return 'romance';
  }
  if (/\b(historical|history|hist[oó]ric[oa]|world war|ancient|biography)\b/.test(joined)) {
    return 'historico';
  }
  if (/\b(nonfiction|non-fiction|self-help|psychology|philosophy|science|essay|business)\b/.test(joined)) {
    return 'no-ficcion';
  }

  return 'general';
}

export async function searchBooksOnline(
  query: string,
  signal?: AbortSignal,
): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: '6',
    fields: 'key,title,author_name,cover_i,subject,first_publish_year',
  });

  const response = await fetch(
    `https://openlibrary.org/search.json?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Open Library search failed (${response.status})`);
  }

  const data = (await response.json()) as OpenLibraryResponse;
  const docs = data.docs ?? [];

  return docs.map((doc) => ({
    key: doc.key,
    title: doc.title,
    author: doc.author_name?.[0] ?? 'Autor desconocido',
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    genre: inferGenreFromSubjects(doc.subject),
    firstPublishYear: doc.first_publish_year,
  }));
}
