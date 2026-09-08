import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  applyClassCommand,
  classroomCsv,
  emptyClassState,
  parseClassBackup,
  petLevel,
} from '../lib/classroom-domain.ts';
import type { ClassState, Command } from '../lib/classroom-domain.ts';
import {
  commitClassCommand,
  importClassState,
  openClassStore,
  readClassState,
} from '../lib/classroom-store.ts';

const initial = () =>
  applyClassCommand(emptyClassState(), {
    type: 'create',
    id: 'class',
    name: '五年三班',
    names: ['小安', '小晴'],
  });
const action = (
  id: string,
  kind: 'score' | 'exchange' | 'feed',
  ids = ['class-0'],
  delta = 5,
): Command => ({
  type: 'act',
  id,
  classId: 'class',
  kind,
  ids,
  delta,
  reason: '課堂努力',
  at: '2026-09-08T05:00:00.000Z',
});
test('points → food → pet growth, with level thresholds and full undo chain', () => {
  let s = initial();
  s = applyClassCommand(s, action('score', 'score'));
  s = applyClassCommand(s, action('exchange', 'exchange'));
  s = applyClassCommand(s, action('feed', 'feed'));
  assert.deepEqual(
    [
      s.classes[0].students[0].points,
      s.classes[0].students[0].food,
      s.classes[0].students[0].growth,
    ],
    [0, 0, 5],
  );
  assert.deepEqual(petLevel(20), { level: 2, progress: 0, next: 20 });
  assert.throws(
    () => applyClassCommand(s, { type: 'undo', id: 'exchange' }),
    /先撤銷/,
  );
  assert.throws(
    () => applyClassCommand(s, { type: 'undo', id: 'score' }),
    /先撤銷/,
  );
  for (const id of ['feed', 'exchange', 'score'])
    s = applyClassCommand(s, { type: 'undo', id });
  assert.deepEqual(s.classes[0].students, initial().classes[0].students);
  assert.ok(s.activities.every((e) => e.undone));
  assert.throws(
    () => applyClassCommand(s, { type: 'undo', id: 'score' }),
    /已撤銷/,
  );
});
test('a batch exchange with insufficient balance never partially changes students', () => {
  let s = applyClassCommand(initial(), action('s1', 'score'));
  s = applyClassCommand(s, action('s2', 'score', ['class-1'], 4));
  const before = structuredClone(s);
  assert.throws(
    () => applyClassCommand(s, action('x', 'exchange', ['class-0', 'class-1'])),
    /積分不足/,
  );
  assert.deepEqual(s, before);
});
test('batch feed and undo reject missing resources without mutating originals', () => {
  let s = applyClassCommand(initial(), action('s', 'score'));
  s = applyClassCommand(s, action('x', 'exchange'));
  let before = structuredClone(s);
  assert.throws(
    () => applyClassCommand(s, action('f', 'feed', ['class-0', 'class-1'])),
    /沒有食物/,
  );
  assert.deepEqual(s, before);
  s = applyClassCommand(s, action('batch', 'score', ['class-0', 'class-1']));
  s = applyClassCommand(s, action('x2', 'exchange', ['class-1']));
  before = structuredClone(s);
  assert.throws(() => applyClassCommand(s, { type: 'undo', id: 'batch' }));
  assert.deepEqual(s, before);
});
test('event IDs make uncertain action retries idempotent', () => {
  const cmd = action('one', 'score', ['class-0', 'class-0']);
  const s = applyClassCommand(initial(), cmd);
  assert.equal(s.classes[0].students[0].points, 5);
  assert.equal(s.activities[0].students.length, 1);
  assert.deepEqual(applyClassCommand(s, cmd), s);
});
test('invalid and hostile backup payloads are rejected; CSV neutralizes formulas', () => {
  for (const change of [
    (s: ClassState) => (s.classes[0].students[0].points = -1),
    (s: ClassState) => (s.classes[0].students[0].pet = 9),
    (s: ClassState) => s.classes.push(s.classes[0]),
    (s: ClassState) => s.classes[0].students.push(s.classes[0].students[0]),
  ]) {
    const s = initial();
    change(s);
    assert.throws(() => parseClassBackup(JSON.stringify(s)));
  }
  const s = initial();
  s.classes[0].students[0].name = '\t=2+2';
  assert.match(
    classroomCsv(parseClassBackup(JSON.stringify(s)).classes[0]),
    /"'\t=2\+2"/,
  );
  assert.throws(() => parseClassBackup('{broken'));
});
test('bad time, unknown student, non-integer scores never change state', () => {
  const s = initial();
  const before = structuredClone(s);
  const cmd = action('bad', 'score');
  assert.throws(() =>
    applyClassCommand(s, { ...cmd, at: 'invalid' } as Command),
  );
  assert.throws(() =>
    applyClassCommand(s, action('bad2', 'score', ['missing'])),
  );
  assert.throws(() =>
    applyClassCommand(s, action('bad3', 'score', ['class-0'], 1.5)),
  );
  assert.deepEqual(s, before);
});
test('two concurrent connections cannot spend the same points twice', async () => {
  const factory = new IDBFactory();
  const a = await openClassStore(factory, 'concurrent');
  const b = await openClassStore(factory, 'concurrent');
  await commitClassCommand(a, {
    type: 'create',
    id: 'class',
    name: '班級',
    names: ['小安'],
  });
  await commitClassCommand(a, action('score', 'score'));
  const results = await Promise.allSettled([
    commitClassCommand(a, action('x1', 'exchange')),
    commitClassCommand(b, action('x2', 'exchange')),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const s = await readClassState(a);
  assert.equal(s.classes[0].students[0].points, 0);
  assert.equal(s.classes[0].students[0].food, 1);
  assert.equal(s.activities.length, 2);
  a.close();
  b.close();
});
test('imports preserve newer local events and keep imported references consistent', async () => {
  const db = await openClassStore(new IDBFactory(), 'import');
  await commitClassCommand(db, {
    type: 'create',
    id: 'class',
    name: '班級',
    names: ['小安', '小晴'],
  });
  const backup = await readClassState(db);
  await commitClassCommand(db, action('later', 'score'));
  await importClassState(db, backup, 'copy');
  const s = await readClassState(db);
  assert.equal(s.classes.length, 2);
  assert.equal(s.classes[0].students[0].points, 5);
  assert.equal(s.classes[1].students[0].points, 0);
  assert.equal(s.activities.length, 1);
  assert.match(s.classes[1].name, /匯入/);
  const source = applyClassCommand(
    initial(),
    action('original-score', 'score'),
  );
  await importClassState(db, source, 'second');
  const next = await readClassState(db);
  const imported = next.activities.find((e) => e.id === 'second-e0')!;
  assert.equal(imported.students[0].id, next.classes[2].students[0].id);
  await commitClassCommand(db, { type: 'undo', id: imported.id });
  assert.equal((await readClassState(db)).classes[2].students[0].points, 0);
  db.close();
});
test('transaction failure keeps durable snapshot intact and data survives reopen', async () => {
  const factory = new IDBFactory();
  let db = await openClassStore(factory, 'persist');
  await commitClassCommand(db, {
    type: 'create',
    id: 'class',
    name: '班級',
    names: ['小安', '小晴'],
  });
  await commitClassCommand(db, action('score', 'score'));
  const before = await readClassState(db);
  await assert.rejects(
    commitClassCommand(db, action('batch', 'exchange', ['class-0', 'class-1'])),
  );
  assert.deepEqual(await readClassState(db), before);
  db.close();
  db = await openClassStore(factory, 'persist');
  assert.deepEqual(await readClassState(db), before);
  db.close();
});
