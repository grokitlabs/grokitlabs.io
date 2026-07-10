# Integrating the GrokitLabs content system into Jekyll

## Context

A separate chat session designed and built a shared visual system for
GrokitLabs "content pages" (how-tos, write-ups, guides) by extracting it from
the "Run Your Projects With Claude" page. That work landed as five flat files
in `/Users/mkovacs/Downloads/grokit-labs-content-system/grokitlabs-content-system/`:
`README.md`, `style.css`, `header.js`, `scene.js`, `template.html`. It was not
built Jekyll-aware — no front matter, no `_includes`, no `relative_url`, and
it duplicates SVG markup (logo, rocket/cloud scene) that already exists
elsewhere in the repo.

This spec covers porting that system into the `grokitlabs` Jekyll site so
that (a) creating a new content page is fast and doesn't require re-pasting
CSS/SVG, and (b) there's a centralized, elegantly-listed index of posts that
can be linked from the homepage later, when ready.

## Current repo state (relevant facts)

- Jekyll site, **no gem-based theme** — custom `_layouts/default.html` only,
  used today by `index.html` (the homepage).
- `_config.yml` already excludes `CLAUDE.md`, `README.md`, `Gemfile`,
  `Gemfile.lock`, `vendor` from publish.
- `assets/` currently holds only images, flat (`logo.svg`, `logo.png`,
  `tj-photo.jpg`, etc.) — no `css/` or `js/` subfolders yet.
- The homepage's own `styles.css` (root-level) already uses the **same**
  design tokens as the content system (`--bg`, `--bg-accent`, `--fg`,
  `--muted`, `--red`, `--border` are identical values) — so the content
  system is not a divergent brand, just a page-type-specific extension of it.
- `run-your-projects-with-claude.html` at the repo root is the **source**
  page the content system was extracted from. It currently duplicates its
  entire `<style>` block and the rocket/cloud SVG inline (~400 lines), rather
  than using the extracted system.
- Three other standalone content pages exist and are explicitly **out of
  scope** for this work: `wrangler.html`, `personal-wrangler-simple.html`
  (different product, cream/denim palette), and the untracked
  `run-your-projects-with-claude-old.html` (a pre-redesign backup, not
  committed). None of the three are touched by this change.

## Decisions

1. **Collection & URLs**: posts live under `/writing/`
   (`grokitlabs.io/writing/<slug>/`), index at `grokitlabs.io/writing/`. This
   reads as a body of work rather than a diary, matching the "how-tos,
   write-ups, guides" framing, and stays consistent with CLAUDE.md's "it's a
   storefront... not a blog" framing (so we avoid the `/blog/` name).
2. **No redirect** needed for the migrated page — its current URL
   (`/run-your-projects-with-claude.html`) hasn't been shared anywhere that
   matters, so it's fine for the URL to change to `/writing/run-your-projects-with-claude/`
   with no old-path redirect.
3. **Header**: server-rendered Jekyll include, not JS-injected. Uses the
   existing `assets/logo.svg` via `<img>` instead of embedding an ~8KB SVG
   string in JavaScript. One canonical logo file, no JS needed for the
   header at all.
4. **Scene**: the rocket/cloud SVG markup is rendered once, server-side, via
   a Jekyll include (currently duplicated three ways: homepage inline, the
   old claude-page inline, and as a JS string in `scene.js`). The
   scroll-collision fade behavior genuinely needs JS, so a slimmed
   `writing-scene-fade.js` keeps only that logic — no embedded SVG string.
5. **Assets organization**: `assets/` gets type-based subfolders,
   `assets/css/` and `assets/js/`, introduced now and ready for future
   assets. The homepage's root-level `styles.css` is untouched (out of
   scope) — this only affects new writing-system assets.
6. **Authoring format**: HTML with Jekyll front matter, not Markdown. The
   template's components (`.step`, `.players`, `.promise`, `.folder`, tags)
   are structural HTML, not prose — Markdown would fight them rather than
   help. This matches how `index.html` is already authored (HTML + front
   matter, no Markdown anywhere in the site).
7. **Scope**: `wrangler.html`, `personal-wrangler-simple.html`, and the
   untracked `run-your-projects-with-claude-old.html` are left exactly as
   they are. The homepage is not modified — no nav link to `/writing/` is
   added yet (explicitly deferred to a later, separate step "when I'm
   ready"). The Downloads source files are not modified; they're only read
   as the porting source.

## File structure (target state)

```
_config.yml                        # + collections.writing, + defaults entry
_writing/
  run-your-projects-with-claude.html   # migrated first post

_layouts/
  default.html                     # unchanged — homepage only
  writing.html                     # new — shared layout for posts + index

_includes/
  writing-header.html              # new — white panel, <img src="/assets/logo.svg">
  writing-scene.html                # new — rocket/cloud SVG markup, server-rendered

assets/
  css/
    writing.css                    # new — ported from content-system style.css
  js/
    writing-scene-fade.js          # new — slimmed scene.js, fade logic only
  logo.svg, logo.png, ...          # unchanged

writing/
  index.html                       # new — the blog index page

README.md                          # new — dev notes (already publish-excluded)
```

`run-your-projects-with-claude.html` is deleted from the repo root (its
content moves into `_writing/`).

## `_config.yml` changes

```yaml
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

This means new posts don't need `layout: writing` in their front matter —
it's implied by living in `_writing/`.

## Front matter schema for posts

```yaml
---
title: "Page Title"
description: "One sentence — used for <meta description> and the index card blurb."
date: 2026-07-09
---
```

Minimal by design (YAGNI): title, description, date. No tags/categories/
reading-time fields — nothing in the current design needs them, and they can
be added later if the index ever needs to support filtering.

## Layout (`_layouts/writing.html`)

Responsible for: `<head>` (title/description from front matter, Inter +
JetBrains Mono font links, `assets/css/writing.css`), rendering
`writing-header.html` and `writing-scene.html` includes, wrapping
`{{ content }}` in `<div class="wrap">`, and loading
`assets/js/writing-scene-fade.js` at the end of `<body>`. Used by both
individual posts and the `/writing/` index page.

## Authoring a new post

1. Copy an existing file in `_writing/` as a starting skeleton (or the
   original `template.html`'s component patterns, documented in the new
   README).
2. Drop the new file in `_writing/`, fill in `title`/`description`/`date`.
3. Write the body using the documented component classes (players, steps,
   tags, folder visual, promise cards) — no `<html>`/`<head>`/style
   block/logo/scene markup needed; the layout supplies all of that.
4. It's live at `/writing/<filename-without-extension>/` and appears on the
   index automatically (no manual index update needed).

## Blog index (`writing/index.html`)

A Jekyll page using the `writing` layout. Body is a Liquid loop over
`site.writing | sort: 'date' | reverse`, rendering one card per post (title,
description, formatted date) using the same dark-navy component language as
posts, so the index doesn't read as a bolted-on directory listing. Not
linked from the homepage nav — reachable only by direct URL at `/writing/`
until a deliberate later decision to add that link.

## Migrating the existing post

`run-your-projects-with-claude.html` (root) → `_writing/run-your-projects-with-claude.html`:

- Strip the inline `<style>` block (~250 lines) — replaced by
  `assets/css/writing.css` via the layout.
- Strip the inline rocket/cloud SVG and header markup — replaced by the
  `writing-header`/`writing-scene` includes via the layout.
- Keep the inner content markup (eyebrow, h1, players, steps, folder,
  promises, footer) as the file's body, under new front matter.
- Delete the root-level `run-your-projects-with-claude.html`.
- No redirect (per Decision 2).

## README.md (new, repo root)

Already covered by `_config.yml`'s `exclude:` list (won't be published).
Carries forward:
- The content system's design rules and color-token table (from the
  Downloads-folder README), updated for the Jekyll paths.
- A "how to add a new writing page" walkthrough (the authoring steps above).
- A short "what changed getting this into Jekyll, and why" section, so a
  future session has the context in this spec without needing to re-derive
  it or find this spec file.

## Out of scope (explicit)

- `wrangler.html`, `personal-wrangler-simple.html`,
  `run-your-projects-with-claude-old.html` — untouched.
- Homepage (`index.html`, root `styles.css`) — untouched, no nav link added.
- The Downloads-folder source files — untouched, read-only source for the
  port.
- Tags, categories, RSS/Atom feed, pagination — nothing in the current
  scope needs them; not building for hypothetical future requirements.

## Testing / verification plan

- `bundle exec jekyll serve` (or equivalent) locally; confirm:
  - `/writing/` renders the index with one card (the migrated post) linking
    correctly.
  - `/writing/run-your-projects-with-claude/` renders the migrated post,
    visually matching the current live page (header, scene, typography,
    components).
  - Corner scene fade-on-scroll behavior still works.
  - `/run-your-projects-with-claude.html` (old root path) 404s as expected
    (no redirect, per Decision 2).
  - Homepage (`/`) is visually unchanged.
- Compare the migrated post against the previous root-level version
  side-by-side (screenshot or manual diff) to confirm no visual regression.
