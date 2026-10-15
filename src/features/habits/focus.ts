import { db, localDate, scheduled } from '../../lib/db';
export interface FocusSession {
  id: string;
  habitId: string;
  date: string;
  minutes: number;
  remainingMs: number;
  endAt: number;
  status: 'running' | 'paused';
}
export function parseSession(value: unknown): FocusSession | undefined {
  if (typeof value !== 'string') return;
  try {
    const s = JSON.parse(value);
    if (
      typeof s.id === 'string' &&
      typeof s.habitId === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
      Number.isFinite(s.minutes) &&
      s.minutes > 0 &&
      s.minutes <= 1440 &&
      Number.isFinite(s.endAt) &&
      Number.isFinite(s.remainingMs) &&
      s.remainingMs >= 0 &&
      ['running', 'paused'].includes(s.status)
    )
      return s;
  } catch {}
}
export const remaining = (s: FocusSession, now = Date.now()) =>
  s.status === 'running' ? Math.max(0, s.endAt - now) : s.remainingMs;
export async function startFocus(habitId: string, minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)
    throw Error('Choose between 1 and 1440 minutes.');
  await db.transaction('rw', db.habits, db.meta, async () => {
    if (parseSession((await db.meta.get('focus:active'))?.value))
      throw Error('Finish or cancel your current focus session first.');
    const h = await db.habits.get(habitId);
    if (!h || h.tracking !== 'duration' || h.paused || h.archived || !scheduled(h, localDate()))
      throw Error('Choose an active duration habit scheduled for today.');
    const duration = minutes * 60000;
    const session: FocusSession = {
      id: crypto.randomUUID(),
      habitId,
      date: localDate(),
      minutes,
      remainingMs: duration,
      endAt: Date.now() + duration,
      status: 'running',
    };
    await db.meta.put({ key: 'focus:active', value: JSON.stringify(session) });
  });
}
export async function finishFocus(now = Date.now()) {
  return db.transaction('rw', db.habits, db.progress, db.meta, async () => {
    const s = parseSession((await db.meta.get('focus:active'))?.value);
    if (!s || s.status !== 'running' || remaining(s, now) > 0) return;
    const h = await db.habits.get(s.habitId);
    if (!h || h.tracking !== 'duration' || h.paused || h.archived) {
      await db.meta.delete('focus:active');
      return;
    }
    const receipt = `focus:credited:${s.id}`;
    if (!(await db.meta.get(receipt))) {
      const key = `${s.habitId}:${s.date}`;
      const p = (await db.progress.get(key)) || {
        key,
        habitId: s.habitId,
        date: s.date,
        value: 0,
        steps: [],
      };
      await db.progress.put({ ...p, value: p.value + s.minutes });
      await db.meta.put({ key: receipt, value: s.date });
    }
    await db.meta.delete('focus:active');
    return { name: h.name, minutes: s.minutes, date: s.date };
  });
}
export async function pauseFocus(expectedId: string) {
  await finishFocus();
  await db.transaction('rw', db.meta, async () => {
    const s = parseSession((await db.meta.get('focus:active'))?.value);
    if (!s || s.id !== expectedId || s.status !== 'running') return;
    await db.meta.put({
      key: 'focus:active',
      value: JSON.stringify({ ...s, remainingMs: remaining(s), status: 'paused' }),
    });
  });
}
export async function resumeFocus(expectedId: string) {
  await db.transaction('rw', db.meta, db.habits, async () => {
    const s = parseSession((await db.meta.get('focus:active'))?.value);
    if (!s || s.id !== expectedId || s.status !== 'paused') return;
    const h = await db.habits.get(s.habitId);
    if (!h || h.paused || h.archived || h.tracking !== 'duration')
      throw Error('This habit is no longer active. Cancel this session.');
    await db.meta.put({
      key: 'focus:active',
      value: JSON.stringify({ ...s, endAt: Date.now() + s.remainingMs, status: 'running' }),
    });
  });
}
export async function cancelFocus(expectedId: string) {
  await finishFocus();
  await db.transaction('rw', db.meta, async () => {
    const session = parseSession((await db.meta.get('focus:active'))?.value);
    if (session?.id === expectedId) await db.meta.delete('focus:active');
  });
}
