import { finishFocus } from './focus';
import { db, localDate } from '../../lib/db';
export type HabitStatus = 'active' | 'paused' | 'archived';
export async function setHabitStatus(id: string, status: HabitStatus) {
  await finishFocus();
  await db.transaction('rw', db.habits, db.meta, async () => {
    const h = await db.habits.get(id);
    if (!h) throw Error('Habit not found');
    const date = localDate();
    const inactivePeriods = (h.inactivePeriods || []).map((period) =>
      period.until ? period : { ...period, until: date },
    );
    if (status !== 'active') inactivePeriods.push({ from: date, until: undefined });
    await db.habits.update(id, {
      archived: status === 'archived',
      paused: status === 'paused',
      inactivePeriods,
    });
    if (status !== 'active') {
      const timer = await db.meta.get('focus:active');
      if (typeof timer?.value === 'string') {
        try {
          if (JSON.parse(timer.value).habitId === id) await db.meta.delete('focus:active');
        } catch {}
      }
    }
  });
}
