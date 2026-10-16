import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import type { Habit, Progress } from '../../types';
import { weeklyComparison } from './weekly';
import { dayDate } from '../../lib/db';
import { t, locale } from '../../lib/i18n';
import { useToday } from '../../app/use-today';
export function WeeklyReview({ habits, progress }: { habits: Habit[]; progress: Progress[] }) {
  const [fullWeek, setFullWeek] = useState(false);
  const today = useToday();
  const { current, previous, change } = weeklyComparison(habits, progress, today, fullWeek);
  const format = (date: string) =>
    dayDate(date).toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
  const rate = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);
  const Trend = change === null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const best = current.habits.find((row) => row.completed > 0);
  return (
    <section className="panel weekly-review">
      <div className="section-title">
        <h2>{t('Weekly review')}</h2>
        <Award size={22} />
      </div>
      <div className="status-tabs review-tabs">
        <button
          className={!fullWeek ? 'active' : ''}
          aria-pressed={!fullWeek}
          onClick={() => setFullWeek(false)}
        >
          {t('Week to date')}
        </button>
        <button
          className={fullWeek ? 'active' : ''}
          aria-pressed={fullWeek}
          onClick={() => setFullWeek(true)}
        >
          {t('Last full week')}
        </button>
      </div>
      <p className="muted review-note">
        {fullWeek
          ? t('Two complete Monday–Sunday weeks.')
          : t('Same weekdays compared, so an unfinished week stays fair.')}
      </p>
      <div className="week-comparison">
        <div>
          <span>{t(fullWeek ? 'Last full week' : 'This week')}</span>
          <small>
            {format(current.start)} – {format(current.end)}
          </small>
          <strong>{rate(current.rate)}</strong>
          <p>
            {t('{done} of {total} completed', {
              done: current.completed,
              total: current.scheduled,
            })}
          </p>
        </div>
        <div>
          <span>{t('Previous week')}</span>
          <small>
            {format(previous.start)} – {format(previous.end)}
          </small>
          <strong>{rate(previous.rate)}</strong>
          <p>
            {t('{done} of {total} completed', {
              done: previous.completed,
              total: previous.scheduled,
            })}
          </p>
        </div>
      </div>
      <p className={`review-trend ${change !== null && change > 0 ? 'up' : ''}`}>
        <Trend size={17} />
        {change === null
          ? t('A comparison appears once both weeks have scheduled habits.')
          : change === 0
            ? t('Holding steady. Keep showing up.')
            : t('{change} percentage points vs previous week', {
                change: change > 0 ? `+${change}` : change,
              })}
      </p>
      <div className="review-chart" aria-label={t('Daily completion comparison')}>
        {current.days.map((day, index) => (
          <div className="review-day" key={day.date}>
            <div className="paired-bars">
              <i
                className="previous"
                title={`${format(previous.days[index].date)}: ${rate(previous.days[index].rate)}`}
                style={{ height: `${Math.max(previous.days[index].rate ?? 0, 2)}%` }}
              />
              <i
                className="current"
                title={`${format(day.date)}: ${rate(day.rate)}`}
                style={{ height: `${Math.max(day.rate ?? 0, 2)}%` }}
              />
            </div>
            <span>{dayDate(day.date).toLocaleDateString(locale(), { weekday: 'short' })}</span>
          </div>
        ))}
      </div>
      <div className="review-legend">
        <span>
          <i />
          {t(fullWeek ? 'Last full week' : 'This week')}
        </span>
        <span>
          <i className="previous" />
          {t('Previous week')}
        </span>
      </div>
      {best ? (
        <Link className="weekly-best" to={`/habits/${best.habit.id}`}>
          <Award size={20} />
          <div>
            <small>{t('Most consistent habit')}</small>
            <strong>{best.habit.name}</strong>
          </div>
          <span>{Math.round((best.completed / best.scheduled) * 100)}%</span>
        </Link>
      ) : (
        <p className="muted review-note">
          {t('Your first completed habit will start this week’s story.')}
        </p>
      )}
      <p className="muted review-note">
        {t(
          'Completion means reaching the full target. Calculated from your current schedules, pause history and saved progress.',
        )}
      </p>
    </section>
  );
}
