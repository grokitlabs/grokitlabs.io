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

  // --- exports ---
  var api = {
    mount: mount,
    unmount: unmount,
    CONFIG: CONFIG,
    _internals: { validateConfig: validateConfig, hits: hits, spawnWave: spawnWave, splitEnemy: splitEnemy }
  };
  if (typeof window !== 'undefined') window.ChaosBlaster = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
