import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { cartTotal, csvCell, makeOrder, parseBackup, taipeiDay, validateMenu, validateSnapshot } from '../lib/pos-domain.ts';
import type { Backup, CartLine, MenuItem } from '../lib/pos-domain.ts';
import { commitOrder, commitVoid, mergeBackup, openStore, readSnapshot, saveMenu } from '../lib/pos-store.ts';

const menu: MenuItem[] = [{ id: 'm1', name: '測試麵', price: 55, category: '主食', accent: '#123456', available: true }];
const lines: CartLine[] = [{ key: 'm1:55', menuId: 'm1', name: '測試麵', unitPrice: 55, quantity: 2, addonName: undefined }];
const create = () => openStore(menu, null, new IDBFactory());

test('金額與數量必須是有界整數，收款不足不能建單', () => {
  for (const value of [-1, 12.5, Infinity, NaN, 1000000]) assert.throws(() => validateMenu([{ ...menu[0], price: value }]));
  assert.throws(() => makeOrder('a', 1, lines, '外帶', 109));
  assert.throws(() => cartTotal([{ ...lines[0], quantity: 0 }]));
  assert.throws(() => cartTotal([{ ...lines[0], quantity: 1000 }]));
  assert.equal(cartTotal(lines), 110);
});
test('兩連線同時結帳：20筆全部存在，號碼唯一', async () => {
  const factory = new IDBFactory();
  const a = await openStore(menu, null, factory);
  const b = await openStore(menu, null, factory);
  await Promise.all(Array.from({ length: 20 }, (_, i) => commitOrder(i % 2 ? a : b, `order-${i}`, lines, '外帶', 200)));
  const state = await readSnapshot(a);
  assert.equal(state.orders.length, 20);
  assert.equal(new Set(state.orders.map((order) => order.number)).size, 20);
  a.close(); b.close();
});
test('同一付款識別重試只產生一單，錯單不消耗號碼', async () => {
  const db = await create();
  await assert.rejects(commitOrder(db, 'bad', lines, '外帶', 1));
  const [a, b] = await Promise.all([commitOrder(db, 'same', lines, '外帶', 200), commitOrder(db, 'same', lines, '外帶', 200)]);
  assert.equal(a.id, b.id); assert.equal(a.number, 1);
  assert.equal((await readSnapshot(db)).orders.length, 1); db.close();
});
test('交易寫入失敗不回報成功，也沒有半筆單據', async () => {
  const db = await create();
  const original = db.transaction.bind(db);
  db.transaction = ((stores, mode, options) => {
    const tx = original(stores, mode, options);
    if (mode === 'readwrite') queueMicrotask(() => tx.abort());
    return tx;
  }) as typeof db.transaction;
  await assert.rejects(commitOrder(db, 'failure', lines, '外帶', 200));
  db.transaction = original;
  assert.equal((await readSnapshot(db)).orders.length, 0);
  const retry = await commitOrder(db, 'failure', lines, '外帶', 200);
  assert.equal(retry.number, 1); db.close();
});
test('舊資料完整遷移，損壞來源拒絕且不被刪除', async () => {
  const raw = JSON.stringify({ menu, orders: [makeOrder('old', 7, lines, '內用', 110)] });
  const db = await openStore(menu, raw, new IDBFactory());
  assert.equal((await readSnapshot(db)).orders[0].id, 'old');
  assert.equal((await commitOrder(db, 'new', lines, '外帶', 110)).number, 8);
  const factory = new IDBFactory();
  await assert.rejects(openStore(menu, '{broken', factory));
  await assert.rejects(openStore(menu, JSON.stringify({ menu, orders: [{}] }), factory));
  const repaired = await openStore(menu, raw, factory);
  assert.equal((await readSnapshot(repaired)).orders.length, 1); db.close(); repaired.close();
});
test('菜單舊版本不能覆蓋新版本；價格快照不回寫歷史單', async () => {
  const db = await create();
  await commitOrder(db, 'sale', lines, '外帶', 200);
  await saveMenu(db, [{ ...menu[0], price: 80 }], 0);
  await assert.rejects(saveMenu(db, menu, 0));
  const data = await readSnapshot(db);
  assert.equal(data.menu[0].price, 80); assert.equal(data.orders[0].total, 110); db.close();
});
test('作廢保留原單並防止重複作廢', async () => {
  const db = await create();
  await commitOrder(db, 'void', lines, '內用', 200);
  await assert.rejects(commitVoid(db, 'void', ' '));
  await commitVoid(db, 'void', '重複輸入');
  const data = await readSnapshot(db);
  assert.equal(data.orders[0].total, 110); assert.equal(data.orders[0].voidReason, '重複輸入');
  assert.equal(data.orders.filter((order) => !order.voidedAt).reduce((sum, order) => sum + order.total, 0), 0);
  await assert.rejects(commitVoid(db, 'void', '再次作廢')); db.close();
});
test('備份還原可重入，衝突取消整份交易', async () => {
  const source = await create(); const target = await create();
  await commitOrder(source, 'source', lines, '外帶', 200);
  const snap = await readSnapshot(source);
  const backup: Backup = { format: 'smallshop-pos', version: 2, exportedAt: new Date().toISOString(), menu: snap.menu, orders: snap.orders };
  const parsed = parseBackup(JSON.stringify(backup));
  assert.equal(await mergeBackup(source, parsed), 0);
  assert.equal(await mergeBackup(target, parsed), 1);
  assert.equal(await mergeBackup(target, parsed), 0);
  const conflict = structuredClone(parsed);
  conflict.orders.unshift(makeOrder('pending', 2, lines, '外帶', 200));
  conflict.orders[1].paid = 300;
  await assert.rejects(mergeBackup(target, conflict));
  assert.deepEqual((await readSnapshot(target)).orders, parsed.orders);
  source.close(); target.close();
});
test('惡意/不完整備份與重複ID被拒，CSV公式中和，營業日固定台北', () => {
  assert.throws(() => parseBackup('{"format":"other","version":2}'));
  assert.throws(() => validateSnapshot({ menu, orders: [{}] }));
  const order = makeOrder('duplicate', 1, lines, '外帶', 200);
  assert.throws(() => validateSnapshot({ menu, orders: [order, order] }));
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('麵,湯'), '"麵,湯"');
  assert.equal(taipeiDay('2026-09-07T16:01:00Z'), '2026-09-08');
});
