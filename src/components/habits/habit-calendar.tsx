import { t, locale } from '../../lib/i18n';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Habit, Progress } from '../../types';
import { dailyScore, streaks } from '../../lib/stats';
import { dayDate, localDate } from '../../lib/db';
import { useToday } from '../../app/use-today';
import { useAppStore } from '../../stores/app';
export function HabitCalendar({
  habits,
  progress,
  detail = false,
}: {
  habits: Habit[];
  progress: Progress[];
  detail?: boolean;
}) {
  const today = useToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const { current, best, records, start } = streaks(habits, progress, today);
  const setDate = useAppStore((s) => s.setDate);
  const first = dayDate(month + '-01');
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const score = dailyScore(habits, records, selected);
  const changeMonth = (delta: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + delta);
    setMonth(localDate(d).slice(0, 7));
  };
  return (
    <>
      <div className="stats-grid streak-stats">
        <section className="panel">
          <Flame />
          <strong>{current}</strong>
          <p>{t('Current streak')}</p>
        </section>
        <section className="panel">
          <Trophy />
          <strong>{best}</strong>
          <p>{t('Best streak')}</p>
        </section>
      </div>
      <section className="panel calendar-panel">
        <div className="section-title">
          <h2>{t('Consistency calendar')}</h2>
        </div>
        <div className="month-nav">
          <button
            aria-label={t('Previous month')}
            disabled={month <= start.slice(0, 7)}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={19} />
          </button>
          <strong>{first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</strong>
          <button
            aria-label={t('Next month')}
            disabled={month >= today.slice(0, 7)}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="calendar-grid">
          {(locale() === 'bn-BD'
            ? ['সো', 'ম', 'বু', 'বৃ', 'শু', 'শ', 'র']
            : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
          ).map((day, i) => (
            <span className="weekday-label" key={i}>
              {day}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={'blank' + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`;
            const score = dailyScore(habits, records, date);
            const unavailable = date > today || date < start;
            const level =
              unavailable || !score.scheduled
                ? 0
                : score.complete === score.scheduled
                  ? 4
                  : score.ratio > 0.5
                    ? 3
                    : score.ratio > 0
                      ? 2
                      : 1;
            return (
              <button
                key={date}
                disabled={unavailable}
                className={`heat-day level-${level} ${date === selected ? 'selected' : ''} ${date === today ? 'is-today' : ''}`}
                aria-label={t('{date}: {done} of {total} habits complete', {
                  date,
                  done: score.complete,
                  total: score.scheduled,
                })}
                aria-pressed={selected === date}
                title={`${date}: ${score.complete}/${score.scheduled}`}
                onClick={() => {
                  setSelected(date);
                  if (detail) setDate(date);
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="heat-legend">
          <span>{t('Not scheduled')}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={'level-' + level} />
          ))}
          <span>{t('Complete')}</span>
        </div>
        <div className="calendar-selection">
          <strong>
            {dayDate(selected).toLocaleDateString(locale(), { month: 'short', day: 'numeric' })}
          </strong>
          <span>
            {selected < start
              ? t('No habits yet')
              : score.scheduled
                ? t('{done} / {total} completed', { done: score.complete, total: score.scheduled })
                : t('Rest day')}
          </span>
          {!detail && score.scheduled > 0 && (
            <Link to="/habits" onClick={() => setDate(selected)}>
              {t('View day')}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
        <p className="muted calendar-note">
          {t(
            'Streaks count completed scheduled days. Rest days do not break a streak; today stays open until midnight. Based on your current schedule and targets.',
          )}
        </p>
      </section>
    </>
  );
}
