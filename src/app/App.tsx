import { t, locale, useLanguage, LanguageSettings } from '../lib/i18n';
import { Templates } from '../features/habits/templates-page';
import { FocusTimer, FocusBar, useFocusCompletion } from '../features/habits/focus-timer';
import { setHabitStatus } from '../features/habits/status';
import { AppUpdate } from './app-update';
import { HabitCalendar } from '../components/habits/habit-calendar';
import { ReminderSettings, ReminderBanner, useReminders } from './reminders';
import { habitTone } from '../lib/theme';
import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Home,
  ChartNoAxesColumnIncreasing,
  Plus,
  ChartPie,
  UserRound,
  ArrowRight,
  ArrowLeft,
  Search,
  Sprout,
  Check,
  Pencil,
  Trash2,
  CalendarDays,
  ShieldCheck,
  Heart,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { db, seed, localDate, dayDate, scheduled, percent, deleteHabit } from '../lib/db';
import { useAppStore } from '../stores/app';
import { Controls } from '../components/habits/habit-card';
import { HabitIcon } from '../components/habits/habit-icon';
import { Button } from '../components/ui/button';
import { HabitBuilder } from '../features/habits/builder';
import type { Habit, Progress } from '../types';
import { usePreferences } from '../stores/preferences';
import { AppearanceSettings, useColorDepth } from './appearance';
import { SortableHabitList } from '../components/habits/sortable-habit-list';
function useData() {
  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const progress = useLiveQuery(() => db.progress.toArray(), []) || [];
  const order = usePreferences((s) => s.habitOrder);
  const rank = new Map(order.map((id, index) => [id, index]));
  const sorted = [...habits].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
  return { habits: sorted, progress };
}
const displayDate = (date: string) =>
  dayDate(date).toLocaleDateString(locale(), { month: 'long', day: 'numeric', year: 'numeric' });
function DateSelector() {
  const { date, setDate } = useAppStore();
  return (
    <label className="date-select">
      <CalendarDays size={17} />
      <input
        aria-label={t('Select progress date')}
        type="date"
        max={localDate()}
        value={date}
        onChange={(e) => {
          if (e.target.value) setDate(e.target.value);
        }}
      />
    </label>
  );
}
function Summary({
  habits,
  progress,
  date,
  home = false,
}: {
  habits: Habit[];
  progress: Progress[];
  date: string;
  home?: boolean;
}) {
  const active = habits.filter((h) => scheduled(h, date));
  const amounts = active.map((h) =>
    percent(
      h,
      progress.find((p) => p.habitId === h.id && p.date === date),
    ),
  );
  const total = amounts.length
    ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
    : 0;
  const completed = amounts.filter((n) => n === 100).length;
  return (
    <section className="summary">
      <div className="summary-content">
        <span className="eyebrow">
          {home ? t('KEEP YOUR MOMENTUM') : t('SMALL STEPS, EVERY DAY')}
        </span>
        <h2>
          {home
            ? t('A little better, every day.')
            : date === localDate()
              ? t('Today’s consistency')
              : t('Your daily consistency')}
        </h2>
        <p>{t('{done} of {total} habits completed', { done: completed, total: active.length })}</p>
        <div className="summary-progress">
          <div className="progress-track">
            <span style={{ width: `${total}%` }} />
          </div>
          <strong>{total}%</strong>
        </div>
      </div>
      <div className="growth-art" aria-hidden="true">
        <div className="sun-disc">
          <Sprout size={57} strokeWidth={1.5} />
        </div>
        <span className="hill one" />
        <span className="hill two" />
      </div>
    </section>
  );
}
function Empty() {
  return (
    <div className="empty panel">
      <Sprout size={42} />
      <h2>{t('A fresh start awaits')}</h2>
      <p>{t('Plant a small habit. Give yourself room to grow.')}</p>
      <Button asChild>
        <Link to="/habits/new">
          <Plus size={18} />
          {t('Create a habit')}
        </Link>
      </Button>
    </div>
  );
}
function Habits() {
  const { habits, progress } = useData();
  const { date } = useAppStore();
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState<'active' | 'paused' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const categories = Array.from(
    new Set(['All', 'Faith', 'Health', 'Learning', 'Personal', ...habits.map((h) => h.category)]),
  );
  const filtered = habits.filter(
    (h) =>
      (status === 'archived'
        ? h.archived
        : status === 'paused'
          ? !h.archived && h.paused
          : !h.archived && !h.paused) &&
      (category === 'All' || h.category === category) &&
      h.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">{t('YOUR GROWTH SPACE')}</div>
          <h1>{t('My habits')}</h1>
          <p>{t('Tiny actions. Big changes.')}</p>
        </div>
        <Link to="/habits/new" className="add-button" aria-label={t('Add habit')}>
          <Plus size={29} />
        </Link>
      </header>
      <Summary habits={habits} progress={progress} date={date} />
      <div className="habit-toolbar">
        <div className="status-tabs">
          {(['active', 'paused', 'archived'] as const).map((value) => (
            <button
              key={value}
              className={status === value ? 'active' : ''}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {t(
                value === 'active' ? t('Active') : value === 'paused' ? t('Paused') : t('Archived'),
              )}
            </button>
          ))}
        </div>
        <Link to="/habits/templates">
          {t('Habit templates')} <Plus size={15} />
        </Link>
      </div>
      <div className="section-title">
        <h2>
          {t(status === 'archived' ? 'Archived' : status === 'paused' ? 'Paused' : 'All habits')}
          <span className="count">{filtered.length}</span>
        </h2>
        <DateSelector />
      </div>
      <div className="filters">
        {categories.map((c) => (
          <button className={category === c ? 'active' : ''} key={c} onClick={() => setCategory(c)}>
            {t(c)}
          </button>
        ))}
      </div>
      <label className="search">
        <Search size={18} />
        <input
          placeholder={t('Find a habit…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>{t('{count} habits', { count: filtered.length })}</span>
      </label>
      <SortableHabitList habits={filtered} progress={progress} date={date} />
      {!habits.length ? (
        <Empty />
      ) : (
        !filtered.length && (
          <div className="empty">
            <Search size={28} />
            <h2>{t('No habits found')}</h2>
            <p>{t('Try another name or category.')}</p>
          </div>
        )
      )}
      <p className="closing">
        <Sprout size={15} />
        {t('Progress is a practice, not a destination.')}
      </p>
    </>
  );
}
function Dashboard() {
  const { habits, progress } = useData();
  const { date, setDate } = useAppStore();
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? t('Good morning')
      : now.getHours() < 18
        ? t('Good afternoon')
        : t('Good evening');
  const first = dayDate(date);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + i);
    return d;
  });
  const active = habits.filter((h) => scheduled(h, date));
  const total = active.length
    ? Math.round(
        active.reduce(
          (sum, h) =>
            sum +
            percent(
              h,
              progress.find((p) => p.date === date && p.habitId === h.id),
            ),
          0,
        ) / active.length,
      )
    : 0;
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">
            {new Date().toLocaleDateString(locale(), {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1>
            {t(greeting)}
            <span className="greeting-dot">.</span>
          </h1>
          <p>{t('Let’s make today a little meaningful.')}</p>
        </div>
        <Link className="avatar" to="/profile" aria-label={t('Your profile')}>
          <UserRound size={24} />
        </Link>
      </header>
      <div className="week">
        {week.map((d) => (
          <button
            disabled={localDate(d) > localDate()}
            key={localDate(d)}
            className={date === localDate(d) ? 'active' : ''}
            onClick={() => setDate(localDate(d))}
          >
            <span>{d.toLocaleDateString(locale(), { weekday: 'short' })}</span>
            <strong>{d.getDate()}</strong>
            <i className={localDate(d) === localDate() ? 'today' : ''} />
          </button>
        ))}
      </div>
      <Summary habits={habits} progress={progress} date={date} home />
      <div className="momentum panel">
        <div
          className="ring"
          style={
            {
              background: `conic-gradient(#6B58E8 ${total}%,#F0ECFF 0)`,
              '--completion': `${total}%`,
            } as React.CSSProperties
          }
        >
          <span>{total}%</span>
        </div>
        <div>
          <h3>{t('Your daily momentum')}</h3>
          <p>{t('Every small action moves you forward.')}</p>
        </div>
        <Check size={22} />
      </div>
      <div className="section-title">
        <h2>{date === localDate() ? t('Today’s habits') : t('Your habits')}</h2>
        <Link to="/habits">
          {t('View all')}
          <ArrowRight size={17} />
        </Link>
      </div>
      <DateSelector />
      <SortableHabitList habits={active} progress={progress} date={date} />
      {!active.length &&
        (habits.length ? (
          <div className="empty panel">
            <CalendarDays />
            <h2>{t('A little breathing room')}</h2>
            <p>{t('No habits scheduled for this day.')}</p>
            <Link to="/habits">{t('Manage your habits')}</Link>
          </div>
        ) : (
          <Empty />
        ))}
    </>
  );
}
function Details() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { date, notify, setDate } = useAppStore();
  const h = useLiveQuery(() => db.habits.get(id || ''), [id]);
  const history =
    useLiveQuery(
      () =>
        db.progress
          .where('habitId')
          .equals(id || '')
          .toArray(),
      [id],
    ) || [];
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void db.habits.get(id || '').then(() => setLoaded(true));
  }, [id]);
  if (!h)
    return (
      <div className="empty">
        {loaded ? t('Habit not found.') : t('Loading…')}
        <Link to="/habits">{t('Back to habits')}</Link>
      </div>
    );
  const p = history.find((p) => p.date === date);
  const n = percent(h, p);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = dayDate(localDate());
    d.setDate(d.getDate() - i);
    return localDate(d);
  }).filter((d) => d >= h.createdAt.slice(0, 10));
  return (
    <>
      <Link className="back" to="/habits">
        <ArrowLeft size={18} />
        {t('My habits')}
      </Link>
      <header className="page-header">
        <div>
          <div className="eyebrow">
            {t(h.category)} ·{' '}
            {t(
              h.tracking === 'boolean'
                ? 'Check off'
                : h.tracking === 'duration'
                  ? 'Duration'
                  : h.tracking === 'steps'
                    ? 'Steps'
                    : 'Count',
            )}
          </div>
          <h1>{h.name}</h1>
          <p>{h.description || t('One small promise to yourself.')}</p>
        </div>
        <HabitIcon name={h.icon} color={h.color} />
      </header>
      <section className="panel detail-progress">
        <div className="section-title">
          <h2>{displayDate(date)}</h2>
          <DateSelector />
        </div>
        {!scheduled(h, date) && (
          <p className="muted">{t('This habit is not scheduled for this day.')}</p>
        )}
        <strong className="big-percent" style={{ color: habitTone(h.color) }}>
          {n}
          <span>%</span>
        </strong>
        <p>
          {n === 100
            ? t('You showed up. That’s a win.')
            : t('A little progress is still progress.')}
        </p>
        <div className="progress-track">
          <span style={{ width: `${n}%`, background: habitTone(h.color) }} />
        </div>
        <fieldset
          className="tracking-controls"
          disabled={!!(h.paused || h.archived) && date >= localDate()}
        >
          <Controls habit={h} progress={p} date={date} />
        </fieldset>
      </section>
      {h.tracking === 'duration' && <FocusTimer habit={h} />}
      {(h.paused || h.archived) && (
        <section className="panel inactive-notice">
          <strong>{t(h.archived ? t('Archived') : t('Paused'))}</strong>
          <p>{t('History is preserved. Resume whenever you’re ready.')}</p>
          <Button
            onClick={() =>
              void setHabitStatus(h.id, 'active')
                .then(() => notify(t('Habit resumed')))
                .catch(() => notify(t('Could not update habit')))
            }
          >
            {t(h.archived ? t('Restore habit') : t('Resume habit'))}
          </Button>
        </section>
      )}
      <HabitCalendar habits={[h]} progress={history} detail />
      <section className="panel">
        <h2>{t('Your rhythm')}</h2>
        <p className="muted">
          {h.weekdays.length === 7
            ? t('Every day')
            : h.weekdays
                .map((d) =>
                  t(
                    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                      d
                    ],
                  ),
                )
                .join(', ')}
        </p>
        <div className="section-title">
          <h2>{t('Recent history')}</h2>
          <span className="muted">{t('Last 7 days')}</span>
        </div>
        {dates.map((d) => (
          <button className="history-row" key={d} onClick={() => setDate(d)}>
            <span>
              {displayDate(d)}
              <small>{scheduled(h, d) ? t('Scheduled') : t('Not scheduled')}</small>
            </span>
            <strong>
              {percent(
                h,
                history.find((p) => p.date === d),
              )}
              %
            </strong>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>
      <div className="detail-actions">
        {!h.archived && (
          <Button
            variant="outline"
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
            }}
          >
            {t(h.paused ? t('Resume habit') : t('Pause habit'))}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            if (
              !h.archived &&
              !confirm(
                t('Pause or archive this habit? Any active focus timer for it will be cancelled.'),
              )
            )
              return;
            void setHabitStatus(h.id, h.archived ? 'active' : 'archived')
              .then(() => notify(t(h.archived ? t('Habit resumed') : t('Habit archived'))))
              .catch(() => notify(t('Could not update habit')));
          }}
        >
          {t(h.archived ? t('Restore habit') : t('Archive habit'))}
        </Button>
        <Button asChild>
          <Link to={`/habits/${id}/edit`}>
            <Pencil size={17} />
            {t('Edit habit')}
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm(t('Delete {name} and all its history?', { name: h.name })))
              void deleteHabit(h.id)
                .then(() => {
                  notify(t('Habit deleted'));
                  navigate('/habits');
                })
                .catch(() => notify(t('Could not delete habit')));
          }}
        >
          <Trash2 size={17} />
          {t('Delete habit')}
        </Button>
      </div>
    </>
  );
}
function Insights() {
  const { habits, progress } = useData();
  const today = localDate();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = dayDate(today);
    d.setDate(d.getDate() - 6 + i);
    const date = localDate(d);
    const hs = habits.filter((h) => scheduled(h, date));
    return {
      date,
      value: hs.length
        ? Math.round(
            hs.reduce(
              (s, h) =>
                s +
                percent(
                  h,
                  progress.find((p) => p.habitId === h.id && p.date === date),
                ),
              0,
            ) / hs.length,
          )
        : 0,
    };
  });
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">{t('LOOK HOW FAR YOU’VE COME')}</div>
          <h1>{t('Your insights')}</h1>
          <p>{t('Small efforts. A bigger picture.')}</p>
        </div>
        <ChartPie className="header-icon" size={32} />
      </header>
      <div className="stats-grid">
        <div className="panel">
          <Sprout />
          <strong>{habits.filter((h) => !h.archived && !h.paused).length}</strong>
          <p>{t('Growing habits')}</p>
        </div>
        <div className="panel">
          <Check />
          <strong>
            {
              progress.filter((p) => {
                const h = habits.find((h) => h.id === p.habitId);
                return h && percent(h, p) === 100;
              }).length
            }
          </strong>
          <p>{t('Daily wins recorded')}</p>
        </div>
      </div>
      <section className="panel">
        <div className="section-title">
          <h2>{t('This week’s rhythm')}</h2>
          <span className="muted">{t('Daily completion')}</span>
        </div>
        <div className="chart">
          {week.map((d) => (
            <div className="chart-col" key={d.date}>
              <span>{d.value}%</span>
              <div className="bar-space">
                <div style={{ height: `${Math.max(d.value, 2)}%` }} />
              </div>
              <small>{dayDate(d.date).toLocaleDateString(locale(), { weekday: 'short' })}</small>
            </div>
          ))}
        </div>
      </section>
      <HabitCalendar habits={habits} progress={progress} />
      <div className="panel encouragement">
        <Heart size={28} />
        <h2>{t('Consistency grows with you.')}</h2>
        <p>{t('Keep showing up. Your daily actions tell your story.')}</p>
      </div>
    </>
  );
}
function Profile() {
  const { habits } = useData();
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">{t('YOUR PERSONAL CORNER')}</div>
          <h1>{t('My profile')}</h1>
          <p>{t('A little space, just for you.')}</p>
        </div>
        <Link to="/settings" className="add-button" aria-label={t('Settings')}>
          <Settings size={25} />
        </Link>
      </header>
      <Link className="profile-link panel" to="/settings">
        <span className="settings-link-label">
          <Settings size={21} />
          {t('Settings · Appearance')}
        </span>
        <ChevronRight size={19} />
      </Link>
      <section className="panel profile-card">
        <div className="avatar large">
          <UserRound size={35} />
        </div>
        <h2>{t('Your growth journey')}</h2>
        <p>{t('{count} habits. Endless possibilities.', { count: habits.length })}</p>
        <span className="badge">{t('Personal growth explorer')}</span>
      </section>
      <section className="panel">
        <div className="info-row">
          <ShieldCheck />
          <div>
            <h3>{t('Yours, on this device')}</h3>
            <p>{t('Habits and history are saved locally in your browser.')}</p>
          </div>
        </div>
        <div className="info-row">
          <Sprout />
          <div>
            <h3>{t('Made for small beginnings')}</h3>
            <p>Ovgen · Version 0.1 · Phase 1</p>
          </div>
        </div>
      </section>
      <Link className="profile-link panel" to="/habits">
        <span>{t('Keep building your habits')}</span>
        <ArrowRight size={19} />
      </Link>
    </>
  );
}
function Shell() {
  useColorDepth();
  const focusSession = useFocusCompletion();
  const reminders = useReminders();
  const { notice, notify } = useAppStore();
  const location = useLocation();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(''), 4000);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className={focusSession ? 'app-shell has-focus' : 'app-shell'}>
      <AppUpdate />
      <FocusBar />
      <ReminderBanner due={reminders.due} dismiss={reminders.dismiss} />
      <aside className="desktop-brand">
        <Link to="/">
          <Sprout size={28} />
          <span>
            ovgen<span className="brand-dot">.</span>
          </span>
        </Link>
        <p>{t('Your growth space')}</p>
        <div className="sidebar-note">
          <Sprout size={30} />
          <strong>{t('A little, every day.')}</strong>
          <p>{t('Become who you want to be, one habit at a time.')}</p>
        </div>
      </aside>
      <main key={location.pathname}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/habits/new" element={<HabitBuilder />} />
          <Route path="/habits/templates" element={<Templates />} />
          <Route path="/habits/:id" element={<Details />} />
          <Route path="/habits/:id/edit" element={<HabitBuilder />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/settings"
            element={
              <>
                <Link className="back" to="/profile">
                  <ArrowLeft size={18} />
                  {t('Profile')}
                </Link>
                <header className="page-header">
                  <div>
                    <div className="eyebrow">{t('MAKE IT YOURS')}</div>
                    <h1>{t('Settings')}</h1>
                    <p>{t('Your space, your preferences.')}</p>
                  </div>
                </header>
                <LanguageSettings />
                <AppearanceSettings />
                <ReminderSettings />
              </>
            }
          />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>{t('A little off track?')}</h1>
                <Link to="/">{t('Go home')}</Link>
              </div>
            }
          />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {[
          { to: '/', label: 'Home', icon: Home },
          { to: '/habits', label: 'Habits', icon: ChartNoAxesColumnIncreasing },
          { to: '/habits/new', label: 'Add', icon: Plus },
          { to: '/insights', label: 'Insights', icon: ChartPie },
          { to: '/profile', label: 'Profile', icon: UserRound },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/habits'}
            className={({ isActive }) =>
              `${isActive ? 'active ' : ''}${label === 'Add' ? 'nav-add' : ''}`
            }
          >
            <span>
              <Icon size={25} strokeWidth={1.8} />
            </span>
            <small>{t(label)}</small>
          </NavLink>
        ))}
      </nav>
      {notice && (
        <div role="status" className="toast">
          <Check size={17} />
          {notice}
          <button aria-label={t('Dismiss notification')} onClick={() => notify('')}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  useLanguage();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active)
        setError(
          t(
            'Opening your saved habits is taking longer than expected. Close other Ovgen tabs, then retry. Your data has not been deleted.',
          ),
        );
    }, 12000);
    seed()
      .then(() => {
        if (active) {
          clearTimeout(timer);
          setError('');
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          clearTimeout(timer);
          setError(
            t(
              'Your browser could not open local storage. Please allow site storage and try again. Your saved data has not been reset.',
            ),
          );
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  if (error)
    return (
      <div className="empty">
        <h2>{t('Let’s reopen your growth space')}</h2>
        <p>{error}</p>
        <Button onClick={() => location.reload()}>{t('Try again')}</Button>
      </div>
    );
  if (!ready)
    return (
      <div className="loading">
        <Sprout size={40} />
        <p>{t('Making room for growth…')}</p>
      </div>
    );
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
