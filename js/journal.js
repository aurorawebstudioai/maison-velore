/* journal.html (list) and journal.html?id=<slug> (article) from data/journal.json */
(() => {
  const MV = window.MV;
  Promise.all([MV.json('data/journal.json'), MV.manifest()]).then(([articles, man]) => {
    const main = document.querySelector('[data-journal-page]');
    const card = (a) => `<article class="jcard"><a class="jcard__media" href="journal.html?id=${a.id}" tabindex="-1" aria-hidden="true">${MV.img(man, a.cover, { sizes: '(max-width: 599px) 104px, (max-width: 1099px) 45vw, 282px', alt: '' })}</a>
      <div class="jcard__text"><p class="jcard__meta">${a.category} · ${a.read}</p><h3 class="jcard__title"><a href="journal.html?id=${a.id}">${MV.esc(a.title)}</a></h3><p class="jcard__excerpt t-small muted">${MV.esc(a.excerpt)}</p></div></article>`;
    const a = articles.find((x) => x.id === MV.qs('id'));
    if (!a) {
      main.innerHTML = `<section class="section"><div class="wrap"><div class="section-head"><div><p class="t-label gold">The journal</p><h1 class="t-h2">Ideas, places and the art of fragrance</h1></div></div><div class="journal-grid">${articles.map(card).join('')}</div></div></section>`;
      return;
    }
    document.title = `${a.title} — Maison Veloré`;
    document.querySelector('meta[name="description"]').content = a.excerpt;
    document.querySelector('meta[property="og:title"]').content = a.title;
    document.querySelector('meta[property="og:description"]').content = a.excerpt;
    main.innerHTML = `<article class="article">
      <div class="wrap article__head"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="journal.html">The journal</a><span aria-hidden="true">/</span><span aria-current="page">${MV.esc(a.title)}</span></nav>
        <p class="jcard__meta">${a.category} · ${a.read}</p><h1 class="t-display">${MV.esc(a.title)}</h1><p class="t-quote muted">${MV.esc(a.excerpt)}</p></div>
      <div class="wrap"><div class="article__cover">${MV.img(man, a.cover, { sizes: '(max-width: 1440px) 100vw, 1200px', alt: '', eager: true })}</div></div>
      <div class="article__body">${a.body.map((p) => `<p class="t-bodyl">${MV.esc(p)}</p>`).join('')}<a class="link" href="journal.html">All articles →</a></div>
    </article>
    <section class="section section--paper" aria-labelledby="more-h"><div class="wrap"><div class="section-head"><div><p class="t-label gold">The journal</p><h2 class="t-h2" id="more-h">Ideas, places and the art of fragrance</h2></div><a class="link" href="journal.html">All articles →</a></div>
      <div class="journal-grid journal-grid--3">${articles.filter((x) => x !== a).map(card).join('')}</div></div></section>`;
  }).catch((e) => console.error(e));
})();
