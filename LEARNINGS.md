# LEARNINGS — lodhakartik.github.io comics

Working notes for the comic-publishing pipeline on this site. Captures the
non-obvious mechanics so we don't re-derive them every iteration.

---

## 1. Site layout

```
lodhakartik.github.io/
├── index.html                 ← homepage; Jain Comics section lists cards
├── comics/
│   ├── index.html             ← /comics/ landing page; same cards in another style
│   ├── reader.html            ← PDF.js reader, loaded as ?id=<slug>#p=<pdfPage>&pn=<panelIdx>
│   └── <slug>/
│       ├── manifest.json      ← metadata + per-page panel rects
│       ├── comic.pdf          ← source PDF (one page per "page")
│       └── cover.jpg          ← ~800px wide JPEG, used by both index cards
```

A new comic = a new `comics/<slug>/` dir + two card insertions
(`index.html` *and* `comics/index.html`). The reader needs zero changes — it
loads everything by slug.

---

## 2. Manifest schema

```jsonc
{
  "id": "<slug>",
  "title": "...",
  "subtitle": "...",
  "series": "...",
  "author": "Kartik Lodha",
  "language": "Hinglish",
  "pdf": "comic.pdf",
  "cover": { "pdfPage": 1 },
  "pages": [
    { "pdfPage": 1, "title": "Cover", "panels": [] },
    { "pdfPage": 2, "title": "...",   "panels": [ {x,y,w,h}, ... ] }
  ]
}
```

- `pdfPage` is 1-indexed (matches PDF.js).
- `panels: []` means page-only mode — the reader still works, panel mode just
  shows the whole page.
- Coordinates are normalized to `[0, 1]` of page width / height.

---

## 3. The panel-zoom math (the part that bites)

`comics/reader.html:520-528`:

```js
const MX = 0.015, MY = 0.010;              // bleed margin around the rect
const x0 = Math.max(0, r.x - MX);
const y0 = Math.max(0, r.y - MY);
const x1 = Math.min(1, r.x + r.w + MX);
const y1 = Math.min(1, r.y + r.h + MY);
// fit to 90% of viewport, preserving aspect
s = Math.min(vw / pw, vh / ph) * 0.90;
```

The reader picks a render scale so the rect fills ~90% of the viewport. The
inverse is the key insight:

> **Smaller rect → larger render scale → more of the neighbor panel leaks
> into the view.**

So if a panel looks "too zoomed in" with a neighbor sliver showing on the
side, the fix is counter-intuitive: **make the rect bigger**. The bigger rect
fits the viewport at a smaller scale, and the framed panel becomes the
dominant subject with gutter/whitespace at the edges instead of the
neighbor.

### The overlapping-origins trick for side-by-side panels

For a row of two half-width panels that are leaking into each other, do
**not** clip to the literal half (`x=0.00 w=0.49` / `x=0.50 w=0.49`). Instead
overlap their origins:

```jsonc
// Left panel:  starts at 0,   spans 70%  → covers 0.00–0.70
{ "x": 0.00, "y": 0.51, "w": 0.70, "h": 0.26 },
// Right panel: starts at 0.30, spans 70% → covers 0.30–1.00
{ "x": 0.30, "y": 0.51, "w": 0.70, "h": 0.26 }
```

Each rect now extends past its neighbor's edge, so the framing has gutter
breathing room instead of a sliver of the other artwork. Symmetric overlap is
what makes both panels feel evenly framed.

Same trick works vertically when stacked panels leak.

---

## 4. Reader URL grammar

```
comics/reader.html?id=<slug>#p=<pdfPage>&pn=<0-indexed-panel>
```

- `id` (query) → which manifest to load.
- `p` (hash)  → 1-indexed PDF page.
- `pn` (hash) → **0-indexed** panel within that page.

The footer shows display numbering that **excludes the cover**:

> PDF page 2 → "Page 1 of N"
> PDF page 3 → "Page 2 of N"
> `pn=3`     → "Panel 4 of M"

When debugging from a screenshot, always translate the footer's "Page X / Panel Y"
back into PDF-page and 0-indexed panel before editing the manifest.

---

## 5. Card placement (two spots to edit)

Every comic needs **two** cards with slightly different markup:

| Location | Class | Counter element |
|---|---|---|
| `index.html` (homepage Jain Comics section) | `.game-card` / `.game-name` / `.game-subtitle` | `.play-count-badge` |
| `comics/index.html` (comics landing) | `.comic-card` / `.comic-name` / `.comic-subtitle` | `.chip` (hidden until fetch) |

Both pull read counts from `counterapi.dev` using key `comic-<slug>`. The
counter auto-creates on first hit; no server-side setup needed.

Keep the cards minimal: series, title, subtitle, chips (pages + language +
reads), Read button. We removed long descriptions because they crowded the
cards and pulled focus from the title.

---

## 6. Updating an existing comic's PDF

When the source PDF gets revised (e.g. specific pages redrawn):

1. `cp` the new PDF over `comics/<slug>/comic.pdf`.
2. Cover only needs regeneration if **page 1** changed.
3. Manifest panel rects survive page-art revisions as long as the panel
   layout (number/position of frames) didn't change.
4. Commit + push. GitHub Pages auto-deploys.
5. **PDF.js caches hard** — verify with Cmd+Shift+R or an incognito window
   before declaring success. A bumped `?v=2` on the cover `<img>` is the
   usual trick for the thumbnail; the PDF itself usually picks up the new
   file fine once the cache is cleared.

---

## 7. Cover generation

```bash
sips -s format jpeg -Z 800 -s formatOptions 80 \
  "<source>.png" \
  --out "comics/<slug>/cover.jpg"
```

- `-Z 800` → max dim 800 px (cards display ~280 px so this is plenty).
- `formatOptions 80` → JPEG quality 80, lands around 150–300 KB.

If updating an existing cover, bump the cache-buster in both `index.html`
files: `cover.jpg?v=2` → `?v=3`.

---

## 8. Verification checklist before declaring done

```bash
# JSON syntax
python3 -c "import json; json.load(open('comics/<slug>/manifest.json')); print('OK')"

# Sizes
du -h comics/<slug>/

# Live preview
python3 -m http.server 8765
# then visit:
#   /                                              ← homepage card
#   /comics/                                       ← comics landing card
#   /comics/reader.html?id=<slug>                  ← reader, first page
#   /comics/reader.html?id=<slug>#p=2&pn=0         ← first panel of page 2
```

Tab through every panel in both Page mode and Panel mode. Watch for neighbor
leakage on side-by-side rows — that's the #1 issue.

---

## 9. Bandwidth sanity check

A ~21 MB PDF × ~1000 reads/month ≈ 21 GB/month. GitHub Pages soft cap is
~100 GB/month. So a typical 5–10 page comic is fine; only worry if a single
comic is >50 MB or a single short goes viral.

---

## 10. The "less zoom" iteration loop

For panel-mode zoom tuning, the loop is:

1. User screenshots a panel that looks wrong, includes the URL fragment.
2. Translate `#p=<pdf>&pn=<idx>` into the manifest entry.
3. If too zoomed in (neighbor leaking) → grow the rect (w/h up, often with
   overlapping x with the neighbor).
4. If too zoomed out (lots of whitespace) → shrink the rect.
5. Commit + push + reload (hard).

Typical successful values for half-width side-by-side panels on these pages
landed around `w=0.70`, with `x=0.00` / `x=0.30` overlap.
