/* cart.html — bag in localStorage: quantity, remove, free sample, gift option, totals, checkout modal */
(() => {
  const MV = window.MV;
  const FREE_SHIPPING = 100, SHIPPING = 6; // content: "Shipping (Free over €100, otherwise €6)"
  Promise.all([MV.products(), MV.manifest()]).then(([products, man]) => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const root = document.querySelector('[data-cart]');
    const itemsEl = document.querySelector('[data-items]');
    const productOf = (id) => byId[id] || MV.EXTRA[id];
    const imageOf = (it) => { const p = productOf(it.id); if (p.img) return p.img; const sc = MV.SCENT[p.id]; return it.size === '2ml' ? `vial_${sc}` : it.size === '100ml' ? `bottle_${sc}` : `bottle_${sc}_${it.size}`; };
    const sizeText = (it) => { const p = productOf(it.id); return p.price != null ? p.family : MV.sizeLabel(it.size) + (it.size === '2ml' ? ' sample' : ''); };

    const render = (focusSel) => {
      const c = MV.cart.get();
      const lines = c.items.filter((it) => productOf(it.id));
      const n = lines.length;
      itemsEl.textContent = n ? `${n} item${n === 1 ? '' : 's'}` : '';
      if (!lines.length) {
        root.innerHTML = `<div class="cart-empty"><p class="t-h2">Your bag is empty.</p><a class="btn btn--primary" href="catalog.html">Discover our fragrances →</a></div>`;
        renderAlso([]);
        return;
      }
      const sub = lines.reduce((a, it) => a + MV.priceOf(productOf(it.id), it.size) * it.qty, 0);
      const ship = sub >= FREE_SHIPPING ? 0 : SHIPPING;
      const sample = c.sample || products[0].id;
      root.innerHTML = `<div class="cart-grid">
        <div class="bag-col">
          <ul class="lines" aria-label="Items in your bag">${lines.map((it) => { const p = productOf(it.id); const key = `${it.id}|${it.size}`;
            return `<li class="line" data-key="${key}">
              <a class="line__img" href="${byId[it.id] ? `product.html?id=${it.id}` : 'index.html#discovery-set'}" tabindex="-1" aria-hidden="true">${MV.img(man, imageOf(it), { sizes: '120px', alt: '' })}</a>
              <div class="line__details">
                <h2 class="t-h3"><a href="${byId[it.id] ? `product.html?id=${it.id}` : 'index.html#discovery-set'}">${MV.esc(p.name)}</a></h2>
                <p class="t-small muted">${MV.esc(sizeText(it))}</p>
                <div class="line__actions">
                  <div class="stepper" role="group" aria-label="Quantity of ${MV.esc(p.name)}">
                    <button type="button" data-step="-1" aria-label="Decrease quantity" ${it.qty <= 1 ? 'disabled' : ''}>−</button>
                    <output class="num" aria-live="polite">${it.qty}</output>
                    <button type="button" data-step="1" aria-label="Increase quantity">+</button>
                  </div>
                  <button class="link" type="button" data-remove>Remove</button>
                </div>
              </div>
              <p class="line__price t-price">${MV.money(MV.priceOf(p, it.size) * it.qty)}</p></li>`; }).join('')}</ul>
          <section class="free-sample" aria-labelledby="fs-h">
            <h2 class="t-h3" id="fs-h">Choose your free sample</h2>
            <p class="t-body muted">One 2 ml vial with every order</p>
            <div class="samples" role="radiogroup" aria-labelledby="fs-h">${products.map((p) => `<label class="sample"><input type="radio" name="sample" value="${p.id}" ${p.id === sample ? 'checked' : ''}><span class="sample__img">${MV.img(man, `vial_${MV.SCENT[p.id]}`, { sizes: '72px', alt: '' })}</span><span class="sample__label">${p.family}</span><span class="visually-hidden">${MV.esc(p.name)}</span></label>`).join('')}</div>
          </section>
          <div class="gift"><label class="check"><input type="checkbox" data-gift ${c.gift ? 'checked' : ''}><span>This is a gift</span></label><p class="t-small muted">Adds tissue paper and a handwritten card</p></div>
        </div>
        <aside class="summary" aria-labelledby="sum-h">
          <h2 class="t-h3" id="sum-h">Order summary</h2>
          <dl class="summary__rows">
            <div><dt>Subtotal</dt><dd>${MV.money(sub)}</dd></div>
            <div><dt>Shipping</dt><dd>${ship ? MV.money(ship) : 'Free'}</dd><p class="t-small muted">Free over €100, otherwise €6</p></div>
            <div><dt>Discount</dt><dd>Free sample ✓</dd></div>
          </dl>
          <div class="summary__total"><span class="t-h4">Total</span><span class="num">${MV.money(sub + ship)}</span></div>
          <form class="promo" data-promo><label class="visually-hidden" for="promo">Promo code</label><input class="field" id="promo" name="promo" placeholder="Promo code" autocomplete="off"><button class="btn btn--secondary" type="submit">Apply</button></form>
          <button class="btn btn--primary btn--block btn--tall" type="button" data-checkout>Checkout</button>
          <p class="trust t-small muted"><span>Secure payment</span><span aria-hidden="true">·</span><span>30-day returns</span></p>
          <a class="link summary__continue" href="catalog.html">Continue shopping</a>
        </aside></div>`;
      renderAlso(lines.map((it) => it.id));
      if (focusSel) { const el = root.querySelector(focusSel); if (el) el.focus(); }
    };
    const renderAlso = (inBag) => {
      /* Figma "Cart": Nuit Orientale, Brise Marine, Jardin Vert, Iris Poudré — skip any already in the bag, then fill up */
      const pref = ['nuit-orientale', 'brise-marine', 'jardin-vert', 'iris-poudre'];
      const list = [...pref.map((id) => byId[id]), ...products].filter((p, i, a) => !inBag.includes(p.id) && a.indexOf(p) === i).slice(0, 4);
      document.querySelector('[data-also]').innerHTML = list.map((p) => MV.card(man, p)).join('');
    };

    root.addEventListener('click', (e) => {
      const li = e.target.closest('.line'); if (!li) return;
      const [id, size] = li.dataset.key.split('|');
      const st = e.target.closest('[data-step]');
      if (st) { const it = MV.cart.get().items.find((i) => i.id === id && i.size === size); MV.cart.setQty(id, size, it.qty + +st.dataset.step); render(`.line[data-key="${li.dataset.key}"] [data-step="${st.dataset.step}"]`); }
      if (e.target.closest('[data-remove]')) { MV.cart.remove(id, size); render('h1'); }
    });
    root.addEventListener('change', (e) => {
      if (e.target.name === 'sample') MV.cart.setSample(e.target.value);
      if (e.target.matches('[data-gift]')) MV.cart.setGift(e.target.checked);
    });
    root.addEventListener('submit', (e) => { if (e.target.matches('[data-promo]')) e.preventDefault(); });
    /* checkout disabled (concept project) */
    const modal = document.querySelector('[data-modal]');
    let lastFocus = null;
    const open = () => { lastFocus = document.activeElement; modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-open')); modal.querySelector('[data-close-modal]').focus(); document.documentElement.style.overflow = 'hidden'; };
    const close = () => { modal.classList.remove('is-open'); setTimeout(() => (modal.hidden = true), 300); document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
    root.addEventListener('click', (e) => { if (e.target.closest('[data-checkout]')) open(); });
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close-modal]')) close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); if (e.key === 'Tab' && !modal.hidden) { e.preventDefault(); modal.querySelector('[data-close-modal]').focus(); } });
    addEventListener('storage', () => render());
    render();
  }).catch((e) => console.error(e));
})();
