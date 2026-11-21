const SOUND_PREF_KEY = 'booktime:soundAlert';
export const DEFAULT_SOUND_ENABLED = true;

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedContext) {
    sharedContext = new AudioCtx();
  }
  return sharedContext;
}

export function readSoundPreference(): boolean {
  if (typeof window === 'undefined') return DEFAULT_SOUND_ENABLED;
  const raw = window.localStorage.getItem(SOUND_PREF_KEY);
  if (raw === null) return DEFAULT_SOUND_ENABLED;
  return raw === 'true';
}

export function saveSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

/**
 * Unlocks Web Audio during a direct user gesture (Start / Resume click)
 * so mobile browsers allow playback when the countdown finishes later.
 */
export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

/**
 * Plays a gentle warm editorial bell chime (C5 -> E5 -> G5) with soft decay.
 * Requires zero external audio files and works 100% offline.
 */
export function playCompletionChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, delay: 0, duration: 1.4, peak: 0.16 }, // C5
    { freq: 659.25, delay: 0.18, duration: 1.5, peak: 0.14 }, // E5
    { freq: 783.99, delay: 0.36, duration: 1.8, peak: 0.12 }, // G5
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, now + note.delay);

    gain.gain.setValueAtTime(0.0001, now + note.delay);
    gain.gain.linearRampToValueAtTime(note.peak, now + note.delay + 0.03);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + note.delay + note.duration,
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.delay);
    osc.stop(now + note.delay + note.duration + 0.05);
  }
}
