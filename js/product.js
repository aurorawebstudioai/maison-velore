/* product.html?id=<slug> — one template for all ten perfumes (data/products.json) */
(() => {
  const MV = window.MV;
  const ROOT = document.querySelector('[data-product]');
  /* one ingredient image per note tier (from the scent asset sheets) */
  const NOTE_IMG = {
    'fleur-silencieuse': ['floral_peony_petal_01', 'floral_peony_01', 'floral_jasmine_01'],
    'soleil-dagrumes': ['citrus_bergamot_01', 'citrus_neroli_blossom_01', 'aquatic_driftwood_01'],
    'bois-intemporel': ['oriental_cardamom_01', 'woody_cedar_branch_01', 'woody_vetiver_roots_01'],
    'nuit-orientale': ['oriental_saffron_01', 'oriental_cinnamon_01', 'oriental_amber_01'],
    'brise-marine': ['aquatic_salt_crystals_01', 'aquatic_driftwood_01', 'aquatic_sea_pebble_01'],
    'jardin-vert': ['green_basil_01', 'green_fig_half_01', 'woody_vetiver_roots_01'],
    'lavande-de-provence': ['lavender_rosemary_01', 'lavender_lavender_sprig_01', 'woody_moss_01'],
    'velours-de-vanille': ['gourmand_almond_01', 'gourmand_vanilla_flower_01', 'gourmand_tonka_beans_01'],
    'rose-imperiale': ['rose_raspberry_01', 'rose_red_rose_01', 'rose_patchouli_leaf_01'],
    'iris-poudre': ['iris_violet_leaf_01', 'iris_iris_flower_01', 'iris_cotton_flower_01'],
  };
  const GALLERY_FLORAL = ['gallery_floral_01_front', 'gallery_floral_02_angle', 'gallery_floral_03_ingredients', 'gallery_floral_04_lifestyle', 'gallery_floral_05_hand'];

  Promise.all([MV.products(), MV.manifest()]).then(([products, man]) => {
    const id = MV.qs('id') || products[0].id;
    const p = products.find((x) => x.id === id) || products[0];
    const sc = MV.SCENT[p.id];
    document.title = `${p.name} — Maison Veloré`;
    const metaD = document.querySelector('meta[name="description"]'); metaD.content = `${p.name}, ${p.family} ${p.concentration}. ${p.tagline}`;
    document.querySelector('meta[property="og:title"]').content = `${p.name} — Maison Veloré`;
    document.querySelector('meta[property="og:description"]').content = p.tagline;
    MV.hydrate(man);
    document.querySelector('[data-crumbs]').insertAdjacentHTML('beforeend', `<span aria-hidden="true">/</span><span aria-current="page">${MV.esc(p.name)}</span>`);

    /* ---------- gallery: Fleur Silencieuse has 5 shots; the others show the front + every other image that exists ---------- */
    const imgs = (p.id === 'fleur-silencieuse' ? GALLERY_FLORAL : [`gallery_${sc}_01_front`, `box_${sc}`, `bottle_${sc}_50ml`, `bottle_${sc}_10ml`, `vial_${sc}`]).filter((n) => man[n]);
    const altFor = (n) => n.includes('box_') ? `${p.name} gift box` : n.includes('vial_') ? `${p.name} 2 ml sample vial` : n.includes('_10ml') ? `${p.name} 10 ml travel spray` : n.includes('_50ml') ? `${p.name} 50 ml bottle` : `${p.name} bottle`;
    const g = document.querySelector('[data-gallery]');
    g.innerHTML = `<div class="gallery__thumbs" role="tablist" aria-label="Product images">${imgs.map((n, i) => `<button class="thumb" type="button" role="tab" aria-selected="${i === 0}" aria-controls="gallery-main" data-i="${i}">${MV.img(man, n, { sizes: '96px', alt: '' })}<span class="visually-hidden">${MV.esc(altFor(n))}</span></button>`).join('')}</div>
      <div class="gallery__main" id="gallery-main"><div class="gallery__track">${imgs.map((n, i) => `<figure class="gallery__slide" data-i="${i}">${MV.img(man, n, { sizes: '(max-width: 899px) 100vw, 576px', alt: altFor(n), eager: i === 0 })}</figure>`).join('')}</div></div>
      <div class="dots gallery__dots">${imgs.map((n, i) => `<button type="button" aria-label="Image ${i + 1} of ${imgs.length}" aria-current="${i === 0}" data-i="${i}"></button>`).join('')}</div>`;
    const track = g.querySelector('.gallery__track');
    const select = (i, fromScroll) => {
      g.querySelectorAll('.thumb').forEach((t, k) => t.setAttribute('aria-selected', k === i));
      g.querySelectorAll('.gallery__dots button').forEach((t, k) => t.setAttribute('aria-current', k === i));
      if (!fromScroll) track.scrollTo({ left: i * track.clientWidth, behavior: MV.reduced ? 'auto' : 'smooth' });
    };
    g.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b && b.tagName === 'BUTTON') select(+b.dataset.i); });
    let st; track.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => select(Math.round(track.scrollLeft / track.clientWidth), true), 80); });

    /* ---------- info / buy box ---------- */
    const info = document.querySelector('[data-info]');
    const notesFor = (k) => p[k].join(', ');
    info.innerHTML = `
      <p class="t-label gold">${p.family}</p>
      <h1 class="t-display info__name">${MV.esc(p.name)}</h1>
      <p class="t-quote muted">${MV.esc(p.tagline)}</p>
      <p class="info__rating"><span class="stars" aria-hidden="true">★★★★★</span> <a class="t-small muted" href="#reviews">4.9 · 128 reviews</a></p>
      <p class="info__price num" data-price aria-live="polite">€${p.prices_eur['100ml']}</p>
      <fieldset class="size-block"><legend class="t-label">Choose your size</legend>
        <div class="sizes">${MV.SIZES.map(([k, l]) => `<label class="size"><input type="radio" name="size" value="${k}" ${k === '100ml' ? 'checked' : ''}><span class="size__ml">${l}</span><span class="size__price">€${p.prices_eur[k]}</span></label>`).join('')}</div>
        <p class="t-small muted">${p.concentration}</p></fieldset>
      <div class="purchase">
        <button class="btn btn--accent btn--block btn--tall" type="button" data-add>Add to bag</button>
        <button class="link" type="button" data-sample>Add a 2 ml sample · €${p.sample_2ml_eur}</button>
        <p class="t-small muted">Complimentary shipping over €100 · Free sample with every order</p>
      </div>
      <div class="accordions">
        <details class="acc" open><summary>About this fragrance</summary><div class="acc__body"><p>${MV.esc(p.desc)}</p></div></details>
        <details class="acc"><summary>Ingredients &amp; care</summary><div class="acc__body"><ul><li>Top notes: ${notesFor('top')}</li><li>Heart notes: ${notesFor('heart')}</li><li>Base notes: ${notesFor('base')}</li></ul><p>How should I store my perfume? Cool, dry, out of sunlight, with the cap on.</p></div></details>
        <details class="acc"><summary>Shipping &amp; returns</summary><div class="acc__body"><ul><li>Free standard shipping on orders over €100, otherwise €6</li><li>Standard delivery: 2–5 business days within the EU, 5–10 internationally</li><li>Express delivery: 1–2 business days within the EU, €14</li><li>Return unopened items within 30 days for a full refund</li><li>Opened fragrances cannot be returned for hygiene reasons, except if faulty</li></ul></div></details>
      </div>`;
    const priceEl = info.querySelector('[data-price]');
    const sizeNow = () => info.querySelector('input[name=size]:checked').value;
    const stickyPrice = document.querySelector('[data-sticky-price]'), stickySize = document.querySelector('[data-sticky-size]');
    const paint = () => { const s = sizeNow(); priceEl.textContent = '€' + p.prices_eur[s]; stickyPrice.textContent = '€' + p.prices_eur[s]; stickySize.textContent = MV.sizeLabel(s); };
    info.addEventListener('change', (e) => { if (e.target.name === 'size') paint(); });
    paint();
    const add = (btn) => {
      MV.cart.add(p.id, sizeNow());
      MV.toast();
      document.querySelectorAll('[data-add], [data-sticky-add]').forEach((b) => { b.textContent = 'Added ✓'; clearTimeout(b._t); b._t = setTimeout(() => (b.textContent = 'Add to bag'), 2200); });
    };
    info.querySelector('[data-add]').addEventListener('click', add);
    document.querySelector('[data-sticky-add]').addEventListener('click', add);
    info.querySelector('[data-sample]').addEventListener('click', () => { MV.cart.add(p.id, '2ml'); MV.toast(); });

    /* sticky buy bar (phones) once the main Add to bag has scrolled away */
    const sticky = document.querySelector('[data-sticky]');
    new IntersectionObserver(([en]) => { const show = !en.isIntersecting && en.boundingClientRect.top < 0; sticky.classList.toggle('is-visible', show); sticky.setAttribute('aria-hidden', !show); sticky.querySelector('button').tabIndex = show ? 0 : -1; }).observe(info.querySelector('[data-add]'));

    /* ---------- scent story ---------- */
    document.querySelector('[data-ss-label]').textContent = p.name;
    const ni = NOTE_IMG[p.id];
    document.querySelector('[data-pyramid]').innerHTML = [['top', 'Top notes'], ['heart', 'Heart notes'], ['base', 'Base notes']].map(([k, t], i) => `
      <div class="tier reveal"><p class="tier__n num">0${i + 1}</p><div class="tier__img">${MV.img(man, ni[i], { sizes: '176px', alt: '' })}</div><h3 class="t-h4">${t}</h3>${p[k].map((n) => `<p class="t-body muted">${MV.esc(n)}</p>`).join('')}</div>`).join('');

    /* ---------- pairs / reviews / also like ---------- */
    const byId = Object.fromEntries(products.map((x) => [x.id, x]));
    document.querySelector('[data-pairs]').innerHTML = p.pairs.map((pid) => MV.card(man, byId[pid])).join('');
    const mine = MV.REVIEWS.filter((r) => r[0].includes(p.name));
    const list = [...mine, ...MV.REVIEWS.filter((r) => !mine.includes(r) && !products.some((x) => r[0].includes(x.name)))].slice(0, 3);
    document.querySelector('[data-reviews-list]').innerHTML = list.map(MV.reviewCard).join('');
    const idx = products.indexOf(p);
    const also = []; for (let k = 1; also.length < 4 && k < products.length; k++) { const c = products[(idx + k) % products.length]; if (!p.pairs.includes(c.id)) also.push(c); }
    document.querySelector('[data-also]').innerHTML = also.map((x) => MV.card(man, x)).join('');
    MV.reveal();
  }).catch((e) => { console.error(e); ROOT.insertAdjacentHTML('afterbegin', '<p class="wrap">This page needs to be served over http.</p>'); });
})();
