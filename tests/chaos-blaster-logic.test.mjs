import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { CONFIG, _internals } = require('../assets/js/chaos-blaster.js');
const { validateConfig, hits, spawnWave, splitEnemy } = _internals;

test('shipped CONFIG is valid', () => {
  assert.deepEqual(validateConfig(CONFIG), []);
});

test('CONFIG has exactly the six spec waves in ladder order', () => {
  assert.deepEqual(CONFIG.waves.map((w) => w.name), [
    'INBOX OVERLOAD', 'RECEIPT BLIZZARD', 'MISSED LEADS',
    'FOLLOW-UP DRIFT', 'TOOL SPRAWL', 'LOCK-IN',
  ]);
});

test('validateConfig flags unknown behavior and missing fields', () => {
  const bad = JSON.parse(JSON.stringify(CONFIG));
  bad.waves[0].behavior = 'moonwalk';
  delete bad.waves[1].name;
  const errs = validateConfig(bad);
  assert.ok(errs.some((e) => e.includes('moonwalk')));
  assert.ok(errs.some((e) => e.includes('name')));
});

test('hits: center-based AABB overlap', () => {
  const a = { x: 100, y: 100, w: 20, h: 20 };
  assert.ok(hits(a, { x: 110, y: 110, w: 20, h: 20 }));
  assert.ok(!hits(a, { x: 141, y: 100, w: 20, h: 20 }));
  assert.ok(!hits(a, { x: 100, y: 141, w: 20, h: 20 }));
});

test('spawnWave: cols*rows enemies, centered grid, inside bounds', () => {
  const wave = CONFIG.waves[0];
  const logical = { w: 720, h: 960 };
  const es = spawnWave(wave, logical);
  assert.equal(es.length, wave.cols * wave.rows);
  const xs = es.map((e) => e.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  assert.ok(Math.abs(mid - logical.w / 2) < 1);
  for (const e of es) {
    assert.ok(e.x - e.w / 2 > 0 && e.x + e.w / 2 < logical.w);
    assert.equal(e.hp, wave.hp);
    assert.equal(e.free, false);
    assert.equal(e.homeX, e.x);
  }
});

test('splitEnemy: sprawl spawns its chaos bits at the parent position', () => {
  const sprawl = CONFIG.waves[4];
  const parent = spawnWave(sprawl, { w: 720, h: 960 })[0];
  const bits = splitEnemy(parent);
  assert.equal(bits.length, sprawl.split.count);
  for (const b of bits) {
    assert.equal(b.x, parent.x);
    assert.equal(b.y, parent.y);
    assert.equal(b.glyph, sprawl.split.glyph);
    assert.ok(b.free);
    assert.equal(b.splitDef, null);
  }
});

test('splitEnemy: no splitDef -> no bits', () => {
  const e = spawnWave(CONFIG.waves[0], { w: 720, h: 960 })[0];
  assert.deepEqual(splitEnemy(e), []);
});
