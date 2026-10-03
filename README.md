# Maison Veloré — website (concept project)

Static site: plain HTML/CSS/JS + GSAP (CDN). No build step to run it; deployable to Vercel as static files.

## Run locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080 . (The pages load `data/*.json` with `fetch`, so they must be served over http, not opened as files.)

## Pages

| Page | What it is |
|---|---|
| `index.html` | Hero slider (10 slides from `data/slides.json`) + home sections |
| `product.html?id=<slug>` | One template for all 10 perfumes (`data/products.json`) |
| `catalog.html` | Grid with filters (scent family, key notes, size, price), sort, filtered + empty states; `?family=Floral` pre-filters |
| `cart.html` | Bag in `localStorage` (`mv-cart-v1`), quantity, remove, free sample, gift option, totals, checkout-disabled modal |
| `quiz.html` | Quiz from `data/quiz.json` (`?a=<index>` pre-answers question 1) |
| `journal.html`, `journal.html?id=<slug>` | Journal list / article from `data/journal.json` |
| `maison.html`, `help.html`, `404.html` | Long brand story, shipping/returns/FAQ/contact, not-found page |

All texts, names, notes and prices come from `content/Тексты_сайта.md` and `data/*.json`.

## Folders

- `design/` — PNG exports of every Figma frame (1x), `tokens.json` (colours, text styles, spacing, component specs), `raw/slides_raw.json` (lossless Figma layer dump).
- `data/slides.json` — layer data of the 10 hero slides × 2 breakpoints (desktop 1440×900, mobile 375×812): positions, matrices, sizes, blur, opacity, z-order, depth tiers, shadows, grading, image crops; images keyed by file name. Rebuild with `python scripts/make_slides_json.py`.
- `optimized/` — source images (not in git, not deployed). `assets/img/` — generated WebP files + `manifest.json`.
- `scripts/build_images.py` — one-time WebP conversion: `python scripts/build_images.py` (needs Pillow). Slider images are sized to 2× their largest displayed size; store images get responsive widths for `srcset`.

## Deploy

`vercel` from this folder (or connect the git repo). `vercel.json` enables clean URLs and long caching for `/assets`. Live: https://maison-velore-phi.vercel.app (auto-deploys from GitHub main). `og:image` points to https://maison-velore-phi.vercel.app — change it if you add a custom domain.
