import { describe, expect, it } from 'vitest';
import { ATMOSPHERES, genreToAtmosphere } from './models';

describe('genreToAtmosphere', () => {
  it('maps genres with dedicated Stitch themes directly', () => {
    expect(genreToAtmosphere('fantasia')).toBe('fantasia');
    expect(genreToAtmosphere('scifi')).toBe('scifi');
    expect(genreToAtmosphere('misterio')).toBe('misterio');
    expect(genreToAtmosphere('terror')).toBe('terror');
  });

  it('falls back to editorial light or dark for other genres', () => {
    expect(genreToAtmosphere('romance')).toBe('editorial');
    expect(genreToAtmosphere('historico', 'editorial-dark')).toBe('editorial-dark');
    expect(genreToAtmosphere('general')).toBe('editorial');
  });

  it('defines all six visual atmospheres in order', () => {
    expect(ATMOSPHERES.map((a) => a.id)).toEqual([
      'editorial',
      'editorial-dark',
      'fantasia',
      'scifi',
      'misterio',
      'terror',
    ]);
  });
});
