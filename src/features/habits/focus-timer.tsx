import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Timer, Play, Pause, X } from 'lucide-react';
import { db, dayDate, localDate, scheduled } from '../../lib/db';
import {
  parseSession,
  remaining,
  startFocus,
  pauseFocus,
  resumeFocus,
  cancelFocus,
  finishFocus,
} from './focus';
import { useAppStore } from '../../stores/app';
import { Button } from '../../components/ui/button';
import { t, locale } from '../../lib/i18n';
import type { Habit } from '../../types';
function useSession() {
  return useLiveQuery(async () => parseSession((await db.meta.get('focus:active'))?.value), []);
}
function useClock(enabled = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    if (!enabled) return;
    const timer = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled]);
  return now;
}
const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
export function useFocusCompletion() {
  const session = useSession();
  const now = useClock(session?.status === 'running');
  const notify = useAppStore((s) => s.notify);
  useEffect(() => {
    if (session?.status !== 'running' || remaining(session, now) > 0) return;
    void finishFocus()
      .then((done) => {
        if (done)
          notify(
            t('{minutes} minutes added to {name}.', { minutes: done.minutes, name: done.name }),
          );
      })
      .catch(() => notify(t('Timer could not be saved. Try again.')));
  }, [session, now, notify]);
  return session;
}
export function FocusTimer({ habit }: { habit: Habit }) {
  const session = useSession();
  const now = useClock(session?.status === 'running');
  const notify = useAppStore((s) => s.notify);
  const [minutes, setMinutes] = useState(Math.min(Math.max(Math.ceil(habit.target), 1), 25));
  const [busy, setBusy] = useState(false);
  const mine = session?.habitId === habit.id;
  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      notify(t(error instanceof Error ? error.message : t('Timer could not be saved. Try again.')));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel focus-panel">
      <h2>
        <Timer size={21} />
        {t('Focus timer')}
      </h2>
      {mine && session ? (
        <>
          <div className="focus-clock" aria-live="off">
            {clock(remaining(session, now))}
          </div>
          <p className="muted">
            {t('Recorded for {date}', { date: dayDate(session.date).toLocaleDateString(locale()) })}
          </p>
          <div className="focus-actions">
            <Button
              disabled={busy}
              onClick={() =>
                void run(() =>
                  session.status === 'running' ? pauseFocus(session.id) : resumeFocus(session.id),
                )
              }
            >
              {session.status === 'running' ? <Pause size={16} /> : <Play size={16} />}{' '}
              {t(session.status === 'running' ? t('Pause') : t('Resume'))}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (confirm(t('Cancel this session? Unfinished minutes will not be recorded.')))
                  void run(() => cancelFocus(session.id));
              }}
            >
              {t('Cancel session')}
            </Button>
          </div>
        </>
      ) : session ? (
        <Link className="profile-link" to={`/habits/${session.habitId}`}>
          {t('Finish or cancel your current focus session first.')} →
        </Link>
      ) : (
        <>
          <label>
            {t('Session length (minutes)')}
            <input
              type="number"
              min="1"
              max="1440"
              step="1"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <Button
            disabled={busy || habit.archived || habit.paused || !scheduled(habit, localDate())}
            onClick={() => void run(() => startFocus(habit.id, minutes))}
          >
            <Play size={16} />
            {t('Start focus')}
          </Button>
        </>
      )}
      <p className="muted reminder-limit">
        {t('Minutes are added when the full session finishes.')}{' '}
        {t('If you leave the app, completion is saved when you return.')}
      </p>
    </section>
  );
}
export function FocusBar() {
  const session = useSession();
  const now = useClock(session?.status === 'running');
  const habit = useLiveQuery(
    async () => (session ? await db.habits.get(session.habitId) : undefined),
    [session?.habitId],
  );
  const notify = useAppStore((s) => s.notify);
  if (!session || !habit) return null;
  return (
    <aside className="focus-bar">
      <Timer size={21} />
      <Link to={`/habits/${session.habitId}`}>
        <strong>{habit.name}</strong>
        <span>{session.status === 'paused' ? t('Paused') : clock(remaining(session, now))}</span>
      </Link>
      <button
        aria-label={t(session.status === 'running' ? t('Pause') : t('Resume'))}
        onClick={() =>
          void (
            session.status === 'running' ? pauseFocus(session.id) : resumeFocus(session.id)
          ).catch(() => notify(t('Timer could not be saved. Try again.')))
        }
      >
        {session.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button
        aria-label={t('Cancel session')}
        onClick={() => {
          if (confirm(t('Cancel this session? Unfinished minutes will not be recorded.')))
            void cancelFocus(session.id).catch(() =>
              notify(t('Timer could not be saved. Try again.')),
            );
        }}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
