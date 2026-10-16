import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  BookOpen,
  Footprints,
  Dumbbell,
  Timer,
  Play,
  Pause,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { db, scheduled, localDate, dayDate } from '../../lib/db';
import { t, locale } from '../../lib/i18n';
import { useAppStore } from '../../stores/app';
import { Button } from '../../components/ui/button';
import { useSession, useClock, clock } from '../habits/focus-timer';
import { startFocus, pauseFocus, resumeFocus, cancelFocus, remaining } from '../habits/focus';
const activities: { key: string; icon: LucideIcon; description: string }[] = [
  { key: 'Reading', icon: BookOpen, description: 'Make time for a good book.' },
  { key: 'Walking', icon: Footprints, description: 'A little movement, a clearer mind.' },
  { key: 'Exercise', icon: Dumbbell, description: 'Show up for your body.' },
  { key: 'Custom session', icon: Timer, description: 'A little time for what matters.' },
];
interface FinishedSession {
  id: string;
  habitId: string;
  name: string;
  custom?: boolean;
  minutes: number;
  date: string;
  completedAt: string;
}
export function FocusScreen() {
  const session = useSession();
  const now = useClock(session?.status === 'running');
  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const available = habits.filter((h) => h.tracking === 'duration' && scheduled(h, localDate()));
  const [activity, setActivity] = useState('Reading');
  const [minutes, setMinutes] = useState(30);
  const [habitId, setHabitId] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const notify = useAppStore((s) => s.notify);
  const history =
    useLiveQuery(async () => {
      const rows = await db.meta.where(':id').startsWith('focus:session:').toArray();
      return rows
        .flatMap((row) => {
          try {
            if (typeof row.value !== 'string') return [];
            const item = JSON.parse(row.value) as FinishedSession;
            return typeof item.id === 'string' &&
              typeof item.name === 'string' &&
              typeof item.completedAt === 'string' &&
              Number.isFinite(item.minutes)
              ? [item]
              : [];
          } catch {
            return [];
          }
        })
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 5);
    }, []) || [];
  const linked = habits.find((h) => h.id === session?.habitId);
  const name = session
    ? linked?.name || session.label || t(session.activity || 'Focus session')
    : t(activity);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify(t(error instanceof Error ? error.message : 'Timer could not be saved. Try again.'));
    } finally {
      setBusy(false);
    }
  }
  const selectedActivity = activities.find((a) => a.key === activity)!;
  return (
    <>
      <Link className="back" to="/">
        <ArrowLeft size={18} />
        {t('Home')}
      </Link>
      <header className="page-header">
        <div>
          <div className="eyebrow">{t('A LITTLE TIME, JUST FOR YOU')}</div>
          <h1>{t('Focus time')}</h1>
          <p>{t('Read, walk, move. One moment at a time.')}</p>
        </div>
        <span className="avatar">
          <Timer size={26} />
        </span>
      </header>
      {!session && (
        <div className="activity-grid">
          {activities.map(({ key, icon: Icon }) => (
            <button
              className={key === activity ? 'selected' : ''}
              key={key}
              aria-pressed={key === activity}
              onClick={() => setActivity(key)}
            >
              <Icon size={24} />
              <strong>{t(key)}</strong>
            </button>
          ))}
        </div>
      )}
      <section className="panel standalone-timer">
        <span className="timer-eyebrow">{name}</span>
        <div
          className="timer-dial"
          style={
            {
              '--timer-progress': `${session ? Math.min(100, Math.max(0, 1 - remaining(session, now) / (session.minutes * 60000)) * 100) : 0}%`,
            } as React.CSSProperties
          }
        >
          <div>
            <span className="timer-digits" aria-live="off">
              {clock(session ? remaining(session, now) : Math.max(0, minutes || 0) * 60000)}
            </span>
            <small>
              {t(
                session?.status === 'paused'
                  ? 'Paused'
                  : session
                    ? 'Stay with this moment'
                    : 'Ready when you are',
              )}
            </small>
          </div>
        </div>
        {session ? (
          <>
            <p className="muted">
              {session.habitId
                ? t('Minutes will be added to your linked habit.')
                : t('Timer only. Your habits will not be changed.')}
            </p>
            <p className="muted">
              {t('Recorded for {date}', {
                date: dayDate(session.date).toLocaleDateString(locale()),
              })}
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
                {session.status === 'running' ? <Pause size={17} /> : <Play size={17} />}{' '}
                {t(session.status === 'running' ? 'Pause' : 'Resume')}
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
        ) : (
          <>
            <p className="muted">{t(selectedActivity.description)}</p>
            <div className="minute-presets">
              {[15, 25, 30, 45, 60].map((value) => (
                <button
                  key={value}
                  className={minutes === value ? 'selected' : ''}
                  aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}
                >
                  {value}
                  <small>{t('minutes')}</small>
                </button>
              ))}
            </div>
            <div className="timer-fields">
              <label>
                {t('Custom minutes')}
                <input
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>
              {activity === 'Custom session' && (
                <label>
                  {t('Session name')}
                  <input
                    value={label}
                    maxLength={100}
                    placeholder={t('e.g. Study, stretch, meditate')}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </label>
              )}
              <label>
                {t('Link to a habit (optional)')}
                <select value={habitId} onChange={(e) => setHabitId(e.target.value)}>
                  <option value="">{t('Timer only — no habit')}</option>
                  {available.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              className="start-timer"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  startFocus(
                    habitId,
                    minutes,
                    activity,
                    activity === 'Custom session' ? label : '',
                  ),
                )
              }
            >
              <Play size={18} />
              {t('Start focus')}
            </Button>
          </>
        )}
        <p className="muted timer-footnote">
          {t('If you leave the app, completion is saved when you return.')}
        </p>
      </section>
      {history.length > 0 && (
        <section className="panel session-history">
          <h2>{t('Recent sessions')}</h2>
          {history.map((item) => (
            <div className="session-history-row" key={item.id}>
              <span className="session-check">
                <Check size={17} />
              </span>
              <div>
                <strong>{item.habitId || item.custom ? item.name : t(item.name)}</strong>
                <small>
                  {new Date(item.completedAt).toLocaleDateString(locale(), {
                    month: 'short',
                    day: 'numeric',
                  })}
                </small>
              </div>
              <span>
                {item.minutes} {t('minutes')}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
