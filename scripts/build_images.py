"""One-time image build: optimized/*.png|jpg  ->  assets/img/<name>-<width>.webp (+ manifest).

No build step is needed to run the site; run this once (or again after adding images):
    python scripts/build_images.py

Rules
- Slider images: one width = min(native, 2 x the largest size they are displayed at in data/slides.json).
- Store images: a few responsive widths (used with srcset), never wider than the source.
- Extras: grain texture for the hero grading, og-image.png (1200x630) rendered from logo/og_image_1200x630.svg design.
"""
import json, math, os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'optimized')
OUT = os.path.join(ROOT, 'assets', 'img')
os.makedirs(OUT, exist_ok=True)
manifest_src = json.load(open(os.path.join(SRC, '_manifest.json'), encoding='utf-8'))
slides = json.load(open(os.path.join(ROOT, 'data', 'slides.json'), encoding='utf-8'))

# ---------- 1. how wide is every slider image displayed? ----------
need = {}

def walk(node, scale_parent=1.0):
    m = node.get('m')
    sx = math.hypot(m[0], m[3]) if m else 1.0
    for f in node.get('f', []) if isinstance(node.get('f'), list) else []:
        if 'i' in f:
            w = node['s'][0] * sx
            if f.get('sm') == 'CROP' and f.get('it'):
                w = w / max(f['it'][0], 0.05)
            need[f['i']] = max(need.get(f['i'], 0), w)
    if node.get('img'):
        need[node['img']] = max(need.get(node['img'], 0), node['s'][0])
    if isinstance(node.get('c'), list):
        for ch in node['c']:
            walk(ch)

for s in slides['slides']:
    for bp in ('desktop', 'mobile'):
        for l in s[bp]['layers']:
            walk(l)

# ---------- 2. store image widths ----------
STORE = [
    (r'^gallery_', [560, 1120]),
    (r'^story_', [640, 1200]),
    (r'^journal_', [600, 1200]),
    (r'^box_', [600, 1120]),
    (r'^vial_', [200, 400, 1120]),
    (r'^vials_all$', [600, 1200]),
    (r'^bottle_[a-z]+_(10|50)ml$', [300, 600, 1120]),
    # scent-story ingredient images on the product page (one per note tier)
    (r'^(floral_peony_petal_01|floral_peony_01|floral_jasmine_01|citrus_bergamot_01|citrus_neroli_blossom_01|aquatic_driftwood_01|oriental_cardamom_01|woody_cedar_branch_01|woody_vetiver_roots_01|oriental_saffron_01|oriental_cinnamon_01|oriental_amber_01|aquatic_salt_crystals_01|aquatic_sea_pebble_01|green_basil_01|green_fig_half_01|lavender_rosemary_01|lavender_lavender_sprig_01|woody_moss_01|gourmand_almond_01|gourmand_vanilla_flower_01|gourmand_tonka_beans_01|rose_raspberry_01|rose_red_rose_01|rose_patchouli_leaf_01|iris_violet_leaf_01|iris_iris_flower_01|iris_cotton_flower_01)$', [360]),
    (r'^bottle_[a-z]+$', [400, 800]),
    (r'^bg_\d\d_', [480, 960]),
]

out_manifest = {}

def save(name, im, width):
    w0, h0 = im.size
    width = min(width, w0)
    h = round(h0 * width / w0)
    fn = f'{name}-{width}.webp'
    path = os.path.join(OUT, fn)
    if not os.path.exists(path):
        sm = im if width == w0 else im.resize((width, h), Image.LANCZOS)
        if sm.mode not in ('RGB', 'RGBA'):
            sm = sm.convert('RGBA')
        sm.save(path, 'WEBP', quality=82, method=6)
    e = out_manifest.setdefault(name, {'w': w0, 'h': h0, 'files': {}})
    e['files'][width] = 'assets/img/' + fn
    return width

for name, meta in sorted(manifest_src.items()):
    src = os.path.join(SRC, meta['file'])
    if not os.path.exists(src):
        continue
    widths = set()
    if name in need:
        widths.add(min(meta['w'], math.ceil(2 * need[name])))
    for pat, ws in STORE:
        if re.search(pat, name):
            widths.update(ws)
    if not widths:
        continue  # not used by the site (asset sheets, previews, hero screenshots)
    im = Image.open(src)
    im.load()
    if im.mode == 'P':
        im = im.convert('RGBA')
    for w in sorted(widths):
        save(name, im, w)
    print(f'{name}: {sorted(out_manifest[name]["files"])}')

# ---------- 3. extras ----------
import random
random.seed(7)
noise = Image.new('L', (160, 160))
noise.putdata([random.randint(92, 164) for _ in range(160 * 160)])  # low-contrast grain, like Figma NOISE density .6
noise.save(os.path.join(OUT, 'grain.png'))

# og image: same design as logo/og_image_1200x630.svg, rendered with the real Cormorant Garamond
W, H = 1200, 630
og = Image.new('RGB', (W, H))
c0, c1 = (0xFB, 0xF3, 0xEA), (0xE9, 0xC1, 0xB9)
px = og.load()
for y in range(H):
    for x in range(W):
        t = (x / W + y / H) / 2
        px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(c0, c1))
d = ImageDraw.Draw(og)
fdir = os.path.join(ROOT, 'scripts', 'fonts')
reg = ImageFont.truetype(os.path.join(fdir, 'CormorantGaramond[wght].ttf'), 120)
try:
    reg.set_variation_by_name('Medium')
except Exception:
    pass
ita = ImageFont.truetype(os.path.join(fdir, 'CormorantGaramond-Italic[wght].ttf'), 42)
try:
    ita.set_variation_by_name('Regular')
except Exception:
    pass
ink = (0x3B, 0x26, 0x26)
d.text((600, 300), 'Maison Veloré', font=reg, fill=ink, anchor='ms')
d.line([(520, 345), (680, 345)], fill=(0xB5, 0x54, 0x5C), width=2)
d.text((600, 410), 'Scents for a more beautiful tomorrow', font=ita, fill=ink, anchor='ms')
small = ImageFont.truetype('arial.ttf', 20) if os.name == 'nt' else ImageFont.load_default()
label = 'CONCEPT PROJECT'
x = 600 - sum(small.getlength(ch) + 4 for ch in label) / 2
for ch in label:
    d.text((x, 570), ch, font=small, fill=(0x76, 0x67, 0x66), anchor='ls')
    x += small.getlength(ch) + 4
og.save(os.path.join(ROOT, 'assets', 'og-image.png'), optimize=True)

json.dump(out_manifest, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), separators=(',', ':'))
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f'{len(out_manifest)} images, {len(os.listdir(OUT))} files, {total / 1e6:.1f} MB')
