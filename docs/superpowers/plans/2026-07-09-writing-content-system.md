# Writing Content System (Jekyll) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the standalone GrokitLabs content system (header.js/scene.js/style.css/template.html) into the Jekyll site as a `/writing/` collection with a shared layout, server-rendered header/scene includes, and an index page listing all posts — and migrate the existing "Run Your Projects With Claude" page into it as the first post.

**Architecture:** A new Jekyll collection (`_writing/`) with `output: true` and a clean `/writing/:name/` permalink, driven by a shared `_layouts/writing.html` that pulls in two new includes (`writing-header.html`, `writing-scene.html`) and two new asset files (`assets/css/writing.css`, `assets/js/writing-scene-fade.js`). A new `writing/index.html` page lists every post via a Liquid loop. No changes to the homepage or its layout/assets.

**Tech Stack:** Jekyll 4.4.1 (globally installed via rbenv, no Gemfile in this repo), plain HTML/CSS/vanilla JS — no build step beyond `jekyll build`/`jekyll serve`.

## Global Constraints

- Posts are authored as HTML with Jekyll front matter, never Markdown — the component classes (`.step`, `.players`, `.promise`, `.folder`, tags) are structural HTML that Markdown would fight.
- Brand colors are never hardcoded inline — always the CSS custom properties in `assets/css/writing.css` (`--bg`, `--fg`, `--muted`, `--accent-a/b/c`, etc.).
- Content max-width stays at `720px` (`.wrap`) — don't widen it per page.
- Role color convention: `--accent-a` amber `#f2a93c` = the human/reader, `--accent-b` red `#e1001a` = Claude/the assistant, `--accent-c` cyan `#35b7d1` = data/files/tools.
- `wrangler.html`, `personal-wrangler-simple.html`, `run-your-projects-with-claude-old.html`, the homepage (`index.html`, root `styles.css`, `_layouts/default.html`), and the Downloads-folder source files are all out of scope — do not modify any of them.
- No redirect for the migrated page's old URL (`/run-your-projects-with-claude.html` → `/writing/run-your-projects-with-claude/`) — intentional, per the spec.
- No nav link from the homepage to `/writing/` yet — deliberately deferred.
- This repo is public (per `CLAUDE.md`) — nothing under `docs/` (specs, plans) may leak into the published `_site/` output.

---

### Task 1: Port the shared CSS and JS assets

**Files:**
- Create: `assets/css/writing.css`
- Create: `assets/js/writing-scene-fade.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `assets/css/writing.css` — stylesheet defining `:root` tokens (`--bg`, `--bg-accent`, `--fg`, `--muted`, `--red`, `--navy`, `--border`, `--card`, `--accent-a`, `--accent-b`, `--accent-c`) and component classes `.site-header`, `.logo-img`, `.wrap`, `.eyebrow`, `.sub`, `.byline`, `.players`/`.player`/`.player-a/b/c`, `.step`/`.step-arrow`/`.who-tag`/`.tag-a/b/c/ab`, `.say`/`.say.a/.say.c`, `.folder`, `.promises`/`.promise`, `.foot`, `.scene-corner` (+ `.is-hidden`). `assets/js/writing-scene-fade.js` — IIFE that toggles `.scene-corner.is-hidden` based on scroll-collision with content, requires an element matching `.scene-corner` to already exist in the DOM (it does not create one).

- [ ] **Step 1: Create `assets/css/writing.css`**

```css
/* =========================================================================
   GrokitLabs writing system — writing.css
   Shared design tokens + components for /writing/ content pages.

   USAGE: linked by _layouts/writing.html. Every page under /writing/ gets:
   dark navy scene, grid overlay, header w/ logo, typography, and the
   content components below (steps, players, tags, folder visual, promise
   cards). See README.md for the color system and design rules.
   ========================================================================= */

:root {
  /* --- brand core (from grokitlabs.io homepage — do not drift these) --- */
  --bg: #0a1526;
  --bg-accent: #12233d;
  --fg: #eef2f9;
  --muted: #8fa0bd;
  --red: #e1001a;
  --navy: #213770;
  --border: #1e3a5f;
  --card: #101f38;

  /* --- content-role palette ---
     Use these to color-code "who/what" in a piece: a human role, the
     assistant/AI role, and a data/tool/external role. Pick whichever
     semantic names fit the piece; all three map to the same 3 hues so
     nothing you publish will clash with another. */
  --accent-a: #f2a93c; /* amber — human / you / the reader */
  --accent-b: #e1001a; /* red   — Claude / the assistant / brand red */
  --accent-c: #35b7d1; /* cyan  — data / files / tools / external systems */
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

body {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  color: var(--fg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  position: relative;
  overflow-x: hidden;
  background-color: var(--bg);
  background-image:
    radial-gradient(1200px 640px at 50% -8%, var(--bg-accent), transparent 65%),
    linear-gradient(rgba(30,58,95,0.4) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30,58,95,0.4) 1px, transparent 1px);
  background-repeat: no-repeat, repeat, repeat;
  background-position: center top, center, center;
  background-size: 100% 900px, 40px 40px, 40px 40px;
  background-attachment: fixed, fixed, fixed;
}

/* ---- header: white panel with the real logo ---- */
.site-header {
  position: relative;
  z-index: 1;
  width: 100%;
  background: #ffffff;
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.28);
}
.logo-img { height: 44px; width: auto; display: block; }

/* ---- page content wrap ---- */
.wrap {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: clamp(2rem, 6vh, 3.5rem) 1.5rem 3rem;
}

/* ---- masthead / typography ---- */
.eyebrow {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.9rem;
  text-align: center;
}
h1 {
  font-weight: 800;
  font-size: clamp(1.9rem, 5.5vw, 2.7rem);
  letter-spacing: -0.02em;
  line-height: 1.12;
  text-align: center;
  margin-bottom: 0.9rem;
  text-shadow: 0 2px 22px rgba(0,0,0,0.4);
}
.sub {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--muted);
  text-align: center;
  max-width: 58ch;
  margin: 0 auto;
}
.sub b { color: var(--fg); font-weight: 600; }
.byline {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.8rem;
  color: var(--muted);
  text-align: center;
  margin-top: 1.4rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--border);
  max-width: 50ch;
  margin-left: auto;
  margin-right: auto;
}
h2 {
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  margin: 2.6rem 0 0.3rem;
}
.h2sub { font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem; }

/* ---- "players" — up to 3 color-coded role cards ---- */
.players { display: flex; gap: 0.7rem; flex-wrap: wrap; margin-top: 1rem; }
.player {
  flex: 1 1 170px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  border-top: 2px solid var(--role, var(--border));
  position: relative;
  overflow: hidden;
}
.player::before {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(180deg, var(--role, transparent), transparent 55%);
  opacity: 0.12;
  pointer-events: none;
}
.player .who { font-weight: 700; font-size: 0.95rem; margin-bottom: 0.25rem; color: var(--role, var(--fg)); position: relative; }
.player .does { font-size: 0.8rem; color: var(--muted); line-height: 1.5; position: relative; }
.player-a { --role: var(--accent-a); }
.player-b { --role: var(--accent-b); }
.player-c { --role: var(--accent-c); }

/* ---- step cards (sequential walkthroughs) ---- */
.step {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.05rem 1.15rem;
  position: relative;
}
.step-arrow {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.45rem 0;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.72rem; font-weight: 500;
  color: var(--muted);
}
.step-arrow::before { content: "↓"; font-size: 1.05rem; color: var(--muted); }

.who-tag {
  display: inline-block;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.15rem 0.6rem;
  border-radius: 99px;
  margin-bottom: 0.6rem;
  border: 1px solid;
}
.tag-a { color: var(--accent-a); border-color: var(--accent-a); }
.tag-b { color: var(--accent-b); border-color: var(--accent-b); }
.tag-c { color: var(--accent-c); border-color: var(--accent-c); }
.tag-ab { color: var(--accent-a); border-color: var(--accent-a); box-shadow: inset 2px 0 0 var(--accent-b); }

.step h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.35rem; }
.step p { font-size: 0.86rem; color: var(--muted); line-height: 1.55; }
.step p b { color: var(--fg); font-weight: 600; }
.step .say {
  margin-top: 0.7rem;
  background: var(--bg);
  border-left: 3px solid var(--accent-b);
  padding: 0.6rem 0.85rem;
  border-radius: 0 8px 8px 0;
  font-size: 0.83rem;
  color: var(--fg);
  line-height: 1.5;
}
.step .say.a { border-left-color: var(--accent-a); }
.step .say.c { border-left-color: var(--accent-c); }

/* ---- folder / file-tree visual ---- */
.folder {
  background: var(--bg);
  border: 1.5px dashed rgba(53,183,209,0.4);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  font-size: 0.83rem;
  margin-top: 0.85rem;
  font-family: "JetBrains Mono", ui-monospace, monospace;
}
.folder .fl { padding: 0.2rem 0; color: var(--fg); }
.folder .in1 { padding-left: 1.3rem; } .folder .in2 { padding-left: 2.5rem; }
.folder .note { color: var(--muted); font-family: "Inter", sans-serif; font-size: 0.72rem; }
.folder b { font-weight: 700; color: var(--accent-c); }

/* ---- promise / callout cards ---- */
.promises { display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.9rem; }
.promise {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.95rem 1.1rem;
  font-size: 0.85rem;
  border-left: 3px solid var(--accent-b);
}
.promise b { display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 0.2rem; color: var(--fg); }
.promise span { color: var(--muted); line-height: 1.5; }

/* ---- footer ---- */
.foot {
  text-align: center;
  padding: 1.6rem 1.5rem 0.5rem;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.65;
}
.foot .divider { border-top: 1px solid var(--border); margin: 1.6rem 0 1.2rem; }

/* ---- discreet corner scene (visual only — behavior lives in writing-scene-fade.js) ---- */
.scene-corner {
  position: fixed;
  bottom: -140px;
  right: -140px;
  width: 640px;
  height: 640px;
  z-index: 0;
  opacity: 0.42;
  pointer-events: none;
  overflow: hidden;
  transition: opacity 0.4s ease;
}
.scene-corner.is-hidden { opacity: 0; }
.scene-corner svg { width: 100%; height: 100%; display: block; }
@media (max-width: 700px) {
  .scene-corner { width: 440px; height: 440px; bottom: -100px; right: -100px; opacity: 0.3; }
}
```

- [ ] **Step 2: Verify the CSS file**

Run: `grep -c "^\.tag-a\|^\.tag-b\|^\.tag-c\|^\.tag-ab" assets/css/writing.css`
Expected: `4`

- [ ] **Step 3: Create `assets/js/writing-scene-fade.js`**

```javascript
/* =========================================================================
   GrokitLabs writing system — writing-scene-fade.js
   Fades the corner scene (rendered server-side by
   _includes/writing-scene.html) when it would visually overlap real
   content while scrolling, and fades it back in the instant it's clear.
   Gracefully does nothing if .scene-corner isn't on the page.

   USAGE: <script src="/assets/js/writing-scene-fade.js" defer></script>
   ========================================================================= */
(function () {
  function init() {
    var scene = document.querySelector('.scene-corner');
    if (!scene) return;

    var selectors = '.step, .promise, .player, .folder, .say, h1, h2, .sub, .byline, .foot';
    var ticking = false;

    function overlaps(a, b) {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    function shrink(rect, insetPct) {
      var dx = rect.width * insetPct;
      var dy = rect.height * insetPct;
      return { left: rect.left + dx, right: rect.right - dx, top: rect.top + dy, bottom: rect.bottom - dy };
    }

    function check() {
      ticking = false;
      // most of the box is transparent padding around the art; only test the
      // inner ~56% where the rocket/cloud/glow actually render, so it hides
      // ONLY on genuine visual overlap, not whenever a card's empty corner is near.
      var sceneRect = shrink(scene.getBoundingClientRect(), 0.22);
      var els = document.querySelectorAll(selectors);
      var collide = false;
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue; // offscreen, skip
        if (overlaps(sceneRect, r)) { collide = true; break; }
      }
      scene.classList.toggle('is-hidden', collide);
    }

    function requestCheck() {
      if (!ticking) { window.requestAnimationFrame(check); ticking = true; }
    }

    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck);
    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 4: Verify the JS file has valid syntax**

Run: `node --check assets/js/writing-scene-fade.js && echo "syntax OK"`
Expected: `syntax OK`

- [ ] **Step 5: Commit**

```bash
git add assets/css/writing.css assets/js/writing-scene-fade.js
git commit -m "Add shared CSS and JS assets for the writing content system"
```

---

### Task 2: Configure the `writing` Jekyll collection and exclude `docs/` from publish

**Files:**
- Modify: `_config.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: a `writing` collection (`site.writing`, backed by `_writing/*`) with `permalink: /writing/:name/`; a `defaults` entry that sets `layout: "writing"` for every document of `type: "writing"` (i.e. everything in `_writing/`); `docs` added to `exclude` so `docs/superpowers/specs/` and `docs/superpowers/plans/` (this plan and its spec) never appear in `_site/`.

- [ ] **Step 1: Confirm the gap this closes**

Run: `jekyll build && test -e _site/docs && echo "LEAK: docs/ is currently published" || echo "docs/ not in _site (nothing built yet or already clean)"`

This repo has no `docs/` exclusion yet, and this session already added
`docs/superpowers/specs/2026-07-09-writing-content-system-design.md` (and,
once saved, this plan) to the repo. Confirm the risk before fixing it —
expected output is either the leak warning (if `_site/` happens to exist
from a prior build) or the "not in _site" line; either way Step 2 fixes it.

- [ ] **Step 2: Update `_config.yml`**

```yaml
title: GrokitLabs
description: GrokitLabs — an independent software lab building market-data and trading tools.
url: https://grokitlabs.io

# Custom layouts + styles; no gem-based theme.
# Files that should never be published to the site:
exclude:
  - CLAUDE.md
  - README.md
  - Gemfile
  - Gemfile.lock
  - vendor
  - docs

collections:
  writing:
    output: true
    permalink: /writing/:name/

defaults:
  - scope:
      path: ""
      type: "writing"
    values:
      layout: "writing"
```

- [ ] **Step 3: Build and verify**

Run:
```bash
rm -rf _site
jekyll build
test ! -e _site/docs && echo "docs excluded - OK"
test ! -d _site/writing && echo "no writing output yet (collection empty) - OK"
grep -q "collections:" _config.yml && echo "collection configured - OK"
```
Expected:
```
docs excluded - OK
no writing output yet (collection empty) - OK
collection configured - OK
```

- [ ] **Step 4: Commit**

```bash
git add _config.yml
git commit -m "Configure writing collection and exclude docs/ from publish"
```

---

### Task 3: Build the shared header/scene includes and layout, migrate the first post

**Files:**
- Create: `_includes/writing-header.html`
- Create: `_includes/writing-scene.html`
- Create: `_layouts/writing.html`
- Create: `_writing/run-your-projects-with-claude.html`
- Delete: `run-your-projects-with-claude.html` (repo root)

**Interfaces:**
- Consumes: `assets/css/writing.css`, `assets/js/writing-scene-fade.js` (Task 1); `writing` collection + `defaults` layout (Task 2).
- Produces: `_layouts/writing.html`, usable by any future file in `_writing/` and by `writing/index.html` (Task 4) via `layout: writing`. The migrated post is reachable at `/writing/run-your-projects-with-claude/`.

- [ ] **Step 0: Screenshot the current page for before/after comparison**

Before deleting the root-level page, capture a visual reference so Task 6
can confirm the migration introduced no regressions. Start Jekyll serving
the current (pre-migration) site — e.g. via the preview tool
(`preview_start`, using a `jekyll serve --port 4000` config as set up in
Task 6 Step 1, or run it early here) — then use `preview_screenshot` on
`http://localhost:4000/run-your-projects-with-claude.html` and save the
result to
`/private/tmp/claude-501/-Users-mkovacs-grokitlabs/*/scratchpad/before-migration.jpg`
(or your session's scratchpad directory). Stop the server afterward if you
started it just for this. Keep this screenshot around until Task 6 Step 3
is done — that's where it gets compared against the migrated page.

- [ ] **Step 1: Create `_includes/writing-header.html`**

```html
<header class="site-header">
  <img class="logo-img" src="{{ '/assets/logo.svg' | relative_url }}" alt="GrokitLabs">
</header>
```

- [ ] **Step 2: Create `_includes/writing-scene.html`**

```html
<div class="scene-corner">
<svg class="scene" viewBox="0 0 1200 1200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="smoke" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#d6dde8" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#9aa9bf" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#9aa9bf" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#315693"/>
      <stop offset="50%" stop-color="#22406f"/>
      <stop offset="100%" stop-color="#182f57"/>
    </linearGradient>
    <radialGradient id="vign" cx="50%" cy="40%" r="72%">
      <stop offset="0%" stop-color="#0a1526" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0a1526" stop-opacity="0.9"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>

  <g fill="#ffffff">
    <circle cx="150" cy="180" r="2" opacity="0.22"/>
    <circle cx="300" cy="120" r="1.6" opacity="0.16"/>
    <circle cx="920" cy="150" r="2.2" opacity="0.2"/>
    <circle cx="1050" cy="260" r="1.6" opacity="0.14"/>
    <circle cx="220" cy="360" r="1.6" opacity="0.14"/>
    <circle cx="1010" cy="470" r="2" opacity="0.16"/>
  </g>

  <g fill="#cdd8e8" fill-opacity="0.9" transform="translate(78,234.9) scale(0.87)">
    <circle cx="420" cy="890" r="72"/>
    <circle cx="505" cy="848" r="96"/>
    <circle cx="600" cy="828" r="118"/>
    <circle cx="695" cy="848" r="96"/>
    <circle cx="780" cy="890" r="72"/>
  </g>
  <g fill="none" stroke="#9fb0c9" stroke-opacity="0.7" stroke-width="3.5" stroke-linecap="round" transform="translate(78,234.9) scale(0.87)">
    <path d="M474,890 q42,-46 92,-2"/>
    <path d="M566,896 q48,-52 104,-2"/>
    <path d="M662,890 q40,-44 86,-2"/>
  </g>

  <g transform="translate(-201.32,262.98) scale(5.1707)">
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 150.574219 86.914062 L 144.40625 86.886719 L 145.65625 79.152344 L 149.386719 79.167969 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 165.222656 86.972656 L 159.054688 86.945312 L 160.304688 79.085938 L 164.035156 79.101562 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 157.894531 86.941406 L 151.722656 86.917969 L 152.96875 80.636719 L 156.699219 80.652344 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 142.648438 75.535156 L 136.011719 75.507812 L 136.023438 72.210938 L 142.957031 67.167969 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 166.441406 75.628906 L 173.925781 75.660156 L 173.9375 72.363281 L 167.046875 67.265625 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 141.578125 70.046875 L 146.746094 70.066406 C 146.730469 74.554688 150.363281 78.214844 154.847656 78.234375 C 159.335938 78.253906 162.996094 74.617188 163.015625 70.132812 L 168.1875 70.152344 C 168.15625 77.488281 162.164062 83.433594 154.828125 83.402344 C 147.492188 83.375 141.546875 77.382812 141.578125 70.046875"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 146.820312 71.164062 L 141.652344 71.164062 L 141.652344 61.070312 L 146.832031 59.570312 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 163.019531 71.164062 L 168.1875 71.164062 L 168.257812 61.015625 L 163.089844 59.90625 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:rgb(88.235474%,0%,10.195923%);fill-opacity:1;" d="M 150.253906 89.308594 L 148.8125 105.792969 L 146.066406 105.785156 L 144.757812 89.285156 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:rgb(88.235474%,0%,10.195923%);fill-opacity:1;" d="M 157.324219 89.335938 L 155.898438 101.699219 L 153.152344 101.6875 L 151.824219 89.316406 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:rgb(88.235474%,0%,10.195923%);fill-opacity:1;" d="M 164.78125 89.367188 L 163.375 97.410156 L 160.628906 97.398438 L 159.285156 89.347656 Z"/>
    <path style="stroke:none;fill-rule:nonzero;fill:#213770;fill-opacity:1;" d="M 168.261719 61.015625 L 163.089844 61.066406 C 163.042969 56.582031 159.359375 52.96875 154.871094 53.015625 C 150.386719 53.058594 146.777344 56.746094 146.820312 61.230469 L 141.652344 61.28125 C 141.578125 53.945312 147.488281 47.917969 154.820312 47.847656 C 162.15625 47.773438 168.1875 53.679688 168.261719 61.015625"/>
    <path style="stroke:none;fill-rule:nonzero;fill:rgb(88.235474%,0%,10.195923%);fill-opacity:1;" d="M 154.917969 56.34375 C 157.007812 56.324219 158.71875 58 158.742188 60.089844 C 158.761719 62.179688 157.082031 63.894531 154.992188 63.914062 C 152.902344 63.933594 151.191406 62.257812 151.171875 60.167969 C 151.148438 58.074219 152.828125 56.363281 154.917969 56.34375"/>
  </g>

  <g stroke="#ffffff" stroke-linecap="round" opacity="0.1">
    <line x1="500" y1="220" x2="500" y2="290" stroke-width="4"/>
    <line x1="600" y1="180" x2="600" y2="255" stroke-width="4"/>
    <line x1="700" y1="225" x2="700" y2="295" stroke-width="4"/>
  </g>

  <rect x="0" y="0" width="1200" height="1200" fill="url(#vign)"/>
</svg>
</div>
```

- [ ] **Step 3: Create `_layouts/writing.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ page.title }} — GrokitLabs</title>
  <meta name="description" content="{{ page.description | default: site.description }}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="icon" href="{{ '/favicon.svg' | relative_url }}" type="image/svg+xml" />
  <link rel="icon" href="{{ '/favicon.ico' | relative_url }}" sizes="any" />
  <link rel="apple-touch-icon" href="{{ '/apple-touch-icon.png' | relative_url }}" />
  <link rel="stylesheet" href="{{ '/assets/css/writing.css' | relative_url }}" />
</head>
<body>
{% include writing-scene.html %}
{% include writing-header.html %}
<div class="wrap">
{{ content }}
</div>
<script src="{{ '/assets/js/writing-scene-fade.js' | relative_url }}" defer></script>
</body>
</html>
```

- [ ] **Step 4: Create `_writing/run-your-projects-with-claude.html`**

This is the existing root-level page's inner content, moved under front
matter, with role classes renamed from the page's original one-off names
(`-me`/`-claude`/`-stuff`) to the shared system's generic convention
(`-a`/`-b`/`-c`, matching the color table: a=amber/human, b=red/Claude,
c=cyan/data) so it uses `assets/css/writing.css` correctly.

```html
---
title: "Run Your Projects With Claude"
description: "The exact setup I use: one project folder, my email, and Claude doing the filing, the status updates, and the \"what needs me today.\""
date: 2026-07-09
---
<div class="eyebrow">A how-to, not a product · no code · ~30 minutes</div>
<h1>How I run my projects with Claude</h1>
<p class="sub">This is the exact setup I use: <b>one project folder, my email, and Claude doing the filing, the status updates, and the "what needs me today."</b> I never maintain it. Everything lives in plain files, in my own Drive, that I keep forever — and you can copy this in about half an hour.</p>
<p class="byline">A few friends asked how I set this up. There's no app to download and nothing to sign up for beyond Claude itself — just a way of using it.</p>

<h2>The three things doing the work</h2>
<p class="h2sub">Every step below is just these three passing work between them — nothing else involved.</p>
<div class="players">
  <div class="player player-a"><div class="who">Me</div><div class="does">Make decisions. Press send. That's the whole job.</div></div>
  <div class="player player-b"><div class="who">Claude</div><div class="does">Reads, files, updates, drafts, and reminds.</div></div>
  <div class="player player-c"><div class="who">My stuff</div><div class="does">My email + one Drive folder. Mine, always.</div></div>
</div>

<h2>Part 1 — The setup (once)</h2>
<p class="h2sub">Three steps, one conversation with Claude. Here's exactly what I did.</p>

<div class="step">
  <span class="who-tag tag-a">me</span>
  <h3>Connect email &amp; Drive to Claude</h3>
  <p>In Claude's settings, connect Gmail and Google Drive. This lets Claude read your mail and work in your Drive. <b>One honest heads-up:</b> connecting Drive gives Claude access to your whole Drive, not just one folder — that's how Google's connection works today. So if you keep private things in Drive, the clean fix is to make a <b>separate Google account just for this</b> and connect that one. Then "your whole Drive" is a Drive that holds only your projects. (This is the one fiddly step — worth doing once. It's what I did.)</p>
</div>
<div class="step-arrow">then</div>
<div class="step">
  <span class="who-tag tag-a">me</span>
  <h3>Make one folder — I called mine "Projects"</h3>
  <p>One Drive folder is the whole system. Claude organizes inside it; you can open any file anytime — they're all plain, readable documents. Here's roughly what mine looks like:</p>
  <div class="folder">
    <div class="fl">📁 <b>Projects</b></div>
    <div class="fl in1">📄 how-we-file-things.md <span class="note">← the filing rules Claude and I agreed on</span></div>
    <div class="fl in1">📁 Projects <span class="note">← one page per project, with its status</span></div>
    <div class="fl in2">📄 kitchen-renovation.md · 📄 hendricks-proposal.md</div>
    <div class="fl in1">📁 Documents <span class="note">← proposals, contracts, notes — filed &amp; linked</span></div>
    <div class="fl in1">📄 today.md <span class="note">← my daily summary lands here</span></div>
  </div>
</div>
<div class="step-arrow">then</div>
<div class="step">
  <span class="who-tag tag-ab">me + claude</span>
  <h3>Agree on the filing system — once, out loud</h3>
  <p>Tell Claude how you think about your work; Claude proposes how to organize it and writes the agreement into <b>how-we-file-things.md</b>. From then on Claude follows those rules — and asks before changing them. This is what I told it:</p>
  <div class="say a">"I run projects for clients, plus house stuff. Every project should have a status, its related documents linked on its page, and nothing should ever be filed loose."</div>
</div>
<div class="step-arrow">finally</div>
<div class="step">
  <span class="who-tag tag-a">me</span>
  <h3>Ask Claude to check in twice a day</h3>
  <p>Set up two recurring check-ins in Claude: a <b>morning summary</b> and an <b>evening tidy-up</b>. Describe them in plain English once; they run on their own after that — even when your computer is off. Here's what I asked for:</p>
  <div class="say a">"Every morning at 7, read my new email and my Projects folder, update anything that changed, and write me a short summary with what needs me today."</div>
</div>

<h2>Part 2 — Then this happens every day</h2>
<p class="h2sub">A real example from my own folder — the proposal email, start to finish, and I never touched it.</p>

<div class="step">
  <span class="who-tag tag-c">my email</span>
  <h3>An email arrives</h3>
  <p>A contractor sends a proposal for my kitchen renovation. It needs my review. I'm busy — I don't even open it.</p>
</div>
<div class="step-arrow">morning check-in</div>
<div class="step">
  <span class="who-tag tag-b">claude</span>
  <h3>Claude reads it and does the secretary work</h3>
  <p>Following the filing rules we agreed on, Claude: saves the proposal into <b>Documents</b> → links it on the <b>kitchen-renovation</b> project page → changes the project's status to <b>"Proposal — needs your review."</b></p>
</div>
<div class="step-arrow">same run</div>
<div class="step">
  <span class="who-tag tag-b">claude</span>
  <h3>It shows up in my daily summary</h3>
  <div class="say">☀️ <b>Today — 1 thing needs you</b><br>1. Kitchen renovation: proposal in from the contractor — $18,400, 6 weeks. It's linked on the project page. Want me to draft questions or a reply?</div>
</div>
<div class="step-arrow">my move</div>
<div class="step">
  <span class="who-tag tag-a">me</span>
  <h3>I decide — in one sentence</h3>
  <div class="say a">"Looks high. Draft a reply asking for a cost breakdown and whether the timeline includes permits."</div>
  <p style="margin-top:0.6rem">Claude writes the reply <b>into my drafts</b> — I read it and press send. Claude never sends anything itself.</p>
</div>
<div class="step-arrow">evening tidy-up</div>
<div class="step">
  <span class="who-tag tag-b">claude</span>
  <h3>Everything gets updated — everywhere</h3>
  <p>Project status → <b>"Waiting on contractor."</b> The question I asked → noted on the project page. Tomorrow's summary will chase it if he goes quiet. The folder is current, and I never touched it.</p>
</div>

<h2>Part 3 — The three rules that make it trustworthy</h2>
<div class="promises">
  <div class="promise"><b>Claude proposes. You approve.</b><span>Drafts, not sent emails. Suggested changes, not silent ones. Nothing leaves your world without your finger on the button.</span></div>
  <div class="promise"><b>Everything is a plain file you can open.</b><span>No app, no lock-in. Stop using Claude tomorrow and the folder still works, forever, with anything.</span></div>
  <div class="promise"><b>The filing rules are written down — by both of you.</b><span>The system is only as tidy as its rules. They live in one file you agreed on, and Claude asks before changing them.</span></div>
</div>

<div class="foot">
  <div class="divider"></div>
  Where I'd take it next, once the daily loop feels boring (that's success): the same three players can handle more — a weekly "what's stuck?" review, watching for late invoices, prepping before meetings. Same folder, same rules, just more check-ins. That's the whole setup. If you copy it and find a better way to do a piece of it, I'd genuinely like to hear about it.
  <br><br>
  One honest note: this isn't Claude-exclusive. ChatGPT and other assistants have similar Gmail/Drive connectors and scheduled tasks now, so this same pattern works there too. I use Claude — but the idea is the pattern, not the brand.
</div>
```

- [ ] **Step 5: Delete the old root-level page**

```bash
git rm run-your-projects-with-claude.html
```

- [ ] **Step 6: Build and verify**

Run:
```bash
rm -rf _site
jekyll build
OUT=_site/writing/run-your-projects-with-claude/index.html
test -f "$OUT" && echo "post built - OK"
grep -q 'src="/assets/logo.svg"' "$OUT" && echo "header include OK"
grep -q 'class="scene-corner"' "$OUT" && echo "scene include OK"
grep -q '<h1>How I run my projects with Claude</h1>' "$OUT" && echo "content OK"
grep -q 'assets/css/writing.css' "$OUT" && echo "css link OK"
grep -q 'assets/js/writing-scene-fade.js' "$OUT" && echo "js link OK"
grep -q 'player-a\|tag-a' "$OUT" && echo "renamed classes present OK"
test ! -f run-your-projects-with-claude.html && echo "old root file removed - OK"
test ! -f _site/run-your-projects-with-claude.html && echo "old output removed - OK"
```
Expected: all eight `OK` lines print, no errors.

- [ ] **Step 7: Commit**

```bash
git add _includes/writing-header.html _includes/writing-scene.html _layouts/writing.html _writing/run-your-projects-with-claude.html
git commit -m "Add writing layout/includes and migrate the Claude how-to into /writing/"
```

---

### Task 4: Build the `/writing/` index page

**Files:**
- Create: `writing/index.html`
- Modify: `assets/css/writing.css`

**Interfaces:**
- Consumes: `_layouts/writing.html` (Task 3), `site.writing` (Jekyll collection populated by Task 2's config + Task 3's migrated post).
- Produces: `/writing/` — a page listing every document in `site.writing`, newest first, each linking to `{{ post.url }}`.

- [ ] **Step 1: Add index card styles to `assets/css/writing.css`**

Append to the end of the file:

```css

/* ---- writing index — post list ---- */
.post-list { display: flex; flex-direction: column; gap: 0.9rem; margin-top: 2.5rem; }
.post-card {
  display: block;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.1rem 1.25rem;
  text-decoration: none;
  transition: border-color 0.15s ease;
}
.post-card:hover { border-color: var(--accent-b); }
.post-card .post-date {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.post-card .post-title { font-size: 1.1rem; font-weight: 700; color: var(--fg); margin-bottom: 0.3rem; }
.post-card .post-desc { font-size: 0.86rem; color: var(--muted); line-height: 1.5; }
```

- [ ] **Step 2: Create `writing/index.html`**

```html
---
title: "Writing"
description: "How-tos, write-ups, and guides from GrokitLabs."
layout: writing
---
<div class="eyebrow">GrokitLabs</div>
<h1>Writing</h1>
<p class="sub">How-tos, write-ups, and guides — the exact setup, no product pitch.</p>

<div class="post-list">
{% for post in site.writing | sort: 'date' | reverse %}
  <a class="post-card" href="{{ post.url | relative_url }}">
    <div class="post-date">{{ post.date | date: "%B %-d, %Y" }}</div>
    <div class="post-title">{{ post.title }}</div>
    <div class="post-desc">{{ post.description }}</div>
  </a>
{% endfor %}
</div>
```

- [ ] **Step 3: Build and verify**

Run:
```bash
rm -rf _site
jekyll build
OUT=_site/writing/index.html
test -f "$OUT" && echo "index built - OK"
grep -q 'href="/writing/run-your-projects-with-claude/"' "$OUT" && echo "links to post - OK"
grep -q 'How I run my projects with Claude' "$OUT" && echo "wrong — should be front-matter title, check next line"
grep -q 'Run Your Projects With Claude' "$OUT" && echo "post title on card - OK"
grep -q 'post-card' "$OUT" && echo "card markup present - OK"
```
Expected: `index built - OK`, `post title on card - OK`, `card markup present - OK`. (The `links to post - OK` line should also print; the deliberately-wrong grep for the H1 text should NOT print anything, since the card uses `post.title` — "Run Your Projects With Claude" — not the in-page `<h1>` text — "How I run my projects with Claude".)

- [ ] **Step 4: Commit**

```bash
git add writing/index.html assets/css/writing.css
git commit -m "Add the /writing/ index page listing all posts"
```

---

### Task 5: Write the root README.md

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing new (documents Tasks 1-4).
- Produces: `README.md` at repo root — already covered by the `exclude:` list from Task 2, so it never publishes.

- [ ] **Step 1: Create `README.md`**

```markdown
# grokitlabs.io

Public landing site for **GrokitLabs** — an independent software lab building market-data and trading tools (StockGrok, TickerStrike). Static site, deployed via GitHub Pages (`CNAME` → grokitlabs.io).

This file is excluded from the published site (see `_config.yml`).

## What lives here

The public website: `index.html`, `styles.css`, `_layouts/`, `_config.yml`, assets, and the `/writing/` content system described below. This repo is **public** — keep it that way. No strategy, methodology, or internal docs (implementation specs/plans under `docs/` are also excluded from publish — see `_config.yml`'s `exclude:` list).

## Voice

Clean, credible, confident. GrokitLabs is the company/umbrella brand (more professional than Army Coding's irreverence). Keep the site simple and fast — the homepage is a storefront and a point of contact, not a blog. `/writing/` is where longer how-tos and write-ups live instead.

## Contact

michael@grokitlabs.io

## The `/writing/` content system

A shared Jekyll collection + layout for published content pages (how-tos,
write-ups, guides), so every new piece gets the same header, typography, and
corner scene automatically — no re-pasting CSS or SVG per page.

It was originally designed and prototyped as flat static files (`style.css`,
`header.js`, `scene.js`, `template.html`) in a separate chat session,
extracted from the first real piece, "How I run my projects with Claude."
Porting it into this Jekyll repo changed three things from that original
delivery:

1. **The header is a server-rendered include** (`_includes/writing-header.html`),
   using the real `assets/logo.svg` via `<img>`, instead of an ~8KB logo SVG
   string embedded in JavaScript.
2. **The corner scene's SVG markup is a server-rendered include**
   (`_includes/writing-scene.html`) instead of a JS string. Only the
   scroll-collision fade *behavior* is still JS
   (`assets/js/writing-scene-fade.js`).
3. **Posts are Jekyll collection documents** (`_writing/*.html`) with front
   matter, not standalone HTML files — so a new page needs zero
   boilerplate (no `<html>`/`<head>`/style block/logo/scene markup) and
   automatically appears on the `/writing/` index.

Design spec and implementation plan for this port live in
`docs/superpowers/specs/2026-07-09-writing-content-system-design.md` and
`docs/superpowers/plans/2026-07-09-writing-content-system.md` (excluded
from publish, git history only).

### Adding a new post

1. Create a new file in `_writing/`, e.g. `_writing/my-new-post.html`.
2. Add front matter:
   ```yaml
   ---
   title: "Page Title"
   description: "One sentence — used for <meta description> and the index card."
   date: 2026-07-09
   ---
   ```
3. Write the body using the component classes below. No `layout:` needed —
   `_config.yml` sets it automatically for everything in `_writing/`.
4. It's live at `/writing/my-new-post/` and appears on `/writing/`
   automatically, newest first.

### The color system

Three accent hues, used consistently across every piece so nothing clashes:

| Token | Hex | Meaning |
|---|---|---|
| `--accent-a` | `#f2a93c` amber | The human / the reader / "you" |
| `--accent-b` | `#e1001a` red | Claude / the assistant / brand red |
| `--accent-c` | `#35b7d1` cyan | Data, files, tools, external systems |

Apply via `.player-a/b/c`, `.tag-a/b/c` (and `.tag-ab` for a "both" combined
tag), and `.say.a` / default `.say` (red) / `.say.c` for quote callouts.
Reuse the same mapping across pieces — readers who see multiple pages will
start reading the colors as a convention, which is the point.

### Design rules (keep these so pages don't drift apart)

1. **Never hardcode the brand colors inline.** Always use the CSS variables
   in `assets/css/writing.css`. If a page needs a new color, add it as a
   token there, not ad hoc.
2. **Don't paste the logo or scene SVGs into a page again.** They live in
   `_includes/writing-header.html` / `_includes/writing-scene.html`. If the
   real logo or scene art changes, update it in exactly one place and every
   page picks it up.
3. **The scene is decorative only.** `aria-hidden`, `pointer-events: none`.
   Never put anything the reader needs to interact with inside it.
4. **Content max-width stays at 720px** (`.wrap`). Don't widen it per-page —
   the line length is tuned for readability against this type scale.
5. **One honest voice.** These pages are personal write-ups shared for
   awareness, not product marketing — keep the first-person, "here's
   exactly what I did" tone established in the first piece.

### What's still undecided

- The homepage doesn't link to `/writing/` yet — deliberately deferred
  until ready to make it public.
- The homepage's own visual treatment is separate and unresolved — this
  system is for `/writing/` content pages only. Don't retrofit the
  homepage to match this until that's deliberately decided.
```

- [ ] **Step 2: Verify it's excluded from the build**

Run:
```bash
rm -rf _site
jekyll build
test ! -e _site/README.md && echo "README excluded - OK"
```
Expected: `README excluded - OK`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Add repo README with writing-system docs and porting notes"
```

---

### Task 6: End-to-end verification pass

**Files:** none created or modified — this task only verifies Tasks 1-5.

**Interfaces:**
- Consumes: the whole site as built by Tasks 1-5.
- Produces: nothing new; confirms the feature works end to end before calling the branch done.

- [ ] **Step 1: Start Jekyll's dev server**

If `.claude/launch.json` doesn't already exist, create it:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "jekyll",
      "runtimeExecutable": "jekyll",
      "runtimeArgs": ["serve", "--port", "4000"],
      "port": 4000
    }
  ]
}
```

Use the preview tool to start it (`preview_start` with `name: "jekyll"`), then confirm it's up:

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/`
Expected: `200`

- [ ] **Step 2: Verify the homepage is unchanged**

Use `preview_screenshot` on `http://localhost:4000/`. Confirm visually it
matches the site's current homepage (rocket scene, "grok" definition,
mailto footer) — no writing-system styles have leaked in.

- [ ] **Step 3: Verify the migrated post renders correctly**

Use `preview_screenshot` and `preview_snapshot` on
`http://localhost:4000/writing/run-your-projects-with-claude/`. Confirm:
- White header panel with the GrokitLabs logo at the top.
- Dark navy background with grid overlay and corner rocket scene.
- Title "How I run my projects with Claude", the three player cards, all
  four step sequences, the folder visual, the three promise cards, and the
  footer — matching the content from the old root-level page.

Compare this screenshot against the `before-migration.jpg` captured in Task
3 Step 0. They should match — same layout, same colors, same content. The
only acceptable difference is the URL in the browser chrome.

Run: `mcp__Claude_Preview__preview_console_logs` with `level: "error"`.
Expected: no errors.

- [ ] **Step 4: Verify the scroll-collision fade behavior**

Use `preview_eval` to scroll the page (`window.scrollTo(0, document.body.scrollHeight)`) then `preview_inspect` on `.scene-corner` to check its class list.
Expected: `.scene-corner` gains `is-hidden` when scrolled to overlap content, and loses it back at the top of the page (`window.scrollTo(0,0)` then re-inspect).

- [ ] **Step 5: Verify the index page**

Use `preview_screenshot` and `preview_snapshot` on
`http://localhost:4000/writing/`. Confirm one card is visible, titled "Run
Your Projects With Claude", dated July 9, 2026, linking to
`/writing/run-your-projects-with-claude/`. Click it (`preview_click`) and
confirm it navigates to the post.

- [ ] **Step 6: Verify the old URL is gone**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/run-your-projects-with-claude.html`
Expected: `404`

- [ ] **Step 7: Stop the dev server**

Use `preview_stop` on the server started in Step 1.

- [ ] **Step 8: Final full-repo build check**

Run:
```bash
rm -rf _site
jekyll build 2>&1 | tail -5
test ! -e _site/docs && echo "docs still excluded - OK"
test ! -e _site/README.md && echo "README still excluded - OK"
test -f _site/writing/index.html && echo "writing index present - OK"
test -f _site/writing/run-your-projects-with-claude/index.html && echo "post present - OK"
test -f _site/index.html && echo "homepage present - OK"
```
Expected: `done in ...` (jekyll's normal success line) followed by all five `OK` lines.

- [ ] **Step 9: No commit needed**

This task is verification-only. If any check in Steps 1-8 fails, fix the
relevant earlier task's files and re-run this task from Step 1 before
considering the branch done.
