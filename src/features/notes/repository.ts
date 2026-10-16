import { db } from '../../lib/db';
export interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
export const noteColors = ['violet', 'green', 'orange', 'blue'] as const;
export function parseNote(value: unknown): Note | undefined {
  if (typeof value !== 'string') return;
  try {
    const n = JSON.parse(value);
    if (
      typeof n.id === 'string' &&
      typeof n.title === 'string' &&
      typeof n.body === 'string' &&
      noteColors.includes(n.color) &&
      typeof n.createdAt === 'string' &&
      typeof n.updatedAt === 'string' &&
      typeof n.pinned === 'boolean'
    )
      return n;
  } catch {}
}
const pending = new Map<string, Promise<unknown>>();
function serialize<T>(id: string, action: () => Promise<T>) {
  const promise = (pending.get(id) || Promise.resolve()).catch(() => undefined).then(action);
  pending.set(id, promise);
  void promise
    .finally(() => {
      if (pending.get(id) === promise) pending.delete(id);
    })
    .catch(() => undefined);
  return promise;
}
export const saveNote = (note: Note) =>
  serialize(note.id, () => db.meta.put({ key: `note:${note.id}`, value: JSON.stringify(note) }));
export const deleteNote = (id: string) => serialize(id, () => db.meta.delete(`note:${id}`));
export async function listNotes() {
  const records = await db.meta.where(':id').startsWith('note:').toArray();
  return records
    .map((r) => parseNote(r.value))
    .filter((n): n is Note => !!n)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}
export async function pinNote(id: string) {
  return serialize(id, () =>
    db.transaction('rw', db.meta, async () => {
      const note = parseNote((await db.meta.get(`note:${id}`))?.value);
      if (note)
        await db.meta.put({
          key: `note:${id}`,
          value: JSON.stringify({ ...note, pinned: !note.pinned }),
        });
    }),
  );
}
