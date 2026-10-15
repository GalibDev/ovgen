import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const usePreferences = create<{
  colorDepth: number;
  habitOrder: string[];
  setColorDepth: (value: number) => void;
  setHabitOrder: (ids: string[]) => void;
}>()(
  persist(
    (set) => ({
      colorDepth: 50,
      habitOrder: [],
      setColorDepth: (value) => set({ colorDepth: Math.max(0, Math.min(100, value)) }),
      setHabitOrder: (habitOrder) => set({ habitOrder }),
    }),
    { name: 'ovgen-preferences', version: 1 },
  ),
);
