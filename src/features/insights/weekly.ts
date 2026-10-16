import type { Habit, Progress } from '../../types';
import { dayDate, localDate, scheduled } from '../../lib/db';
import { isComplete, shiftDate } from '../../lib/stats';
export function monday(date: string) {
  return shiftDate(date, -((dayDate(date).getDay() + 6) % 7));
}
export function summarizeWeek(habits: Habit[], progress: Progress[], start: string, end: string) {
  const records = new Map(progress.map((p) => [`${p.habitId}:${p.date}`, p]));
  const days = [];
  const byHabit = new Map<string, { habit: Habit; scheduled: number; completed: number }>();
  let totalScheduled = 0,
    totalCompleted = 0;
  for (let date = start; date <= end; date = shiftDate(date, 1)) {
    let scheduledCount = 0,
      completedCount = 0;
    for (const habit of habits) {
      if (!scheduled(habit, date)) continue;
      scheduledCount++;
      const done = isComplete(habit, records.get(`${habit.id}:${date}`));
      if (done) completedCount++;
      const row = byHabit.get(habit.id) || { habit, scheduled: 0, completed: 0 };
      row.scheduled++;
      if (done) row.completed++;
      byHabit.set(habit.id, row);
    }
    days.push({
      date,
      scheduled: scheduledCount,
      completed: completedCount,
      rate: scheduledCount ? (completedCount / scheduledCount) * 100 : null,
    });
    totalScheduled += scheduledCount;
    totalCompleted += completedCount;
  }
  return {
    start,
    end,
    scheduled: totalScheduled,
    completed: totalCompleted,
    rate: totalScheduled ? (totalCompleted / totalScheduled) * 100 : null,
    days,
    habits: [...byHabit.values()].sort(
      (a, b) =>
        b.completed / b.scheduled - a.completed / a.scheduled ||
        b.completed - a.completed ||
        a.habit.name.localeCompare(b.habit.name),
    ),
  };
}
export function weeklyComparison(
  habits: Habit[],
  progress: Progress[],
  today = localDate(),
  fullWeek = false,
) {
  const currentMonday = monday(today);
  const start = fullWeek ? shiftDate(currentMonday, -7) : currentMonday;
  const end = fullWeek ? shiftDate(currentMonday, -1) : today;
  const current = summarizeWeek(habits, progress, start, end);
  const previous = summarizeWeek(habits, progress, shiftDate(start, -7), shiftDate(end, -7));
  const change =
    current.rate === null || previous.rate === null
      ? null
      : Math.round(current.rate - previous.rate);
  return { current, previous, change };
}
