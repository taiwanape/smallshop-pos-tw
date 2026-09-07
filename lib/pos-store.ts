import { makeOrder, validateMenu, validateOrder, validateSnapshot, voidOrder } from './pos-domain.ts';
import type { Backup, CartLine, DiningType, MenuItem, Order, Snapshot } from './pos-domain.ts';

export const LEGACY_KEY = 'smallshop-pos-demo-v1';
const DB_NAME = 'smallshop-pos-ledger-v2';
type Meta = { key: 'settings'; menu: MenuItem[]; counter: number; menuRevision: number };
const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

// All writes read current state inside one read-write transaction. UI snapshots
// never replace the ledger, and success is returned only after oncomplete.
async function transaction<T>(db: IDBDatabase, mode: IDBTransactionMode, action: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const tx = db.transaction(['meta', 'orders'], mode);
  const complete = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('資料未儲存，請保留訂單後重試。'));
    tx.onerror = () => {}; // onabort owns the rejection.
  });
  void complete.catch(() => {});
  try { const result = await action(tx); await complete; return result; }
  catch (error) { try { tx.abort(); } catch { /* already aborted/completed */ } await complete.catch(() => {}); throw error; }
}

export async function openStore(defaultMenu: MenuItem[], legacyRaw: string | null, factory: IDBFactory = indexedDB, name = DB_NAME): Promise<IDBDatabase> {
  const open = factory.open(name, 1);
  open.onupgradeneeded = () => {
    open.result.createObjectStore('meta', { keyPath: 'key' });
    open.result.createObjectStore('orders', { keyPath: 'id' });
  };
  const db = await request(open);
  db.onversionchange = () => db.close();
  try {
    await transaction(db, 'readwrite', async (tx) => {
      const meta = tx.objectStore('meta');
      if (await request(meta.get('settings'))) return;
      const initial: unknown = legacyRaw ? JSON.parse(legacyRaw) : { menu: defaultMenu, orders: [] };
      validateSnapshot(initial); // Failed migration never deletes the legacy data.
      initial.orders.forEach((order) => tx.objectStore('orders').add(order));
      meta.put({ key: 'settings', menu: initial.menu, counter: initial.orders.reduce((max, order) => Math.max(max, order.number), 0), menuRevision: 0 } satisfies Meta);
    });
    return db;
  } catch (error) { db.close(); throw error; }
}

export async function readSnapshot(db: IDBDatabase): Promise<Snapshot & { menuRevision: number }> {
  return transaction(db, 'readonly', async (tx) => {
    const settings = await request<Meta>(tx.objectStore('meta').get('settings'));
    const orders = await request<Order[]>(tx.objectStore('orders').getAll());
    return { menu: settings.menu, menuRevision: settings.menuRevision, orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number) };
  });
}

export async function commitOrder(db: IDBDatabase, id: string, lines: CartLine[], diningType: DiningType, paid: number): Promise<Order> {
  return transaction(db, 'readwrite', async (tx) => {
    const orders = tx.objectStore('orders');
    const existing = await request<Order | undefined>(orders.get(id));
    if (existing) return existing; // An uncertain retry has the same idempotency key.
    const meta = tx.objectStore('meta');
    const settings = await request<Meta>(meta.get('settings'));
    const order = makeOrder(id, settings.counter + 1, lines, diningType, paid);
    orders.add(order);
    meta.put({ ...settings, counter: order.number });
    return order;
  });
}

export async function saveMenu(db: IDBDatabase, menu: MenuItem[], expectedRevision: number): Promise<void> {
  validateMenu(menu);
  await transaction(db, 'readwrite', async (tx) => {
    const store = tx.objectStore('meta');
    const settings = await request<Meta>(store.get('settings'));
    if (settings.menuRevision !== expectedRevision) throw new Error('其他分頁已更新菜單。請關閉菜單後重新開啟再修改。');
    store.put({ ...settings, menu, menuRevision: settings.menuRevision + 1 });
  });
}

export async function commitVoid(db: IDBDatabase, id: string, reason: string): Promise<void> {
  await transaction(db, 'readwrite', async (tx) => {
    const store = tx.objectStore('orders');
    const order = await request<Order | undefined>(store.get(id));
    if (!order) throw new Error('找不到訂單。');
    validateOrder(order);
    store.put(voidOrder(order, reason));
  });
}

// Restore means append missing orders. Never overwrite a conflicting order or
// replace an established menu. This makes repeat imports safe and inspectable.
export async function mergeBackup(db: IDBDatabase, backup: Backup): Promise<number> {
  validateSnapshot(backup);
  return transaction(db, 'readwrite', async (tx) => {
    const orders = tx.objectStore('orders');
    const meta = tx.objectStore('meta');
    const settings = await request<Meta>(meta.get('settings'));
    const existingOrders = await request<Order[]>(orders.getAll());
    const existing = new Map(existingOrders.map((order) => [order.id, order]));
    let added = 0;
    let counter = settings.counter;
    for (const order of backup.orders) {
      const found = existing.get(order.id);
      if (found) {
        // Structural field comparison is independent of JSON property order.
        const canonical = (value: unknown): string => {
          if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
          if (value && typeof value === 'object') return '{' + Object.keys(value).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
          return JSON.stringify(value);
        };
        if (canonical(found) !== canonical(order)) throw new Error(`訂單 ${order.id} 有不同版本，已取消整份匯入。`);
      } else { orders.add(order); added += 1; counter = Math.max(counter, order.number); }
    }
    const restoreMenu = existingOrders.length === 0 && settings.menuRevision === 0;
    meta.put({ ...settings, counter, menu: restoreMenu ? backup.menu : settings.menu, menuRevision: restoreMenu ? settings.menuRevision + 1 : settings.menuRevision });
    return added;
  });
}
