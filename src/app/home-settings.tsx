import { usePreferences } from '../stores/preferences';
import { t } from '../lib/i18n';
export function HomeSettings() {
  const { showCalendar, showMomentum, showSalah, setHomeSection } = usePreferences();
  return (
    <section className="panel">
      <h2>{t('Home customization')}</h2>
      <p className="muted">{t('Choose what appears on your Home screen.')}</p>
      {(
        [
          {
            key: 'showCalendar',
            title: 'Weekly calendar',
            description: 'Select a day from the calendar strip.',
            checked: showCalendar,
          },
          {
            key: 'showMomentum',
            title: 'Daily momentum',
            description: 'Show the summary and circular progress.',
            checked: showMomentum,
          },
          {
            key: 'showSalah',
            title: 'Salah preview',
            description: 'Show individual prayers on Home habit cards.',
            checked: showSalah,
          },
        ] as const
      ).map((option) => (
        <label className="toggle-row" key={option.key}>
          <span>
            {t(option.title)}
            <small>{t(option.description)}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={option.checked}
            onChange={(e) => setHomeSection(option.key, e.target.checked)}
          />
        </label>
      ))}
      <p className="muted">{t('Habits and progress stay unchanged when a section is hidden.')}</p>
    </section>
  );
}
