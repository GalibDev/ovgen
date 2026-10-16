import type { Habit, Progress } from '../../types';
import { db, localDate } from '../../lib/db';
import { isComplete } from '../../lib/stats';
export const milestoneLevels = [7, 30, 100] as const;
export function completedDays(habit: Habit, progress: Progress[], today = localDate()) {
  return new Set(
    progress
      .filter(
        (p) =>
          p.habitId === habit.id &&
          p.date >= habit.createdAt.slice(0, 10) &&
          p.date <= today &&
          isComplete(habit, p),
      )
      .map((p) => p.date),
  ).size;
}
export async function claimMilestones(today = localDate()) {
  return db.transaction('rw', db.habits, db.progress, db.meta, async () => {
    const habits = await db.habits.toArray();
    const progress = await db.progress.toArray();
    const celebrations: { habitId: string; name: string; level: number }[] = [];
    for (const habit of habits) {
      const count = completedDays(habit, progress, today);
      const reached = milestoneLevels.filter((level) => count >= level);
      if (!reached.length) continue;
      const receipts = await db.meta.bulkGet(
        reached.map((level) => `milestone:${habit.id}:${level}`),
      );
      const newLevels = reached.filter((_, i) => !receipts[i]);
      if (!newLevels.length) continue;
      await db.meta.bulkPut(
        newLevels.map((level) => ({ key: `milestone:${habit.id}:${level}`, value: today })),
      );
      celebrations.push({ habitId: habit.id, name: habit.name, level: Math.max(...newLevels) });
    }
    return celebrations;
  });
}
