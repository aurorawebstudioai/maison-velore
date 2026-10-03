/* Maison Veloré — shared site code (header, footer, cart store, images, toast). No build step. */
(() => {
  const MV = (window.MV = window.MV || {});
  const cache = {};
  MV.json = (url) => (cache[url] = cache[url] || fetch(url).then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }));
  MV.products = () => MV.json('data/products.json');
  MV.manifest = () => MV.json('assets/img/manifest.json');
  MV.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  MV.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MV.qs = (k) => new URLSearchParams(location.search).get(k);

  /* scent key used in image file names, by product id */
  MV.SCENT = { 'fleur-silencieuse': 'floral', 'soleil-dagrumes': 'citrus', 'bois-intemporel': 'woody', 'nuit-orientale': 'oriental', 'brise-marine': 'aquatic', 'jardin-vert': 'green', 'lavande-de-provence': 'lavender', 'velours-de-vanille': 'gourmand', 'rose-imperiale': 'rose', 'iris-poudre': 'iris' };
  MV.SIZES = [['10ml', '10 ml'], ['50ml', '50 ml'], ['100ml', '100 ml']];
  MV.money = (n) => '€' + (Math.round(n * 100) / 100).toString().replace(/\.(\d)$/, '.$10');

  /* responsive <img> from assets/img/manifest.json */
  MV.img = (man, name, { sizes = '100vw', alt = '', cls = '', eager = false, attrs = '' } = {}) => {
    const e = man[name];
    if (!e) return `<span class="img-missing ${cls}" role="img" aria-label="${MV.esc(alt || name)}"></span>`;
    const ws = Object.keys(e.files).map(Number).sort((a, b) => a - b);
    const srcset = ws.map((w) => `${e.files[w]} ${w}w`).join(', ');
    const def = e.files[ws[ws.length - 1]];
    const h = Math.round((e.h * ws[ws.length - 1]) / e.w);
    return `<img class="${cls}" src="${def}" srcset="${srcset}" sizes="${sizes}" width="${ws[ws.length - 1]}" height="${h}" alt="${MV.esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" ${attrs}>`;
  };

  /* ---------------- cart (localStorage) ---------------- */
  const KEY = 'mv-cart-v1';
  const read = () => { try { return Object.assign({ items: [], sample: null, gift: false }, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return { items: [], sample: null, gift: false }; } };
  const write = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} dispatchEvent(new CustomEvent('mv:cart', { detail: c })); };
  MV.cart = {
    get: read,
    count: () => read().items.reduce((n, i) => n + i.qty, 0),
    add(id, size, qty = 1) { const c = read(); const it = c.items.find((i) => i.id === id && i.size === size); if (it) it.qty += qty; else c.items.push({ id, size, qty }); write(c); },
    setQty(id, size, qty) { const c = read(); const it = c.items.find((i) => i.id === id && i.size === size); if (!it) return; it.qty = Math.max(1, qty); write(c); },
    remove(id, size) { const c = read(); c.items = c.items.filter((i) => !(i.id === id && i.size === size)); write(c); },
    setSample(id) { const c = read(); c.sample = id; write(c); },
    setGift(v) { const c = read(); c.gift = !!v; write(c); },
    clear() { write({ items: [], sample: null, gift: false }); },
  };
  MV.priceOf = (p, size) => (size === '2ml' ? p.sample_2ml_eur : p.prices_eur[size]);
  MV.sizeLabel = (size) => ({ '2ml': '2 ml', '10ml': '10 ml', '50ml': '50 ml', '100ml': '100 ml' }[size] || size);

  /* ---------------- header ---------------- */
  const BAG = '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4.5 7.5h13l-1 12h-11z"/><path d="M8 7.5V6a3 3 0 0 1 6 0v1.5"/></svg>';
  const BURGER = '<svg viewBox="0 0 22 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M1 1h20M1 8h20M1 15h20"/></svg>';
  const CLOSE = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>';
  MV.icons = { BAG, BURGER, CLOSE };
  const page = document.body.dataset.page;
  const links = [['catalog.html', 'Shop', 'catalog'], ['index.html#our-story', 'Our Maison', 'maison'], ['journal.html', 'Journal', 'journal']];
  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.className = 'site-header' + (header.dataset.over !== undefined ? ' site-header--over' : '');
    header.innerHTML = `<div class="site-header__inner">
      <a class="brand" href="index.html">Maison Veloré</a>
      <nav class="nav-links" aria-label="Main">${links.map(([h, t, k]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      <div class="nav-actions">
        <a class="bag-link" href="cart.html" aria-label="Your bag">${BAG}<span data-bag-count>(0)</span></a>
        <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu-panel">${BURGER}</button>
      </div></div>`;
    const panel = document.createElement('div');
    panel.className = 'menu-panel'; panel.id = 'menu-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Menu');
    panel.innerHTML = `<div class="menu-panel__bar"><a class="brand" href="index.html">Maison Veloré</a>
      <div class="nav-actions"><a class="bag-link" href="cart.html" aria-label="Your bag">${BAG}<span data-bag-count>(0)</span></a>
      <button class="menu-toggle" type="button" style="display:inline-flex" aria-label="Close menu" data-close>${CLOSE}</button></div></div>
      <ul class="menu-panel__links"><li><a href="catalog.html">Shop</a></li><li><a href="index.html#our-story">Our Maison</a></li><li><a href="journal.html">Journal</a></li><li><a href="quiz.html">Quiz</a></li></ul>
      <p class="menu-panel__foot">Scents for a more beautiful tomorrow</p>`;
    document.body.appendChild(panel);
    const toggle = header.querySelector('.menu-toggle');
    const setOpen = (o) => { panel.classList.toggle('is-open', o); toggle.setAttribute('aria-expanded', o); document.documentElement.style.overflow = o ? 'hidden' : ''; if (o) panel.querySelector('[data-close]').focus(); else toggle.focus(); };
    toggle.addEventListener('click', () => setOpen(true));
    panel.querySelector('[data-close]').addEventListener('click', () => setOpen(false));
    panel.addEventListener('click', (e) => { if (e.target.closest('.menu-panel__links a')) setOpen(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false); });
  }
  const paintCount = () => document.querySelectorAll('[data-bag-count]').forEach((el) => (el.textContent = `(${MV.cart.count()})`));
  paintCount(); addEventListener('mv:cart', paintCount); addEventListener('storage', paintCount);

  /* ---------------- footer (texts from content/Тексты_сайта.md) ---------------- */
  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    const cols = [
      ['Shop', [['All fragrances', 'catalog.html'], ['Bestsellers', 'index.html#bestsellers'], ['Scent families', 'index.html#scent-families'], ['Gift sets', 'catalog.html'], ['Discovery set', 'index.html#discovery-set']]],
      ['About', [['Our story', 'index.html#our-story'], ['Sustainability', 'index.html#our-story'], ['Ingredients', 'journal.html?id=art-of-natural-ingredients'], ['Craftsmanship', 'journal.html?id=art-of-natural-ingredients']]],
      ['Help', [['Shipping', 'cart.html#help'], ['Returns', 'cart.html#help'], ['FAQ', 'cart.html#help'], ['Contact', 'cart.html#help']]],
      ['Journal', [['All articles', 'journal.html'], ['Places', 'journal.html?id=scent-of-the-mediterranean'], ['Craftsmanship', 'journal.html?id=art-of-natural-ingredients'], ['Guides', 'journal.html?id=fragrance-in-summer']]],
      ['Follow us', [['Instagram', '#'], ['Facebook', '#'], ['Pinterest', '#'], ['YouTube', '#']]],
    ];
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="wrap"><div class="footer-top">
      <div class="footer-brand"><a class="brand" href="index.html">Maison Veloré</a><p>A more beautiful tomorrow</p></div>
      <div class="footer-cols">${cols.map(([t, ls]) => `<details class="footer-col" open><summary><h3>${t}</h3></summary><ul>${ls.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></details>`).join('')}</div>
      </div>
      <div class="footer-bottom"><span>© 2026 Maison Veloré. All rights reserved.</span><span>Privacy · Terms · Contact</span></div>
      <p class="footer-disclaimer">Maison Veloré is a fictional brand created as a design concept. No real products are sold.</p></div>`;
    const mq = matchMedia('(max-width: 899px)');
    const sync = () => footer.querySelectorAll('.footer-col').forEach((d) => (d.open = !mq.matches));
    sync(); mq.addEventListener('change', sync);
  }

  /* ---------------- toast ---------------- */
  let toastEl, toastT;
  MV.toast = () => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.innerHTML = '<span>Added to bag</span><span aria-hidden="true">·</span><a href="cart.html">View bag</a>'; document.body.appendChild(toastEl); }
    toastEl.classList.add('is-visible'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-visible'), 3600);
  };
  /* quick add: smallest size ("from €35") */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quick-add]'); if (!b) return;
    e.preventDefault(); MV.cart.add(b.dataset.quickAdd, b.dataset.size || '10ml'); MV.toast();
  });

  /* product card (Store/Product Card) */
  MV.card = (man, p, { variant = 'standard', sizes = '(max-width: 599px) 140px, (max-width: 1099px) 45vw, 282px' } = {}) => {
    const scent = MV.SCENT[p.id];
    const quick = `<button class="btn btn--${variant === 'catalog' ? 'primary card__quick' : 'secondary'}" type="button" data-quick-add="${p.id}" data-size="10ml" aria-label="Quick add ${MV.esc(p.name)}, 10 ml">Quick add</button>`;
    return `<article class="card card--${variant}">
      <a class="card__media" href="product.html?id=${p.id}" tabindex="-1" aria-hidden="true">${MV.img(man, `gallery_${scent}_01_front`, { sizes, alt: '' })}</a>
      ${variant === 'catalog' ? quick : ''}
      <div class="card__info"><p class="card__family">${p.family}</p><h3 class="card__name"><a href="product.html?id=${p.id}">${MV.esc(p.name)}</a></h3>${variant === 'catalog' ? `<p class="card__tagline">${MV.esc(p.tagline)}</p>` : ''}<p class="card__price">from €${p.prices_eur['10ml']}</p></div>
      ${variant === 'standard' ? quick : ''}</article>`;
  };

  /* newsletter (texts from content) */
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-newsletter]'); if (!f) return;
    e.preventDefault(); const msg = f.querySelector('[data-msg]'); const v = f.email.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    msg.textContent = ok ? "Thank you. You're on the list." : 'Please enter a valid email address.';
    msg.style.color = ok ? '' : '#9b3b3b'; if (ok) f.reset();
  });

  /* reveal on scroll (transform/opacity only) */
  MV.reveal = (root = document) => {
    const els = root.querySelectorAll('.reveal'); if (!els.length) return;
    if (MV.reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.remove('reveal')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (!en.isIntersecting) return; io.unobserve(en.target); en.target.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }).finished.then(() => en.target.classList.remove('reveal')); }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  };
})();
