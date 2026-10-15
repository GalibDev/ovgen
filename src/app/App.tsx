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
} from 'lucide-react';
import { db, seed, localDate, dayDate, scheduled, percent, deleteHabit } from '../lib/db';
import { useAppStore } from '../stores/app';
import { HabitCard, Controls } from '../components/habits/habit-card';
import { HabitIcon } from '../components/habits/habit-icon';
import { Button } from '../components/ui/button';
import { HabitBuilder } from '../features/habits/builder';
import type { Habit, Progress } from '../types';
function useData() {
  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const progress = useLiveQuery(() => db.progress.toArray(), []) || [];
  return { habits, progress };
}
const displayDate = (date: string) =>
  dayDate(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
function DateSelector() {
  const { date, setDate } = useAppStore();
  return (
    <label className="date-select">
      <CalendarDays size={17} />
      <input
        aria-label="Select progress date"
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
        <span className="eyebrow">{home ? 'KEEP YOUR MOMENTUM' : 'SMALL STEPS, EVERY DAY'}</span>
        <h2>
          {home
            ? 'A little better, every day.'
            : date === localDate()
              ? 'Today’s consistency'
              : 'Your daily consistency'}
        </h2>
        <p>
          {completed} of {active.length} habits completed
        </p>
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
      <h2>A fresh start awaits</h2>
      <p>Plant a small habit. Give yourself room to grow.</p>
      <Button asChild>
        <Link to="/habits/new">
          <Plus size={18} />
          Create a habit
        </Link>
      </Button>
    </div>
  );
}
function Habits() {
  const { habits, progress } = useData();
  const { date } = useAppStore();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const categories = Array.from(
    new Set(['All', 'Faith', 'Health', 'Learning', 'Personal', ...habits.map((h) => h.category)]),
  );
  const filtered = habits.filter(
    (h) =>
      !h.archived &&
      (category === 'All' || h.category === category) &&
      h.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">YOUR GROWTH SPACE</div>
          <h1>My habits</h1>
          <p>Tiny actions. Big changes.</p>
        </div>
        <Link to="/habits/new" className="add-button" aria-label="Add habit">
          <Plus size={29} />
        </Link>
      </header>
      <Summary habits={habits} progress={progress} date={date} />
      <div className="section-title">
        <h2>
          All habits <span className="count">{habits.filter((h) => !h.archived).length}</span>
        </h2>
        <DateSelector />
      </div>
      <div className="filters">
        {categories.map((c) => (
          <button className={category === c ? 'active' : ''} key={c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <label className="search">
        <Search size={18} />
        <input
          placeholder="Find a habit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>{filtered.length} habits</span>
      </label>
      <div className="habit-list">
        {filtered.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            progress={progress.find((p) => p.habitId === h.id && p.date === date)}
            date={date}
          />
        ))}
      </div>
      {!habits.length ? (
        <Empty />
      ) : (
        !filtered.length && (
          <div className="empty">
            <Search size={28} />
            <h2>No habits found</h2>
            <p>Try another name or category.</p>
          </div>
        )
      )}
      <p className="closing">
        <Sprout size={15} />
        Progress is a practice, not a destination.
      </p>
    </>
  );
}
function Dashboard() {
  const { habits, progress } = useData();
  const { date, setDate } = useAppStore();
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
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
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1>
            {greeting}
            <span className="greeting-dot">.</span>
          </h1>
          <p>Let’s make today a little meaningful.</p>
        </div>
        <Link className="avatar" to="/profile" aria-label="Your profile">
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
            <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            <strong>{d.getDate()}</strong>
            <i className={localDate(d) === localDate() ? 'today' : ''} />
          </button>
        ))}
      </div>
      <Summary habits={habits} progress={progress} date={date} home />
      <div className="momentum panel">
        <div className="ring" style={{ background: `conic-gradient(#6B58E8 ${total}%,#F0ECFF 0)` }}>
          <span>{total}%</span>
        </div>
        <div>
          <h3>Your daily momentum</h3>
          <p>Every small action moves you forward.</p>
        </div>
        <Check size={22} />
      </div>
      <div className="section-title">
        <h2>{date === localDate() ? 'Today’s habits' : 'Your habits'}</h2>
        <Link to="/habits">
          View all <ArrowRight size={17} />
        </Link>
      </div>
      <DateSelector />
      <div className="habit-list">
        {active.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            progress={progress.find((p) => p.habitId === h.id && p.date === date)}
            date={date}
          />
        ))}
      </div>
      {!active.length &&
        (habits.length ? (
          <div className="empty panel">
            <CalendarDays />
            <h2>A little breathing room</h2>
            <p>No habits scheduled for this day.</p>
            <Link to="/habits">Manage your habits</Link>
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
        {loaded ? 'Habit not found.' : 'Loading…'}
        <Link to="/habits">Back to habits</Link>
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
        My habits
      </Link>
      <header className="page-header">
        <div>
          <div className="eyebrow">
            {h.category} · {h.tracking}
          </div>
          <h1>{h.name}</h1>
          <p>{h.description || 'One small promise to yourself.'}</p>
        </div>
        <HabitIcon name={h.icon} color={h.color} />
      </header>
      <section className="panel detail-progress">
        <div className="section-title">
          <h2>{displayDate(date)}</h2>
          <DateSelector />
        </div>
        {!scheduled(h, date) && <p className="muted">This habit is not scheduled for this day.</p>}
        <strong className="big-percent" style={{ color: h.color }}>
          {n}
          <span>%</span>
        </strong>
        <p>{n === 100 ? 'You showed up. That’s a win.' : 'A little progress is still progress.'}</p>
        <div className="progress-track">
          <span style={{ width: `${n}%`, background: h.color }} />
        </div>
        <Controls habit={h} progress={p} date={date} />
      </section>
      <section className="panel">
        <h2>Your rhythm</h2>
        <p className="muted">
          {h.weekdays.length === 7
            ? 'Every day'
            : h.weekdays
                .map(
                  (d) =>
                    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                      d
                    ],
                )
                .join(', ')}
        </p>
        <div className="section-title">
          <h2>Recent history</h2>
          <span className="muted">Last 7 days</span>
        </div>
        {dates.map((d) => (
          <button className="history-row" key={d} onClick={() => setDate(d)}>
            <span>
              {displayDate(d)}
              <small>{scheduled(h, d) ? 'Scheduled' : 'Not scheduled'}</small>
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
        <Button asChild>
          <Link to={`/habits/${id}/edit`}>
            <Pencil size={17} />
            Edit habit
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm(`Delete ${h.name} and all its history?`))
              void deleteHabit(h.id)
                .then(() => {
                  notify('Habit deleted');
                  navigate('/habits');
                })
                .catch(() => notify('Could not delete habit'));
          }}
        >
          <Trash2 size={17} />
          Delete habit
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
          <div className="eyebrow">LOOK HOW FAR YOU’VE COME</div>
          <h1>Your insights</h1>
          <p>Small efforts. A bigger picture.</p>
        </div>
        <ChartPie className="header-icon" size={32} />
      </header>
      <div className="stats-grid">
        <div className="panel">
          <Sprout />
          <strong>{habits.filter((h) => !h.archived).length}</strong>
          <p>Growing habits</p>
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
          <p>Daily wins recorded</p>
        </div>
      </div>
      <section className="panel">
        <div className="section-title">
          <h2>This week’s rhythm</h2>
          <span className="muted">Daily completion</span>
        </div>
        <div className="chart">
          {week.map((d) => (
            <div className="chart-col" key={d.date}>
              <span>{d.value}%</span>
              <div className="bar-space">
                <div style={{ height: `${Math.max(d.value, 2)}%` }} />
              </div>
              <small>{dayDate(d.date).toLocaleDateString(undefined, { weekday: 'short' })}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="panel encouragement">
        <Heart size={28} />
        <h2>Consistency grows with you.</h2>
        <p>Keep showing up. Your daily actions tell your story.</p>
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
          <div className="eyebrow">YOUR PERSONAL CORNER</div>
          <h1>My profile</h1>
          <p>A little space, just for you.</p>
        </div>
      </header>
      <section className="panel profile-card">
        <div className="avatar large">
          <UserRound size={35} />
        </div>
        <h2>Your growth journey</h2>
        <p>{habits.length} habits. Endless possibilities.</p>
        <span className="badge">Personal growth explorer</span>
      </section>
      <section className="panel">
        <div className="info-row">
          <ShieldCheck />
          <div>
            <h3>Yours, on this device</h3>
            <p>Habits and history are saved locally in your browser.</p>
          </div>
        </div>
        <div className="info-row">
          <Sprout />
          <div>
            <h3>Made for small beginnings</h3>
            <p>Ovgen · Version 0.1 · Phase 1</p>
          </div>
        </div>
      </section>
      <Link className="profile-link panel" to="/habits">
        <span>Keep building your habits</span>
        <ArrowRight size={19} />
      </Link>
    </>
  );
}
function Shell() {
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
    <div className="app-shell">
      <aside className="desktop-brand">
        <Link to="/">
          <Sprout size={28} />
          <span>
            ovgen<span className="brand-dot">.</span>
          </span>
        </Link>
        <p>Your growth space</p>
        <div className="sidebar-note">
          <Sprout size={30} />
          <strong>A little, every day.</strong>
          <p>Become who you want to be, one habit at a time.</p>
        </div>
      </aside>
      <main key={location.pathname}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/habits/new" element={<HabitBuilder />} />
          <Route path="/habits/:id" element={<Details />} />
          <Route path="/habits/:id/edit" element={<HabitBuilder />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>A little off track?</h1>
                <Link to="/">Go home</Link>
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
            <small>{label}</small>
          </NavLink>
        ))}
      </nav>
      {notice && (
        <div role="status" className="toast">
          <Check size={17} />
          {notice}
          <button aria-label="Dismiss notification" onClick={() => notify('')}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    seed()
      .then(() => setReady(true))
      .catch(() => setError(true));
  }, []);
  if (error)
    return (
      <div className="empty">
        <h2>Local storage is unavailable</h2>
        <p>Allow browser storage, then reload to open Ovgen.</p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    );
  if (!ready)
    return (
      <div className="loading">
        <Sprout size={40} />
        <p>Making room for growth…</p>
      </div>
    );
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
