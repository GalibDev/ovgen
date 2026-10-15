export type Tracking = 'boolean' | 'count' | 'steps' | 'duration';
export interface Step { id: string; name: string }
export interface Habit { id: string; name: string; description: string; category: string; icon: string; color: string; tracking: Tracking; target: number; unit: string; steps: Step[]; weekdays: number[]; createdAt: string; archived: boolean }
export interface Progress { key: string; habitId: string; date: string; value: number; steps: string[] }
