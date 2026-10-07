#!/usr/bin/env node
/* Valide le schéma des modules. Usage : node tools/validate.js [fichier...]

   Champs HTML bruts : le moteur (assets/engine.js) n'échappe (esc) que les lignes de `code`, `cmds[i][0]`,
   `file`/`lang`, les titres de slide et `tag`. TOUS les autres champs sont injectés tels quels en HTML
   (text, bullets, cellules de table, cmds[i][1], callout, compare, flow, layers, cards, quiz, reveal, lab,
   caption, takeaways, objectives, tagline…). Une balise absente de la liste blanche (HTML_TAGS), par exemple un
   placeholder `<version>`, y serait interprétée par le navigateur et disparaîtrait : écrire `&lt;version&gt;`.
   Exception : le champ `html` d'un bloc `diagram` (SVG/HTML voulu) n'est pas contrôlé. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// À garder synchronisé avec assets/engine.js (objet R) et le CSS des callouts.
const BLOCKS = ['text', 'bullets', 'code', 'cmds', 'table', 'compare', 'callout', 'flow', 'layers', 'cards', 'quiz', 'reveal', 'lab', 'diagram'];
const CALLOUTS = ['tip', 'warn', 'trap', 'cloud', 'onprem', 'k8s', 'ocp'];

// Balises autorisées dans les champs HTML bruts (ajuster ici si le moteur/CSS en prend d'autres en charge).
const HTML_TAGS = new Set(['b', 'i', 'em', 'strong', 'code', 'br', 'a', 'span', 'ul', 'ol', 'li', 'p', 'kbd', 'sub', 'sup', 'mark', 'small', 'pre']);
const TAG_RE = /<\/?([A-Za-z][A-Za-z0-9-]*)/g;
const strs = x => (Array.isArray(x) ? x : [x]).filter(v => typeof v === 'string');

// Liste les champs rendus en HTML brut d'un bloc : [[nom du champ, texte], ...] (miroir de R dans engine.js).
function rawHtmlFields(b) {
  const f = [];
  const add = (name, v) => strs(v).forEach((t, i) => f.push([name, t]));
  switch (b.t) {
    case 'text': case 'reveal': add('html', b.html); if (b.t === 'reveal') add('label', b.label); break;
    case 'bullets': add('items', b.items || []); break;
    case 'code': add('caption', b.caption); break;
    case 'cmds': (b.items || []).forEach((c, k) => { if (Array.isArray(c)) add(`items[${k}][1]`, c[1]); }); break;
    case 'table': add('head', b.head || []); (b.rows || []).forEach((r, k) => (r || []).forEach((c, m) => add(`rows[${k}][${m}]`, c))); break;
    case 'compare': for (const side of ['left', 'right']) { const o = b[side] || {}; add(`${side}.title`, o.title); add(`${side}.items`, o.items || []); } add('verdict', b.verdict); break;
    case 'callout': add('html', b.html); add('title', b.title); break;
    case 'flow': (b.nodes || []).forEach((n, k) => { if (typeof n === 'string') add(`nodes[${k}]`, n); else if (n) { add(`nodes[${k}].label`, n.label); add(`nodes[${k}].sub`, n.sub); } }); add('caption', b.caption); break;
    case 'layers': (b.items || []).forEach((l, k) => { add(`items[${k}].name`, l.name); add(`items[${k}].desc`, l.desc); }); break;
    case 'cards': (b.items || []).forEach((c, k) => { add(`items[${k}].front`, c.front); add(`items[${k}].back`, c.back); }); break;
    case 'quiz': add('q', b.q); add('options', b.options || []); add('explain', b.explain); break;
    case 'lab': add('title', b.title); add('goal', b.goal); add('steps', b.steps || []); break;
    case 'diagram': add('caption', b.caption); break; // `html` : SVG voulu, exempté
  }
  return f;
}

const dir = path.join(__dirname, '..', 'modules', 'fr');
const files = process.argv.length > 2 ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => /^m\d+.*\.js$/.test(f)).map(f => path.join(dir, f));
let errors = 0, warns = 0;
const loadedMods = {};
const err = (f, m) => { errors++; console.error(`ERREUR  ${path.basename(f)} : ${m}`); };
const warn = (f, m) => { warns++; console.warn(`warn    ${path.basename(f)} : ${m}`); };

for (const file of files) {
  let mod = null;
  const sandbox = { COURSE: { add(m) { mod = m; } } };
  try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }); }
  catch (e) { err(file, 'ne s\'exécute pas : ' + e.message); continue; }
  if (!mod) { err(file, 'aucun appel COURSE.add'); continue; }

  loadedMods[mod.id] = mod;
  const expected = /^m(\d+)/.exec(path.basename(file));
  if (expected && mod.id !== 'm' + expected[1]) err(file, `id "${mod.id}" ≠ nom de fichier`);
  if (expected && mod.num !== +expected[1]) err(file, `num ${mod.num} ≠ nom de fichier`);
  for (const k of ['emoji', 'title', 'tagline']) if (!mod[k]) err(file, `champ manquant : ${k}`);
  if (/[<`]/.test(mod.title || '')) err(file, 'title ne doit pas contenir de HTML/backticks');
  if (!Array.isArray(mod.objectives) || mod.objectives.length < 3) err(file, 'objectives : 3 minimum');
  if (!Array.isArray(mod.takeaways) || mod.takeaways.length < 4) err(file, 'takeaways : 4 minimum');
  if (!Array.isArray(mod.slides)) { err(file, 'slides manquant'); continue; }
  if (mod.num !== 15 && (mod.slides.length < 14 || mod.slides.length > 26)) warn(file, `${mod.slides.length} slides (cible 16-22)`);

  const checkHtml = (where, field, text) => {
    for (const m of text.matchAll(TAG_RE)) {
      if (HTML_TAGS.has(m[1].toLowerCase())) continue;
      const i = m.index, ex = text.slice(Math.max(0, i - 15), i + 30).replace(/\s+/g, ' ');
      err(file, `${where}, champ ${field} : balise <${m[1]}> non autorisée dans un champ HTML brut (« …${ex}… ») ; écris &lt;${m[1]}&gt;`);
    }
  };
  for (const k of ['tagline', 'duration', 'emoji']) strs(mod[k]).forEach(t => checkHtml('module', k, t));
  for (const k of ['objectives', 'takeaways']) strs(mod[k]).forEach(t => checkHtml('module', k, t));

  let quizzes = 0, labs = 0;
  mod.slides.forEach((s, i) => {
    const at = `slide ${i + 1} "${s.title}"`;
    if (!s.title) err(file, `slide ${i + 1} sans title`);
    else if (/[<`]/.test(s.title)) err(file, `${at} : title en texte brut (pas de HTML/backticks)`);
    if (!Array.isArray(s.blocks) || !s.blocks.length) { err(file, `${at} : pas de blocs`); return; }
    s.blocks.forEach((b, j) => {
      const bt = `${at} bloc ${j + 1} (${b.t})`;
      if (!BLOCKS.includes(b.t)) return err(file, `${bt} : type inconnu`);
      rawHtmlFields(b).forEach(([field, text]) => checkHtml(bt, field, text));
      const need = { text: ['html'], bullets: ['items'], code: ['code'], cmds: ['items'], table: ['head', 'rows'], compare: ['left', 'right'],
        callout: ['kind', 'html'], flow: ['nodes'], layers: ['items'], cards: ['items'], quiz: ['q', 'options', 'answer'], reveal: ['html'], lab: ['title', 'steps'], diagram: ['html'] }[b.t];
      need.forEach(k => { if (b[k] === undefined) err(file, `${bt} : champ "${k}" manquant`); });
      if (b.t === 'callout' && !CALLOUTS.includes(b.kind)) err(file, `${bt} : kind "${b.kind}" inconnu`);
      if (b.t === 'table' && b.rows) b.rows.forEach((r, k) => { if (r.length !== b.head.length) err(file, `${bt} : ligne ${k + 1} a ${r.length} colonnes pour ${b.head.length} en-têtes`); });
      if (b.t === 'quiz') {
        quizzes++;
        if (!Number.isInteger(b.answer) || b.answer < 0 || b.answer >= (b.options || []).length) err(file, `${bt} : answer hors limites`);
        if (!b.explain) warn(file, `${bt} : pas d'explication`);
      }
      if (b.t === 'lab') labs++;
      if (b.t === 'cmds' && b.items) b.items.forEach((c, k) => { if (!Array.isArray(c) || c.length !== 2) err(file, `${bt} : item ${k + 1} doit être [cmd, desc]`); });
      if (b.t === 'cards' && b.items) b.items.forEach((c, k) => { if (!c.front || !c.back) err(file, `${bt} : carte ${k + 1} incomplète`); });
      if (b.t === 'code' && /<\/?[a-z]+>/i.test(b.code || '') && !/^\s*(<\?xml|<!)/.test(b.code) && b.lang !== 'xml' && b.lang !== 'html') warn(file, `${bt} : balises HTML dans du code (sera affiché tel quel)`);
    });
  });
  if (mod.num !== 15 && !quizzes) warn(file, 'aucun quiz');
  if (mod.num !== 15 && !labs) warn(file, 'aucun lab');
  console.log(`${errors ? '…' : 'ok '}      ${path.basename(file)} : ${mod.slides.length} slides, ${quizzes} quiz, ${labs} lab`);
}
// Cohérence manifeste (assets/plan.js) ↔ modules ↔ index.html (contrôles globaux, seulement sans arguments).
if (process.argv.length <= 2) {
  const root = path.join(__dirname, '..');
  let plan = null;
  try { vm.runInNewContext(fs.readFileSync(path.join(root, 'assets', 'plan.js'), 'utf8'), { COURSE: { set plan(p) { plan = p; } } }, { filename: 'plan.js' }); }
  catch (e) { err('plan.js', 'ne s\'exécute pas : ' + e.message); }
  if (plan) {
    const ids = new Set(plan.map(p => p.id));
    if (ids.size !== plan.length) err('plan.js', 'id en doublon');
    if (new Set(plan.map(p => p.num)).size !== plan.length) err('plan.js', 'num en doublon');
    plan.forEach(p => { if (p.id !== 'm' + String(p.num).padStart(2, '0')) err('plan.js', `id "${p.id}" incohérent avec num ${p.num}`); });
    for (const f of files) { const m = /^(m\d+)/.exec(path.basename(f)); if (m && !ids.has(m[1])) err(f, 'module absent du manifeste assets/plan.js'); }
    plan.forEach(p => { const m = loadedMods[p.id]; if (m) { if (m.title !== p.title) err('plan.js', `${p.id} : title « ${p.title} » ≠ module « ${m.title} »`); if (m.emoji !== p.emoji) err('plan.js', `${p.id} : emoji ≠ module`); } });
    plan.forEach(p => { if (!p.id || p.num === undefined || !p.emoji || !p.title) err('plan.js', `entrée incomplète : ${JSON.stringify(p)}`); });
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    for (const m of html.matchAll(/<script src="([^"]+)"/g)) if (!fs.existsSync(path.join(root, m[1]))) err('index.html', `script inexistant (404) : ${m[1]}`);
    for (const f of files) if (!html.includes('modules/fr/' + path.basename(f))) warn(f, 'module non chargé par index.html');
  }
}
console.log(`\n${files.length} module(s), ${errors} erreur(s), ${warns} avertissement(s).`);
process.exit(errors ? 1 : 0);
