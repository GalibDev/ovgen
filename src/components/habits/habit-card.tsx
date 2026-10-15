import { t } from '../../lib/i18n';
import { setHabitStatus } from '../../features/habits/status';
import { habitTone } from '../../lib/theme';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, Plus, MoreVertical, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import type { Habit, Progress } from '../../types';
import { percent, changeValue, toggleStep, updateProgress, deleteHabit } from '../../lib/db';
import { useAppStore } from '../../stores/app';
import { HabitIcon } from './habit-icon';
export function Controls({
  habit: h,
  progress: p,
  date,
}: {
  habit: Habit;
  progress?: Progress;
  date: string;
}) {
  const notify = useAppStore((s) => s.notify);
  const run = (task: Promise<unknown>) => {
    void task.catch(() => notify(t('Could not save progress. Please try again.')));
  };
  if (h.tracking === 'steps')
    return (
      <div className="steps">
        {h.steps.map((s) => (
          <button
            key={s.id}
            className={p?.steps.includes(s.id) ? 'step checked' : 'step'}
            onClick={() => run(toggleStep(h, date, s.id))}
          >
            <span>{p?.steps.includes(s.id) ? <Check size={13} /> : null}</span>
            {s.name}
          </button>
        ))}
      </div>
    );
  if (h.tracking === 'boolean')
    return (
      <button
        className={p?.value ? 'complete done' : 'complete'}
        onClick={() => run(updateProgress(h, date, (p) => ({ ...p, value: p.value ? 0 : 1 })))}
      >
        <Check size={16} />
        {p?.value ? t('Completed · undo') : t('Mark complete')}
      </button>
    );
  return (
    <div className="counter">
      <button
        aria-label={t('Decrease {name}', { name: h.name })}
        disabled={!p?.value}
        onClick={() => run(changeValue(h, date, h.tracking === 'duration' ? -5 : -1))}
      >
        <Minus size={16} />
      </button>
      <span>
        {p?.value || 0} / {h.target} {t(h.unit)}
      </span>
      <button
        aria-label={t('Increase {name}', { name: h.name })}
        onClick={() => run(changeValue(h, date, h.tracking === 'duration' ? 5 : 1))}
      >
        <Plus size={16} />
      </button>
      {h.tracking === 'duration' && (
        <label className="manual">
          {t('Minutes')}
          <input
            aria-label={t('Record completed minutes')}
            type="number"
            min="0"
            value={p?.value || 0}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isFinite(value) && value >= 0)
                run(updateProgress(h, date, (p) => ({ ...p, value })));
            }}
          />
        </label>
      )}
    </div>
  );
}
export function HabitCard({
  habit: h,
  progress: p,
  date,
}: {
  habit: Habit;
  progress?: Progress;
  date: string;
}) {
  const [menu, setMenu] = useState(false);
  const notify = useAppStore((s) => s.notify);
  const n = percent(h, p);
  const amount =
    h.tracking === 'steps' ? h.steps.filter((s) => p?.steps.includes(s.id)).length : p?.value || 0;
  return (
    <article
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button,a,input')) e.stopPropagation();
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest('button,a,input')) e.stopPropagation();
      }}
      className="habit-card"
      style={{ '--habit-color': habitTone(h.color) } as React.CSSProperties}
    >
      <HabitIcon name={h.icon} color={h.color} />
      <div className="habit-main">
        <div className="card-top">
          <Link className="habit-title" to={`/habits/${h.id}`}>
            {h.name}
          </Link>
          <span className="percent">{n}%</span>
          <div className="menu-wrap">
            <button
              className="more"
              aria-label={t('Options for {name}', { name: h.name })}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <MoreVertical size={21} />
            </button>
            {menu && (
              <div className="menu">
                <Link to={`/habits/${h.id}`}>
                  <ArrowUpRight size={15} />
                  {t('View details')}
                </Link>
                <Link to={`/habits/${h.id}/edit`}>
                  <Pencil size={15} />
                  {t('Edit habit')}
                </Link>
                {!h.archived && (
                  <button
                    onClick={() => {
                      if (
                        !h.paused &&
                        !confirm(
                          t(
                            'Pause or archive this habit? Any active focus timer for it will be cancelled.',
                          ),
                        )
                      )
                        return;
                      void setHabitStatus(h.id, h.paused ? 'active' : 'paused')
                        .then(() => notify(t(h.paused ? t('Habit resumed') : t('Habit paused'))))
                        .catch(() => notify(t('Could not update habit')));
                      setMenu(false);
                    }}
                  >
                    {t(h.paused ? t('Resume habit') : t('Pause habit'))}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (
                      !h.archived &&
                      !confirm(
                        t(
                          'Pause or archive this habit? Any active focus timer for it will be cancelled.',
                        ),
                      )
                    )
                      return;
                    void setHabitStatus(h.id, h.archived ? 'active' : 'archived')
                      .then(() => notify(t(h.archived ? t('Habit resumed') : t('Habit archived'))))
                      .catch(() => notify(t('Could not update habit')));
                    setMenu(false);
                  }}
                >
                  {t(h.archived ? t('Restore habit') : t('Archive habit'))}
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('Delete {name} and its history?', { name: h.name })))
                      void deleteHabit(h.id)
                        .then(() => notify(t('Habit deleted')))
                        .catch(() => notify(t('Could not delete habit')));
                    setMenu(false);
                  }}
                >
                  <Trash2 size={15} />
                  {t('Delete habit')}
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="habit-sub">
          {h.tracking === 'boolean'
            ? n
              ? t('A little win for today')
              : t('Ready when you are')
            : `${amount} / ${h.tracking === 'steps' ? h.steps.length : h.target} ${t(h.unit)}`}
        </p>
        <div className="progress-track">
          <span style={{ width: `${n}%`, background: habitTone(h.color) }} />
        </div>
        {h.archived || h.paused ? (
          <p className="muted inactive-label">{t(h.archived ? t('Archived') : t('Paused'))}</p>
        ) : (
          <Controls habit={h} progress={p} date={date} />
        )}
      </div>
    </article>
  );
}
