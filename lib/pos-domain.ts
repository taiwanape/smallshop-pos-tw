export type DiningType = '外帶' | '內用';
export type MenuItem = { id: string; name: string; price: number; category: string; accent: string; available: boolean; addon?: { name: string; price: number } };
export type CartLine = { key: string; menuId: string; name: string; unitPrice: number; quantity: number; addonName?: string };
export type Order = { id: string; number: number; createdAt: string; diningType: DiningType; lines: CartLine[]; total: number; paid: number; voidedAt?: string; voidReason?: string };
export type Snapshot = { menu: MenuItem[]; orders: Order[] };
export type Backup = Snapshot & { format: 'smallshop-pos'; version: 2; exportedAt: string };

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function record(value: unknown): asserts value is Record<string, unknown> {
  invariant(value && typeof value === 'object' && !Array.isArray(value), '資料格式不正確。');
}
function text(value: unknown, max = 120): asserts value is string {
  invariant(typeof value === 'string' && value.trim().length > 0 && value.length <= max, '文字欄位不正確。');
}
export function amount(value: unknown, max = 999999): asserts value is number {
  invariant(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max, '金額必須是 0–999,999 的整數元。');
}
function timestamp(value: unknown): asserts value is string {
  text(value, 40);
  invariant(/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), '日期格式不正確。');
}
export function validateMenu(value: unknown): asserts value is MenuItem[] {
  invariant(Array.isArray(value) && value.length > 0 && value.length <= 500, '菜單必須有 1–500 個品項。');
  const ids = new Set();
  value.forEach((item) => {
    record(item); text(item.id); text(item.name); text(item.category); amount(item.price);
    invariant(!ids.has(item.id), '菜單 ID 重複。'); ids.add(item.id);
    invariant(typeof item.available === 'boolean' && typeof item.accent === 'string' && /^#[0-9a-f]{6}$/i.test(item.accent), '菜單販售狀態或顏色不正確。');
    if (item.addon !== undefined) { record(item.addon); text(item.addon.name); amount(item.addon.price); amount(item.price + item.addon.price); }
  });
}
export function cartTotal(value: unknown): number {
  invariant(Array.isArray(value) && value.length > 0 && value.length <= 500, '請加入 1–500 個訂單品項。');
  const keys = new Set();
  const total = value.reduce((sum, line) => {
    record(line); text(line.key, 1000); text(line.menuId); text(line.name, 250); amount(line.unitPrice);
    invariant(Number.isSafeInteger(line.quantity) && Number(line.quantity) >= 1 && Number(line.quantity) <= 999, '單一品項數量必須是 1–999。');
    invariant(!keys.has(line.key), '訂單品項重複。'); keys.add(line.key);
    if (line.addonName !== undefined) text(line.addonName);
    return sum + line.unitPrice * Number(line.quantity);
  }, 0);
  amount(total);
  return total;
}
export function validateOrder(value: unknown): asserts value is Order {
  record(value); text(value.id); timestamp(value.createdAt);
  invariant(Number.isSafeInteger(value.number) && Number(value.number) > 0, '取餐號不正確。');
  invariant(value.diningType === '內用' || value.diningType === '外帶', '用餐方式不正確。');
  const total = cartTotal(value.lines); amount(value.total); amount(value.paid);
  invariant(total === value.total && value.paid >= total, '訂單金額不一致或收款不足。');
  invariant((value.voidedAt === undefined) === (value.voidReason === undefined), '作廢紀錄不完整。');
  if (value.voidedAt !== undefined) { timestamp(value.voidedAt); text(value.voidReason, 200); }
}
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  record(value); validateMenu(value.menu);
  invariant(Array.isArray(value.orders) && value.orders.length <= 100000, '訂單清單不正確或超過 100,000 筆。');
  const ids = new Set();
  value.orders.forEach((order) => { validateOrder(order); invariant(!ids.has(order.id), '訂單 ID 重複。'); ids.add(order.id); });
}
export function parseBackup(raw: string): Backup {
  invariant(raw.length <= 50 * 1024 * 1024, '備份檔超過 50 MB。');
  const data: unknown = JSON.parse(raw); record(data);
  invariant(data.format === 'smallshop-pos' && data.version === 2, '只接受小店快收第 2 版備份。');
  timestamp(data.exportedAt); validateSnapshot(data);
  return data as Backup;
}
export function makeOrder(id: string, number: number, lines: CartLine[], diningType: DiningType, paid: number): Order {
  const order = { id, number, lines: structuredClone(lines), diningType, paid, total: cartTotal(lines), createdAt: new Date().toISOString() };
  validateOrder(order);
  return order;
}
export function voidOrder(order: Order, reason: string): Order {
  invariant(!order.voidedAt, '這筆訂單已作廢。'); text(reason, 200);
  return { ...order, voidedAt: new Date().toISOString(), voidReason: reason.trim() };
}
export function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function taipeiDay(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
