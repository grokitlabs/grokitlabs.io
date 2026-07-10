# Chaos Blaster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the homepage easter-egg Galaga-style game specified in `docs/superpowers/specs/2026-07-10-chaos-blaster-design.md`: click the hero rocket → full-viewport canvas shooter with six problem-themed waves, animated logo-flame exhaust, and file-based chip audio.

**Architecture:** One self-contained IIFE (`assets/js/chaos-blaster.js`) exposing `window.ChaosBlaster.mount()`, lazily injected by a ≤20-line inline hook in `index.html`. Pure game logic (config validation, collision, wave spawning, splitting) is exported for Node's built-in test runner; everything visual/audio is verified in the browser via the local Jekyll preview. Audio ships as committed OGG+MP3 files rendered by a zero-dependency Node generator in `tools/gen-audio/`.

**Tech Stack:** Vanilla JS (no deps), Canvas 2D, WebAudio playback, `node:test` (Node 22 installed), ffmpeg 8 (installed at `/usr/local/bin/ffmpeg`) for audio encoding, Jekyll static site (preview server config already in `.claude/launch.json`, name `jekyll`, port 4000).

## Global Constraints

- **This repo is public.** No strategy/funnel/internal language anywhere — code comments, commit messages, and game copy describe the game only.
- Zero runtime dependencies; no package.json, no build step. `assets/js/chaos-blaster.js` must run as a plain classic script AND `require()` cleanly in Node (CommonJS export guard, no top-level DOM access).
- Nothing loads on normal page view: no game JS, no audio. First click on the rocket triggers everything.
- Palette: navy `#213770`, brand red `#e1001a`, backdrop `#0a1526`, cloud/star neutrals `#cdd8e8`/`#9aa9bf`.
- Copy verbatim from spec: victory `Chaos cleared. That’s what we do.` — game over `Chaos is fractal — it keeps coming.`
- localStorage keys: `grokitlabs.chaosBlaster.highScore`, `grokitlabs.chaosBlaster.muted`.
- Audio: files under `assets/audio/chaos-blaster/`, names `fire hit split wave playerhit gameover victory soundtrack`, formats `.ogg` + `.mp3`, sound ON by default, total ≤ ~1 MB with soundtrack ≤ 700 KB, missing/blocked audio must never break gameplay.
- Soundtrack: 45–60 s seamless minor-key loop. SFX evocative of classic arcade chip sound but 100% synthesized original work.
- `prefers-reduced-motion: reduce` disables shake, flame flicker, and hover wiggle; game stays playable.
- Never edit `_site/` (build output). Work on branch `chaos-blaster-spec`.
- All tests: `node --test tests/` must pass at the end of every task from Task 2 on.

---

### Task 1: Audio generator + committed audio assets

**Files:**
- Create: `tools/gen-audio/gen-audio.mjs`
- Create: `.gitignore` (append if it exists)
- Modify: `_config.yml` (exclude `tools` and `tests` from publish)
- Output (committed): `assets/audio/chaos-blaster/*.ogg` + `*.mp3` (8 names × 2 formats)

**Interfaces:**
- Produces: the 16 audio files later loaded by Task 7's audio manager via `assets/audio/chaos-blaster/<name>.<ext>`.

- [ ] **Step 1: Exclude non-site directories from Jekyll publish**

In `_config.yml`, change the exclude list to:

```yaml
exclude:
  - CLAUDE.md
  - README.md
  - Gemfile
  - Gemfile.lock
  - vendor
  - docs
  - tools
  - tests
```

- [ ] **Step 2: Create/append `.gitignore`**

Ensure the repo root `.gitignore` contains these lines (create the file if absent, append if present):

```
_site
tools/gen-audio/tmp/
```

- [ ] **Step 3: Write the generator**

Create `tools/gen-audio/gen-audio.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Renders Chaos Blaster's v1 sound set (synthesized chip-style audio) to WAV,
// then encodes OGG + MP3 via ffmpeg. Re-run any time to regenerate the
// committed files under assets/audio/chaos-blaster/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'assets', 'audio', 'chaos-blaster');
const TMP = join(HERE, 'tmp');
const SR = 44100;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- synth
const F = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const buf = (sec) => new Float32Array(Math.round(sec * SR));

function tone(sec, f0, f1 = f0, type = 'square', gain = 1) {
  const b = buf(sec);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / b.length;
    const f = type === 'noise' ? 0 : f0 * Math.pow(f1 / f0 || 1, t);
    phase += (TAU * f) / SR;
    const v =
      type === 'sine' ? Math.sin(phase)
      : type === 'square' ? (Math.sin(phase) > 0 ? 1 : -1)
      : type === 'saw' ? 2 * ((phase / TAU) % 1) - 1
      : Math.random() * 2 - 1; // noise
    b[i] = v * gain;
  }
  return b;
}

function decay(b, k = 5) {
  for (let i = 0; i < b.length; i++) b[i] *= Math.exp((-k * i) / b.length);
  return b;
}

function shaped(b, attack = 0.004, release = 0.02) {
  const a = Math.max(1, Math.round(attack * SR));
  const r = Math.max(1, Math.round(release * SR));
  for (let i = 0; i < b.length; i++) {
    let g = 1;
    if (i < a) g = i / a;
    if (b.length - i < r) g = Math.min(g, (b.length - i) / r);
    b[i] *= g;
  }
  return b;
}

function mix(dst, src, atSec = 0, gain = 1) {
  const o = Math.round(atSec * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * gain;
  return dst;
}

function seq(notes, type, gain) {
  const total = notes.reduce((s, n) => s + n[1], 0);
  const out = buf(total + 0.1);
  let t = 0;
  for (const [freq, dur] of notes) {
    mix(out, shaped(decay(tone(dur, freq, freq, type, gain), 2.5)), t);
    t += dur;
  }
  return out;
}

// Doom loop: 24 bars at 108 BPM (~53 s). Am-F-Dm-E pulse bass + minor arpeggio
// + a high "alarm" bend every 4th bar. Tail is crossfaded onto the head so the
// file loops seamlessly.
function song() {
  const beat = 60 / 108;
  const bar = beat * 4;
  const bars = 24;
  const xfade = 0.06;
  const out = buf(bars * bar + xfade);
  const prog = [45, 45, 41, 41, 38, 38, 40, 40]; // A2 A2 F2 F2 D2 D2 E2 E2
  const arp = [0, 3, 7, 12];
  for (let b = 0; b < bars; b++) {
    const root = prog[b % prog.length];
    const t0 = b * bar;
    for (let i = 0; i < 8; i++)
      mix(out, shaped(decay(tone(beat * 0.5, F(root), F(root), 'saw', 0.5), 3)), t0 + i * beat * 0.5, 0.8);
    for (let i = 0; i < 16; i++) {
      const n = root + 24 + arp[i % 4];
      mix(out, shaped(decay(tone(beat * 0.25, F(n), F(n), 'square', 0.22), 5)), t0 + i * beat * 0.25, 0.7);
    }
    if (b % 4 === 3)
      mix(out, shaped(decay(tone(beat, F(root + 36), F(root + 36) * 0.97, 'sine', 0.3), 2)), t0 + 3 * beat, 0.8);
  }
  const n = Math.round(xfade * SR);
  const body = out.slice(0, out.length - n);
  for (let i = 0; i < n; i++)
    body[i] = body[i] * (i / n) + out[out.length - n + i] * (1 - i / n);
  return body;
}

const SOUNDS = {
  fire: () => shaped(decay(tone(0.14, 1500, 320, 'square', 0.7), 4)),
  hit: () => {
    const b = tone(0.1, 640, 460, 'square', 0.55);
    mix(b, tone(0.05, 0, 0, 'noise', 0.35));
    return shaped(decay(b, 5));
  },
  split: () => {
    const b = tone(0.22, 330, 70, 'sine', 0.9);
    mix(b, tone(0.07, 0, 0, 'noise', 0.3));
    return shaped(decay(b, 4));
  },
  wave: () => seq([[220, 0.12], [261.63, 0.12], [329.63, 0.12], [440, 0.3]], 'square', 0.5),
  playerhit: () => {
    const b = tone(0.4, 380, 55, 'saw', 0.7);
    mix(b, tone(0.25, 0, 0, 'noise', 0.5));
    return shaped(decay(b, 3));
  },
  gameover: () => seq([[440, 0.22], [329.63, 0.22], [261.63, 0.22], [220, 0.5]], 'square', 0.45),
  victory: () => seq([[440, 0.14], [523.25, 0.14], [659.25, 0.14], [880, 0.4]], 'square', 0.5),
  soundtrack: song,
};

// ------------------------------------------------------------ WAV writer
function wav(samples) {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.9 / peak : 1;
  const d = Buffer.alloc(44 + samples.length * 2);
  d.write('RIFF', 0);
  d.writeUInt32LE(36 + samples.length * 2, 4);
  d.write('WAVEfmt ', 8);
  d.writeUInt32LE(16, 16);
  d.writeUInt16LE(1, 20);
  d.writeUInt16LE(1, 22);
  d.writeUInt32LE(SR, 24);
  d.writeUInt32LE(SR * 2, 28);
  d.writeUInt16LE(2, 32);
  d.writeUInt16LE(16, 34);
  d.write('data', 36);
  d.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    d.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * g * 32767))), 44 + i * 2);
  return d;
}

// ---------------------------------------------------------------- encode
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg not found on PATH — install it (brew install ffmpeg) and re-run.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
for (const [name, render] of Object.entries(SOUNDS)) {
  const wavPath = join(TMP, name + '.wav');
  writeFileSync(wavPath, wav(render()));
  const quality = name === 'soundtrack' ? ['-qscale:a', '3'] : ['-qscale:a', '4'];
  execFileSync('ffmpeg', ['-y', '-i', wavPath, '-ac', '1', '-c:a', 'libvorbis', ...quality, join(OUT, name + '.ogg')], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-i', wavPath, '-ac', '1', '-c:a', 'libmp3lame', '-qscale:a', '5', join(OUT, name + '.mp3')], { stdio: 'ignore' });
  const kb = (p) => Math.round(statSync(p).size / 1024);
  console.log(`${name}: ${kb(join(OUT, name + '.ogg'))} KB ogg, ${kb(join(OUT, name + '.mp3'))} KB mp3`);
}
rmSync(TMP, { recursive: true, force: true });
console.log('done →', OUT);
```

- [ ] **Step 4: Run the generator**

Run: `node tools/gen-audio/gen-audio.mjs`
Expected: one line per sound with KB sizes, then `done → …/assets/audio/chaos-blaster`. No errors.

- [ ] **Step 5: Verify durations and budget**

Run: `ffprobe -v error -show_entries format=duration -of csv=p=0 assets/audio/chaos-blaster/soundtrack.ogg && du -ch assets/audio/chaos-blaster/*.ogg | tail -1`
Expected: soundtrack duration between 45 and 60 (≈53.3), total OGG size ≤ 700 KB. If soundtrack.ogg alone exceeds 700 KB, drop its quality to `-qscale:a 2` and re-run.

Listen check (optional but recommended): `afplay` a couple of the WAVs is impossible (tmp deleted) — instead `afplay assets/audio/chaos-blaster/fire.mp3` and `afplay assets/audio/chaos-blaster/soundtrack.mp3` for a few seconds each; confirm fire sounds like a zap/pew and soundtrack is a brooding minor loop, not noise/silence.

- [ ] **Step 6: Commit**

```bash
git add _config.yml .gitignore tools/gen-audio/gen-audio.mjs assets/audio/chaos-blaster
git commit -m "Add synthesized audio set and generator for Chaos Blaster"
```

---

### Task 2: Game file skeleton — CONFIG + pure logic (TDD)

**Files:**
- Create: `assets/js/chaos-blaster.js`
- Test: `tests/chaos-blaster-logic.test.mjs`

**Interfaces:**
- Produces: `window.ChaosBlaster` / CommonJS export `{ CONFIG, _internals: { validateConfig, hits, spawnWave, splitEnemy } }`.
  - `validateConfig(cfg) -> string[]` (empty = valid)
  - `hits(a, b) -> boolean` — center-based AABB; `a`/`b` are `{x, y, w, h}` where `x,y` is the **center**
  - `spawnWave(waveDef, logical) -> Enemy[]` — `logical` is `{w, h}`
  - `splitEnemy(enemy) -> Enemy[]` — chaos bits, or `[]` when `enemy.splitDef` is null
  - Enemy shape (used by every later task): `{ glyph, color, w, h, x, y, homeX, homeY, hp, maxHp, points, free, vx, vy, phase, splitDef, splitCredit, turnT }`
- Later tasks insert code above the `// --- exports ---` marker and extend the `api` object.

- [ ] **Step 1: Write the failing tests**

Create `tests/chaos-blaster-logic.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — cannot find module `../assets/js/chaos-blaster.js`.

- [ ] **Step 3: Create the game file skeleton**

Create `assets/js/chaos-blaster.js`:

```js
/* Chaos Blaster — grokitlabs.io homepage easter egg.
 * Self-contained: no dependencies, injected on demand, never loaded with the
 * base page. Also require()-able in Node for the pure-logic tests. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  var CONFIG = {
    logical: { w: 720, h: 960 },
    player: { w: 56, h: 84, speed: 430, fireInterval: 0.16, bulletSpeed: 680, lives: 3, invulnSec: 2 },
    bullet: { w: 5, h: 16 },
    score: { waveClearBonus: 500 },
    storage: {
      highScore: 'grokitlabs.chaosBlaster.highScore',
      muted: 'grokitlabs.chaosBlaster.muted'
    },
    audio: {
      basePath: '/assets/audio/chaos-blaster/',
      formats: ['ogg', 'mp3'],
      files: ['fire', 'hit', 'split', 'wave', 'playerhit', 'gameover', 'victory', 'soundtrack'],
      sfxGain: 0.5,
      musicGain: 0.32
    },
    copy: {
      title: 'CHAOS BLASTER',
      subtitle: 'The everyday problems are coming. Clear them.',
      pressStart: 'Tap, click, or press Space to start',
      victoryLine: 'Chaos cleared. That’s what we do.',
      gameoverLine: 'Chaos is fractal — it keeps coming.',
      playAgain: 'Play again',
      retry: 'Retry',
      legendTitle: 'KNOW YOUR CHAOS',
      linkText: 'hello@grokitlabs.io',
      linkHref: 'mailto:hello@grokitlabs.io'
    },
    waves: [
      { name: 'INBOX OVERLOAD',   glyph: 'envelope', color: '#6f9bd8', cols: 6, rows: 2, size: 34,  hp: 1,  points: 50,   speed: 42, behavior: 'drift' },
      { name: 'RECEIPT BLIZZARD', glyph: 'receipt',  color: '#cdd8e8', cols: 7, rows: 3, size: 30,  hp: 1,  points: 60,   speed: 58, behavior: 'flutter' },
      { name: 'MISSED LEADS',     glyph: 'lead',     color: '#e4b54a', cols: 6, rows: 2, size: 34,  hp: 1,  points: 80,   speed: 64, behavior: 'dive' },
      { name: 'FOLLOW-UP DRIFT',  glyph: 'clock',    color: '#a07bd8', cols: 6, rows: 2, size: 34,  hp: 2,  points: 90,   speed: 66, behavior: 'regroup' },
      { name: 'TOOL SPRAWL',      glyph: 'sprawl',   color: '#e1001a', cols: 4, rows: 1, size: 52,  hp: 3,  points: 120,  speed: 52, behavior: 'drift',
        split: { glyph: 'chaos', color: '#ff5a4e', count: 3, size: 22, hp: 1, points: 40, speed: 130 } },
      { name: 'LOCK-IN',          glyph: 'boss',     color: '#e1001a', cols: 1, rows: 1, size: 120, hp: 24, points: 1000, speed: 90, behavior: 'boss',
        split: { glyph: 'chaos', color: '#ff5a4e', count: 3, size: 22, hp: 1, points: 40, speed: 130, everyHp: 6 } }
    ]
  };

  // ------------------------------------------------------------ pure logic
  var GLYPH_NAMES = ['envelope', 'receipt', 'lead', 'clock', 'sprawl', 'chaos', 'boss'];
  var BEHAVIORS = ['drift', 'flutter', 'dive', 'regroup', 'boss'];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function hits(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
  }

  function validateConfig(cfg) {
    var errs = [];
    if (!cfg || !Array.isArray(cfg.waves) || cfg.waves.length === 0) {
      return ['waves must be a non-empty array'];
    }
    cfg.waves.forEach(function (w, i) {
      var at = 'wave ' + i + ': ';
      if (typeof w.name !== 'string' || !w.name) errs.push(at + 'missing name');
      if (GLYPH_NAMES.indexOf(w.glyph) === -1) errs.push(at + 'unknown glyph "' + w.glyph + '"');
      if (typeof w.color !== 'string') errs.push(at + 'missing color');
      if (!(w.cols >= 1) || !(w.rows >= 1)) errs.push(at + 'cols/rows must be >= 1');
      if (!(w.size > 0)) errs.push(at + 'size must be > 0');
      if (!(w.hp >= 1)) errs.push(at + 'hp must be >= 1');
      if (!(w.points >= 0)) errs.push(at + 'points must be >= 0');
      if (!(w.speed > 0)) errs.push(at + 'speed must be > 0');
      if (BEHAVIORS.indexOf(w.behavior) === -1) errs.push(at + 'unknown behavior "' + w.behavior + '"');
      if (w.split) {
        if (GLYPH_NAMES.indexOf(w.split.glyph) === -1) errs.push(at + 'split: unknown glyph');
        if (!(w.split.count >= 1)) errs.push(at + 'split: count must be >= 1');
        if (!(w.split.size > 0) || !(w.split.hp >= 1) || !(w.split.points >= 0) || !(w.split.speed > 0)) {
          errs.push(at + 'split: size/hp/points/speed invalid');
        }
      }
    });
    return errs;
  }

  function spawnWave(waveDef, logical) {
    var enemies = [];
    var spacingX = waveDef.size * 1.7;
    var spacingY = waveDef.size * 1.6;
    var startX = (logical.w - (waveDef.cols - 1) * spacingX) / 2;
    for (var r = 0; r < waveDef.rows; r++) {
      for (var c = 0; c < waveDef.cols; c++) {
        enemies.push({
          glyph: waveDef.glyph, color: waveDef.color,
          w: waveDef.size, h: waveDef.size,
          x: startX + c * spacingX, y: 130 + r * spacingY,
          homeX: startX + c * spacingX, homeY: 130 + r * spacingY,
          hp: waveDef.hp, maxHp: waveDef.hp, points: waveDef.points,
          free: false, vx: 0, vy: 0, phase: Math.random() * TAU,
          splitDef: waveDef.split || null, splitCredit: 0, turnT: 0
        });
      }
    }
    return enemies;
  }

  function splitEnemy(enemy) {
    if (!enemy.splitDef) return [];
    var d = enemy.splitDef;
    var bits = [];
    for (var i = 0; i < d.count; i++) {
      var ang = -Math.PI / 2 + (i - (d.count - 1) / 2) * 0.7;
      bits.push({
        glyph: d.glyph, color: d.color, w: d.size, h: d.size,
        x: enemy.x, y: enemy.y, homeX: enemy.x, homeY: enemy.y,
        hp: d.hp, maxHp: d.hp, points: d.points,
        free: true,
        vx: Math.cos(ang) * d.speed,
        vy: Math.sin(ang) * d.speed * 0.6 + 40,
        phase: Math.random() * TAU,
        splitDef: null, splitCredit: 0, turnT: 0.4
      });
    }
    return bits;
  }

  // --- exports ---
  var api = {
    CONFIG: CONFIG,
    _internals: { validateConfig: validateConfig, hits: hits, spawnWave: spawnWave, splitEnemy: splitEnemy }
  };
  if (typeof window !== 'undefined') window.ChaosBlaster = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/js/chaos-blaster.js tests/chaos-blaster-logic.test.mjs
git commit -m "Add Chaos Blaster config and pure game logic with node:test coverage"
```

---
### Task 3: Overlay shell — mount/unmount, input, loop, title screen

**Files:**
- Modify: `assets/js/chaos-blaster.js` (insert above the `// --- exports ---` marker; extend `api`)
- Modify: `styles.css` (append overlay styles)

**Interfaces:**
- Consumes: `CONFIG`, `clamp`, `TAU` from Task 2.
- Produces:
  - `api.mount()` / `api.unmount()` — open/close the game overlay
  - module-scope `state` object: `{ mode: 'title'|'banner'|'playing'|'gameover'|'victory', t, score, lives, highScore, waveIndex, bannerT, timeSinceKill, diveT, shake, player: {x,y,w,h,cooldown,invuln}, bullets: [], enemies: [], particles: [], stars: [], formation: {x,y,dir} }`
  - module-scope `input` `{ left, right, fire, touch, down, pointerX, dragDx }`
  - `audio` **stub** `{ init, play, startMusic, stopMusic, setRate, suspend, resume, toggleMuted, isMuted }` (real manager replaces it in Task 7)
  - functions later tasks replace: `startGame()`, `onAgainClick()`, `drawWorld()`, `drawHud()`, `update(dt)`
  - `reducedMotion` boolean read once from `matchMedia('(prefers-reduced-motion: reduce)')`
- Note: this task has no meaningful pure-logic surface — it is DOM/loop wiring, verified in the browser. `node --test tests/` must still pass (the file must stay `require()`-safe: no DOM access outside functions).

- [ ] **Step 1: Insert the shell code**

In `assets/js/chaos-blaster.js`, insert the following block immediately above the `// --- exports ---` line:

```js
  // ------------------------------------------------------------ game shell
  var overlay = null, canvas = null, ctx = null, raf = 0, lastT = 0, paused = false;
  var state = null;
  var input = { left: false, right: false, fire: false, touch: false, down: false, pointerX: 0, dragDx: 0 };
  var reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stub — replaced by the real WebAudio manager in a later task.
  var audio = {
    init: function () {}, play: function () {}, startMusic: function () {},
    stopMusic: function () {}, setRate: function () {}, suspend: function () {},
    resume: function () {}, toggleMuted: function () { return true; },
    isMuted: function () { return true; }
  };

  function readHighScore() {
    try { return Number(localStorage.getItem(CONFIG.storage.highScore)) || 0; } catch (e) { return 0; }
  }

  function newGame() {
    var stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * CONFIG.logical.w, y: Math.random() * CONFIG.logical.h,
        r: Math.random() * 1.8 + 0.4, a: Math.random() * 0.25 + 0.05
      });
    }
    state = {
      mode: 'title', t: 0, score: 0, lives: CONFIG.player.lives,
      highScore: readHighScore(),
      waveIndex: -1, bannerT: 0, timeSinceKill: 0, diveT: 2.5, shake: 0,
      player: {
        x: CONFIG.logical.w / 2, y: CONFIG.logical.h - 90,
        w: CONFIG.player.w, h: CONFIG.player.h, cooldown: 0, invuln: 0
      },
      bullets: [], enemies: [], particles: [], stars: stars,
      formation: { x: 0, y: 0, dir: 1 }
    };
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'cb-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Chaos Blaster game');
    overlay.innerHTML =
      '<canvas class="cb-canvas"></canvas>' +
      '<div class="cb-chrome">' +
        '<button type="button" class="cb-mute" aria-pressed="false">SOUND ON</button>' +
        '<button type="button" class="cb-close" aria-label="Close game">&#10005;</button>' +
      '</div>' +
      '<div class="cb-end" hidden>' +
        // TJ cameo slot — swap this burst for mascot art when it exists.
        '<div class="cb-end-cameo" aria-hidden="true">&#10038;</div>' +
        '<h2 class="cb-end-line"></h2>' +
        '<p class="cb-end-score"></p>' +
        '<button type="button" class="cb-again"></button>' +
        '<p class="cb-end-link"><a href="#"></a></p>' +
      '</div>';
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('.cb-canvas');
    ctx = canvas.getContext('2d');
    overlay.querySelector('.cb-close').addEventListener('click', unmount);
    overlay.querySelector('.cb-mute').addEventListener('click', onMuteClick);
    overlay.querySelector('.cb-again').addEventListener('click', onAgainClick);
    var link = overlay.querySelector('.cb-end-link a');
    link.href = CONFIG.copy.linkHref;
    link.textContent = CONFIG.copy.linkText;

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (paused) audio.suspend(); else { audio.resume(); lastT = 0; }
    });

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      input.touch = e.pointerType !== 'mouse';
      input.pointerX = e.clientX;
      input.down = true;
      if (state && state.mode === 'title') startGame();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!input.down) return;
      var scale = canvas.clientWidth / CONFIG.logical.w;
      input.dragDx += (e.clientX - input.pointerX) / scale;
      input.pointerX = e.clientX;
    });
    canvas.addEventListener('pointerup', function () { input.down = false; });
    resize();
  }

  function resize() {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var scale = Math.min(window.innerWidth / CONFIG.logical.w, window.innerHeight / CONFIG.logical.h);
    canvas.style.width = CONFIG.logical.w * scale + 'px';
    canvas.style.height = CONFIG.logical.h * scale + 'px';
    canvas.width = Math.round(CONFIG.logical.w * scale * dpr);
    canvas.height = Math.round(CONFIG.logical.h * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  function onKeyDown(e) {
    if (!overlay || overlay.hidden) return;
    if (e.key === 'Escape') { unmount(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = true;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = true;
    else if (e.key === ' ') {
      e.preventDefault();
      if (state.mode === 'title') startGame(); else input.fire = true;
    } else if (e.key === 'Tab') trapFocus(e);
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
    else if (e.key === ' ') input.fire = false;
  }

  function trapFocus(e) {
    var focusables = overlay.querySelectorAll('button, a[href]');
    var list = Array.prototype.filter.call(focusables, function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onMuteClick() {
    var muted = audio.toggleMuted();
    var btn = overlay.querySelector('.cb-mute');
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  }

  function onAgainClick() { /* wired up when end screens land */ }

  function startGame() { state.mode = 'playing'; } // replaced when waves land

  function mount() {
    if (!overlay) build();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.cb-end').hidden = true;
    newGame();
    audio.init();
    audio.startMusic();
    var btn = overlay.querySelector('.cb-mute');
    btn.setAttribute('aria-pressed', audio.isMuted() ? 'true' : 'false');
    btn.textContent = audio.isMuted() ? 'SOUND OFF' : 'SOUND ON';
    paused = false;
    lastT = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    overlay.querySelector('.cb-close').focus();
  }

  function unmount() {
    cancelAnimationFrame(raf);
    audio.stopMusic();
    overlay.hidden = true;
    document.body.style.overflow = '';
    var rocket = document.getElementById('hero-rocket');
    if (rocket) rocket.focus();
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (paused) { lastT = 0; return; }
    if (!lastT) { lastT = t; return; }
    var dt = clamp((t - lastT) / 1000, 0, 1 / 30);
    lastT = t;
    state.t += dt;
    update(dt);
    render();
  }

  function update(dt) {
    state.shake = Math.max(0, state.shake - dt * 2);
    // gameplay systems land in later tasks
  }

  function render() {
    var w = CONFIG.logical.w, h = CONFIG.logical.h;
    ctx.save();
    if (!reducedMotion && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    var g = ctx.createRadialGradient(w / 2, h * 0.35, 80, w / 2, h * 0.55, h * 0.8);
    g.addColorStop(0, '#12203a');
    g.addColorStop(1, '#0a1526');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.fillStyle = '#ffffff';
    state.stars.forEach(function (s) {
      ctx.globalAlpha = s.a;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (state.mode === 'title') drawTitle();
    drawWorld();
    drawHud();
    ctx.restore();
  }

  function drawTitle() {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e1001a';
    ctx.font = 'bold 56px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(CONFIG.copy.title, CONFIG.logical.w / 2, 330);
    ctx.fillStyle = '#cdd8e8';
    ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(CONFIG.copy.subtitle, CONFIG.logical.w / 2, 380);
    ctx.fillText(CONFIG.copy.pressStart, CONFIG.logical.w / 2, 560);
  }

  function drawWorld() { /* player/enemies land in later tasks */ }
  function drawHud() { /* lands with game flow */ }
```

Then change the `api` object at the bottom to:

```js
  var api = {
    mount: mount,
    unmount: unmount,
    CONFIG: CONFIG,
    _internals: { validateConfig: validateConfig, hits: hits, spawnWave: spawnWave, splitEnemy: splitEnemy }
  };
```

- [ ] **Step 2: Append overlay styles to `styles.css`**

```css
/* --- Chaos Blaster overlay (nothing loads until the hero rocket is clicked) --- */
.cb-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(7, 13, 24, 0.97); display: flex; align-items: center; justify-content: center; }
.cb-overlay[hidden] { display: none; }
.cb-canvas { display: block; touch-action: none; }
.cb-chrome { position: absolute; top: 12px; right: 14px; display: flex; gap: 10px; }
.cb-chrome button { background: rgba(205, 216, 232, 0.12); color: #cdd8e8; border: 1px solid rgba(205, 216, 232, 0.35); border-radius: 6px; font: 600 13px/1 "Helvetica Neue", Arial, sans-serif; padding: 9px 12px; cursor: pointer; }
.cb-chrome button:hover, .cb-chrome button:focus-visible { background: rgba(205, 216, 232, 0.25); }
.cb-end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; background: rgba(10, 21, 38, 0.82); color: #cdd8e8; font-family: "Helvetica Neue", Arial, sans-serif; padding: 24px; }
.cb-end[hidden] { display: none; }
.cb-end-cameo { color: #e1001a; font-size: 54px; line-height: 1; }
.cb-end h2 { color: #ffffff; font-size: 30px; margin: 0; }
.cb-end-score { font-size: 18px; margin: 0; }
.cb-again { background: #e1001a; border: none; color: #ffffff; font: 700 16px/1 "Helvetica Neue", Arial, sans-serif; border-radius: 8px; padding: 14px 26px; cursor: pointer; }
.cb-again:hover, .cb-again:focus-visible { background: #b80016; }
.cb-end-link a { color: #9aa9bf; }
```

- [ ] **Step 3: Node tests still pass**

Run: `node --test tests/`
Expected: all PASS (proves the file is still `require()`-safe with no top-level DOM access).

- [ ] **Step 4: Verify in the browser**

1. Start the `jekyll` preview server (`preview_start` with name `jekyll`), open `http://localhost:4000/`.
2. Inject and mount via `preview_eval`:
   ```js
   (() => { const s = document.createElement('script'); s.src = '/assets/js/chaos-blaster.js'; s.onload = () => window.ChaosBlaster.mount(); document.head.appendChild(s); return 'injected'; })()
   ```
3. `preview_screenshot`: dark overlay with starfield, CHAOS BLASTER title, subtitle, start line; SOUND OFF (stub) and ✕ buttons top-right.
4. `preview_console_logs` (level error): none.
5. `preview_click` on `.cb-close`: overlay disappears, page scroll restored (`preview_eval`: `document.body.style.overflow === ''`).
6. Re-mount via `preview_eval` `window.ChaosBlaster.mount()`; press Escape via `preview_eval`: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` — overlay closes.

- [ ] **Step 5: Commit**

```bash
git add assets/js/chaos-blaster.js styles.css
git commit -m "Add Chaos Blaster overlay shell: mount/unmount, input, render loop, title screen"
```

---

### Task 4: Player rocket with animated flames, bullets, particles

**Files:**
- Modify: `assets/js/chaos-blaster.js`

**Interfaces:**
- Consumes: `state`, `input`, `audio`, `clamp`, `reducedMotion` from Task 3.
- Produces:
  - `ROCKET` path-data table + `buildRocketPaths()` / `rocketPaths` (`{ body: Path2D[], flames: Path2D[], window: Path2D }`) — reused by Task 6's `drawMiniRocket`
  - `updatePlayer(dt)`, `updateBullets(dt)`, `updateParticles(dt)`
  - `drawPlayer(p)`, `drawBullets()`, `drawParticles()`
  - `spark(x, y, color, n)` — particle burst, reused by Task 5 for hits/deaths
  - Bullet shape: `{ x, y, w, h, vy }` (center-based, works with `hits()`)

- [ ] **Step 1: Insert the player/bullet/particle code**

Insert above `// --- exports ---` (the path data below is copied verbatim from the rocket vector in `assets/logo.svg` / the `index.html` hero — same numbers, single source of truth for the ship's look):

```js
  // ---------------------------------------------------- player + projectiles
  var ROCKET = {
    bounds: { x: 136.0, y: 47.8, w: 37.95, h: 58.0 },
    flameTopY: 89.3,
    body: [
      'M 150.574219 86.914062 L 144.40625 86.886719 L 145.65625 79.152344 L 149.386719 79.167969 Z',
      'M 165.222656 86.972656 L 159.054688 86.945312 L 160.304688 79.085938 L 164.035156 79.101562 Z',
      'M 157.894531 86.941406 L 151.722656 86.917969 L 152.96875 80.636719 L 156.699219 80.652344 Z',
      'M 142.648438 75.535156 L 136.011719 75.507812 L 136.023438 72.210938 L 142.957031 67.167969 Z',
      'M 166.441406 75.628906 L 173.925781 75.660156 L 173.9375 72.363281 L 167.046875 67.265625 Z',
      'M 141.578125 70.046875 L 146.746094 70.066406 C 146.730469 74.554688 150.363281 78.214844 154.847656 78.234375 C 159.335938 78.253906 162.996094 74.617188 163.015625 70.132812 L 168.1875 70.152344 C 168.15625 77.488281 162.164062 83.433594 154.828125 83.402344 C 147.492188 83.375 141.546875 77.382812 141.578125 70.046875',
      'M 146.820312 71.164062 L 141.652344 71.164062 L 141.652344 61.070312 L 146.832031 59.570312 Z',
      'M 163.019531 71.164062 L 168.1875 71.164062 L 168.257812 61.015625 L 163.089844 59.90625 Z',
      'M 168.261719 61.015625 L 163.089844 61.066406 C 163.042969 56.582031 159.359375 52.96875 154.871094 53.015625 C 150.386719 53.058594 146.777344 56.746094 146.820312 61.230469 L 141.652344 61.28125 C 141.578125 53.945312 147.488281 47.917969 154.820312 47.847656 C 162.15625 47.773438 168.1875 53.679688 168.261719 61.015625'
    ],
    flames: [
      'M 150.253906 89.308594 L 148.8125 105.792969 L 146.066406 105.785156 L 144.757812 89.285156 Z',
      'M 157.324219 89.335938 L 155.898438 101.699219 L 153.152344 101.6875 L 151.824219 89.316406 Z',
      'M 164.78125 89.367188 L 163.375 97.410156 L 160.628906 97.398438 L 159.285156 89.347656 Z'
    ],
    window: 'M 154.917969 56.34375 C 157.007812 56.324219 158.71875 58 158.742188 60.089844 C 158.761719 62.179688 157.082031 63.894531 154.992188 63.914062 C 152.902344 63.933594 151.191406 62.257812 151.171875 60.167969 C 151.148438 58.074219 152.828125 56.363281 154.917969 56.34375'
  };
  var rocketPaths = null;
  function buildRocketPaths() {
    rocketPaths = {
      body: ROCKET.body.map(function (d) { return new Path2D(d); }),
      flames: ROCKET.flames.map(function (d) { return new Path2D(d); }),
      window: new Path2D(ROCKET.window)
    };
  }

  function drawPlayer(p) {
    if (!rocketPaths) buildRocketPaths();
    var s = p.h / ROCKET.bounds.h;
    ctx.save();
    if (p.invuln > 0 && Math.floor(state.t * 12) % 2) ctx.globalAlpha = 0.35;
    ctx.translate(p.x - (ROCKET.bounds.x + ROCKET.bounds.w / 2) * s, p.y - (ROCKET.bounds.y + ROCKET.bounds.h / 2) * s);
    ctx.scale(s, s);
    // exhaust glow, breathing with the flames
    var glow = reducedMotion ? 0.45 : 0.3 + 0.3 * Math.abs(Math.sin(state.t * 23));
    var g = ctx.createRadialGradient(155, 100, 2, 155, 100, 26);
    g.addColorStop(0, 'rgba(255, 140, 60, ' + glow + ')');
    g.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(129, 74, 52, 52);
    // flames: logo shapes, length flickering independently
    ctx.fillStyle = '#e1001a';
    rocketPaths.flames.forEach(function (path, i) {
      var flick = reducedMotion ? 1
        : 0.72 + 0.38 * (0.5 + 0.5 * Math.sin(state.t * 31 + i * 2.1)) + 0.08 * Math.sin(state.t * 57 + i * 5);
      ctx.save();
      ctx.translate(0, ROCKET.flameTopY);
      ctx.scale(1, flick);
      ctx.translate(0, -ROCKET.flameTopY);
      ctx.fill(path);
      ctx.restore();
    });
    ctx.fillStyle = '#213770';
    rocketPaths.body.forEach(function (path) { ctx.fill(path); });
    ctx.fillStyle = '#e1001a';
    ctx.fill(rocketPaths.window);
    ctx.restore();
  }

  function updatePlayer(dt) {
    var p = state.player;
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.x += dir * CONFIG.player.speed * dt + input.dragDx;
    input.dragDx = 0;
    p.x = clamp(p.x, p.w / 2 + 10, CONFIG.logical.w - p.w / 2 - 10);
    p.invuln = Math.max(0, p.invuln - dt);
    p.cooldown -= dt;
    var firing = input.fire || (input.touch && state.mode === 'playing');
    if (firing && p.cooldown <= 0 && state.mode === 'playing') {
      p.cooldown = CONFIG.player.fireInterval;
      state.bullets.push({
        x: p.x, y: p.y - p.h / 2 - 6,
        w: CONFIG.bullet.w, h: CONFIG.bullet.h,
        vy: -CONFIG.player.bulletSpeed
      });
      spark(p.x, p.y - p.h / 2 - 8, '#ffb347', 3);
      audio.play('fire');
    }
  }

  function updateBullets(dt) {
    state.bullets = state.bullets.filter(function (b) {
      b.y += b.vy * dt;
      return b.y > -30;
    });
  }

  function spark(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      state.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160 - 30,
        life: 0.35 + Math.random() * 0.25,
        color: color, r: 1.5 + Math.random() * 2
      });
    }
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter(function (pt) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      return pt.life > 0;
    });
  }

  function drawBullets() {
    ctx.fillStyle = '#e1001a';
    state.bullets.forEach(function (b) { ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h); });
  }

  function drawParticles() {
    state.particles.forEach(function (pt) {
      ctx.globalAlpha = Math.max(0, pt.life / 0.6);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
```

- [ ] **Step 2: Wire into the loop**

Replace the Task 3 bodies of `update` and `drawWorld` with:

```js
  function update(dt) {
    state.shake = Math.max(0, state.shake - dt * 2);
    if (state.mode === 'playing' || state.mode === 'title') updatePlayer(dt);
    updateBullets(dt);
    updateParticles(dt);
  }

  function drawWorld() {
    drawParticles();
    drawBullets();
    drawPlayer(state.player);
  }
```

- [ ] **Step 3: Node tests still pass**

Run: `node --test tests/`
Expected: all PASS.

- [ ] **Step 4: Verify in the browser**

1. Reload `http://localhost:4000/`, inject + mount (same snippet as Task 3 Step 4).
2. `preview_screenshot`: the logo rocket sits near the bottom of the title screen with visibly varying flame lengths between two screenshots taken a second apart (take two, compare flame region).
3. Start the game (`preview_eval`: `window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`), hold ArrowRight down via two evals (`keydown` then, after a screenshot, `keyup`): rocket moved right.
4. Fire: dispatch `keydown` `' '` again — screenshot shows red bullets streaming upward and muzzle sparks.
5. `preview_console_logs` errors: none.

- [ ] **Step 5: Commit**

```bash
git add assets/js/chaos-blaster.js
git commit -m "Add player rocket with animated logo-flame exhaust, bullets, particles"
```

---

### Task 5: Enemies — glyphs, waves, behaviors, splitting, collisions, lives

**Files:**
- Modify: `assets/js/chaos-blaster.js`

**Interfaces:**
- Consumes: `spawnWave`, `splitEnemy`, `hits` (Task 2); `state`, `audio` (Task 3); `spark` (Task 4).
- Produces:
  - `GLYPHS` — `{ envelope, receipt, lead, clock, sprawl, chaos, boss }`, each `function (s)` drawing centered at the current origin with the current `strokeStyle` (used by Task 6's legend)
  - `startWave(i)` (Task 6 extends it with the banner), `updateEnemies(dt)`, `collide()`, `playerHit()`, `endGame(won)` (stub — Task 6 completes), `waveCleared()`
  - `api._debug = { getState, startWave }` for playtesting (skip to any wave)
- Replaces: Task 3's `startGame` stub body; Task 4's `update`/`drawWorld` bodies.

- [ ] **Step 1: Insert enemy glyphs and systems**

Insert above `// --- exports ---`:

```js
  // ------------------------------------------------------------- enemies
  // Each glyph draws centered on the origin at size s using current stroke.
  var GLYPHS = {
    envelope: function (s) {
      var w = s, h = s * 0.72;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, h * 0.08); ctx.lineTo(w / 2, -h / 2);
      ctx.stroke();
    },
    receipt: function (s) {
      var w = s * 0.72, h = s;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(w / 4, h / 2 - 5); ctx.lineTo(0, h / 2); ctx.lineTo(-w / 4, h / 2 - 5); ctx.lineTo(-w / 2, h / 2);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.22); ctx.lineTo(w * 0.3, -h * 0.22);
      ctx.moveTo(-w * 0.3, 0.02 * h); ctx.lineTo(w * 0.3, 0.02 * h);
      ctx.stroke();
    },
    lead: function (s) {
      ctx.beginPath();
      ctx.moveTo(0, s / 2); ctx.lineTo(-s * 0.38, -s / 2); ctx.lineTo(0, -s * 0.2); ctx.lineTo(s * 0.38, -s / 2);
      ctx.closePath(); ctx.stroke();
    },
    clock: function (s) {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.3);
      ctx.moveTo(0, 0); ctx.lineTo(s * 0.2, s * 0.08);
      ctx.stroke();
    },
    sprawl: function (s) {
      var r = s * 0.18;
      var pts = [[-s * 0.3, s * 0.18], [s * 0.3, s * 0.18], [0, -s * 0.32]];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.closePath(); ctx.stroke();
      pts.forEach(function (p) { ctx.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2); });
    },
    chaos: function (s) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var ang = (i / 10) * TAU;
        var rad = i % 2 ? s * 0.22 : s * 0.5;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath(); ctx.stroke();
    },
    boss: function (s) {
      var w = s * 0.7, h = s * 0.5;
      ctx.strokeRect(-w / 2, -h * 0.1, w, h);
      ctx.beginPath(); ctx.arc(0, -h * 0.1, w * 0.32, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, h * 0.12, s * 0.06, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * 0.16); ctx.lineTo(0, h * 0.3); ctx.stroke();
    }
  };

  function drawEnemies() {
    state.enemies.forEach(function (e) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      if (e.maxHp > 1 && e.hp < e.maxHp) ctx.globalAlpha = 0.55 + 0.45 * (e.hp / e.maxHp);
      GLYPHS[e.glyph](e.w);
      ctx.restore();
    });
  }

  function startWave(i) {
    state.waveIndex = i;
    state.enemies = spawnWave(CONFIG.waves[i], CONFIG.logical);
    state.formation = { x: 0, y: 0, dir: 1 };
    state.timeSinceKill = 0;
    state.diveT = 2.5;
    state.mode = 'playing';
  }

  function formationBounds() {
    var min = Infinity, max = -Infinity, found = false;
    state.enemies.forEach(function (e) {
      if (e.free) return;
      found = true;
      min = Math.min(min, e.homeX - e.w / 2);
      max = Math.max(max, e.homeX + e.w / 2);
    });
    return found ? { min: min, max: max } : null;
  }

  function updateEnemies(dt) {
    var wave = CONFIG.waves[state.waveIndex];
    if (!wave) return;
    state.timeSinceKill += dt;
    var b = formationBounds();
    if (b) {
      state.formation.x += state.formation.dir * wave.speed * dt;
      if (b.min + state.formation.x < 24 || b.max + state.formation.x > CONFIG.logical.w - 24) {
        state.formation.dir *= -1;
        state.formation.y += 14;
      }
      if (wave.behavior === 'regroup') {
        // left alone, the wave slides back up and regains ground
        state.formation.y += (state.timeSinceKill > 3.5 ? -22 : 7) * dt;
        if (state.formation.y < 0) state.formation.y = 0;
      }
    }
    if (wave.behavior === 'dive') {
      state.diveT -= dt;
      if (state.diveT <= 0) {
        state.diveT = 2.2;
        var slotted = state.enemies.filter(function (e) { return !e.free; });
        if (slotted.length) {
          var d = slotted[Math.floor(Math.random() * slotted.length)];
          d.free = true;
          d.vx = (state.player.x - d.x) * 0.6;
          d.vy = wave.speed * 3.2;
        }
      }
    }
    state.enemies.forEach(function (e) {
      if (e.glyph === 'boss') {
        e.free = true;
        e.phase += dt;
        e.x = CONFIG.logical.w / 2 + Math.sin(e.phase * 0.8) * (CONFIG.logical.w / 2 - 120);
        e.y = 190 + Math.sin(e.phase * 2.3) * 46;
        return;
      }
      if (e.free) {
        if (e.glyph === 'chaos') {
          e.turnT -= dt;
          if (e.turnT <= 0) {
            e.turnT = 0.5 + Math.random() * 0.5;
            var ang = Math.random() * TAU;
            var sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 120;
            e.vx = Math.cos(ang) * sp;
            e.vy = Math.abs(Math.sin(ang)) * sp * 0.7 + 40;
          }
          if ((e.x < e.w && e.vx < 0) || (e.x > CONFIG.logical.w - e.w && e.vx > 0)) e.vx *= -1;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y > CONFIG.logical.h + e.h) {
          if (e.glyph === 'chaos') {
            e.y = -e.h; // wraps back in — pressure stays until it's dealt with
          } else {
            e.free = false;
            e.vx = e.vy = 0;
          }
        }
      } else {
        var jx = 0, jy = 0;
        if (wave.behavior === 'flutter') {
          jx = Math.sin(state.t * 2.1 + e.phase) * 10;
          jy = Math.sin(state.t * 3.3 + e.phase) * 7;
        }
        e.x = e.homeX + state.formation.x + jx;
        e.y = e.homeY + state.formation.y + jy;
      }
    });
  }

  function killEnemy(e) {
    state.score += e.points;
    state.timeSinceKill = 0;
    spark(e.x, e.y, e.color, 8);
    state.enemies = state.enemies.filter(function (x) { return x !== e; });
    var bits = splitEnemy(e);
    if (bits.length) {
      audio.play('split');
      state.enemies = state.enemies.concat(bits);
    } else {
      audio.play('hit');
    }
  }

  function collide() {
    var p = state.player;
    state.bullets = state.bullets.filter(function (bl) {
      var hitE = null;
      for (var i = 0; i < state.enemies.length; i++) {
        if (hits(bl, state.enemies[i])) { hitE = state.enemies[i]; break; }
      }
      if (!hitE) return true;
      hitE.hp -= 1;
      spark(bl.x, bl.y, '#ffffff', 2);
      if (hitE.splitDef && hitE.splitDef.everyHp && hitE.hp > 0) {
        // the boss sheds chaos as it fractures
        hitE.splitCredit += 1;
        if (hitE.splitCredit >= hitE.splitDef.everyHp) {
          hitE.splitCredit = 0;
          audio.play('split');
          state.enemies = state.enemies.concat(splitEnemy(hitE));
        }
      }
      if (hitE.hp <= 0) killEnemy(hitE); else audio.play('hit');
      return false;
    });
    if (p.invuln <= 0) {
      for (var j = 0; j < state.enemies.length; j++) {
        if (hits(p, state.enemies[j])) { playerHit(); break; }
      }
    }
    for (var k = 0; k < state.enemies.length; k++) {
      var e = state.enemies[k];
      if (!e.free && e.y > CONFIG.logical.h - 190) {
        playerHit();
        state.formation.y -= 240; // breach pushes the wave back up
        break;
      }
    }
  }

  function playerHit() {
    state.player.invuln = CONFIG.player.invulnSec;
    state.shake = 1;
    audio.play('playerhit');
    spark(state.player.x, state.player.y, '#e1001a', 14);
    state.lives -= 1;
    if (state.lives <= 0) endGame(false);
  }

  function endGame(won) {
    state.mode = won ? 'victory' : 'gameover'; // end screens land in the next task
  }

  function waveCleared() {
    state.score += CONFIG.score.waveClearBonus;
    if (state.waveIndex + 1 >= CONFIG.waves.length) endGame(true);
    else startWave(state.waveIndex + 1);
  }
```

- [ ] **Step 2: Wire into the loop and expose debug hooks**

Replace the `startGame` body from Task 3 and the `update`/`drawWorld` bodies from Task 4:

```js
  function startGame() { startWave(0); }

  function update(dt) {
    state.shake = Math.max(0, state.shake - dt * 2);
    if (state.mode === 'playing' || state.mode === 'title') updatePlayer(dt);
    updateBullets(dt);
    updateParticles(dt);
    if (state.mode === 'playing') {
      updateEnemies(dt);
      collide();
      if (state.enemies.length === 0) waveCleared();
    }
  }

  function drawWorld() {
    drawEnemies();
    drawParticles();
    drawBullets();
    drawPlayer(state.player);
  }
```

Add to the `api` object:

```js
    _debug: { getState: function () { return state; }, startWave: startWave },
```

- [ ] **Step 3: Node tests still pass**

Run: `node --test tests/`
Expected: all PASS.

- [ ] **Step 4: Verify each wave in the browser**

1. Reload, inject + mount, start the game.
2. Wave 1: screenshot shows a 6×2 grid of blue envelope outlines stepping side to side and down.
3. Skip around with `preview_eval` `window.ChaosBlaster._debug.startWave(4)`: 4 large red sprawl clusters; hold Space and line up under one — when it dies, screenshot shows 3 small spiky chaos bits scattering.
4. `startWave(5)`: single big padlock sweeping; hits shed chaos bits every 6 hp (watch enemy count grow via `_debug.getState().enemies.length`).
5. `startWave(2)`: individual darts periodically dive toward the rocket.
6. Let a diver hit the rocket: shake + rocket blinks; `_debug.getState().lives` decremented. Force game over (`preview_eval` three collisions or set lives) — mode becomes `gameover`, game field freezes.
7. Clear wave check: `preview_eval` `(() => { const s = window.ChaosBlaster._debug.getState(); s.enemies.length = 0; return 'cleared'; })()` — next wave spawns (score +500).
8. `preview_console_logs` errors: none.

- [ ] **Step 5: Commit**

```bash
git add assets/js/chaos-blaster.js
git commit -m "Add enemy waves: glyphs, formation behaviors, dives, splitting, collisions"
```

---
### Task 6: Game flow — wave banners, HUD, legend, end screens, high score

**Files:**
- Modify: `assets/js/chaos-blaster.js`

**Interfaces:**
- Consumes: everything prior; `rocketPaths`/`buildRocketPaths`/`ROCKET` (Task 4); `GLYPHS` (Task 5); `.cb-end` panel DOM (Task 3).
- Produces: complete `drawHud()`, `drawBanner()`, `drawLegend()`, `drawMiniRocket(x, y)`; final `endGame(won)` and `onAgainClick()`; `startWave(i)` gains banner mode + `audio.play('wave')` + `audio.setRate(...)`.

- [ ] **Step 1: Banner mode**

Replace the Task 5 `startWave` body:

```js
  function startWave(i) {
    state.waveIndex = i;
    state.enemies = spawnWave(CONFIG.waves[i], CONFIG.logical);
    state.formation = { x: 0, y: 0, dir: 1 };
    state.timeSinceKill = 0;
    state.diveT = 2.5;
    state.mode = 'banner';
    state.bannerT = 2.2;
    audio.play('wave');
    audio.setRate(1 + i * 0.02); // tension creeps up the ladder
  }
```

In `update(dt)`, insert before the `if (state.mode === 'playing')` block:

```js
    if (state.mode === 'banner') {
      state.bannerT -= dt;
      if (state.bannerT <= 0) state.mode = 'playing';
    }
```

Also allow the player to move (not fire) during the banner: change the `updatePlayer` gate in `update` to:

```js
    if (state.mode === 'playing' || state.mode === 'title' || state.mode === 'banner') updatePlayer(dt);
```

In `render()`, after `drawWorld();` add:

```js
    if (state.mode === 'banner') drawBanner();
```

- [ ] **Step 2: Banner, HUD, legend, mini-rocket drawing**

Insert above `// --- exports ---`:

```js
  // ------------------------------------------------------------- game flow UI
  function drawBanner() {
    var wave = CONFIG.waves[state.waveIndex];
    var a = Math.min(1, state.bannerT);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10, 21, 38, 0.7)';
    ctx.fillRect(0, 380, CONFIG.logical.w, 120);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('WAVE ' + (state.waveIndex + 1) + ' — ' + wave.name, CONFIG.logical.w / 2, 452);
    ctx.globalAlpha = 1;
  }

  function drawMiniRocket(x, y) {
    if (!rocketPaths) buildRocketPaths();
    var s = 22 / ROCKET.bounds.h;
    ctx.save();
    ctx.translate(x - (ROCKET.bounds.x + ROCKET.bounds.w / 2) * s, y - (ROCKET.bounds.y + ROCKET.bounds.h / 2) * s);
    ctx.scale(s, s);
    ctx.fillStyle = '#cdd8e8';
    rocketPaths.body.forEach(function (p2) { ctx.fill(p2); });
    ctx.fillStyle = '#e1001a';
    rocketPaths.flames.forEach(function (p2) { ctx.fill(p2); });
    ctx.restore();
  }

  function drawLegend() {
    if (state.waveIndex < 0) return;
    var narrow = typeof window !== 'undefined' && window.innerWidth < 640;
    var from = narrow ? state.waveIndex : 0;
    var baseY = CONFIG.logical.h - 24;
    ctx.textAlign = 'left';
    ctx.font = '14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#9aa9bf';
    ctx.fillText(CONFIG.copy.legendTitle, 20, baseY - (state.waveIndex - from + 1) * 30);
    for (var i = from; i <= state.waveIndex; i++) {
      var w = CONFIG.waves[i];
      var ly = baseY + (i - state.waveIndex) * 30;
      ctx.save();
      ctx.translate(30, ly - 5);
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 2;
      GLYPHS[w.glyph](16);
      ctx.restore();
      ctx.fillStyle = '#9aa9bf';
      ctx.fillText(w.name, 50, ly);
    }
  }
```

Replace the empty `drawHud` from Task 3:

```js
  function drawHud() {
    if (state.mode === 'title') return;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cdd8e8';
    ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('SCORE ' + state.score, 20, 34);
    ctx.textAlign = 'center';
    ctx.fillText('HIGH ' + Math.max(state.highScore, state.score), CONFIG.logical.w / 2, 34);
    for (var i = 0; i < state.lives; i++) drawMiniRocket(CONFIG.logical.w - 30 - i * 26, 26);
    drawLegend();
  }
```

- [ ] **Step 3: End screens and restart**

Replace the Task 5 `endGame` stub and the Task 3 `onAgainClick` stub:

```js
  function endGame(won) {
    state.mode = won ? 'victory' : 'gameover';
    var best = Math.max(state.highScore, state.score);
    try { localStorage.setItem(CONFIG.storage.highScore, String(best)); } catch (e) {}
    audio.stopMusic();
    audio.play(won ? 'victory' : 'gameover');
    var panel = overlay.querySelector('.cb-end');
    panel.querySelector('.cb-end-line').textContent = won ? CONFIG.copy.victoryLine : CONFIG.copy.gameoverLine;
    panel.querySelector('.cb-end-score').textContent = 'Score ' + state.score + '  ·  Best ' + best;
    panel.querySelector('.cb-again').textContent = won ? CONFIG.copy.playAgain : CONFIG.copy.retry;
    panel.querySelector('.cb-end-cameo').hidden = !won;
    panel.querySelector('.cb-end-link').hidden = !won;
    panel.hidden = false;
    panel.querySelector('.cb-again').focus();
  }

  function onAgainClick() {
    overlay.querySelector('.cb-end').hidden = true;
    newGame();
    audio.startMusic();
    startGame();
  }
```

- [ ] **Step 4: Node tests still pass**

Run: `node --test tests/`
Expected: all PASS.

- [ ] **Step 5: Verify in the browser**

1. Reload, inject + mount, start: `WAVE 1 — INBOX OVERLOAD` banner fades over ~2 s, then enemies engage. HUD shows SCORE/HIGH and 3 mini rockets top-right; legend bottom-left shows envelope + INBOX OVERLOAD.
2. `_debug.startWave(3)`: banner reads `WAVE 4 — FOLLOW-UP DRIFT`; legend now lists four rows (desktop width).
3. `preview_resize` to mobile (375×812): legend shows only the current wave row. Resize back to desktop.
4. Force victory: `preview_eval` `(() => { const d = window.ChaosBlaster._debug; d.startWave(5); const s = d.getState(); s.enemies.length = 0; return 'ok'; })()` then wait one frame — end panel shows the ✶ cameo burst, `Chaos cleared. That’s what we do.`, score line, `Play again` button, and the mailto link. `preview_snapshot` to confirm exact copy.
5. Click `Play again`: fresh run starts at wave 1 with 3 lives.
6. Force game over (set `getState().lives = 1` then collide, or call `getState().player.invuln = 0` and wait under a diver): panel shows `Chaos is fractal — it keeps coming.` and `Retry`; no cameo, no link.
7. High score: `preview_eval` `localStorage.getItem('grokitlabs.chaosBlaster.highScore')` — a number ≥ the last score. Reload the page, inject + mount: HUD HIGH shows the persisted value.
8. `preview_console_logs` errors: none.

- [ ] **Step 6: Commit**

```bash
git add assets/js/chaos-blaster.js
git commit -m "Add wave banners, HUD, chaos legend, end screens, persistent high score"
```

---

### Task 7: Audio manager — file loading, SFX, looping soundtrack, mute

**Files:**
- Modify: `assets/js/chaos-blaster.js` (replace the Task 3 audio stub in place)

**Interfaces:**
- Consumes: the 16 files from Task 1; `CONFIG.audio`, `CONFIG.storage.muted`.
- Produces: real `audio` object with the exact same surface as the stub: `{ init, play(name), startMusic, stopMusic, setRate(r), suspend, resume, toggleMuted() -> boolean, isMuted() -> boolean }`. All failure paths are silent — missing files, blocked network, or no WebAudio must never throw or block gameplay.

- [ ] **Step 1: Replace the stub**

Delete the Task 3 `var audio = { ... stub ... };` block and put this in its place:

```js
  // -------------------------------------------------------------- audio
  // File-based: each sound is an OGG (MP3 fallback) under CONFIG.audio.basePath.
  // Upgrading a sound later = dropping in a new file with the same name.
  // Every failure path is silent — the game never depends on audio loading.
  var audio = (function () {
    var actx = null, master = null, musicGainNode = null, musicSrc = null;
    var buffers = {};
    var wantMusic = false;
    var rate = 1;
    var muted = false;
    try { muted = localStorage.getItem(CONFIG.storage.muted) === '1'; } catch (e) {}

    function init() {
      if (!actx) {
        var AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        try { actx = new AC(); } catch (e) { return; }
        master = actx.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(actx.destination);
        musicGainNode = actx.createGain();
        musicGainNode.gain.value = CONFIG.audio.musicGain;
        musicGainNode.connect(master);
        CONFIG.audio.files.forEach(load);
      }
      resume();
    }

    function load(name) {
      var tryFormat = function (fi) {
        if (fi >= CONFIG.audio.formats.length) return; // give up quietly
        fetch(CONFIG.audio.basePath + name + '.' + CONFIG.audio.formats[fi])
          .then(function (res) {
            if (!res.ok) throw new Error('http ' + res.status);
            return res.arrayBuffer();
          })
          .then(function (ab) { return actx.decodeAudioData(ab); })
          .then(function (buf) {
            buffers[name] = buf;
            if (name === 'soundtrack' && wantMusic) startMusic();
          })
          .catch(function () { tryFormat(fi + 1); });
      };
      tryFormat(0);
    }

    function play(name) {
      if (!actx || !buffers[name] || muted) return;
      try {
        var src = actx.createBufferSource();
        src.buffer = buffers[name];
        var g = actx.createGain();
        g.gain.value = CONFIG.audio.sfxGain;
        src.connect(g);
        g.connect(master);
        src.start();
      } catch (e) { /* never let audio break gameplay */ }
    }

    function startMusic() {
      wantMusic = true;
      if (!actx || !buffers.soundtrack || musicSrc) return;
      try {
        musicSrc = actx.createBufferSource();
        musicSrc.buffer = buffers.soundtrack;
        musicSrc.loop = true;
        musicSrc.playbackRate.value = rate;
        musicSrc.connect(musicGainNode);
        musicSrc.start();
      } catch (e) { musicSrc = null; }
    }

    function stopMusic() {
      wantMusic = false;
      if (musicSrc) {
        try { musicSrc.stop(); } catch (e) {}
        musicSrc = null;
      }
    }

    function setRate(r) {
      rate = r;
      if (musicSrc) musicSrc.playbackRate.value = r;
    }

    function suspend() { if (actx && actx.state === 'running') actx.suspend(); }
    function resume() { if (actx && actx.state === 'suspended') actx.resume(); }

    function toggleMuted() {
      muted = !muted;
      try { localStorage.setItem(CONFIG.storage.muted, muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 1;
      return muted;
    }

    function isMuted() { return muted; }

    return {
      init: init, play: play, startMusic: startMusic, stopMusic: stopMusic,
      setRate: setRate, suspend: suspend, resume: resume,
      toggleMuted: toggleMuted, isMuted: isMuted
    };
  })();
```

- [ ] **Step 2: Node tests still pass**

Run: `node --test tests/`
Expected: all PASS (audio IIFE runs at load in Node — it must not touch `window`/`localStorage` outside try/guards; the `typeof window !== 'undefined'` check in `init` plus the try around `localStorage` keep `require()` safe. If the require crashes, fix the top-level access, don't skip the test).

- [ ] **Step 3: Verify in the browser**

1. Reload, inject + mount (mount is a user-gesture-equivalent here; for real click-gesture audio the Task 8 flow covers it). Soundtrack starts: `preview_eval` `window.ChaosBlaster && 'ok'` then listen — or verify programmatically: `preview_network` shows requests for `soundtrack.ogg`, `fire.ogg`, etc., all 200.
2. Start the game, fire: `preview_network` shows no *new* audio requests (buffers reused).
3. Mute: `preview_click` `.cb-mute` → button reads SOUND OFF; `preview_eval` `localStorage.getItem('grokitlabs.chaosBlaster.muted') === '1'`. Close, re-mount: button still reads SOUND OFF.
4. Unmute again (persist `'0'`).
5. Blocked-audio resilience: `preview_eval`
   ```js
   (() => { const orig = window.fetch; window.fetch = () => Promise.reject(new Error('blocked')); return 'fetch blocked'; })()
   ```
   then reload the page, re-block fetch **before** injecting the game script via a `<script>` element (script tags bypass fetch, so injection still works), mount, and play wave 1 for a few seconds. Expected: zero console errors, game fully playable, silent. Restore with a normal reload.
6. Wave pitch creep: `_debug.startWave(5)` then `preview_eval` — no API to read playbackRate externally; verify by ear or accept the code path (setRate is called in startWave — confirmed by Task 6).
7. `preview_console_logs` errors: none.

- [ ] **Step 4: Commit**

```bash
git add assets/js/chaos-blaster.js
git commit -m "Add WebAudio manager: file-based SFX, looping soundtrack, persistent mute"
```

---

### Task 8: Homepage entry — clickable hero rocket, lazy loader, hover hint

**Files:**
- Modify: `index.html` (rocket group + inline loader script)
- Modify: `styles.css` (hero rocket hint styles)

**Interfaces:**
- Consumes: `window.ChaosBlaster.mount()` (Task 3); `#hero-rocket` is the element `unmount()` returns focus to.
- Produces: the public entry point — `#hero-rocket` clickable/keyboard-activatable; game script + audio load only after first activation.

- [ ] **Step 1: Make the hero rocket a button**

In `index.html`:

1. On the `<svg class="scene" ...>` element, change `aria-hidden="true"` to `role="presentation"` (a focusable button may not live inside `aria-hidden`).
2. Wrap the rocket paths in a new inner group. The existing outer group keeps its transform (CSS animations on the inner group must not fight the attribute transform):

```html
  <!-- rocket: exact vector from the logo, scaled; click it. -->
  <g transform="translate(-201.32,262.98) scale(5.1707)">
    <g id="hero-rocket" class="hero-rocket" tabindex="0" role="button" aria-label="Launch a hidden game">
      ... all 13 existing rocket <path> elements, unchanged ...
    </g>
  </g>
```

3. Add `class="hero-flame"` to each of the three red flame paths (the ones whose `d` starts with `M 150.253906 89.308594`, `M 157.324219 89.335938`, `M 164.78125 89.367188`).

- [ ] **Step 2: Add the lazy loader**

At the bottom of `index.html` (after the `<footer>` block):

```html
<script>
  // Chaos Blaster easter egg: nothing loads until the rocket is clicked.
  (function () {
    var rocket = document.getElementById('hero-rocket');
    if (!rocket) return;
    var loading = false;
    function launch() {
      if (window.ChaosBlaster) { window.ChaosBlaster.mount(); return; }
      if (loading) return;
      loading = true;
      var s = document.createElement('script');
      s.src = '{{ "/assets/js/chaos-blaster.js" | relative_url }}';
      s.onload = function () { window.ChaosBlaster.mount(); };
      document.head.appendChild(s);
    }
    rocket.addEventListener('click', launch);
    rocket.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
    });
  })();
</script>
```

- [ ] **Step 3: Hover hint styles**

Append to `styles.css`:

```css
/* --- hero rocket: game entry hint --- */
.hero-rocket { cursor: pointer; }
.hero-rocket:focus-visible { outline: 2px solid #e1001a; outline-offset: 6px; }
.hero-rocket:hover, .hero-rocket:focus-visible { animation: cb-wiggle 0.9s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.hero-rocket:hover .hero-flame, .hero-rocket:focus-visible .hero-flame { animation: cb-flicker 0.32s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 0%; }
@keyframes cb-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-1.4deg); } 75% { transform: rotate(1.4deg); } }
@keyframes cb-flicker { from { transform: scaleY(0.82); } to { transform: scaleY(1.12); } }
@media (prefers-reduced-motion: reduce) {
  .hero-rocket:hover, .hero-rocket:focus-visible,
  .hero-rocket:hover .hero-flame, .hero-rocket:focus-visible .hero-flame { animation: none; }
}
```

(The wiggle animates `transform` on the **inner** group, which has no transform attribute of its own — the outer group carries the scene placement, so the two can't conflict.)

- [ ] **Step 4: Verify in the browser**

1. Reload `http://localhost:4000/` fresh. `preview_network`: NO requests for `chaos-blaster.js` or anything under `/assets/audio/` before interaction.
2. `preview_inspect` on `#hero-rocket`: `cursor: pointer`.
3. Hover via `preview_eval` (dispatch `mouseover`/`:hover` is unreliable in eval — instead verify the CSS rule exists: `[...document.styleSheets].some(ss => [...ss.cssRules].some(r => r.cssText && r.cssText.includes('cb-wiggle')))`).
4. `preview_click` on `#hero-rocket`: overlay opens on the title screen; `preview_network` now shows `chaos-blaster.js` + audio files loading.
5. Press Escape (`preview_eval` keydown): overlay closes; `preview_eval` `document.activeElement.id === 'hero-rocket'` → true.
6. Keyboard entry: `preview_eval` `(() => { const r = document.getElementById('hero-rocket'); r.focus(); r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return document.querySelector('.cb-overlay') && !document.querySelector('.cb-overlay').hidden; })()` → true.
7. Second open reuses the script: `preview_network` shows no duplicate `chaos-blaster.js` request.
8. `preview_console_logs` errors: none.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css
git commit -m "Wire hero rocket as Chaos Blaster entry: lazy loader, hover hint, focus handling"
```

---

### Task 9: Full spec playtest checklist + build hygiene

**Files:**
- None new — fixes only, wherever the checklist finds problems.

**Interfaces:**
- Consumes: the complete game. This task is the spec's "Verification (playtest checklist)" section executed end to end.

- [ ] **Step 1: Automated checks**

```bash
node --test tests/
jekyll build
```
Expected: all tests pass; build succeeds. Then confirm exclusions and payload:

```bash
ls _site/tools _site/tests _site/docs 2>&1 | grep -c "No such file"   # expect 3
du -ch _site/assets/audio/chaos-blaster/*.ogg | tail -1               # ≤ 700 KB
du -h _site/assets/js/chaos-blaster.js
```

- [ ] **Step 2: Spec checklist in the browser (desktop)**

1. Fresh load: no game/audio network requests before click (`preview_network`), no layout shift (screenshot vs. pre-branch screenshot of the hero).
2. Full keyboard playthrough attempt: Enter on rocket → Space to start → play with arrows/Space. Use `_debug.startWave(n)` to reach waves 3–6 quickly; reach BOTH end screens; verify exact copy strings on each (`preview_snapshot`).
3. High score persists across a full page reload.
4. Esc and ✕ both close and restore scroll + focus; reopening works without re-injecting.

- [ ] **Step 3: Spec checklist — mobile viewport**

`preview_resize` mobile (375×812):
1. Canvas letterboxes to fit; ✕ reachable; page behind doesn't scroll.
2. Pointer-drag steering works: `preview_eval` dispatch `pointerdown` then `pointermove` +40 px on `.cb-canvas` — player x moves right (`_debug.getState().player.x` before/after).
3. Autofire: after a touch pointerdown, bullets appear without further input.
4. Legend collapsed to current wave only.
Resize back to desktop.

- [ ] **Step 4: Spec checklist — reduced motion**

Reload the page, then before injecting the game script, stub matchMedia via `preview_eval`:

```js
(() => { const orig = window.matchMedia; window.matchMedia = (q) => q.includes('prefers-reduced-motion') ? { matches: true, addListener() {}, removeListener() {} } : orig(q); return 'rm stubbed'; })()
```

Inject + mount + play briefly: no screen shake on player hit (watch two screenshots during a hit), flames render at constant length, game fully playable.

- [ ] **Step 5: Fix anything found, then commit**

Fix issues at the source (game file/CSS/HTML), re-run the relevant checklist item, then:

```bash
git add -A
git commit -m "Playtest fixes from full spec verification pass"
```

(If nothing needed fixing, skip the commit.)

- [ ] **Step 6: Wrap up**

Update `STATE.md` if the repo has one by then (or note its absence to the user), summarize verification evidence (screenshots of title, mid-wave, both end screens), and hand off per the finishing-a-development-branch skill — merge/push only with explicit owner OK.


