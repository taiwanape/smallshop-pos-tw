import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { parseToolRoute } from '../lib/suite-paths.ts';
import { WUJIE_MENU } from '../lib/wujie-menu.ts';
import { LEGACY_SAMPLE_MENU } from '../lib/legacy-sample-menu.ts';
import {
  commitOrder,
  mergeBackup,
  openStore,
  readSnapshot,
  saveMenu,
  upgradeUntouchedMenu,
} from '../lib/pos-store.ts';
import { makeOrder } from '../lib/pos-domain.ts';
import type { Backup, CartLine } from '../lib/pos-domain.ts';
import { rebaseLexi } from '../scripts/pages-paths.mjs';

test('公開網址能直接開啟三個工具，且保留舊 demo 網址', () => {
  assert.equal(parseToolRoute(''), 'home');
  assert.equal(parseToolRoute('#/'), 'home');
  assert.equal(parseToolRoute('#/pos'), 'pos');
  assert.equal(parseToolRoute('#/demo?source=friend'), 'pos');
  assert.equal(parseToolRoute('#/classroom'), 'classroom');
  assert.equal(parseToolRoute('#/learn'), 'learn');
  assert.equal(parseToolRoute('#/learning'), 'home');
});

test('英文 app 子路徑包含 runtime base、圖示及字型，但不改作者來源網址', () => {
  const input =
    'src="/lexiharbor/_expo/a.js";baseUrl:"/lexiharbor";u=\'/lexiharbor/assets/a.png\';font="/lexiharbor/a.ttf";source="https://github.com/taiwanape/lexiharbor"';
  const output = rebaseLexi(input);
  assert.equal(
    output,
    'src="/smallshop-pos-tw/lexiharbor/_expo/a.js";baseUrl:"/smallshop-pos-tw/lexiharbor";u=\'/smallshop-pos-tw/lexiharbor/assets/a.png\';font="/smallshop-pos-tw/lexiharbor/a.ttf";source="https://github.com/taiwanape/lexiharbor"',
  );
  assert.equal(rebaseLexi(output), output);
});

test('五結原工具的 21 品項、原價及四種煎類加蛋完整保留', () => {
  assert.deepEqual(
    WUJIE_MENU.map((item) => [item.name, item.price]),
    [
      ['綜合煎', 85],
      ['蚵仔煎', 75],
      ['蝦仔煎', 75],
      ['蛋煎', 65],
      ['大腸麵線(大)', 60],
      ['大腸麵線(小)', 50],
      ['清麵線(大)', 55],
      ['清麵線(小)', 45],
      ['臭豆腐', 55],
      ['炸餛飩', 45],
      ['米粉羹(大)', 40],
      ['米粉羹(小)', 35],
      ['餛飩麵', 45],
      ['陽春麵', 45],
      ['乾麵(小)', 45],
      ['乾麵(大)', 55],
      ['魚丸湯', 45],
      ['貢丸湯', 45],
      ['餛飩湯', 45],
      ['一串心', 20],
      ['茶葉蛋', 15],
    ],
  );
  assert.deepEqual(
    WUJIE_MENU.filter((item) => item.addon).map((item) => item.addon),
    Array.from({ length: 4 }, () => ({ name: '加蛋', price: 10 })),
  );
});

const lines: CartLine[] = [
  { key: 'old', menuId: 'old', name: '舊品項', unitPrice: 60, quantity: 2 },
];
test('自動菜單升級保留歷史快照和續號，且不能覆蓋使用者修改', async () => {
  const db = await openStore(
    LEGACY_SAMPLE_MENU,
    JSON.stringify({
      menu: LEGACY_SAMPLE_MENU,
      orders: [makeOrder('old', 18, lines, '內用', 120)],
    }),
    new IDBFactory(),
  );
  const previous = (await readSnapshot(db)).orders;
  assert.equal(
    await upgradeUntouchedMenu(db, LEGACY_SAMPLE_MENU, WUJIE_MENU),
    true,
  );
  assert.deepEqual((await readSnapshot(db)).orders, previous);
  assert.equal((await commitOrder(db, 'new', lines, '外帶', 200)).number, 19);
  assert.equal(
    await upgradeUntouchedMenu(db, LEGACY_SAMPLE_MENU, WUJIE_MENU),
    false,
  );
  await assert.rejects(saveMenu(db, LEGACY_SAMPLE_MENU, 0));
  db.close();
  const custom = structuredClone(LEGACY_SAMPLE_MENU);
  custom[0].price += 5;
  const customDb = await openStore(custom, null, new IDBFactory());
  assert.equal(
    await upgradeUntouchedMenu(customDb, LEGACY_SAMPLE_MENU, WUJIE_MENU),
    false,
  );
  assert.deepEqual((await readSnapshot(customDb)).menu, custom);
  customDb.close();
});

test('系統升級的未使用帳本仍能完整還原備份，手動儲存後則保留目前菜單', async () => {
  const db = await openStore(LEGACY_SAMPLE_MENU, null, new IDBFactory());
  await upgradeUntouchedMenu(db, LEGACY_SAMPLE_MENU, WUJIE_MENU);
  const custom = structuredClone(WUJIE_MENU);
  custom[0].price = 99;
  const backup = { menu: custom, orders: [] } as unknown as Backup;
  await mergeBackup(db, backup);
  assert.equal((await readSnapshot(db)).menu[0].price, 99);
  await saveMenu(db, WUJIE_MENU, 2);
  await mergeBackup(db, backup);
  assert.equal((await readSnapshot(db)).menu[0].price, 85);
  db.close();
});
