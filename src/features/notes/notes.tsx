import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, Search, StickyNote, Pin, Trash2, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db } from '../../lib/db';
import { t, locale } from '../../lib/i18n';
import { useAppStore } from '../../stores/app';
import {
  listNotes,
  parseNote,
  saveNote,
  deleteNote,
  pinNote,
  noteColors,
  type Note,
} from './repository';
export function Notes() {
  const notes = useLiveQuery(listNotes, []);
  const [search, setSearch] = useState('');
  const notify = useAppStore((s) => s.notify);
  const filtered = (notes || []).filter((note) =>
    `${note.title} ${note.body}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <Link className="back" to="/">
        <ArrowLeft size={18} />
        {t('Home')}
      </Link>
      <header className="page-header">
        <div>
          <div className="eyebrow">{t('A PLACE FOR YOUR THOUGHTS')}</div>
          <h1>{t('My notes')}</h1>
          <p>{t('Small thoughts. Room to grow.')}</p>
        </div>
        <Link className="add-button" to="/notes/new" aria-label={t('New note')}>
          <Plus size={27} />
        </Link>
      </header>
      <label className="search">
        <Search size={18} />
        <input
          aria-label={t('Search notes')}
          placeholder={t('Search notes…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>{t('{count} notes', { count: filtered.length })}</span>
      </label>
      {notes === undefined ? (
        <p className="empty">{t('Loading…')}</p>
      ) : !filtered.length ? (
        <section className="empty panel">
          <StickyNote size={39} />
          <h2>{t(search ? 'No notes found' : 'A thought worth keeping')}</h2>
          <p>
            {t(
              search
                ? 'Try a different search.'
                : 'Capture an idea, a reflection, or a little reminder.',
            )}
          </p>
          {!search && (
            <Button asChild>
              <Link to="/notes/new">
                <Plus size={16} />
                {t('New note')}
              </Link>
            </Button>
          )}
        </section>
      ) : (
        <div className="notes-grid">
          {filtered.map((note) => (
            <article className={`note-card note-${note.color}`} key={note.id}>
              <div className="note-card-top">
                <StickyNote size={19} />
                <button
                  aria-label={t(note.pinned ? 'Unpin note' : 'Pin note')}
                  aria-pressed={note.pinned}
                  className={note.pinned ? 'pinned' : ''}
                  onClick={() =>
                    void pinNote(note.id).catch(() =>
                      notify(t('Could not save. Please try again.')),
                    )
                  }
                >
                  <Pin size={17} />
                </button>
              </div>
              <Link className="note-open" to={`/notes/${note.id}`}>
                <h2>{note.title || t('Untitled note')}</h2>
                <p>{note.body || t('Open to add your thoughts…')}</p>
              </Link>
              <div className="note-footer">
                <time dateTime={note.updatedAt}>
                  {new Date(note.updatedAt).toLocaleDateString(locale(), {
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
                <button
                  aria-label={t('Delete note')}
                  onClick={() => {
                    if (confirm(t('Delete this note? This cannot be undone.')))
                      void deleteNote(note.id)
                        .then(() => notify(t('Note deleted')))
                        .catch(() => notify(t('Could not delete note')));
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="closing">{t('Private notes, saved on this device.')}</p>
    </>
  );
}
export function NoteEditor() {
  const { id } = useParams();
  const result = useLiveQuery(
    async () => (id ? parseNote((await db.meta.get(`note:${id}`))?.value) || null : null),
    [id],
  );
  if (id && result === undefined) return <p className="empty">{t('Loading…')}</p>;
  if (id && !result)
    return (
      <div className="empty">
        <h2>{t('Note not found')}</h2>
        <Link to="/notes">{t('My notes')}</Link>
      </div>
    );
  return <Editor key={id || 'new'} original={result || undefined} />;
}
function Editor({ original }: { original?: Note }) {
  const navigate = useNavigate();
  const notify = useAppStore((s) => s.notify);
  const [note, setNote] = useState<Note>(
    () =>
      original || {
        id: crypto.randomUUID(),
        title: '',
        body: '',
        color: 'violet',
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
  );
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [busy, setBusy] = useState(false);
  const latest = useRef(note);
  const saved = useRef(original ? JSON.stringify(original) : '');
  const deleted = useRef(false);
  const mounted = useRef(false);
  latest.current = note;
  async function persist(current: Note) {
    if (deleted.current || (!original && !current.title.trim() && !current.body.trim())) return;
    const snapshot = JSON.stringify(current);
    if (snapshot === saved.current) return;
    if (mounted.current) setStatus('saving');
    try {
      await saveNote(current);
      saved.current = snapshot;
      if (mounted.current) {
        const upToDate = JSON.stringify(latest.current) === snapshot;
        setStatus(upToDate ? 'saved' : 'saving');
        if (!original && upToDate) navigate(`/notes/${current.id}`, { replace: true });
      }
    } catch {
      if (mounted.current) setStatus('error');
      throw Error('Could not save. Please try again.');
    }
  }
  const persistRef = useRef(persist);
  persistRef.current = persist;
  useEffect(() => {
    mounted.current = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !deleted.current &&
        (latest.current.title.trim() || latest.current.body.trim()) &&
        JSON.stringify(latest.current) !== saved.current
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      mounted.current = false;
      window.removeEventListener('beforeunload', beforeUnload);
      if (!deleted.current)
        void persistRef
          .current(latest.current)
          .catch(() => notify(t('Could not save. Please try again.')));
    };
  }, [notify]);
  useEffect(() => {
    const timer = setTimeout(() => void persistRef.current(note).catch(() => undefined), 600);
    return () => clearTimeout(timer);
  }, [note]);
  function patch(change: Partial<Note>) {
    setStatus('saving');
    setNote((previous) => ({ ...previous, ...change, updatedAt: new Date().toISOString() }));
  }
  async function back() {
    if (busy) return;
    setBusy(true);
    try {
      await persistRef.current(latest.current);
      navigate('/notes');
    } catch {
      notify(t('Could not save. Please try again.'));
      setBusy(false);
    }
  }
  return (
    <>
      <div className="note-editor-toolbar">
        <button className="back" onClick={() => void back()}>
          <ArrowLeft size={18} />
          {t('My notes')}
        </button>
        <span role="status" className={`note-save-status ${status}`}>
          <Check size={14} />
          {t(status === 'saving' ? 'Saving…' : status === 'error' ? 'Could not save' : 'Saved')}
        </span>
        <button
          aria-label={t('Delete note')}
          disabled={busy}
          onClick={() => {
            if (!confirm(t('Delete this note? This cannot be undone.'))) return;
            deleted.current = true;
            setBusy(true);
            void deleteNote(note.id)
              .then(() => {
                notify(t('Note deleted'));
                navigate('/notes', { replace: true });
              })
              .catch(() => {
                deleted.current = false;
                setBusy(false);
                notify(t('Could not delete note'));
              });
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <section className={`panel note-editor note-${note.color}`}>
        <div className="note-editor-options">
          <div className="note-color-picker">
            {noteColors.map((color) => (
              <button
                key={color}
                aria-label={t('Note color {color}', { color: t(color) })}
                aria-pressed={note.color === color}
                className={`note-swatch swatch-${color}`}
                onClick={() => patch({ color })}
              >
                {note.color === color && <Check size={14} />}
              </button>
            ))}
          </div>
          <button
            className={note.pinned ? 'pinned' : ''}
            aria-label={t(note.pinned ? 'Unpin note' : 'Pin note')}
            aria-pressed={note.pinned}
            onClick={() => patch({ pinned: !note.pinned })}
          >
            <Pin size={20} />
          </button>
        </div>
        <input
          className="note-title-input"
          aria-label={t('Note title')}
          placeholder={t('Give your thought a title…')}
          maxLength={120}
          value={note.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <textarea
          className="note-body-input"
          aria-label={t('Note text')}
          placeholder={t('What’s on your mind?')}
          maxLength={30000}
          value={note.body}
          onChange={(e) => patch({ body: e.target.value })}
        />
        <div className="note-editor-bottom">
          <span>{t('{count} characters', { count: note.body.length })}</span>
          <Button
            disabled={busy || status === 'saved'}
            variant="ghost"
            onClick={() => void persistRef.current(latest.current).catch(() => undefined)}
          >
            {t('Save now')}
          </Button>
        </div>
      </section>
      <p className="closing">{t('Changes save automatically on this device.')}</p>
    </>
  );
}
