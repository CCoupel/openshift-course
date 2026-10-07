/* Moteur de slides — voir CONVENTIONS.md pour le schéma des modules et des blocs. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strip = h => String(h).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  const pad = n => String(n).padStart(2, '0');

  const KEY = 'ocp-course-v1';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  const state = Object.assign({ visited: {}, quiz: {}, theme: null, last: null, lang: null }, store.get());
  const save = () => store.set(state);

  /* ---------- Langue et libellés (assets/i18n.js) ---------- */
  const LANGS = ['fr', 'en'];
  let lang = 'fr';
  // t('clé', { param }) : langue active, repli fr, repli sur la clé elle-même.
  function t(key, vars) {
    const all = (window.COURSE && COURSE.i18n) || {};
    let v = (all[lang] && all[lang][key] !== undefined) ? all[lang][key] : (all.fr && all.fr[key] !== undefined ? all.fr[key] : key);
    if (vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return v;
  }
  // Ordre D3 : ?lang= valide, puis langue mémorisée, puis langue du navigateur (fr/en), sinon fr.
  function resolveLang() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (q && LANGS.includes(q.toLowerCase())) return q.toLowerCase();
    } catch (e) { /* ignore */ }
    if (LANGS.includes(state.lang)) return state.lang;
    try {
      for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])) {
        const c = String(l).toLowerCase().slice(0, 2);
        if (LANGS.includes(c)) return c;
      }
    } catch (e) { /* ignore */ }
    return 'fr';
  }
  const ptitle = p => (p.title && typeof p.title === 'object') ? (p.title[lang] || p.title.fr) : p.title;

  const CALLOUTS = {
    tip: '💡', warn: '⚠️', trap: '🪤', cloud: '☁️', onprem: '🏢', k8s: '☸️', ocp: '🔴'
  };

  /* ---------- Rendu des blocs ---------- */
  const fc = b => (b.frag ? ' frag' : '');
  const wide = b => (b.wide ? ' wide' : '');

  function codeHtml(code) {
    return String(code).replace(/\n$/, '').split('\n').map(l => {
      const e = esc(l);
      if (/^\s*#/.test(l)) return `<span class="c-cm">${e}</span>`;
      if (/^\$ /.test(l)) return `<span class="c-ps">$ </span>${e.slice(2)}`;
      return e;
    }).join('\n');
  }

  const R = {
    text: b => `<div class="blk text${fc(b)}${wide(b)}">${b.html}</div>`,
    bullets: b => `<ul class="blk bullets${wide(b)}">${b.items.map(i => `<li class="${b.frag ? 'frag' : ''}">${i}</li>`).join('')}</ul>`,
    code: b => `<div class="${wide(b).trim()}${fc(b)}"><div class="codebox">
      <div class="codebar"><span class="dots"><i></i><i></i><i></i></span><span class="fn">${esc(b.file || b.lang || '')}</span><button class="copy" type="button">${t('block.copy')}</button></div>
      <pre>${codeHtml(b.code)}</pre></div>${b.caption ? `<div class="codecap">${b.caption}</div>` : ''}</div>`,
    cmds: b => `<div class="cmds${fc(b)}${wide(b)}">${b.items.map(([c, d]) => `<div class="cm">${esc(c)}</div><div>${d}</div>`).join('')}</div>`,
    table: b => `<div class="tablewrap${fc(b)}${wide(b)}"><table><thead><tr>${b.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
      b.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
    compare: b => `<div class="${wide(b).trim()}${fc(b)}"><div class="compare">
      <div class="cside l"><h3>${b.left.title}</h3><ul>${b.left.items.map(i => `<li>${i}</li>`).join('')}</ul></div>
      <div class="cside r"><h3>${b.right.title}</h3><ul>${b.right.items.map(i => `<li>${i}</li>`).join('')}</ul></div></div>
      ${b.verdict ? `<div class="verdict">${b.verdict}</div>` : ''}</div>`,
    callout: b => {
      const kind = CALLOUTS[b.kind] ? b.kind : 'tip';
      return `<div class="callout ${kind}${fc(b)}${wide(b)}"><div class="ch">${CALLOUTS[kind]} ${b.title || t('callout.' + kind)}</div><p>${b.html}</p></div>`;
    },
    flow: b => `<div class="${wide(b).trim()}${fc(b)}"><div class="flow">${b.nodes.map((n, i) => {
      const o = typeof n === 'string' ? { label: n } : n;
      return (i ? '<span class="farrow">→</span>' : '') + `<div class="fnode${o.hl ? ' hl' : ''}"><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</div>`;
    }).join('')}</div>${b.caption ? `<div class="flowcap">${b.caption}</div>` : ''}</div>`,
    layers: b => `<div class="layers${fc(b)}${wide(b)}">${b.items.map(l =>
      `<div class="layer${l.hl ? ' hl' : ''}${l.base ? ' base' : ''}"><b>${l.name}</b><span>${l.desc || ''}</span></div>`).join('')}</div>`,
    cards: b => `<div class="cards${fc(b)}${wide(b)}">${b.items.map(c =>
      `<button type="button" class="card"><span class="in"><span class="f">${c.front}<small>${t('block.flip')}</small></span><span class="b">${c.back}</span></span></button>`).join('')}</div>`,
    quiz: (b, ctx) => `<div class="quiz${fc(b)}${wide(b)}" data-k="${ctx.uid}#${ctx.bi}" data-a="${b.answer}">
      <div class="q">${b.q}</div>
      <div class="opts">${b.options.map((o, i) => `<button type="button" class="opt" data-i="${i}">${o}</button>`).join('')}</div>
      <div class="explain">${b.explain || ''}</div>
      <button type="button" class="redo">${t('block.redo')}</button></div>`,
    reveal: b => `<details class="reveal${fc(b)}${wide(b)}"><summary>${b.label || t('block.reveal')}</summary><div>${b.html}</div></details>`,
    lab: b => `<div class="lab${fc(b)}${wide(b)}"><h3>${b.title}</h3>${b.goal ? `<p class="goal">${b.goal}</p>` : ''}<ol>${
      b.steps.map(s => `<li><label><input type="checkbox"><span>${s}</span></label></li>`).join('')}</ol></div>`,
    diagram: b => `<div class="${wide(b).trim()}${fc(b)}"><div class="diagram">${b.html}</div>${b.caption ? `<div class="dcap">${b.caption}</div>` : ''}</div>`
  };

  function renderBlocks(slide, uid) {
    const html = (slide.blocks || []).map((b, bi) => {
      const fn = R[b.t];
      if (!fn) return `<div class="callout warn"><p>${esc(t('block.unknown', { type: b.t }))}</p></div>`;
      return fn(b, { uid, bi });
    }).join('');
    return `<div class="blocks${slide.layout === 'two' ? ' two' : ''}">${html}</div>`;
  }

  /* ---------- Liste plate des slides ---------- */
  let modules = [];   // modules affichés dans la langue active (repli fr si non traduit)
  let upcoming = [];  // modules du plan sans fichier chargé (« à venir »)
  let fallback = new Set(); // ids des modules affichés en fr faute de traduction
  let flat = [];

  function build() {
    const by = COURSE.byLang, byId = {};
    (by.fr || []).forEach(m => { byId[m.id] = m; });
    fallback = new Set();
    (by[lang] || []).forEach(m => { byId[m.id] = m; });
    (by.fr || []).forEach(m => { if (lang !== 'fr' && !(by[lang] || []).some(x => x.id === m.id)) fallback.add(m.id); });
    modules = Object.keys(byId).map(k => byId[k]).sort((a, b) => a.num - b.num);
    upcoming = (COURSE.plan || []).filter(p => !byId[p.id]).sort((a, b) => a.num - b.num);
    flat = [{ kind: 'home', title: t('nav.home'), uid: 'home' }];
    modules.forEach(m => {
      flat.push({ kind: 'cover', mod: m, title: m.title, uid: m.id + '/0' });
      m.slides.forEach((s, i) => flat.push({ kind: 'slide', mod: m, slide: s, title: s.title, uid: m.id + '/' + (i + 1) }));
      if (m.takeaways && m.takeaways.length) flat.push({ kind: 'recap', mod: m, title: t('recap.title'), uid: m.id + '/' + (m.slides.length + 1) });
    });
  }

  // Plan complet trié par num : modules chargés + modules « à venir » (soon: true).
  const planList = () => modules.concat(upcoming.map(p => Object.assign({ soon: true }, p, { title: ptitle(p) }))).sort((a, b) => a.num - b.num);

  const quizTotal = m => m.slides.reduce((n, s) => n + (s.blocks || []).filter(b => b.t === 'quiz').length, 0);
  const quizScore = m => Object.keys(state.quiz).filter(k => k.startsWith(m.id + '/') && state.quiz[k] === 1).length;
  const modPct = m => {
    const ids = flat.filter(f => f.mod === m);
    return ids.length ? Math.round(ids.filter(f => state.visited[f.uid]).length / ids.length * 100) : 0;
  };

  function renderSlide(f) {
    const banner = f.mod && fallback.has(f.mod.id) ? `<div class="fallback-banner" role="note">🌐 ${esc(t('lang.fallback'))}</div>` : '';
    return banner + renderBody(f);
  }

  function renderBody(f) {
    if (f.kind === 'home') {
      const total = flat.length - 1, seen = flat.filter(x => x.mod && state.visited[x.uid]).length;
      const cont = state.last && flat.find(x => x.uid === state.last && x.mod);
      return `<div class="home"><h1>🔴 ${esc(t('course.title'))}</h1>
        <p class="sub">${esc(t('home.sub', { done: modules.length, total: modules.length + upcoming.length, slides: total, seen }))}</p>
        <div class="actions">${cont ? `<a class="btn primary" href="#${cont.uid}">${esc(t('home.resume', { title: cont.mod.title }))}</a>` : `<a class="btn primary" href="#${modules[0] ? modules[0].id : 'home'}/0">${esc(t('home.start'))}</a>`}
        <button class="btn" id="reset" type="button">${esc(t('home.reset'))}</button></div>
        <div class="mgrid">${planList().map(m => m.soon
          ? `<div class="mcard soon" aria-disabled="true"><div class="e">${m.emoji}</div><div class="n">${esc(t('home.module'))} ${pad(m.num)}</div>
          <h3>${esc(m.title)}</h3><p>${esc(t('home.soon'))}</p></div>`
          : `<a class="mcard" href="#${m.id}/0"><div class="e">${m.emoji}</div><div class="n">${esc(t('home.module'))} ${pad(m.num)}</div>
          <h3>${esc(m.title)}</h3><p>${m.tagline || ''}</p><div class="bar"><i style="width:${modPct(m)}%"></i></div></a>`).join('')}</div>
        <div class="legend">${esc(t('legend.lead'))} <span class="tag onprem">🏢 ${esc(t('legend.onprem'))}</span> ${esc(t('legend.onpremDesc'))} · <span class="tag cloud">☁️ ${esc(t('legend.cloud'))}</span> ${esc(t('legend.cloudDesc'))} · <span class="tag k8s">K8s</span> <span class="tag ocp">OCP</span></div></div>`;
    }
    const m = f.mod;
    if (f.kind === 'cover') {
      return `<div class="cover"><div class="big">${m.emoji}</div><div class="num">${esc(t('cover.module'))} ${pad(m.num)}</div><h1>${esc(m.title)}</h1>
        <p class="tagline">${m.tagline || ''}</p>
        ${m.objectives ? `<div class="obj"><h3>🎯 ${esc(t('cover.objectives'))}</h3><ul>${m.objectives.map(o => `<li>${o}</li>`).join('')}</ul></div>` : ''}
        <div class="meta">${esc(t('cover.slides', { n: m.slides.length }))}${m.duration ? ' · ' + m.duration : ''}${quizTotal(m) ? ' · ' + esc(t('cover.quiz', { n: quizTotal(m) })) : ''}</div></div>`;
    }
    if (f.kind === 'recap') {
      const qt = quizTotal(m);
      return `<div class="recap"><h2>✅ ${esc(t('recap.title'))}</h2><ul>${m.takeaways.map(t => `<li>${t}</li>`).join('')}</ul>
        ${qt ? `<div class="score">🎯 ${t('recap.score', { score: quizScore(m), total: qt })}</div>` : ''}</div>`;
    }
    const s = f.slide;
    return `<h2 class="stitle">${esc(s.title)}${s.tag ? `<span class="stag">${esc(s.tag)}</span>` : ''}</h2>${renderBlocks(s, f.uid)}`;
  }

  /* ---------- Affichage ---------- */
  let cur = null, curIdx = -1, frags = [], fragIdx = 0;
  const slideEl = () => $('#slide');

  function show(i, keepFrags) {
    if (i < 0 || i >= flat.length) i = 0;
    const back = keepFrags === undefined && i < curIdx;
    curIdx = i; cur = flat[i];
    state.visited[cur.uid] = 1;
    if (cur.mod) state.last = cur.uid;
    save();
    const el = slideEl();
    el.innerHTML = `<div class="slide-inner">${renderSlide(cur)}</div>`;
    el.scrollTop = 0;
    frags = $$('.frag', el); fragIdx = 0;
    if (back) { frags.forEach(x => x.classList.add('show')); fragIdx = frags.length; }
    else if (keepFrags) { fragIdx = Math.min(keepFrags, frags.length); frags.slice(0, fragIdx).forEach(x => x.classList.add('show')); }
    updateChrome();
  }

  function updateChrome() {
    const m = cur.mod;
    $('#crumb').innerHTML = m ? `${m.emoji} <b>${pad(m.num)} ${esc(m.title)}</b> › ${esc(cur.title)}` : `🏠 <b>${esc(t('nav.home'))}</b>`;
    const inMod = m ? flat.filter(f => f.mod === m) : [];
    $('#counter').textContent = m ? `${inMod.indexOf(cur) + 1} / ${inMod.length}` : '';
    $('#progress i').style.width = (curIdx / (flat.length - 1) * 100) + '%';
    $('#prev').disabled = curIdx === 0;
    $('#next').disabled = curIdx === flat.length - 1 && fragIdx >= frags.length;
    $('#next').classList.toggle('has-frag', fragIdx < frags.length);
    document.title = (m ? `${pad(m.num)} ${m.title} · ` : '') + t('course.title');
    renderNav();
  }

  function renderNav() {
    const q = $('#search').value.trim();
    if (q) return renderSearch(q);
    $('#navlist').innerHTML = `<a class="nav-home ${cur.kind === 'home' ? 'on' : ''}" href="#home">🏠 ${esc(t('nav.home'))}</a>` + planList().map(m => {
      if (m.soon) return `<div class="nav-mod soon" aria-disabled="true"><span class="nav-mod-h"><span class="e">${m.emoji}</span>
        <span class="t"><b>${pad(m.num)}</b> ${esc(m.title)}</span><span class="pct">${esc(t('nav.soon'))}</span></span></div>`;
      const open = cur.mod === m;
      return `<div class="nav-mod ${open ? 'open' : ''}"><a class="nav-mod-h" href="#${m.id}/0"><span class="e">${m.emoji}</span>
        <span class="t"><b>${pad(m.num)}</b> ${esc(m.title)}</span><span class="pct">${modPct(m)}%</span></a>${
        open ? '<ol>' + flat.filter(f => f.mod === m).map(f =>
          `<li><a class="${f === cur ? 'on' : ''} ${state.visited[f.uid] ? 'seen' : ''}" href="#${f.uid}">${esc(f.title)}</a></li>`).join('') + '</ol>' : ''}</div>`;
    }).join('');
    const on = $('#navlist a.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  let index = null;
  function renderSearch(q) {
    if (!index) index = flat.filter(f => f.mod).map(f => ({ f, text: strip(JSON.stringify(f.slide || f.mod.takeaways || f.mod.objectives || '')).toLowerCase() }));
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const res = index.filter(x => terms.every(t => x.f.title.toLowerCase().includes(t) || x.text.includes(t))).slice(0, 40);
    $('#navlist').innerHTML = res.length
      ? `<div class="search-res">${res.map(x => `<a href="#${x.f.uid}">${esc(x.f.title)}<small>${x.f.mod.emoji} ${pad(x.f.mod.num)} ${esc(x.f.mod.title)}</small></a>`).join('')}</div>`
      : `<div class="search-empty">${esc(t('search.empty'))}</div>`;
  }

  /* ---------- Navigation ---------- */
  const goUid = uid => { if (location.hash === '#' + uid) show(flat.findIndex(f => f.uid === uid)); else location.hash = '#' + uid; };

  function next() {
    if (fragIdx < frags.length) { frags[fragIdx++].classList.add('show'); updateChrome(); return; }
    if (curIdx < flat.length - 1) goUid(flat[curIdx + 1].uid);
  }
  function prev() { if (curIdx > 0) goUid(flat[curIdx - 1].uid); }

  function fromHash() {
    const uid = decodeURIComponent(location.hash.slice(1));
    let i = flat.findIndex(f => f.uid === uid);
    if (i < 0) i = 0;
    show(i);
  }

  /* ---------- Interactions ---------- */
  function copyText(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = t('block.copied'); setTimeout(() => { btn.textContent = o; }, 1200); };
    const fallback = () => {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } t.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }

  function onSlideClick(e) {
    const opt = e.target.closest('.opt');
    if (opt) {
      const quiz = opt.closest('.quiz');
      if (quiz.classList.contains('done')) return;
      const a = +quiz.dataset.a, i = +opt.dataset.i;
      quiz.classList.add('done');
      $$('.opt', quiz)[a].classList.add('ok');
      if (i !== a) opt.classList.add('ko');
      if (state.quiz[quiz.dataset.k] === undefined) { state.quiz[quiz.dataset.k] = i === a ? 1 : 0; save(); }
      return;
    }
    if (e.target.closest('.redo')) {
      const quiz = e.target.closest('.quiz');
      quiz.classList.remove('done'); $$('.opt', quiz).forEach(o => o.classList.remove('ok', 'ko'));
      return;
    }
    const card = e.target.closest('.card'); if (card) { card.classList.toggle('flipped'); return; }
    const cp = e.target.closest('.copy');
    if (cp) {
      const pre = $('pre', cp.closest('.codebox')).cloneNode(true);
      $$('.c-ps', pre).forEach(x => x.remove());
      copyText(pre.textContent, cp); return;
    }
    if (e.target.id === 'reset' && confirm(t('home.resetConfirm'))) {
      state.visited = {}; state.quiz = {}; state.last = null; save(); show(curIdx);
    }
  }

  /* ---------- Langue : libellés statiques, bascule, annonce ---------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(',').forEach(p => {
      const [a, k] = p.split(':'); el.setAttribute(a.trim(), t(k.trim()));
    }));
    $$('.lang').forEach(g => {
      g.setAttribute('aria-label', t('lang.group'));
      $$('button', g).forEach(b => {
        const on = b.dataset.l === lang;
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('aria-label', t('lang.' + b.dataset.l));
        b.title = t('lang.' + b.dataset.l);
      });
    });
  }
  let toastTimer = null;
  function announce(msg) {
    const el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1500);
  }
  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l; state.lang = l; save();
    try { const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u.toString()); } catch (e) { /* file:// restrictif */ }
    const uid = cur ? cur.uid : 'home', kept = fragIdx;
    build(); index = null; applyStatic();
    const i = flat.findIndex(f => f.uid === uid);
    show(i < 0 ? 0 : i, kept);
    announce(t('lang.toast.' + l));
  }

  function toggleMenu() {
    if (window.matchMedia('(max-width: 900px)').matches) document.body.classList.toggle('menu-open');
    else document.body.classList.toggle('menu-closed');
  }
  function applyTheme() {
    if (state.theme) document.documentElement.setAttribute('data-theme', state.theme);
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    const dark = state.theme ? state.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = dark ? 'light' : 'dark'; save(); applyTheme();
  }

  function start() {
    lang = resolveLang();
    build();
    applyStatic();
    applyTheme();
    $$('.lang').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button[data-l]'); if (b) setLang(b.dataset.l); }));
    $('#slide').addEventListener('click', onSlideClick);
    $('#next').addEventListener('click', next);
    $('#prev').addEventListener('click', prev);
    $('#menu').addEventListener('click', toggleMenu);
    $('#theme').addEventListener('click', toggleTheme);
    $('#search').addEventListener('input', () => renderNav());
    $('#navlist').addEventListener('click', () => document.body.classList.remove('menu-open'));
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.matches('input, textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
        case 'Home': goUid(flat[0].uid); break;
        case 'End': goUid(flat[flat.length - 1].uid); break;
        case 'm': toggleMenu(); break;
        case 't': toggleTheme(); break;
        case 'l': setLang(lang === 'fr' ? 'en' : 'fr'); break;
        case '/': e.preventDefault(); document.body.classList.remove('menu-closed'); $('#search').focus(); break;
      }
    });
    let x0 = null;
    $('#slide').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    $('#slide').addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 70) (dx < 0 ? next : prev)();
    }, { passive: true });
    if (window.matchMedia('(max-width: 900px)').matches) document.body.classList.remove('menu-closed');
    fromHash();
  }

  const COURSE = window.COURSE = {
    modules: [], byLang: {},
    add(m) { this.modules.push(m); (this.byLang[m.lang || 'fr'] = this.byLang[m.lang || 'fr'] || []).push(m); },
    start, setLang
  };
})();
