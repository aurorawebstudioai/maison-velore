/* catalog.html — filters (scent family, key notes, size, price), sort, filtered + empty states */
(() => {
  const MV = window.MV;
  const NOTES = ['Rose', 'Jasmine', 'Bergamot', 'Cedar', 'Amber', 'Vanilla', 'Musk', 'Lavender'];
  const PMIN = 35, PMAX = 180;
  const state = { family: new Set(), notes: new Set(), size: new Set(), min: PMIN, max: PMAX, sort: 'featured' };
  const X = '<svg viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M.5.5l8 8M8.5.5l-8 8"/></svg>';
  const CHEV = '<svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M.5.5L5 5 9.5.5"/></svg>';

  Promise.all([MV.products(), MV.manifest()]).then(([products, man]) => {
    const allNotes = (p) => [...p.top, ...p.heart, ...p.base].join(' ').toLowerCase();
    const prices = (p) => MV.SIZES.filter(([k]) => !state.size.size || state.size.has(k)).map(([k]) => p.prices_eur[k]);
    const match = (p, skip) => (skip === 'family' || !state.family.size || state.family.has(p.family))
      && (skip === 'notes' || !state.notes.size || [...state.notes].every((n) => allNotes(p).includes(n.toLowerCase())))
      && (skip === 'price' || prices(p).some((v) => v >= state.min && v <= state.max));
    const url = new URLSearchParams(location.search);
    if (url.get('family')) state.family.add(url.get('family'));

    /* ---------- filter groups (shared by the sidebar and the toolbar dropdowns) ---------- */
    const group = (key) => {
      if (key === 'family') return products.map((p) => { const n = products.filter((q) => q.family === p.family && match(q, 'family')).length; return `<label class="check"><input type="checkbox" data-f="family" value="${p.family}" ${state.family.has(p.family) ? 'checked' : ''}><span>${p.family} (${n})</span></label>`; }).join('');
      if (key === 'notes') return `<div class="chip-wrap">${NOTES.map((n) => `<button class="chip" type="button" data-f="notes" value="${n}" aria-pressed="${state.notes.has(n)}">${n}</button>`).join('')}</div>`;
      if (key === 'size') return MV.SIZES.map(([k, l]) => `<label class="check"><input type="checkbox" data-f="size" value="${k}" ${state.size.has(k) ? 'checked' : ''}><span>${l}</span></label>`).join('');
      if (key === 'price') return `<div class="range" style="--a:${(state.min - PMIN) / (PMAX - PMIN)};--b:${(state.max - PMIN) / (PMAX - PMIN)}">
        <span class="range__track"></span><span class="range__fill"></span>
        <input type="range" min="${PMIN}" max="${PMAX}" step="5" value="${state.min}" data-f="min" aria-label="Minimum price">
        <input type="range" min="${PMIN}" max="${PMAX}" step="5" value="${state.max}" data-f="max" aria-label="Maximum price"></div>
        <p class="range__values t-small muted"><span class="num">€${state.min}</span><span class="num">€${state.max}</span></p>`;
    };
    const GROUPS = [['family', 'Scent family'], ['notes', 'Key notes'], ['size', 'Size'], ['price', 'Price']];
    const sidebar = document.querySelector('[data-sidebar]');
    const renderSidebar = () => {
      sidebar.innerHTML = GROUPS.map(([k, t]) => `<details class="fgroup" open><summary><h2 class="t-h4">${t}</h2></summary><div class="fgroup__body fgroup__body--${k}">${group(k)}</div></details>`).join('') + `<div class="fgroup fgroup--clear"><button class="link" type="button" data-clear>Clear all</button></div>`;
    };
    const dd = document.querySelector('[data-dropdowns]');
    const isActive = (k) => (k === 'price' ? state.min !== PMIN || state.max !== PMAX : state[k].size > 0);
    const renderDropdowns = (open) => {
      dd.innerHTML = GROUPS.map(([k, t]) => `<div class="dd"><button class="chip chip--dd${isActive(k) ? ' is-active' : ''}" type="button" aria-expanded="${open === k}" aria-controls="dd-${k}" data-dd="${k}">${t} ${CHEV}</button>
        <div class="dd__panel" id="dd-${k}" ${open === k ? '' : 'hidden'}>${group(k)}</div></div>`).join('');
    };

    /* ---------- results ---------- */
    const grid = document.querySelector('[data-grid]'), count = document.querySelector('[data-count]'), active = document.querySelector('[data-active]');
    const filtersOn = () => state.family.size || state.notes.size || state.size.size || state.min !== PMIN || state.max !== PMAX;
    const renderResults = () => {
      let list = products.filter((p) => match(p));
      const lo = (p) => Math.min(...prices(p)), hi = (p) => Math.max(...prices(p));
      if (state.sort === 'price-asc') list = list.slice().sort((a, b) => lo(a) - lo(b));
      if (state.sort === 'price-desc') list = list.slice().sort((a, b) => hi(b) - hi(a));
      if (state.sort === 'newest') list = list.slice().reverse();
      count.textContent = `Showing ${list.length} fragrance${list.length === 1 ? '' : 's'}`;
      const chips = [...[...state.family].map((v) => ['family', v, v]), ...[...state.notes].map((v) => ['notes', v, v]), ...[...state.size].map((v) => ['size', v, MV.sizeLabel(v)])];
      if (state.min !== PMIN || state.max !== PMAX) chips.push(['price', '', `€${state.min}–€${state.max}`]);
      active.hidden = !chips.length;
      active.innerHTML = chips.map(([f, v, l]) => `<button class="chip chip--removable" type="button" data-remove="${f}" value="${v}" aria-label="Remove filter ${l}">${l} ${X}</button>`).join('') + (chips.length ? '<button class="link" type="button" data-clear>Clear all</button>' : '');
      if (!list.length) {
        grid.innerHTML = `<div class="cat-empty"><p class="t-h3">No fragrances match these filters.</p><button class="btn btn--secondary" type="button" data-clear>Clear filters</button></div>`;
        return;
      }
      grid.innerHTML = list.map((p) => MV.card(man, p, { variant: 'catalog', sizes: '(max-width: 599px) 50vw, (max-width: 1099px) 45vw, 282px' })).join('')
        + (!filtersOn() && state.sort === 'featured' ? `<aside class="quiz-banner"><div class="quiz-banner__text"><h2 class="t-h2">Not sure where to start?</h2><p class="t-body">Five quick questions. One fragrance made for you.</p><a class="btn btn--accent" href="quiz.html">Take the quiz</a></div><div class="quiz-banner__img">${MV.img(man, 'vials_all', { sizes: '240px', alt: '' })}</div></aside>` : '');
    };
    const renderAll = (open) => {
      /* keep keyboard focus on the same control after re-rendering */
      const a = document.activeElement; const key = a && a.dataset && a.dataset.f ? [a.closest('.dd__panel') ? '.dd__panel' : '[data-sidebar]', a.dataset.f, a.value] : null;
      renderSidebar(); renderDropdowns(open); renderResults();
      if (key) { const el = [...document.querySelectorAll(`${key[0]} [data-f="${key[1]}"]`)].find((x) => x.value === key[2] || key[1] === 'min' || key[1] === 'max'); if (el) el.focus(); }
    };

    /* ---------- events ---------- */
    let openDD = null;
    const onChange = (e) => {
      const t = e.target; const f = t.dataset && t.dataset.f; if (!f) return;
      if (f === 'min' || f === 'max') { let v = +t.value; if (f === 'min') state.min = Math.min(v, state.max - 5); else state.max = Math.max(v, state.min + 5); }
      else if (t.type === 'checkbox') { t.checked ? state[f].add(t.value) : state[f].delete(t.value); }
      renderAll(openDD);
      if (f === 'min' || f === 'max') { const same = document.querySelector(`${t.closest('.dd__panel') ? '.dd__panel' : '[data-sidebar]'} input[data-f="${f}"]`); if (same) same.focus(); }
    };
    document.addEventListener('change', onChange);
    document.addEventListener('input', (e) => { if (e.target.dataset && (e.target.dataset.f === 'min' || e.target.dataset.f === 'max')) { const r = e.target.closest('.range'); const v = +e.target.value; const vals = r.nextElementSibling.querySelectorAll('.num'); if (e.target.dataset.f === 'min') { vals[0].textContent = '€' + v; r.style.setProperty('--a', (v - PMIN) / (PMAX - PMIN)); } else { vals[1].textContent = '€' + v; r.style.setProperty('--b', (v - PMIN) / (PMAX - PMIN)); } } });
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('button[data-f="notes"]');
      if (chip) { const v = chip.value; state.notes.has(v) ? state.notes.delete(v) : state.notes.add(v); renderAll(openDD); return; }
      const rm = e.target.closest('[data-remove]');
      if (rm) { const f = rm.dataset.remove; if (f === 'price') { state.min = PMIN; state.max = PMAX; } else state[f].delete(rm.value); renderAll(openDD); return; }
      if (e.target.closest('[data-clear]')) { state.family.clear(); state.notes.clear(); state.size.clear(); state.min = PMIN; state.max = PMAX; openDD = null; renderAll(); return; }
      const ddb = e.target.closest('[data-dd]');
      if (ddb) { openDD = openDD === ddb.dataset.dd ? null : ddb.dataset.dd; renderDropdowns(openDD); return; }
      if (openDD && !e.target.closest('.dd')) { openDD = null; renderDropdowns(); }
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && openDD) { const k = openDD; openDD = null; renderDropdowns(); dd.querySelector(`[data-dd="${k}"]`).focus(); } });
    document.querySelector('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; renderResults(); });
    renderAll();
  }).catch((e) => console.error(e));
})();
