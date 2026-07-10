/* Chaos Blaster — grokitlabs.io homepage easter egg.
 * Self-contained: no dependencies, injected on demand, never loaded with the
 * base page. Also require()-able in Node for the pure-logic tests. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  var CONFIG = {
    logical: { w: 720, h: 960 },
    player: { w: 56, h: 84, speed: 430, fireInterval: 0.36, bulletSpeed: 680, lives: 3, invulnSec: 2 },
    bullet: { w: 5, h: 16 },
    score: { waveClearBonus: 500 },
    storage: {
      highScore: 'grokitlabs.chaosBlaster.highScore',
      muted: 'grokitlabs.chaosBlaster.muted'
    },
    audio: {
      basePath: '/assets/audio/chaos-blaster/',
      formats: ['ogg', 'mp3'],
      files: ['fire', 'hit', 'split', 'wave', 'dive', 'playerhit', 'gameover', 'victory', 'soundtrack'],
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
      { name: 'INBOX OVERLOAD',   glyph: 'envelope', color: '#6f9bd8', cols: 6, rows: 2, size: 34,  hp: 1,  points: 50,   speed: 42, behavior: 'drift', 
        dive: { interval: 1.0 } },
      { name: 'RECEIPT BLIZZARD', glyph: 'receipt',  color: '#cdd8e8', cols: 7, rows: 3, size: 30,  hp: 1,  points: 60,   speed: 58, behavior: 'flutter',
        dive: { interval: 1.0 } },
      { name: 'MISSED LEADS',     glyph: 'lead',     color: '#e4b54a', cols: 6, rows: 2, size: 34,  hp: 1,  points: 80,   speed: 64, behavior: 'drift',
        dive: { interval: 2.0 } },
      { name: 'FOLLOW-UP DRIFT',  glyph: 'clock',    color: '#a07bd8', cols: 6, rows: 2, size: 34,  hp: 2,  points: 90,   speed: 66, behavior: 'regroup',
        dive: { interval: 2.6 } },
      { name: 'TOOL SPRAWL',      glyph: 'sprawl',   color: '#e1001a', cols: 4, rows: 1, size: 52,  hp: 3,  points: 120,  speed: 52, behavior: 'drift',
        dive: { interval: 2.8 },
        split: { glyph: 'chaos', color: '#ff5a4e', count: 3, size: 22, hp: 1, points: 40, speed: 130 } },
      { name: 'LOCK-IN',          glyph: 'boss',     color: '#e1001a', cols: 1, rows: 1, size: 120, hp: 24, points: 1000, speed: 90, behavior: 'boss',
        split: { glyph: 'chaos', color: '#ff5a4e', count: 3, size: 22, hp: 1, points: 40, speed: 130, everyHp: 6 } }
    ]
  };

  // ------------------------------------------------------------ pure logic
  var GLYPH_NAMES = ['envelope', 'receipt', 'lead', 'clock', 'sprawl', 'chaos', 'boss'];
  var BEHAVIORS = ['drift', 'flutter', 'regroup', 'boss'];

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
      if (w.dive) {
        if (!(w.dive.interval > 0)) errs.push(at + 'dive: interval must be > 0');
        if (w.dive.max != null && !(w.dive.max >= 1)) errs.push(at + 'dive: max must be >= 1');
        if (w.dive.speed != null && !(w.dive.speed > 0)) errs.push(at + 'dive: speed must be > 0');
      }
    });
    return errs;
  }

  // motion  = how an enemy moves when it's free (not sitting in formation):
  //           'dive' (toward the player), 'orbit' (boss), 'wander' (chaos bits).
  // exit    = what happens when a free enemy passes the bottom edge:
  //           'return' (fly back to its formation slot) or 'wrap' (reappear up top).
  // Both are set here at spawn and are INDEPENDENT of glyph — glyph is now
  // purely the drawn shape, so aliens can be renamed/redesigned without
  // touching any behavior.
  function spawnWave(waveDef, logical) {
    var enemies = [];
    var isBoss = waveDef.behavior === 'boss';
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
          free: isBoss,
          motion: isBoss ? 'orbit' : 'dive',
          exit: isBoss ? 'none' : 'return',
          vx: 0, vy: 0, phase: Math.random() * TAU,
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
        free: true, motion: 'wander', exit: 'wrap',
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
  var bgGradient = null;
  var launchedViaKeyboard = false;
  var input = { left: false, right: false, fire: false, touch: false, down: false, pointerX: 0, dragDx: 0 };
  var reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------------------------------------------------------------- audio
  // File-based: each sound is an OGG (MP3 fallback) under CONFIG.audio.basePath.
  // Upgrading a sound later = dropping in a new file with the same name.
  // Every failure path is silent — the game never depends on audio loading.
  var audio = (function () {
    var actx = null, master = null, musicGainNode = null, musicSrc = null;
    var buffers = {};
    var wantMusic = false;
    var unlockHooked = false;
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
      // A context created outside a user gesture (the game script loads
      // async on first click) can sit suspended on iOS until the next real
      // interaction — unlock on the first one inside the game.
      if (actx && actx.state === 'suspended' && !unlockHooked) {
        unlockHooked = true;
        var unlock = function () {
          resume();
          document.removeEventListener('pointerdown', unlock, true);
          document.removeEventListener('keydown', unlock, true);
        };
        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('keydown', unlock, true);
      }
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
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer may already be gone */ }
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

  function startGame() { startWave(0); }

  function mount(viaKeyboard) {
    launchedViaKeyboard = !!viaKeyboard;
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
    input.left = input.right = input.fire = false;
    input.down = false;
    input.dragDx = 0;
    resize(); // viewport may have changed while the overlay was closed
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
    // Return focus to the launcher only for keyboard users — a mouse user
    // doesn't expect a focus ring to appear on this background rocket, and
    // returning focus here after an Esc close is what drew the stray box.
    if (launchedViaKeyboard) {
      var rocket = document.getElementById('hero-rocket');
      if (rocket) rocket.focus();
    } else if (document.activeElement && overlay.contains(document.activeElement)) {
      document.activeElement.blur(); // don't leave focus on the hidden chrome
    }
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
    if (state.mode === 'playing' || state.mode === 'title' || state.mode === 'banner') updatePlayer(dt);
    updateBullets(dt);
    updateParticles(dt);
    if (state.mode === 'banner') {
      state.bannerT -= dt;
      if (state.bannerT <= 0) state.mode = 'playing';
    }
    if (state.mode === 'playing') {
      updateEnemies(dt);
      collide();
      if (state.enemies.length === 0) waveCleared();
    }
  }

  function render() {
    var w = CONFIG.logical.w, h = CONFIG.logical.h;
    ctx.save();
    if (!reducedMotion && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    if (!bgGradient) {
      bgGradient = ctx.createRadialGradient(w / 2, h * 0.35, 80, w / 2, h * 0.55, h * 0.8);
      bgGradient.addColorStop(0, '#12203a');
      bgGradient.addColorStop(1, '#0a1526');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.fillStyle = '#ffffff';
    state.stars.forEach(function (s) {
      ctx.globalAlpha = s.a;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (state.mode === 'title') drawTitle();
    drawWorld();
    if (state.mode === 'banner') drawBanner();
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

  function drawWorld() {
    drawEnemies();
    drawParticles();
    drawBullets();
    drawPlayer(state.player);
  }
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
    state.mode = 'banner';
    state.bannerT = 2.2;
    audio.play('wave');
    audio.setRate(1 + i * 0.02); // tension creeps up the ladder
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
    if (wave.dive) {
      var cap = wave.dive.max || 2;
      var activeDivers = 0;
      for (var di = 0; di < state.enemies.length; di++) {
        if (state.enemies[di].free && state.enemies[di].motion === 'dive') activeDivers++;
      }
      // The timer only advances while there's room to dive, so `interval` is
      // the minimum spacing between dives and `max` is the concurrency cap —
      // the two tune independently, and no swarm builds up when a fast
      // interval outruns how long a dive takes to complete.
      if (activeDivers < cap) {
        state.diveT -= dt;
        if (state.diveT <= 0) {
          state.diveT = wave.dive.interval;
          var slotted = state.enemies.filter(function (e) { return !e.free; });
          if (slotted.length) {
            var d = slotted[Math.floor(Math.random() * slotted.length)];
            d.free = true;
            d.vx = (state.player.x - d.x) * 0.6;
            d.vy = wave.dive.speed || wave.speed * 3.2;
            audio.play('dive');
          }
        }
      }
    }
    state.enemies.forEach(function (e) {
      if (e.motion === 'orbit') {
        e.free = true;
        e.phase += dt;
        e.x = CONFIG.logical.w / 2 + Math.sin(e.phase * 0.8) * (CONFIG.logical.w / 2 - 120);
        e.y = 190 + Math.sin(e.phase * 2.3) * 46;
        return;
      }
      if (e.free) {
        if (e.motion === 'wander') {
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
          if (e.exit === 'wrap') {
            e.y = -e.h; // reappears up top — pressure stays until it's dealt with
          } else {
            // Missed the player — return to formation. Reposition now
            // (not just next frame): collide()'s breach check runs later
            // in this same tick and would otherwise still see the stale
            // off-screen dive position and misread it as the formation
            // itself having breached.
            e.free = false;
            e.vx = e.vy = 0;
            e.x = e.homeX + state.formation.x;
            e.y = e.homeY + state.formation.y;
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
    // Breach: the standing formation has marched down to the player. Keyed
    // off the formation's nominal descent (lowest in-formation slot + the
    // shared y offset), never a live enemy y — so a diver that just returned
    // to its slot can't be misread as the whole wave breaching.
    if (p.invuln <= 0) {
      var lowestHomeY = -Infinity;
      for (var k = 0; k < state.enemies.length; k++) {
        var e = state.enemies[k];
        if (!e.free && e.homeY > lowestHomeY) lowestHomeY = e.homeY;
      }
      if (lowestHomeY > -Infinity && lowestHomeY + state.formation.y > CONFIG.logical.h - 190) {
        playerHit();
        state.formation.y -= 240; // push the wave back up
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

  function waveCleared() {
    state.score += CONFIG.score.waveClearBonus;
    if (state.waveIndex + 1 >= CONFIG.waves.length) endGame(true);
    else startWave(state.waveIndex + 1);
  }

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

  // --- exports ---
  var api = {
    mount: mount,
    unmount: unmount,
    CONFIG: CONFIG,
    _internals: { validateConfig: validateConfig, hits: hits, spawnWave: spawnWave, splitEnemy: splitEnemy },
    _debug: { getState: function () { return state; }, startWave: startWave }
  };
  if (typeof window !== 'undefined') window.ChaosBlaster = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
