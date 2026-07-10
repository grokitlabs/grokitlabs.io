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
