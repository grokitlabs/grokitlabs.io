# grokitlabs.io

Public landing site for **GrokitLabs** — an independent software lab building market-data and trading tools (StockGrok, TickerStrike). Static site, deployed via GitHub Pages (`CNAME` → grokitlabs.io).

## What lives here

Only the public website: `index.html`, `styles.css`, `_layouts/`, `_config.yml`, assets. This repo is **public** — keep it that way. No strategy, methodology, or internal docs.

## Data & pricing source of truth (read before touching numbers)

The `/work/` offer page renders its numbers from `_data/pricing.yml`, not from hardcoded values. That file is the **public render source** — but it is *downstream* of the real source of truth for pricing decisions, which lives in the **private** `grokitlabs-studio/offer/pricing.md` (along with private margin/effort reasoning that must never appear in this public repo). Today the two are hand-synced; a generator (studio issue GL-001, "Tier 2") will later make `_data/pricing.yml` generated-only.

**Invariant:** never hardcode a price in a page — add/change it in `_data/pricing.yml` and reference `{{ site.data.pricing.* }}`. If the page, `_data/pricing.yml`, and the studio master ever disagree, the **studio master wins** — reconcile toward it and flag the discrepancy to the user rather than guessing. Full mechanism + change procedure: **`_data/README.md`**.

## Voice

Clean, credible, confident. GrokitLabs is the company/umbrella brand (more professional than Army Coding's irreverence). Keep the site simple and fast; it's a storefront and a point of contact, not a blog.

## Contact

michael@grokitlabs.io
