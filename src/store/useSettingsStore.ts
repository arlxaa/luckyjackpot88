import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  volume: number; // 0..1
  muted: boolean;
  musicOn: boolean;
  reduceMotion: boolean;
  quality: 'low' | 'medium' | 'high';
  soundEnabled: boolean; // "tap to enable" gate
  set: (p: Partial<SettingsState>) => void;
  enableSound: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      volume: 0.7,
      muted: false,
      musicOn: true,
      reduceMotion: false,
      quality: 'medium',
      soundEnabled: false,
      set: (p) => set(p),
      enableSound: () => set({ soundEnabled: true }),
    }),
    { name: 'lucky-jackpot88-settings' }
  )
);
