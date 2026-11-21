import { create } from 'zustand';
import type { AtmosphereId } from '@/domain/models';

const STORAGE_KEY = 'booktime:atmosphere';

const VALID_ATMOSPHERES = new Set<AtmosphereId>([
  'editorial',
  'editorial-dark',
  'fantasia',
  'scifi',
  'misterio',
  'terror',
]);

function readInitialAtmosphere(): AtmosphereId {
  if (typeof window === 'undefined') return 'editorial';
  const stored = window.localStorage.getItem(STORAGE_KEY) as AtmosphereId | null;
  if (stored && VALID_ATMOSPHERES.has(stored)) return stored;
  return 'editorial';
}

export function applyAtmosphereToDocument(atmosphere: AtmosphereId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.atmosphere = atmosphere;
}

interface AtmosphereState {
  atmosphere: AtmosphereId;
  setAtmosphere: (atmosphere: AtmosphereId) => void;
}

export const useAtmosphereStore = create<AtmosphereState>((set) => ({
  atmosphere: readInitialAtmosphere(),
  setAtmosphere: (atmosphere) => {
    applyAtmosphereToDocument(atmosphere);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, atmosphere);
    }
    set({ atmosphere });
  },
}));
