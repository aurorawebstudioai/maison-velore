/* quiz.html — data/quiz.json: each answer adds a point to 2–3 perfumes; most points wins; ties -> first in products.json */
(() => {
  const MV = window.MV;
  Promise.all([MV.products(), MV.manifest(), MV.json('data/quiz.json')]).then(([products, man, quiz]) => {
    MV.hydrate(man);
    const box = document.querySelector('[data-quiz]');
    const Q = quiz.questions;
    const answers = [];
    const pre = MV.qs('a');
    if (pre != null && Q[0].answers[+pre]) answers.push(+pre);
    const focusHeading = () => { const h = box.querySelector('h1, h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };
    const step = () => {
      const i = answers.length;
      if (i >= Q.length) return result();
      const q = Q[i];
      box.innerHTML = `<p class="t-label gold">Question ${i + 1} of ${Q.length}</p>
        ${i === 0 ? '<h1 class="t-h2">Find your signature scent</h1><p class="t-body muted">Five quick questions. One fragrance made for you.</p><span class="rule" aria-hidden="true"></span>' : ''}
        <h2 class="quiz-q">${MV.esc(q.q)}</h2>
        <div class="quiz-pills" role="group" aria-label="${MV.esc(q.q)}">${q.answers.map((a, k) => `<button class="pill" type="button" data-a="${k}">${MV.esc(a.a)}</button>`).join('')}</div>
        <div class="quiz-progress" aria-hidden="true">${Q.map((_, k) => `<span class="${k < i ? 'done' : k === i ? 'cur' : ''}"></span>`).join('')}</div>`;
      focusHeading();
    };
    const result = () => {
      const score = Object.fromEntries(products.map((p) => [p.id, 0]));
      answers.forEach((a, i) => Q[i].answers[a].scores.forEach((id) => score[id]++));
      const ranked = products.slice().sort((a, b) => score[b.id] - score[a.id] || products.indexOf(a) - products.indexOf(b));
      const [win, second] = ranked;
      box.innerHTML = `<div class="quiz-result">
        <div class="quiz-result__img">${MV.img(man, `gallery_${MV.SCENT[win.id]}_01_front`, { sizes: '(max-width: 599px) 80vw, 320px', alt: `${win.name} bottle` })}</div>
        <div class="quiz-result__text"><h1 class="t-h2">Your scent is ${MV.esc(win.name)}</h1>
        <p class="t-quote muted">${MV.esc(win.tagline)}</p>
        <div class="btn-row"><a class="btn btn--primary" href="product.html?id=${win.id}">View fragrance</a><button class="btn btn--secondary" type="button" data-retake>Retake the quiz</button></div>
        <p class="t-small muted">Also try: <a class="link" href="product.html?id=${second.id}">${MV.esc(second.name)}</a></p></div></div>`;
      focusHeading();
    };
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (a) { answers.push(+a.dataset.a); step(); return; }
      if (e.target.closest('[data-retake]')) { answers.length = 0; step(); }
    });
    step();
  }).catch((e) => console.error(e));
})();
