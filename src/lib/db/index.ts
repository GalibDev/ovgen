import Dexie from 'dexie';
import type { Habit, Progress } from '../../types';
class OvgenDB extends Dexie {
  get habits() {
    return this.table<Habit, string>('habits');
  }
  get progress() {
    return this.table<Progress, string>('progress');
  }
  get meta() {
    return this.table<{ key: string; value: boolean | string }, string>('meta');
  }
  constructor(create = false) {
    super('ovgen', { autoOpen: false });
    // Existing installations are opened at their installed schema version.
    // Reminder receipts use the existing metadata store, avoiding upgrade locks.
    if (create)
      this.version(1).stores({
        habits: 'id,category,createdAt',
        progress: 'key,habitId,date,[habitId+date]',
        meta: 'key',
      });
  }
}
export let db = new OvgenDB();
let opening: Promise<void> | undefined;
export function openDatabase() {
  if (!opening)
    opening = (async () => {
      try {
        await db.open();
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'NoSuchDatabaseError') throw error;
        db.close();
        db = new OvgenDB(true);
        await db.open();
      }
    })().catch((error) => {
      opening = undefined;
      throw error;
    });
  return opening;
}
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayDate = (d: string) => new Date(`${d}T12:00:00`);
export const scheduled = (h: Habit, d: string) =>
  h.createdAt.slice(0, 10) <= d &&
  h.weekdays.includes(dayDate(d).getDay()) &&
  !(h.inactivePeriods || []).some(
    (period) => d >= period.from && (!period.until || d < period.until),
  ) &&
  !((h.archived || h.paused) && !h.inactivePeriods?.length && d >= localDate());
export const percent = (h: Habit, p?: Progress) =>
  Math.round(
    Math.min(
      100,
      Math.max(
        0,
        h.tracking === 'boolean'
          ? p?.value
            ? 100
            : 0
          : h.tracking === 'steps'
            ? h.steps.length
              ? (h.steps.filter((s) => p?.steps.includes(s.id)).length / h.steps.length) * 100
              : 0
            : h.target > 0
              ? ((p?.value || 0) / h.target) * 100
              : 0,
      ),
    ),
  );
export async function updateProgress(h: Habit, date: string, fn: (p: Progress) => Progress) {
  await db.transaction('rw', db.progress, async () => {
    const key = `${h.id}:${date}`;
    const p = (await db.progress.get(key)) || { key, habitId: h.id, date, value: 0, steps: [] };
    await db.progress.put(fn(p));
  });
}
export const changeValue = (h: Habit, d: string, delta: number) =>
  updateProgress(h, d, (p) => ({ ...p, value: Math.max(0, p.value + delta) }));
export const toggleStep = (h: Habit, d: string, id: string) =>
  updateProgress(h, d, (p) => ({
    ...p,
    steps: p.steps.includes(id) ? p.steps.filter((s) => s !== id) : [...p.steps, id],
  }));
export async function deleteHabit(id: string) {
  await db.transaction('rw', db.habits, db.progress, db.meta, async () => {
    await db.progress.where('habitId').equals(id).delete();
    await db.meta
      .where(':id')
      .startsWith('reminder:' + id + ':')
      .delete();
    const timer = await db.meta.get('focus:active');
    if (typeof timer?.value === 'string') {
      try {
        if (JSON.parse(timer.value).habitId === id) await db.meta.delete('focus:active');
      } catch {}
    }
    await db.habits.delete(id);
  });
}
export async function seed() {
  await openDatabase();
  if (await db.meta.get('seeded')) return;
  await db.transaction('rw', db.habits, db.meta, async () => {
    if (await db.meta.get('seeded')) return;
    if ((await db.habits.count()) === 0) {
      const defaults = [
        ['Daily Salah', 'Faith', 'Moon', '#8B5CF6', 'steps', 5, 'prayers'],
        ['Read books', 'Learning', 'BookOpen', '#22A77B', 'count', 20, 'pages'],
        ['Drink water', 'Health', 'Droplets', '#4399E8', 'count', 8, 'glasses'],
        ['Exercise', 'Health', 'Dumbbell', '#F68B38', 'duration', 30, 'minutes'],
      ] as const;
      await db.habits.bulkAdd(
        defaults.map(([name, category, icon, color, tracking, target, unit]) => ({
          id: crypto.randomUUID(),
          name,
          description: '',
          category,
          icon,
          color,
          tracking,
          target,
          unit,
          steps:
            tracking === 'steps'
              ? ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((name) => ({
                  id: crypto.randomUUID(),
                  name,
                }))
              : [],
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          createdAt: localDate() + 'T00:00:00',
          archived: false,
        })),
      );
    }
    await db.meta.put({ key: 'seeded', value: true });
  });
}
