import { db, localDate } from '../../lib/db';
import type { Habit } from '../../types';
export const templateDefinitions = [
  {
    key: 'salah',
    name: 'Daily Salah',
    description: 'Make time for your five daily prayers.',
    category: 'Faith',
    icon: 'Moon',
    color: '#8B5CF6',
    tracking: 'steps',
    target: 5,
    unit: 'prayers',
    steps: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
  },
  {
    key: 'study',
    name: 'Study session',
    description: 'A little focused learning, every day.',
    category: 'Learning',
    icon: 'GraduationCap',
    color: '#22A77B',
    tracking: 'duration',
    target: 60,
    unit: 'minutes',
    steps: [],
  },
  {
    key: 'water',
    name: 'Drink water',
    description: 'Stay refreshed throughout your day.',
    category: 'Health',
    icon: 'Droplets',
    color: '#4399E8',
    tracking: 'count',
    target: 8,
    unit: 'glasses',
    steps: [],
  },
  {
    key: 'exercise',
    name: 'Exercise',
    description: 'Move your body and clear your mind.',
    category: 'Health',
    icon: 'Dumbbell',
    color: '#F68B38',
    tracking: 'duration',
    target: 30,
    unit: 'minutes',
    steps: [],
  },
] as const;
export async function createFromTemplate(key: string, translate: (value: string) => string) {
  const source = templateDefinitions.find((t) => t.key === key);
  if (!source) throw Error('Template not found');
  const habit: Habit = {
    id: crypto.randomUUID(),
    name: translate(source.name),
    description: translate(source.description),
    category: source.category,
    icon: source.icon,
    color: source.color,
    tracking: source.tracking,
    target: source.target,
    unit: source.unit,
    steps: source.steps.map((name) => ({ id: crypto.randomUUID(), name: translate(name) })),
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    createdAt: localDate() + 'T' + new Date().toTimeString().slice(0, 8),
    archived: false,
  };
  await db.habits.add(habit);
  return habit;
}
