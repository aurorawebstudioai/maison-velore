/* Maison Veloré — hero slider, rendered from data/slides.json (Figma layer data) and animated with GSAP. */
(() => {
  const MV = window.MV;
  const root = document.querySelector('[data-hero]');
  if (!root) return;

  const BLEND = { SOFT_LIGHT: 'soft-light', SCREEN: 'screen', MULTIPLY: 'multiply', OVERLAY: 'overlay', DARKEN: 'darken', LIGHTEN: 'lighten', COLOR_DODGE: 'color-dodge', COLOR_BURN: 'color-burn', HARD_LIGHT: 'hard-light', LUMINOSITY: 'luminosity', COLOR: 'color', SATURATION: 'saturation', HUE: 'hue' };
  const MOBILE_MAX = 699;
  const AUTOPLAY = 7000;
  const reduced = MV.reduced;

  let pendingColors = null, lite = false, stageK = 1;
  let data, manifest, mode, cfg, stage, viewport, slidesEl, ui, cur = 0, busy = false, built = {}, filterCss = [];
  let autoplayOn = !reduced, autoplayTimer = null, autoStart = 0, hovering = false, inView = true, progressTween = null;

  /* ---------- matrix helpers: [a,c,e,b,d,f] (Figma row-major 2x3) ---------- */
  const I = [1, 0, 0, 0, 1, 0];
  const absOf = (n) => (n.m ? n.m : [1, 0, n.p[0], 0, 1, n.p[1]]);
  const mul = (A, B) => [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2], A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
  const inv = (A) => { const det = A[0] * A[4] - A[1] * A[3]; return [A[4] / det, -A[1] / det, (A[1] * A[5] - A[4] * A[2]) / det, -A[3] / det, A[0] / det, (A[3] * A[2] - A[0] * A[5]) / det]; };
  const css = (M) => `matrix(${M[0]},${M[3]},${M[1]},${M[4]},${M[2]},${M[5]})`;
  const apply = (M, x, y) => [M[0] * x + M[1] * y + M[2], M[3] * x + M[4] * y + M[5]];
  const bbox = (n) => { const M = absOf(n); const pts = [[0, 0], [n.s[0], 0], [0, n.s[1]], [n.s[0], n.s[1]]].map(([x, y]) => apply(M, x, y)); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };

  /* ---------- paint conversion ---------- */
  const src = (name, shownW) => {
    const e = manifest[name]; if (!e) return null;
    const ws = Object.keys(e.files).map(Number).sort((a, b) => a - b);
    if (!shownW) return e.files[ws[ws.length - 1]];
    const need = shownW * stageK * Math.min(window.devicePixelRatio || 1, 2);
    return e.files[ws.find((x) => x >= need) || ws[ws.length - 1]];
  };
  const filterFor = (f) => { const p = []; if (f.exposure) p.push(`brightness(${(1 + f.exposure).toFixed(3)})`); if (f.contrast) p.push(`contrast(${(1 + f.contrast * 0.6).toFixed(3)})`); if (f.saturation) p.push(`saturate(${(1 + f.saturation).toFixed(3)})`); if (f.temperature > 0) p.push(`sepia(${(f.temperature * 0.5).toFixed(3)})`); return p.join(' '); };
  const ginv = (gt) => inv([gt[0], gt[1], gt[2], gt[3], gt[4], gt[5]]);
  const gradientCss = (g, w, h) => {
    const G = ginv(g.gt); const P = (u, v) => { const [x, y] = apply(G, u, v); return [x * w, y * h]; };
    if (g.g === 'radial' || g.g === 'diamond') {
      const C = P(0.5, 0.5), A = P(1, 0.5), B = P(0.5, 1);
      const rx = Math.hypot(A[0] - C[0], A[1] - C[1]), ry = Math.hypot(B[0] - C[0], B[1] - C[1]);
      return `radial-gradient(${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${C[0].toFixed(1)}px ${C[1].toFixed(1)}px, ${g.st.map(([p, c]) => `${c} ${(p * 100).toFixed(2)}%`).join(', ')})`;
    }
    const P0 = P(0, 0.5), P1 = P(1, 0.5); const dx = P1[0] - P0[0], dy = P1[1] - P0[1];
    const th = Math.atan2(dx, -dy); const u = [Math.sin(th), -Math.cos(th)]; const L = Math.abs(w * u[0]) + Math.abs(h * u[1]);
    const S = [w / 2 - (u[0] * L) / 2, h / 2 - (u[1] * L) / 2];
    const t0 = ((P0[0] - S[0]) * u[0] + (P0[1] - S[1]) * u[1]) / L, t1 = ((P1[0] - S[0]) * u[0] + (P1[1] - S[1]) * u[1]) / L;
    return `linear-gradient(${((th * 180) / Math.PI).toFixed(2)}deg, ${g.st.map(([p, c]) => `${c} ${((t0 + p * (t1 - t0)) * 100).toFixed(2)}%`).join(', ')})`;
  };
  const imageBox = (f, w, h) => {
    if (f.sm === 'CROP' && f.it) { const [a, , c, , e, ff] = f.it; return { size: `${(w / a).toFixed(1)}px ${(h / e).toFixed(1)}px`, pos: `${((-c / a) * w).toFixed(1)}px ${((-ff / e) * h).toFixed(1)}px`, rep: 'no-repeat' }; }
    if (f.sm === 'FIT') return { size: 'contain', pos: 'center', rep: 'no-repeat' };
    if (f.sm === 'TILE') return { size: 'auto', pos: '0 0', rep: 'repeat' };
    return { size: 'cover', pos: 'center', rep: 'no-repeat' };
  };

  /* ---------- node -> DOM ---------- */
  const el = (cls) => { const d = document.createElement('div'); if (cls) d.className = cls; return d; };
  const imgUrls = new Set();
  function render(n, parentAbs) {
    if (n.t === 'text' || /^(nav|button|controls|swipe_|tap_|status)/.test(n.n)) return null;
    const A = absOf(n);
    const d = el('l');
    d.dataset.n = n.n;
    const [w, h] = n.s;
    d.style.width = w + 'px'; d.style.height = h + 'px';
    d.style.transform = css(mul(inv(parentAbs), A));
    if (n.o != null) d.style.opacity = n.o;
    if (n.b && BLEND[n.b]) d.style.mixBlendMode = BLEND[n.b];
    if (n.t === 'ellipse') d.style.borderRadius = '50%';
    if (n.cr) d.style.borderRadius = n.cr + 'px';
    if (n.clip) d.style.overflow = 'hidden';
    const filters = [];
    if (n.t === 'inst') {
      if (n.comp === 'Bottle Label') { d.appendChild(label(n)); }
      else if (n.img) { const u = src(n.img); if (u) { d.style.backgroundImage = `url("${u}")`; d.style.backgroundSize = 'contain'; d.style.backgroundRepeat = 'no-repeat'; imgUrls.add(u); } }
    }
    const fills = Array.isArray(n.f) ? n.f : [];
    const bgs = [], sizes = [], poss = [], reps = [];
    for (const f of fills.slice().reverse()) {
      if (f.c) { if (fills.length === 1) d.style.backgroundColor = f.c; else { bgs.push(`linear-gradient(${f.c},${f.c})`); sizes.push('100% 100%'); poss.push('0 0'); reps.push('no-repeat'); } }
      else if (f.i) { const shown = w * Math.hypot(A[0], A[3]) / (f.sm === 'CROP' && f.it ? Math.max(f.it[0], 0.05) : 1); const u = src(f.i, shown); if (!u) continue; imgUrls.add(u); const b = imageBox(f, w, h); bgs.push(`url("${u}")`); sizes.push(b.size); poss.push(b.pos); reps.push(b.rep); if (f.f != null && filterCss[f.f]) filters.push(filterCss[f.f]); if (f.a != null) d.style.opacity = (n.o ?? 1) * f.a; }
      else if (f.g) { bgs.push(gradientCss(f, w, h)); sizes.push('100% 100%'); poss.push('0 0'); reps.push('no-repeat'); }
    }
    if (bgs.length) { d.style.backgroundImage = bgs.join(','); d.style.backgroundSize = sizes.join(','); d.style.backgroundPosition = poss.join(','); d.style.backgroundRepeat = reps.join(','); }
    for (const fx of n.fx || []) {
      if (fx.t === 'blur' && fx.r > 0) filters.push(`blur(${(fx.r / 2).toFixed(1)}px)`);
      else if (fx.t === 'ds') filters.push(`drop-shadow(${fx.x}px ${fx.y}px ${(fx.r / 2).toFixed(1)}px ${fx.c})`);
      else if (fx.t === 'noise') { d.style.backgroundImage = 'url("assets/img/grain.png")'; d.style.backgroundSize = '160px 160px'; d.style.backgroundRepeat = 'repeat'; d.style.backgroundColor = 'transparent'; }
    }
    if (filters.length) d.style.filter = filters.join(' ');
    if (Array.isArray(n.c)) renderChildren(n.c, A, d);
    return d;
  }
  function renderChildren(children, parentAbs, host) {
    let target = host, targetAbs = parentAbs;
    for (const c of children) {
      if (c.mask) {
        /* Figma: a mask node clips every following sibling. Build a wrapper in the mask node's own space. */
        const MA = absOf(c);
        const wrap = el('l mask');
        wrap.style.width = c.s[0] + 'px'; wrap.style.height = c.s[1] + 'px';
        wrap.style.transform = css(mul(inv(parentAbs), MA));
        const f = (c.f || [])[0] || {};
        let mi = '', ms = '100% 100%', mp = '0 0';
        if (f.g) mi = gradientCss(f, c.s[0], c.s[1]);
        else if (f.i) { const masks = (window.MV_DATA && window.MV_DATA.masks) || {}; const u = masks[f.i] || src(f.i); mi = `url("${u}")`; const b = imageBox(f, c.s[0], c.s[1]); ms = b.size; mp = b.pos; }
        else if (f.c) mi = `linear-gradient(${f.c},${f.c})`;
        if (mi) { wrap.style.webkitMaskImage = wrap.style.maskImage = mi; wrap.style.webkitMaskSize = wrap.style.maskSize = ms; wrap.style.webkitMaskPosition = wrap.style.maskPosition = mp; wrap.style.webkitMaskRepeat = wrap.style.maskRepeat = 'no-repeat'; }
        host.appendChild(wrap);
        target = wrap; targetAbs = MA;
        continue;
      }
      const ch = render(c, targetAbs);
      if (ch) target.appendChild(ch);
    }
  }
  /* Bottle Label instance -> crisp HTML (texts come from the Figma instance) */
  function label(n) {
    const [w] = n.s; const k = w / 200;
    const t = n.texts || [];
    const box = el('bottle-label');
    box.style.background = n.bg || '#f4efe6';
    box.innerHTML = `<div class="bottle-label__in" style="transform:scale(${k})"><span class="bl-brand">${MV.esc(t[0] || '')}</span><span class="bl-rule"></span><span class="bl-name">${MV.esc(t[1] || '')}</span><span class="bl-meta">${MV.esc(t[2] || '')}</span></div>`;
    return box;
  }

  /* ---------- slides ---------- */
  function buildSlide(i) {
    if (built[i]) return built[i];
    const s = data.slides[i]; const d = s[mode];
    const host = el('slide'); host.dataset.index = i; host.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
    const layers = [];
    let bottleBox = null;
    /* grading frames are pass-through in Figma: split them so each child's blend mode reaches the slide below */
    const flat = [];
    for (const L of d.layers) {
      if (L.role === 'grade' && Array.isArray(L.c)) L.c.forEach((c) => flat.push(Object.assign({}, c, { role: 'grade', tier: 'grade', depth: 0 })));
      else flat.push(L);
    }
    for (const L of flat) {
      if (L.role === 'ui' || L.role === 'text') continue;
      if (lite && /grain/.test(L.n)) continue;
      /* wrappers are sized to the layer's bounding box so composited layers stay small */
      const b = bbox(L);
      const px = el('w px'), tr = el('w tr'), fl = el('w fl');
      const node = render(L, [1, 0, b.x, 0, 1, b.y]);
      if (!node) continue;
      if (L.b && BLEND[L.b]) { px.style.mixBlendMode = BLEND[L.b]; node.style.mixBlendMode = ''; }
      Object.assign(px.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
      fl.appendChild(node); tr.appendChild(fl); px.appendChild(tr); host.appendChild(px);
      const ox = b.x + b.w / 2, oy = b.y + b.h / 2;
      const rec = { L, px, tr, fl, cx: ox, cy: oy, area: b.w * b.h, depth: L.depth || 0 };
      layers.push(rec);
      if (L.role === 'bottle') bottleBox = { x: ox, y: oy };
    }
    /* per-slide text block (positions + type from Figma) */
    const tf = d.layers.find((l) => l.role === 'text');
    const text = el('slide-text');
    const product = data.slides[i].product;
    if (tf) for (const t of tf.c) {
      const tag = t.n === 'title' ? 'h2' : 'p';
      const e = document.createElement(tag);
      e.className = 'st st--' + t.n;
      e.style.left = t.p[0] + 'px'; e.style.top = t.p[1] + 'px';
      e.style.fontSize = t.fs + 'px';
      e.style.lineHeight = typeof t.lh === 'number' ? t.lh + 'px' : typeof t.lh === 'string' && t.lh.endsWith('%') ? (parseFloat(t.lh) / 100).toFixed(3) : '1.2';
      if (t.ls && t.ls !== '0%') e.style.letterSpacing = (parseFloat(t.ls) / 100).toFixed(3) + 'em';
      e.style.whiteSpace = 'pre';
      if (t.n === 'title') { const a = document.createElement('a'); a.href = `product.html?id=${product}`; a.textContent = t.tx; e.appendChild(a); }
      else e.textContent = t.tx;
      text.appendChild(e);
    }
    host.appendChild(text);
    slidesEl.appendChild(host);
    return (built[i] = { i, host, layers, text, lines: [...text.children], bottle: bottleBox || { x: cfg.w * 0.6, y: cfg.h * 0.5 } });
  }
  const preload = (i) => { const s = buildSlide(i); const urls = [...s.host.querySelectorAll('.l')].flatMap((n) => [...(n.style.backgroundImage || '').matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1])); return Promise.all([...new Set(urls)].map((u) => new Promise((res) => { const im = new Image(); im.onerror = res; im.onload = () => (im.decode ? im.decode().then(res, res) : res()); im.src = u; }))); };
  const near = (i) => [i, (i + 1) % 10, (i + 9) % 10];

  /* ---------- UI (controls, button) ---------- */
  function buildUI() {
    const d = data.slides[0][mode];
    const find = (name, list = d.layers) => { for (const l of list) { if (l.n === name) return l; if (Array.isArray(l.c)) { const r = find(name, l.c); if (r) return r; } } return null; };
    const btn = find('button'), counter = find('counter_text'), progress = find('progress'), prev = find('arrow_prev'), next = find('arrow_next');
    ui = el('hero-ui');
    ui.innerHTML = `
      <button class="hero-cta btn" type="button" style="left:${btn.p[0]}px;top:${btn.p[1]}px;width:${btn.s[0]}px;height:${btn.s[1]}px" data-hero-add>Add to bag</button>
      <p class="hero-counter num" style="left:${counter.p[0]}px;top:${counter.p[1]}px;font-size:${counter.fs}px" aria-live="polite"><span data-cur>01</span> / 10</p>
      <div class="hero-progress" style="left:${progress.p[0]}px;top:${progress.p[1] - 20}px;width:${progress.s[0]}px" role="group" aria-label="Choose a fragrance">
        ${data.slides.map((s, i) => `<button type="button" aria-label="${MV.esc(s.id.slice(3))} — slide ${i + 1} of 10" data-go="${i}"><span><i></i></span></button>`).join('')}
      </div>
      ${prev ? `<button class="hero-arrow" type="button" style="left:${prev.p[0]}px;top:${prev.p[1]}px" aria-label="Previous fragrance" data-dir="-1"><svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="22.5"/><path d="M25.5 17.5L20 23l5.5 5.5"/></svg></button>
      <button class="hero-arrow" type="button" style="left:${next.p[0]}px;top:${next.p[1]}px" aria-label="Next fragrance" data-dir="1"><svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="22.5"/><path d="M20.5 17.5L26 23l-5.5 5.5"/></svg></button>` : ''}`;
    stage.appendChild(ui);
    ui.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]'); const a = e.target.closest('[data-dir]'); const add = e.target.closest('[data-hero-add]');
      if (g) { stopAutoplay(); goTo(+g.dataset.go); }
      if (a) { stopAutoplay(); step(+a.dataset.dir); }
      if (add) { MV.cart.add(data.slides[cur].product, '100ml'); MV.toast(); }
    });
  }
  function paintUI(i, first) {
    const c = data.slides[i].colors;
    const vars = { '--hero-text': c.text, '--hero-accent': c.accent, '--hero-on-accent': c['on-accent'] };
    const apply = () => { for (const [k, v] of Object.entries(vars)) { root.style.setProperty(k, v); document.documentElement.style.setProperty(k, v); } };
    if (first || reduced) apply(); else pendingColors = apply; /* applied once, mid-transition (see goTo) */
    ui.querySelector('[data-cur]').textContent = String(i + 1).padStart(2, '0');
    ui.querySelectorAll('[data-go]').forEach((b, k) => { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    ui.querySelector('[data-hero-add]').setAttribute('aria-label', `Add ${data.slides[i].id.slice(3)} 100 ml to bag`);
    restartProgress();
  }

  /* ---------- transitions ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const isFlyer = (r) => r.L.role === 'ingredient' || r.L.role === 'particle';
  function scatterVec(r, s) { let vx = r.cx - s.bottle.x, vy = r.cy - s.bottle.y; const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len; return [vx, vy]; }

  function step(dir) { goTo((cur + dir + 10) % 10, dir); }
  async function goTo(to, dir) {
    if (busy || to === cur) return;
    if (dir == null) { const f = (to - cur + 10) % 10; dir = f <= 5 ? 1 : -1; }
    busy = true;
    const A = buildSlide(cur), B = buildSlide(to);
    await Promise.race([preload(to), new Promise((r) => setTimeout(r, 900))]);
    stopFloat(A); resetParallax(A);
    B.host.style.visibility = 'visible'; B.host.style.zIndex = 2; A.host.style.zIndex = 1;
    B.host.setAttribute('aria-hidden', 'false'); A.host.setAttribute('aria-hidden', 'true');
    const from = cur; cur = to;
    const done = () => { A.host.style.visibility = 'hidden'; gsap.set(A.layers.map((r) => r.tr), { clearProps: 'transform,opacity,willChange' }); gsap.set(A.lines, { clearProps: 'transform,opacity' }); setWill(A, false); setWill(B, false); busy = false; startFloat(B); (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => near(cur).forEach(preload)); };
    paintUI(to);
    if (reduced) { gsap.fromTo(B.host, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out', onComplete: () => { gsap.set(B.host, { clearProps: 'opacity' }); done(); } }); return; }
    setWill(A, true); setWill(B, true);
    const tl = gsap.timeline({ onComplete: done, defaults: { overwrite: 'auto' } });
    const k = mode === 'mobile' ? 0.45 : 1;
    /* 1. ingredients scatter outward, small first, speed by depth */
    const outFly = A.layers.filter(isFlyer).sort((a, b) => a.area - b.area);
    outFly.forEach((r, n) => { const [vx, vy] = scatterVec(r, A); const dist = (320 + 520 * Math.min(r.depth, 1.3)) * k; tl.to(r.tr, { x: vx * dist - dir * 80 * k, y: vy * dist, rotation: rand(14, 38) * (vx >= 0 ? 1 : -1), scale: 0.92, opacity: 0, duration: 0.72 - 0.26 * Math.min(r.depth, 1.2), ease: 'power2.in' }, Math.min(0.008 * n, 0.2)); });
    /* 2. floor objects lift ~60px and fly out, shadows shrink and fade */
    A.layers.filter((r) => r.L.role === 'floor').forEach((r, n) => { const out = (r.cx < A.bottle.x ? -1 : 1); tl.to(r.tr, { y: -60 * k, duration: 0.24, ease: 'power2.out' }, 0.06 + n * 0.03).to(r.tr, { x: out * 340 * k, y: -110 * k, rotation: out * 18, opacity: 0, duration: 0.42, ease: 'power2.in' }, 0.3 + n * 0.03); });
    A.layers.filter((r) => r.L.role === 'floorShadow').forEach((r) => tl.to(r.tr, { scale: 0.35, opacity: 0, duration: 0.36, ease: 'power2.in' }, 0.06));
    /* 3. bottle out with rotation; background, grading and text colours crossfade */
    A.layers.filter((r) => r.L.role === 'bottleShadow').forEach((r) => tl.to(r.tr, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.14));
    A.layers.filter((r) => r.L.role === 'bottle').forEach((r) => tl.to(r.tr, { x: -dir * 760 * k, y: -20, rotation: -dir * 13, opacity: 0, duration: 0.66, ease: 'power3.in' }, 0.16));
    B.layers.filter((r) => r.L.role === 'bg' || r.L.role === 'grade').forEach((r) => tl.fromTo(r.tr, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, 0.3));
    tl.to(A.lines, { y: -26, opacity: 0, duration: 0.34, stagger: 0.035, ease: 'power2.in' }, 0.08);
    /* 4. new bottle enters with a soft overshoot; ingredients fly in and settle; floor drops in */
    B.layers.filter((r) => r.L.role === 'bottle').forEach((r) => tl.fromTo(r.tr, { x: dir * 760 * k, y: 0, rotation: dir * 13, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.78, ease: 'back.out(1.25)' }, 0.52));
    B.layers.filter((r) => r.L.role === 'bottleShadow').forEach((r) => tl.fromTo(r.tr, { opacity: 0 }, { opacity: 1, duration: 0.42, ease: 'power1.out' }, 0.98));
    const inFly = B.layers.filter(isFlyer).sort((a, b) => b.area - a.area);
    inFly.forEach((r, n) => { const [vx, vy] = scatterVec(r, B); const dist = (260 + 420 * Math.min(r.depth, 1.3)) * k; tl.fromTo(r.tr, { x: vx * dist + dir * 90 * k, y: vy * dist, rotation: -rand(16, 34) * (vx >= 0 ? 1 : -1), scale: 0.9, opacity: 0 }, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.5 + 0.2 * Math.min(r.depth, 1.2), ease: 'power3.out' }, 0.56 + Math.min(n * 0.006, 0.16)); });
    B.layers.filter((r) => r.L.role === 'floor').forEach((r, n) => tl.fromTo(r.tr, { y: -60 * k, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'bounce.out' }, 0.74 + n * 0.04));
    B.layers.filter((r) => r.L.role === 'floorShadow').forEach((r) => tl.fromTo(r.tr, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.82));
    /* 5. text lines slide up with a stagger */
    if (pendingColors) { tl.call(pendingColors, null, 0.42); pendingColors = null; }
    tl.fromTo(B.lines, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.78);
    tl.fromTo(ui.querySelector('.hero-cta'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0.98);
  }
  const setWill = (s, on) => s.layers.forEach((r) => (r.tr.style.willChange = on ? 'transform, opacity' : ''));

  /* ---------- idle: float + parallax ---------- */
  function startFloat(s) {
    if (reduced || lite) return;
    s.floats = s.layers.filter((r) => isFlyer(r)).map((r) => gsap.to(r.fl, { y: rand(5, 13) * (Math.random() < 0.5 ? -1 : 1), rotation: rand(1.5, 4.5) * (Math.random() < 0.5 ? -1 : 1), duration: rand(3.2, 6), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: rand(0, 1.5) }));
  }
  function stopFloat(s) { (s.floats || []).forEach((t) => t.kill()); s.floats = null; gsap.to(s.layers.map((r) => r.fl), { y: 0, rotation: 0, duration: 0.3 }); }
  let qx = new Map();
  function parallax(nx, ny) {
    const s = built[cur]; if (!s || busy) return;
    for (const r of s.layers) {
      if (!qx.has(r.px)) qx.set(r.px, [gsap.quickTo(r.px, 'x', { duration: 0.9, ease: 'power3.out' }), gsap.quickTo(r.px, 'y', { duration: 0.9, ease: 'power3.out' })]);
      const [fx, fy] = qx.get(r.px); fx(-nx * 22 * r.depth); fy(-ny * 14 * r.depth);
    }
  }
  function resetParallax(s) { gsap.to(s.layers.map((r) => r.px), { x: 0, y: 0, duration: 0.6, ease: 'power2.out' }); }

  /* ---------- autoplay ---------- */
  function restartProgress() {
    if (progressTween) progressTween.kill();
    const bars = ui.querySelectorAll('.hero-progress i');
    gsap.set(bars, { scaleX: 0 });
    if (!autoplayOn) { gsap.set(bars[cur], { scaleX: 1 }); return; }
    progressTween = gsap.to(bars[cur], { scaleX: 1, duration: AUTOPLAY / 1000, ease: 'none', paused: hovering || !inView || document.hidden, onComplete: () => { if (autoplayOn) step(1); } });
  }
  function stopAutoplay() { if (!autoplayOn) return; autoplayOn = false; if (progressTween) progressTween.kill(); gsap.set(ui.querySelectorAll('.hero-progress i'), { scaleX: 0 }); gsap.set(ui.querySelectorAll('.hero-progress i')[cur], { scaleX: 1 }); }
  const syncPause = () => { if (!progressTween) return; (hovering || !inView || document.hidden) ? progressTween.pause() : progressTween.resume(); };

  /* ---------- layout ---------- */
  function measure() {
    const w = root.clientWidth;
    const m = w <= MOBILE_MAX ? 'mobile' : 'desktop';
    cfg = m === 'mobile' ? { w: 375, h: 812, top: 44 } : { w: 1440, h: 900, top: 0 };
    const k = w / cfg.w;
    stageK = k; lite = m === 'mobile' || matchMedia('(pointer: coarse)').matches;
    viewport.style.height = (cfg.h - cfg.top) * k + 'px';
    stage.style.width = cfg.w + 'px'; stage.style.height = cfg.h + 'px';
    stage.style.transform = `translateY(${-cfg.top * k}px) scale(${k})`;
    root.dataset.mode = m;
    return m;
  }
  function rebuild() {
    Object.values(built).forEach((s) => { stopFloat(s); s.host.remove(); }); built = {}; qx = new Map();
    if (ui) ui.remove();
    buildUI();
    const s = buildSlide(cur); s.host.style.visibility = 'visible'; s.host.style.zIndex = 2;
    paintUI(cur, true); startFloat(s); near(cur).forEach(preload);
  }

  /* ---------- init ---------- */
  Promise.all([MV.json('data/slides.json'), MV.manifest()]).then(([d, man]) => {
    data = d; manifest = man; filterCss = d.imageFilters.map(filterFor);
    viewport = root.querySelector('.hero__viewport');
    stage = el('hero__stage'); slidesEl = el('hero__slides'); stage.appendChild(slidesEl); viewport.appendChild(stage);
    mode = measure();
    rebuild();
    root.classList.add('is-ready');
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const m = measure(); if (m !== mode) { mode = m; rebuild(); } }, 120); });
    /* input: keyboard, swipe/drag, hover, parallax */
    addEventListener('keydown', (e) => { if (e.target.closest('input, textarea, select, [contenteditable]')) return; const r = root.getBoundingClientRect(); if (r.bottom < 120 || r.top > innerHeight - 120) return; if (e.key === 'ArrowRight') { stopAutoplay(); step(1); } if (e.key === 'ArrowLeft') { stopAutoplay(); step(-1); } });
    let sx = null, sy = 0, st = 0;
    viewport.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a')) return; sx = e.clientX; sy = e.clientY; st = Date.now(); });
    addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2 && Date.now() - st < 900) { stopAutoplay(); step(dx < 0 ? 1 : -1); } });
    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; syncPause(); } });
    root.addEventListener('pointerleave', () => { hovering = false; syncPause(); parallax(0, 0); });
    if (!reduced && matchMedia('(pointer: fine)').matches) root.addEventListener('pointermove', (e) => { if (mode !== 'desktop') return; const r = root.getBoundingClientRect(); parallax(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1); });
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; syncPause(); built[cur] && built[cur].floats && built[cur].floats.forEach((t) => (inView ? t.resume() : t.pause())); }, { threshold: 0.2 }).observe(root);
    document.addEventListener('visibilitychange', syncPause);
    MV.hero = { goTo, step, get index() { return cur; }, stopAutoplay };
  }).catch((err) => { console.error(err); root.classList.add('is-error'); });
})();
