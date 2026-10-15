import { t } from '../lib/i18n';
import { useEffect, useLayoutEffect, useState } from 'react';
import { usePreferences } from '../stores/preferences';
import { themeColors } from '../styles/palette';
// Preserve white surfaces and near-neutral text; adjust the colored design tokens.
export function useColorDepth() {
  const depth = usePreferences((s) => s.colorDepth);
  const theme = usePreferences((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#15121e' : '#6B58E8');
    for (const hex of themeColors) {
      const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const hi = Math.max(...rgb),
        lo = Math.min(...rgb);
      const chroma = hi - lo;
      const amount = (depth - 50) / 50;
      let values = rgb;
      if (chroma > 0.025 || (hi > 0.9 && hi < 0.99)) {
        values =
          amount < 0
            ? rgb.map((v) => v + (1 - v) * -amount * 0.45)
            : rgb.map((v) => Math.max(0, v - amount * (1 - v) * 0.38));
      }
      if (dark) {
        const average = (hi + lo) / 2;
        if (lo > 0.67 && hi > 0.86) {
          values = chroma > 0.06 ? [0.17, 0.13, 0.25] : [0.13, 0.115, 0.17];
        } else if (chroma < 0.18) {
          values = average < 0.35 ? [0.92, 0.9, 0.96] : [0.72, 0.68, 0.8];
        } else if (average < 0.45) {
          values = rgb.map((v) => Math.min(1, v * 0.75 + 0.28));
        }
      }
      if (dark) {
        values = values.map((v) => Math.min(1, Math.max(0, v + (50 - depth) * 0.0008)));
      }
      const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
      document.documentElement.style.setProperty(
        `--tone-${hex}`,
        `rgba(${values.map((v) => Math.round(v * 255)).join(',')},${alpha})`,
      );
    }
    document.documentElement.style.setProperty(
      '--habit-shade',
      dark ? '#ede4ff' : depth < 50 ? 'white' : '#24113f',
    );
    document.documentElement.style.setProperty('--habit-shift', Math.abs(depth - 50) * 0.5 + '%');
    document.documentElement.style.setProperty('--habit-tint', `${18 + (depth - 50) * 0.2}%`);
    document.documentElement.style.setProperty(
      '--surface',
      dark
        ? `rgb(${[33, 29, 44].map((v) => Math.round(v + (50 - depth) * 0.18)).join(',')})`
        : 'white',
    );
  }, [depth, dark]);
}
export function AppearanceSettings() {
  const { colorDepth, setColorDepth, theme, setTheme } = usePreferences();
  return (
    <section className="panel appearance-settings">
      <h2>{t('Appearance')}</h2>
      <div className="theme-options" role="group" aria-label={t('Color theme')}>
        {(['light', 'dark', 'system'] as const).map((mode) => (
          <button
            key={mode}
            className={theme === mode ? 'active' : ''}
            aria-pressed={theme === mode}
            onClick={() => setTheme(mode)}
          >
            {mode === 'light' ? t('☀ Light') : mode === 'dark' ? t('☾ Dark') : t('System')}
          </button>
        ))}
      </div>
      <label htmlFor="color-depth">
        {t('Color intensity')}
        <strong>{colorDepth}%</strong>
      </label>
      <p className="muted">{t('Choose the shade that feels right for you.')}</p>
      <input
        id="color-depth"
        type="range"
        min="0"
        max="100"
        step="1"
        value={colorDepth}
        onChange={(e) => setColorDepth(Number(e.target.value))}
        aria-valuetext={colorDepth < 40 ? t('Light') : colorDepth > 60 ? t('Deep') : t('Balanced')}
      />
      <div className="range-labels">
        <span>{t('Light')}</span>
        <button onClick={() => setColorDepth(50)}>{t('Reset')}</button>
        <span>{t('Deep')}</span>
      </div>
      <div className="color-preview">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="muted">{t('Saved automatically on this device.')}</p>
    </section>
  );
}
