/* Home sections below the hero (layout from the Figma "Home — Desktop" / "Home — Mobile" frames) */
(() => {
  const MV = window.MV;
  Promise.all([MV.products(), MV.manifest(), MV.json('data/journal.json'), MV.json('data/quiz.json')]).then(([products, man, journal, quiz]) => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    MV.hydrate(man);

    /* bestsellers */
    document.querySelectorAll('[data-cards]').forEach((el) => { el.innerHTML = el.dataset.cards.split(',').map((id) => MV.card(man, byId[id])).join(''); });

    /* scent family tiles: bg_[n]_[scent] + bottle with contact shadow and reflection */
    const tiles = document.querySelector('[data-tiles]');
    if (tiles) tiles.innerHTML = products.map((p, i) => {
      const sc = MV.SCENT[p.id];
      const bg = `bg_${String(i + 1).padStart(2, '0')}_${sc}`;
      return `<a class="tile reveal" href="catalog.html?family=${encodeURIComponent(p.family)}">
        <span class="tile__media">${MV.img(man, bg, { sizes: '(max-width: 599px) 50vw, 220px', alt: '' })}
          <span class="tile__refl" aria-hidden="true">${MV.img(man, `bottle_${sc}`, { sizes: '180px', alt: '' })}</span>
          <span class="tile__shadow" aria-hidden="true"></span>
          <span class="tile__bottle">${MV.img(man, `bottle_${sc}`, { sizes: '(max-width: 599px) 40vw, 180px', alt: `${p.name} bottle` })}</span></span>
        <span class="tile__row"><span class="tile__names"><span class="tile__caption">${p.family}</span><span class="tile__perfume">${MV.esc(p.name)}</span></span><span class="tile__explore">Explore →</span></span></a>`;
    }).join('');

    /* discovery set */
    document.querySelectorAll('[data-add-discovery]').forEach((b) => b.addEventListener('click', () => { MV.cart.add('discovery-set', 'set'); MV.toast(); }));

    /* quiz teaser: first question from data/quiz.json */
    const q = quiz.questions[0];
    const qq = document.querySelector('[data-quiz-q]');
    if (qq) qq.textContent = q.q;
    const qa = document.querySelector('[data-quiz-answers]');
    if (qa) qa.innerHTML = q.answers.map((a, i) => `<a class="pill" href="quiz.html?a=${i}">${MV.esc(a.a)}</a>`).join('');

    /* journal */
    const jg = document.querySelector('[data-journal]');
    if (jg) jg.innerHTML = journal.map((a) => `<article class="jcard reveal">
      <a class="jcard__media" href="journal.html?id=${a.id}" tabindex="-1" aria-hidden="true">${MV.img(man, a.cover, { sizes: '(max-width: 599px) 104px, (max-width: 1099px) 45vw, 282px', alt: '' })}</a>
      <div class="jcard__text"><p class="jcard__meta">${a.category} · ${a.read}</p><h3 class="jcard__title"><a href="journal.html?id=${a.id}">${MV.esc(a.title)}</a></h3><p class="jcard__excerpt t-small muted">${MV.esc(a.excerpt)}</p></div></article>`).join('');

    /* reviews carousel: 3 per page on desktop, 1 on phones */
    const rv = document.querySelector('[data-reviews]');
    if (rv) {
      rv.innerHTML = `<div class="reviews__viewport"><div class="reviews__track">${MV.REVIEWS.map(MV.reviewCard).join('')}</div></div>
        <div class="reviews__nav"><button class="round-btn" type="button" data-rv="-1" aria-label="Previous reviews"><svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="22.5"/><path d="M25.5 17.5L20 23l5.5 5.5"/></svg></button><div class="dots" data-rv-dots></div><button class="round-btn" type="button" data-rv="1" aria-label="Next reviews"><svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="22.5"/><path d="M20.5 17.5L26 23l-5.5 5.5"/></svg></button></div>`;
      const track = rv.querySelector('.reviews__track'), dots = rv.querySelector('[data-rv-dots]');
      let page = 0;
      const per = () => (matchMedia('(max-width: 599px)').matches ? 1 : 3);
      const pages = () => Math.ceil(MV.REVIEWS.length / per());
      const show = (p) => {
        page = (p + pages()) % pages();
        const card = track.children[0]; const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        track.style.transform = `translateX(${-page * per() * (card.getBoundingClientRect().width + gap)}px)`;
        dots.innerHTML = Array.from({ length: pages() }, (_, i) => `<button type="button" aria-label="Reviews page ${i + 1}" aria-current="${i === page}" data-page="${i}"></button>`).join('');
        [...track.children].forEach((c, i) => c.setAttribute('aria-hidden', Math.floor(i / per()) !== page));
      };
      rv.addEventListener('click', (e) => { const b = e.target.closest('[data-rv]'); const d = e.target.closest('[data-page]'); if (b) show(page + +b.dataset.rv); if (d) show(+d.dataset.page); });
      let sx = null;
      track.addEventListener('pointerdown', (e) => (sx = e.clientX));
      addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) show(page + (dx < 0 ? 1 : -1)); });
      addEventListener('resize', () => show(Math.min(page, pages() - 1)));
      show(0);
    }
    MV.reveal();
  }).catch((e) => console.error(e));
})();
