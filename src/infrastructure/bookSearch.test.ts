import { describe, expect, it } from 'vitest';
import { inferGenreFromSubjects } from './bookSearch';

describe('inferGenreFromSubjects', () => {
  it('maps Open Library subjects to BookTime genres', () => {
    expect(inferGenreFromSubjects(['Epic fantasy', 'Magic'])).toBe('fantasia');
    expect(inferGenreFromSubjects(['Science fiction', 'Space opera'])).toBe('scifi');
    expect(inferGenreFromSubjects(['Detective and mystery stories'])).toBe('misterio');
    expect(inferGenreFromSubjects(['Horror tales', 'Gothic fiction'])).toBe('terror');
    expect(inferGenreFromSubjects(['Historical fiction'])).toBe('historico');
    expect(inferGenreFromSubjects(['Unknown tag'])).toBe('general');
  });
});
