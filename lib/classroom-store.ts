import {
  applyClassCommand,
  emptyClassState,
  validateClassState,
} from './classroom-domain.ts';
import type { ClassState, Command } from './classroom-domain.ts';
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function openClassStore(
  factory: IDBFactory = indexedDB,
  name = 'daily-tools-classroom-v1',
) {
  const r = factory.open(name, 1);
  r.onupgradeneeded = () => r.result.createObjectStore('state');
  const db = await request(r);
  db.onversionchange = () => db.close();
  return db;
}
async function transaction(
  db: IDBDatabase,
  update?: (s: ClassState) => ClassState,
): Promise<ClassState> {
  const tx = db.transaction('state', update ? 'readwrite' : 'readonly');
  const finished = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('儲存失敗，資料未變更。'));
    tx.onerror = () => {};
  });
  void finished.catch(() => {});
  try {
    const store = tx.objectStore('state');
    const current =
      (await request<ClassState | undefined>(store.get('current'))) ??
      emptyClassState();
    validateClassState(current);
    const next = update ? update(current) : current;
    if (update) {
      validateClassState(next);
      store.put(next, 'current');
    }
    await finished;
    return next;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await finished.catch(() => {});
    throw error;
  }
}
export const readClassState = (db: IDBDatabase) => transaction(db);
export const commitClassCommand = (db: IDBDatabase, command: Command) =>
  transaction(db, (s) => applyClassCommand(s, command));
export const importClassState = (
  db: IDBDatabase,
  state: ClassState,
  prefix: string,
) =>
  transaction(db, (current) => {
    validateClassState(state);
    const classIds = new Map(
      state.classes.map((c, i) => [c.id, `${prefix}-c${i}`]),
    );
    const studentIds = new Map<string, string>();
    let studentIndex = 0;
    const mapStudent = (id: string) => {
      if (!studentIds.has(id))
        studentIds.set(id, `${prefix}-s${studentIndex++}`);
      return studentIds.get(id)!;
    };
    const classes = state.classes.map((c) => ({
      ...c,
      id: classIds.get(c.id)!,
      name: `${c.name.slice(0, 70)}（匯入）`,
      students: c.students.map((p) => ({ ...p, id: mapStudent(p.id) })),
    }));
    const activities = state.activities.map((e, i) => ({
      ...e,
      id: `${prefix}-e${i}`,
      classId: classIds.get(e.classId)!,
      students: e.students.map((p) => ({ ...p, id: mapStudent(p.id) })),
    }));
    return {
      ...current,
      classes: [...current.classes, ...classes],
      activities: [...activities, ...current.activities],
    };
  });
