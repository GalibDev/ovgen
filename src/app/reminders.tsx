import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, localDate, scheduled } from '../lib/db';
import { isComplete, shiftDate } from '../lib/stats';
import { usePreferences } from '../stores/preferences';
import { Button } from '../components/ui/button';
import type { Habit } from '../types';
export const notificationsSupported = () =>
  typeof Notification !== 'undefined' && window.isSecureContext;
async function showNotification(title: string, body: string, tag: string, url = '/') {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  const registration =
    'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) {
    await registration.showNotification(title, { body, icon: '/icon.svg', tag, data: { url } });
    return true;
  }
  try {
    const notification = new Notification(title, { body, icon: '/icon.svg', tag });
    notification.onclick = () => {
      window.focus();
      window.location.assign(url);
    };
    return true;
  } catch {
    return false;
  }
}
export function ReminderSettings() {
  const { remindersEnabled, setRemindersEnabled, browserNotifications, setBrowserNotifications } =
    usePreferences();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  useEffect(() => {
    const refresh = () =>
      setPermission(notificationsSupported() ? Notification.permission : 'unsupported');
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  async function enable() {
    if (!notificationsSupported()) return;
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setBrowserNotifications(result === 'granted');
      setMessage(
        result === 'granted'
          ? 'Browser notifications enabled.'
          : result === 'denied'
            ? 'Notifications are blocked. Change your browser’s site permissions to allow them.'
            : 'Permission was not granted. In-app reminders still work.',
      );
    } catch {
      setMessage('This browser could not enable notifications. In-app reminders still work.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel reminder-settings">
      <h2>
        <Bell size={21} />
        Reminders
      </h2>
      <label className="toggle-row">
        <span>
          Habit reminders<small>Show a reminder when a scheduled habit is due.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={remindersEnabled}
          onChange={(e) => setRemindersEnabled(e.target.checked)}
        />
      </label>
      <p className="muted reminder-limit">
        Web reminders work while Ovgen is open. Closed-app and reliable background reminders require
        a future Android app or push service. On iPhone, browser notifications may require adding
        Ovgen to your Home Screen.
      </p>
      <div className="notification-actions">
        {permission === 'unsupported' ? (
          <p className="muted">
            Browser notifications are unavailable here. In-app reminders are available.
          </p>
        ) : permission === 'granted' ? (
          <label className="toggle-row">
            <span>Browser notifications</span>
            <input
              type="checkbox"
              role="switch"
              checked={browserNotifications}
              onChange={(e) => setBrowserNotifications(e.target.checked)}
            />
          </label>
        ) : (
          <Button variant="outline" disabled={busy || permission === 'denied'} onClick={enable}>
            {busy
              ? 'Requesting…'
              : permission === 'denied'
                ? 'Blocked in browser settings'
                : 'Enable browser notifications'}
          </Button>
        )}
        {permission === 'granted' && (
          <Button
            variant="ghost"
            onClick={() => {
              void showNotification('Ovgen reminder', 'A small step for your growth.', 'ovgen-test')
                .then((ok) =>
                  setMessage(
                    ok
                      ? 'Test notification sent.'
                      : 'Could not show a notification on this device.',
                  ),
                )
                .catch(() => setMessage('Could not send the notification.'));
            }}
          >
            Send test notification
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
      <div className="reminder-habits">
        {habits
          .filter((h) => !h.archived)
          .map((h) => (
            <Link key={h.id} to={`/habits/${h.id}/edit`}>
              <span>{h.name}</span>
              <strong>{h.reminder?.enabled ? h.reminder.time : 'Set reminder'}</strong>
            </Link>
          ))}
      </div>
    </section>
  );
}
export function useReminders() {
  const enabled = usePreferences((s) => s.remindersEnabled);
  const browserNotifications = usePreferences((s) => s.browserNotifications);
  const [due, setDue] = useState<Habit[]>([]);
  const running = useRef(false);
  useEffect(() => {
    if (!enabled) {
      setDue([]);
      return;
    }
    let disposed = false;
    async function check() {
      if (disposed || running.current) return;
      running.current = true;
      try {
        const now = new Date();
        const date = localDate(now);
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const candidates = (await db.habits.toArray()).filter(
          (h) =>
            h.reminder?.enabled &&
            /^([01]\d|2[0-3]):[0-5]\d$/.test(h.reminder.time) &&
            h.reminder.time <= time &&
            scheduled(h, date),
        );
        const delivered: Habit[] = [];
        for (const h of candidates) {
          if (disposed) break;
          const claimed = await db.transaction('rw', db.habits, db.progress, db.meta, async () => {
            const current = await db.habits.get(h.id);
            if (
              !current?.reminder?.enabled ||
              current.reminder.time !== h.reminder?.time ||
              !scheduled(current, date)
            )
              return false;
            const key = `reminder:${h.id}:${date}:${current.reminder.time}`;
            if (
              (await db.meta.get(key)) ||
              isComplete(current, await db.progress.get(`${h.id}:${date}`))
            )
              return false;
            await db.meta.put({ key, value: date });
            return true;
          });
          if (claimed) {
            delivered.push(h);
            if (browserNotifications)
              await showNotification(
                'A little time for you',
                `Time for ${h.name}.`,
                `${h.id}:${date}`,
                `/habits/${h.id}`,
              ).catch(() => false);
          }
        }
        if (!disposed && delivered.length) setDue(delivered);
        await db.meta
          .where(':id')
          .startsWith('reminder:')
          .filter(
            (receipt) => typeof receipt.value === 'string' && receipt.value < shiftDate(date, -30),
          )
          .delete();
      } catch {
        /* Retry on the next tick without interrupting habit tracking. */
      } finally {
        running.current = false;
      }
    }
    void check();
    const timer = setInterval(() => void check(), 15000);
    const refresh = () => void check();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled, browserNotifications]);
  return { due, dismiss: () => setDue([]) };
}
export function ReminderBanner({ due, dismiss }: { due: Habit[]; dismiss: () => void }) {
  if (!due.length) return null;
  return (
    <aside className="reminder-banner" role="status">
      <Bell size={20} />
      <div>
        <strong>A little time for you</strong>
        <p>{due.map((h) => h.name).join(' · ')}</p>
        <Link to={due.length === 1 ? `/habits/${due[0].id}` : '/habits'} onClick={dismiss}>
          Open habits
        </Link>
      </div>
      <button aria-label="Dismiss reminder" onClick={dismiss}>
        <X size={18} />
      </button>
    </aside>
  );
}
