import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Award, Check, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Habit, Progress } from '../../types';
import { db } from '../../lib/db';
import { completedDays, milestoneLevels, claimMilestones } from './milestones';
import { t } from '../../lib/i18n';
import { useToday } from '../../app/use-today';
import { useAppStore } from '../../stores/app';
export function HabitMilestones({ habit, progress }: { habit: Habit; progress: Progress[] }) {
  const today = useToday();
  const count = completedDays(habit, progress, today);
  const goal = habit.goalDays || 7;
  const notify = useAppStore((s) => s.notify);
  return (
    <section className="panel milestone-panel">
      <div className="section-title">
        <h2>{t('Your milestones')}</h2>
        <Trophy size={22} />
      </div>
      <label className="goal-picker">
        <span>{t('Completed-day goal')}</span>
        <select
          value={goal}
          onChange={(e) =>
            void db.habits
              .update(habit.id, { goalDays: Number(e.target.value) as 7 | 30 | 100 })
              .catch(() => notify(t('Could not save. Please try again.')))
          }
        >
          {milestoneLevels.map((level) => (
            <option key={level} value={level}>
              {t('{count} days', { count: level })}
            </option>
          ))}
        </select>
      </label>
      <div className="goal-progress">
        <strong>{count}</strong>
        <span>{t('completed days')}</span>
        {count >= goal && (
          <span className="goal-achieved">
            <Check size={14} />
            {t('Goal reached')}
          </span>
        )}
      </div>
      <div className="progress-track">
        <span style={{ width: `${Math.min(100, (count / goal) * 100)}%` }} />
      </div>
      <p className="muted">{t('{done} of {goal} completed days', { done: count, goal })}</p>
      <div className="milestone-badges">
        {milestoneLevels.map((level) => (
          <div className={count >= level ? 'unlocked' : 'locked'} key={level}>
            <Award size={28} />
            <strong>{t('{count} days', { count: level })}</strong>
            <small>{t(count >= level ? 'Unlocked' : 'Keep growing')}</small>
          </div>
        ))}
      </div>
      <p className="muted review-note">
        {t('Completed days are cumulative, not consecutive. Missed days do not reset your goal.')}
      </p>
    </section>
  );
}
export function MilestoneCelebration() {
  const data = useLiveQuery(() => Promise.all([db.habits.toArray(), db.progress.toArray()]), []);
  const today = useToday();
  const mounted = useRef(false);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof claimMilestones>>>([]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    void claimMilestones(today)
      .then((items) => {
        if (mounted.current && items.length) setQueue((previous) => [...previous, ...items]);
      })
      .catch(() => {
        /* A later progress update retries without blocking the app. */
      });
  }, [data, today]);
  const first = queue[0];
  useEffect(() => {
    if (!first) return;
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), 7000);
    return () => clearTimeout(timer);
  }, [first]);
  if (!first) return null;
  return (
    <aside className="milestone-celebration" role="status">
      <div className="celebration-sparkles" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <Trophy size={35} />
      <div>
        <strong>{t('{count}-day milestone!', { count: first.level })}</strong>
        <p>{first.name}</p>
        <Link to={`/habits/${first.habitId}`} onClick={() => setQueue((items) => items.slice(1))}>
          {t('Celebrate your progress')} →
        </Link>
      </div>
      <button
        aria-label={t('Dismiss notification')}
        onClick={() => setQueue((items) => items.slice(1))}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
