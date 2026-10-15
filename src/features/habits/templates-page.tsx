import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { templateDefinitions, createFromTemplate } from './templates';
import { HabitIcon } from '../../components/habits/habit-icon';
import { Button } from '../../components/ui/button';
import { useAppStore } from '../../stores/app';
import { t } from '../../lib/i18n';
export function Templates() {
  const [busy, setBusy] = useState('');
  const navigate = useNavigate();
  const notify = useAppStore((s) => s.notify);
  async function add(key: string) {
    if (busy) return;
    setBusy(key);
    try {
      const h = await createFromTemplate(key, t);
      notify(t('Template added'));
      navigate(`/habits/${h.id}`);
    } catch {
      notify(t('Could not add template'));
      setBusy('');
    }
  }
  return (
    <>
      <Link className="back" to="/habits/new">
        <ArrowLeft size={18} />
        {t('Back')}
      </Link>
      <header className="page-header">
        <div>
          <div className="eyebrow">{t('START WITH SOMETHING SIMPLE')}</div>
          <h1>{t('Habit templates')}</h1>
          <p>{t('A small beginning, already planned.')}</p>
        </div>
      </header>
      <div className="template-grid">
        {templateDefinitions.map((template) => (
          <section className="panel template-card" key={template.key}>
            <HabitIcon name={template.icon} color={template.color} />
            <h2>{t(template.name)}</h2>
            <p>{t(template.description)}</p>
            <span className="badge">
              {template.target} {t(template.unit)} · {t('Every day')}
            </span>
            <Button disabled={!!busy} onClick={() => void add(template.key)}>
              <Plus size={17} />
              {busy === template.key ? t('Adding…') : t('Use template')}
            </Button>
          </section>
        ))}
      </div>
    </>
  );
}
