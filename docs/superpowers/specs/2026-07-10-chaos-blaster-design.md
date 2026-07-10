# Chaos Blaster — homepage easter-egg game

## Context

grokitlabs.io's homepage hero is an SVG launch scene whose rocket is the
exact vector from the GrokitLabs logo (`index.html`, the `<g>` marked
"rocket: exact vector from the logo"). This spec adds a small, dependency-free
Galaga-style shooter that launches when a visitor clicks that rocket. Purpose:
customer delight, plus a light-touch echo of what GrokitLabs does — the
enemies are the everyday problems our audience faces (inbox overload, missed
follow-ups, tool sprawl), and clearing them is the win state.

The game is an easter egg, not a nav destination. The storefront's look,
copy, and load performance must be completely unaffected until the rocket
is clicked.

## Discovery and entry

- The hero rocket group in `index.html` becomes interactive: `cursor:
  pointer`, a subtle wiggle animation on hover (desktop) as the findability
  hint, and an accessible name (`role="button"`, `aria-label="Launch a
  game"`, keyboard focusable + Enter/Space activation).
- On first activation, a small inline hook injects
  `assets/js/chaos-blaster.js` (one `<script>` element, created on demand)
  and mounts the game. Subsequent activations reuse the loaded module.
- The game renders as a **full-viewport fixed overlay** (dark backdrop
  matching the hero palette) with a `<canvas>` centered in it. A visible ✕
  button and the Esc key both close the overlay and return to the untouched
  page. Body scroll is locked while open.
- No game code, CSS, or assets load on normal page view. The only additions
  to the base page are the hover hint styles and the few-line click hook.

## Game design

### Player

The logo rocket, redrawn on canvas via `Path2D` from the same path data used
in the hero (single source of truth: the path strings are copied into the
game's sprite table with a comment pointing back at `assets/logo.svg`). It
sits near the bottom edge, moves horizontally only, and fires upward.

- 3 lives. Brief invulnerability + blink after losing one.
- Score: points per enemy destroyed (small chaos worth less than the big
  ships that spawned them), plus a wave-clear bonus.
- High score persists in `localStorage` (`grokitlabs.chaosBlaster.highScore`).

### The chaos ladder (waves)

Six waves, each named for a real-life problem. Difficulty climbs by speed,
count, and behavior. Every wave opens with a full-width banner
(`WAVE 3 — MISSED LEADS`) before enemies appear.

| # | Wave name        | Enemy glyph      | Behavior |
|---|------------------|------------------|----------|
| 1 | Inbox Overload   | envelope         | slow horizontal drift, descends in steps — the tutorial wave |
| 2 | Receipt Blizzard | paper scrap      | faster, more numerous, slight flutter in motion |
| 3 | Missed Leads     | dart/arrow ship  | individuals periodically dive at the player, Galaga-style |
| 4 | Follow-up Drift  | clock ship       | slide sideways and *regroup upward* if left alone too long |
| 5 | Tool Sprawl      | large cluster ship | **splits into 3 small chaos-bits when destroyed**; bits are fast and erratic |
| 6 | Lock-In (boss)   | one large padlock ship | multi-stage: each hit threshold fractures a chunk off into chaos-bits until the core is exposed |

The splitting mechanic (waves 5–6) is the thematic core: big problems break
into smaller ones that still have to be dealt with.

### Legend / key

A small persistent key in a screen corner lists each enemy glyph + color
alongside its problem name, so the labeling reads without text on the
enemies themselves. On narrow screens the key collapses to the current
wave's entry only.

### End states

- **Victory** (wave 6 cleared): "Chaos cleared. That's what we do." plus
  final score, high score, Play Again, and a single quiet text link back to
  the site (target decided at implementation; default `mailto` footer
  contact).
- **Game over**: "Chaos is fractal — it keeps coming." plus score, high
  score, Retry.

### Controls

- **Desktop:** ← / → or A / D to move; Space to fire, hold for autofire;
  Esc closes.
- **Touch:** drag anywhere on the canvas to steer (finger offset, not
  absolute position, so the thumb never covers the ship); autofire is always
  on. The ✕ button closes.
- The game auto-pauses on visibility loss (tab switch) — no time passes
  while hidden. Closing the overlay (✕ or Esc) abandons the run.

## Visuals and audio

- Everything is canvas-drawn vector art in the existing site palette: navy
  `#213770`, brand red (the logo's `rgb(88.2%,0%,10.2%)` ≈ `#E1001A`), and
  the hero scene's star/cloud neutrals on the dark backdrop. No image
  assets, no sprite sheets.
- Enemy glyphs are simple 2–4 path shapes sized ≥ 24 px so they stay
  readable; color + silhouette carry the type identity, the legend carries
  the words.
- Juice: muzzle flash, hit flash, split "pop", and a brief screen shake on
  player damage. All motion effects are disabled when
  `prefers-reduced-motion: reduce` is set (game remains fully playable).
- Sound: a handful of synthesized WebAudio bleeps (fire, hit, split, wave
  banner, game over). **Muted by default**, toggle button in the overlay
  chrome. No audio files.
- TJ (mascot) has a **cameo slot only**: the victory screen reserves a
  celebratory spot for him, stubbed with a simple drawn star/burst until
  final mascot art exists. No dependency on `assets/tj-cartoon.png` in v1.

## Architecture

Two touchpoints in the repo, both additive:

1. **`assets/js/chaos-blaster.js`** — the entire game. Vanilla ES module
   pattern (an IIFE exposing `window.ChaosBlaster.mount()`), zero
   dependencies. Internal structure:
   - `CONFIG` object at the top of the file: wave table (names, enemy
     types, counts, speeds, split rules), all user-facing copy (banners,
     end-state lines, legend labels), scoring values, and tuning constants.
     Renaming a wave or retuning difficulty is a one-line edit with no
     logic changes.
   - Below it: sprite path table, entity classes (player, enemy, bullet,
     particle), wave director, input (keyboard + pointer), render loop
     (`requestAnimationFrame`, delta-time based), overlay/DOM chrome, and
     the WebAudio synth.
2. **`index.html`** — the rocket group gets the button semantics/hover
   class, plus a small inline script (≤ 20 lines) that lazily injects the
   game script and calls `mount()`.
3. **`styles.css`** — hover wiggle keyframes and overlay chrome styles
   (scoped under a `.cb-` prefix).

Jekyll implications: none beyond a new static asset; `assets/js/` already
exists and is published as-is.

## Accessibility

- Entry rocket: focusable, named, keyboard-activatable.
- Overlay: `role="dialog"` with `aria-label`, focus trapped inside while
  open, focus returned to the rocket on close.
- `prefers-reduced-motion` honored (no shake/flash effects; hover wiggle
  suppressed).
- The game itself is inherently visual/real-time; no attempt to make
  gameplay screen-reader-playable (accepted limitation for an easter egg).
  The overlay's chrome (close, mute, score) uses real buttons and text.

## Verification (playtest checklist)

Manual, via local Jekyll preview:

1. Homepage unchanged before click: no game network requests, no layout
   shift, Lighthouse-visible payload identical except the inline hook.
2. Desktop playthrough: all 6 waves reachable, splitting works, victory and
   game-over screens both reachable, high score persists across reloads.
3. Mobile viewport: drag steering usable one-thumbed, legend collapses, ✕
   reachable, no page scroll behind overlay.
4. Esc/✕ restore the page and focus correctly; reopening works without
   re-injecting the script.
5. `prefers-reduced-motion` emulation: no shake/wiggle, game playable.
6. Keyboard-only session: open with Enter on the rocket, play, close with
   Esc.

## Out of scope (v1)

Possible later itches, deliberately not built now: online leaderboards,
power-ups, multiple playable ships, a dedicated `/play` URL for sharing,
TJ as a playable character, sound-on-by-default polish, and play analytics.
Nothing in the architecture blocks any of these; the wave `CONFIG` table is
the extension point for new content.
