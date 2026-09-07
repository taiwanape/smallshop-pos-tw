import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_PREVIEW_URL, previewRoute, sampleTotal } from '../lib/public-preview.ts';

test('public homepage and demo work on a GitHub Pages hash route', () => {
  assert.equal(previewRoute(''), 'home');
  assert.equal(previewRoute('#features'), 'home');
  assert.equal(previewRoute('#/'), 'home');
  assert.equal(previewRoute('#/demo'), 'demo');
  assert.equal(previewRoute('#/demo?source=friend'), 'demo');
  assert.equal(previewRoute('#/demographic'), 'home');
  assert.equal(new URL(PUBLIC_PREVIEW_URL).hostname, 'taiwanape.github.io');
});

test('homepage sample totals are integer TWD and reject invalid quantities', () => {
  assert.equal(sampleTotal({ noodles: 1, greens: 0, tea: 1 }), 85);
  assert.equal(sampleTotal({ noodles: 2, greens: 1, tea: 1 }), 185);
  assert.equal(sampleTotal({ noodles: 0, greens: 0, tea: 0 }), 0);
  assert.equal(sampleTotal({ noodles: 9, greens: 9, tea: 9 }), 1170);
  for (const quantity of [-1, 10, .5, NaN, Infinity]) assert.throws(() => sampleTotal({ noodles: quantity, greens: 0, tea: 0 }));
});
