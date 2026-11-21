import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SOUND_ENABLED,
  playCompletionChime,
  readSoundPreference,
  unlockAudioContext,
} from './soundAlert';

describe('soundAlert', () => {
  it('defaults to enabled when storage is unavailable', () => {
    expect(DEFAULT_SOUND_ENABLED).toBe(true);
    expect(readSoundPreference()).toBe(true);
  });

  it('degrades gracefully without throwing when Web Audio API is unavailable', () => {
    expect(() => unlockAudioContext()).not.toThrow();
    expect(() => playCompletionChime()).not.toThrow();
  });
});
