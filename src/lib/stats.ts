import { dayDate, localDate, percent, scheduled } from './db';
import type { Habit, Progress } from '../types';
export const isComplete = (h: Habit, p?: Progress) =>
  h.tracking === 'boolean'
    ? !!p?.value
    : h.tracking === 'steps'
      ? h.steps.length > 0 && h.steps.every((s) => p?.steps.includes(s.id))
      : h.target > 0 && (p?.value || 0) >= h.target;
export const shiftDate = (date: string, days: number) => {
  const d = dayDate(date);
  d.setDate(d.getDate() + days);
  return localDate(d);
};
export function dailyScore(habits: Habit[], records: Map<string, Progress>, date: string) {
  const active = habits.filter((h) => scheduled(h, date));
  const complete = active.filter((h) => isComplete(h, records.get(`${h.id}:${date}`))).length;
  return {
    scheduled: active.length,
    complete,
    ratio: active.length
      ? active.reduce((sum, h) => sum + percent(h, records.get(`${h.id}:${date}`)), 0) /
        active.length /
        100
      : 0,
  };
}
export function streaks(habits: Habit[], progress: Progress[], today = localDate()) {
  const records = new Map(progress.map((p) => [`${p.habitId}:${p.date}`, p]));
  const start = habits.reduce(
    (min, h) => (h.createdAt.slice(0, 10) < min ? h.createdAt.slice(0, 10) : min),
    today,
  );
  let current = 0,
    best = 0;
  for (let date = start; date <= today; date = shiftDate(date, 1)) {
    const score = dailyScore(habits, records, date);
    if (!score.scheduled) continue;
    if (score.complete === score.scheduled) {
      current++;
      best = Math.max(best, current);
    } else if (date !== today) {
      current = 0;
    }
  }
  return { current, best, records, start };
}
