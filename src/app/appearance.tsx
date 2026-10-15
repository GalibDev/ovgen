import { useEffect } from 'react';
import { usePreferences } from '../stores/preferences';
import { themeColors } from '../styles/palette';
// Preserve white surfaces and near-neutral text; adjust the colored design tokens.
export function useColorDepth() {
  const depth = usePreferences((s) => s.colorDepth);
  useEffect(() => {
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
      const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
      document.documentElement.style.setProperty(
        `--tone-${hex}`,
        `rgba(${values.map((v) => Math.round(v * 255)).join(',')},${alpha})`,
      );
    }
    document.documentElement.style.setProperty('--habit-shade', depth < 50 ? 'white' : '#24113f');
    document.documentElement.style.setProperty('--habit-shift', Math.abs(depth - 50) * 0.5 + '%');
    document.documentElement.style.setProperty('--habit-tint', `${18 + (depth - 50) * 0.2}%`);
  }, [depth]);
}
export function AppearanceSettings() {
  const { colorDepth, setColorDepth } = usePreferences();
  return (
    <section className="panel appearance-settings">
      <h2>Appearance</h2>
      <label htmlFor="color-depth">
        Color intensity <strong>{colorDepth}%</strong>
      </label>
      <p className="muted">Choose the shade that feels right for you.</p>
      <input
        id="color-depth"
        type="range"
        min="0"
        max="100"
        step="1"
        value={colorDepth}
        onChange={(e) => setColorDepth(Number(e.target.value))}
        aria-valuetext={colorDepth < 40 ? 'Light' : colorDepth > 60 ? 'Deep' : 'Balanced'}
      />
      <div className="range-labels">
        <span>Light</span>
        <button onClick={() => setColorDepth(50)}>Reset</button>
        <span>Deep</span>
      </div>
      <div className="color-preview">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="muted">Saved automatically on this device.</p>
    </section>
  );
}
