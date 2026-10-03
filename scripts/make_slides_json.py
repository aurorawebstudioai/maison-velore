"""Build data/slides.json from the raw Figma layer dump (design/raw/slides_raw.json).
Adds role / tier / depth per top-level layer and a per-breakpoint image index keyed by file name.
Run: python scripts/make_slides_json.py
"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(os.path.join(ROOT, 'design/raw/slides_raw.json'), encoding='utf-8'))
products = json.load(open(os.path.join(ROOT, 'data/products.json'), encoding='utf-8'))
manifest = json.load(open(os.path.join(ROOT, 'optimized/_manifest.json'), encoding='utf-8'))
PARTICLE = re.compile(r'(pollen|dust|mist|haze|sugar|specks|droplets|drops|dew|foam|rain|bits|fall|cloud|glow|sawdust|smoke)')

def blur_of(l):
    return max([fx.get('r', 0) for fx in l.get('fx', []) if fx.get('t') == 'blur'] + [0])

def area(l):
    return l['s'][0] * l['s'][1]

def classify(layers):
    names = [l['n'] for l in layers]
    bi = next((i for i, n in enumerate(names) if n.startswith('bottle_')), len(names))
    for i, l in enumerate(layers):
        n = l['n']; b = blur_of(l)
        if n.startswith('bg_'): role, tier, depth = 'bg', 'bg', 0.05
        elif n.startswith('grade_'): role, tier, depth = 'grade', 'grade', 0
        elif n.startswith('bshadow_'): role, tier, depth = 'bottleShadow', 'bottle', 0.75
        elif n.startswith('bottle_'): role, tier, depth = 'bottle', 'bottle', 0.75
        elif n.startswith('fshadow_'): role, tier, depth = 'floorShadow', 'floor-back' if i < bi else 'floor-front', 0.7 if i < bi else 0.85
        elif n.startswith('floor_'): role, tier, depth = 'floor', 'floor-back' if i < bi else 'floor-front', 0.7 if i < bi else 0.85
        elif re.search(r'_bead_\d+', n): role, tier, depth = 'particle', 'bead', 0.55
        elif n.startswith('ing_'):
            role = 'ingredient'
            if PARTICLE.search(n): tier, depth = 'particle', 0.5
            elif '_fly' in n: tier, depth = 'fly', round(0.9 - min(b, 6) / 12, 2)
            elif i < bi:
                ds = max([fx.get('r', 0) for fx in l.get('fx', []) if fx.get('t') == 'ds'] + [0])
                if b >= 3: tier, depth = 'back', 0.25
                elif ds >= 50: tier, depth = 'hero', 0.45
                else: tier, depth = 'mid', 0.6
            else:
                tier, depth = ('edge', 1.35) if b >= 10 else ('over', 1.0)
        elif n.startswith('text_'): role, tier, depth = 'text', 'text', 0
        else: role, tier, depth = 'ui', 'ui', 0
        l['role'], l['tier'], l['depth'] = role, tier, depth
        if role in ('floor', 'floorShadow'):
            l['pair'] = re.sub(r'^(fshadow|floor)_[a-z]+_', '', n)
    return layers

def collect_images(node, acc):
    for f in node.get('f', []) if isinstance(node.get('f'), list) else []:
        if 'i' in f: acc[f['i']] = acc.get(f['i'], 0) + 1
    if node.get('comp', '').startswith('Particle/'):
        nm = 'particle_gold_bead' if 'Gold Bead' in node['comp'] else 'particle_golden_droplet'
        node['img'] = nm; acc[nm] = acc.get(nm, 0) + 1
    if isinstance(node.get('c'), list):
        for ch in node['c']: collect_images(ch, acc)

out = {'meta': {'source': raw['source'] + ' — pages "Hero Slider" (desktop 1440×900) and "Hero Slider — Mobile" (375×812)',
                'exported': raw['exported'],
                'coords': 'All positions are in slide-frame space. "p" = [x,y] translate; "m" = [a,c,e,b,d,f] row-major 2x3 affine (x\'=a*x+c*y+e, y\'=b*x+d*y+f); "s" = [w,h] of the untransformed box.',
                'keys': {'n': 'layer name', 't': 'type', 'o': 'opacity', 'b': 'blend mode', 'f': 'fills (c=solid colour, i=image name, sm=scale mode, it=crop transform, f=index into imageFilters, g=gradient type, st=stops, gt=gradient transform)', 'fx': 'effects (blur r = Figma radius; ds = drop shadow c/x/y/r/s; noise)', 'mask': 'this node masks its following siblings', 'c': 'children (or text colour on text nodes)', 'tx': 'text', 'fs': 'font size', 'lh': 'line height', 'ls': 'letter spacing', 'role/tier/depth': 'animation grouping + parallax depth (added by make_slides_json.py)'}},
       'imageFilters': raw['imageFilters'], 'slides': []}
missing = set()
for i, s in enumerate(raw['slides']):
    sid = s['id']; scent = sid.split('_', 1)[1]
    entry = {'id': sid, 'index': i + 1, 'scent': scent, 'product': products[i]['id'], 'colors': raw['slideVars'].get(sid, {})}
    for bp in ('desktop', 'mobile'):
        d = s[bp]; classify(d['layers'])
        acc = {}
        for l in d['layers']: collect_images(l, acc)
        imgs = {}
        for nm, uses in sorted(acc.items()):
            m = manifest.get(nm)
            if not m: missing.add(nm)
            imgs[nm + (os.path.splitext(m['file'])[1] if m else '.png')] = {'name': nm, 'uses': uses, 'optimized': m['file'] if m else None, 'w': m['w'] if m else None, 'h': m['h'] if m else None}
        entry[bp] = {'size': d['frame'], 'figmaId': d['figmaId'], 'images': imgs, 'layers': d['layers']}
    out['slides'].append(entry)
json.dump(out, open(os.path.join(ROOT, 'data/slides.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('slides:', len(out['slides']), 'bytes:', os.path.getsize(os.path.join(ROOT, 'data/slides.json')))
print('missing in optimized/:', sorted(missing) or 'none')
from collections import Counter
print(Counter(l['tier'] for s in out['slides'] for l in s['desktop']['layers']))
