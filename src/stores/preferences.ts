import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const usePreferences = create<{
  colorDepth: number;
  showCalendar: boolean;
  showMomentum: boolean;
  showSalah: boolean;
  setHomeSection: (key: 'showCalendar' | 'showMomentum' | 'showSalah', visible: boolean) => void;
  language: 'en' | 'bn';
  setLanguage: (language: 'en' | 'bn') => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => void;
  browserNotifications: boolean;
  setBrowserNotifications: (enabled: boolean) => void;
  habitOrder: string[];
  setColorDepth: (value: number) => void;
  setHabitOrder: (ids: string[]) => void;
}>()(
  persist(
    (set) => ({
      colorDepth: 50,
      showCalendar: true,
      showMomentum: true,
      showSalah: true,
      setHomeSection: (key, visible) => set({ [key]: visible }),
      language: 'en',
      setLanguage: (language) => set({ language }),
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      remindersEnabled: true,
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
      browserNotifications: false,
      setBrowserNotifications: (browserNotifications) => set({ browserNotifications }),
      habitOrder: [],
      setColorDepth: (value) => set({ colorDepth: Math.max(0, Math.min(100, value)) }),
      setHabitOrder: (habitOrder) => set({ habitOrder }),
    }),
    { name: 'ovgen-preferences', version: 1 },
  ),
);
