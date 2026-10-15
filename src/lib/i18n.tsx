import { useEffect } from 'react';
import { usePreferences } from '../stores/preferences';
import { bn } from './translations';
export function t(key: string, values: Record<string, string | number> = {}) {
  let text = usePreferences.getState().language === 'bn' ? bn[key] || key : key;
  for (const [name, value] of Object.entries(values))
    text = text.replaceAll(`{${name}}`, String(value));
  return text;
}
export const locale = () => (usePreferences.getState().language === 'bn' ? 'bn-BD' : 'en-US');
export function useLanguage() {
  const language = usePreferences((s) => s.language);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return language;
}
export function LanguageSettings() {
  const { language, setLanguage } = usePreferences();
  return (
    <section className="panel">
      <h2>{t('Language')}</h2>
      <div className="theme-options" role="group" aria-label={t('Language')}>
        {(['en', 'bn'] as const).map((code) => (
          <button
            key={code}
            className={language === code ? 'active' : ''}
            aria-pressed={language === code}
            onClick={() => setLanguage(code)}
          >
            {code === 'en' ? 'English' : 'বাংলা'}
          </button>
        ))}
      </div>
      <p className="muted">{t('Your habit names and notes stay as you wrote them.')}</p>
    </section>
  );
}
