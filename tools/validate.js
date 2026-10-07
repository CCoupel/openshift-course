#!/usr/bin/env node
/* Valide le schéma des modules, fr et en. Usage : node tools/validate.js [--strict-i18n] [--root <dir>] [fichier...]
   --strict-i18n : module en absent ou empreinte `source` périmée/absente = erreur (sinon avertissement).
   --root <dir>  : arbre de type dépôt à contrôler (assets/, modules/fr|en/, index.html) ; défaut : ce dépôt.
   Avec des fichiers en argument : contrôle de schéma seul (pas de parité ni de contrôles globaux).

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
const { hashFile, SOURCE_RE } = require('./i18n-hash');

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

const LANGS = ['fr', 'en'];
const MARK = { fr: /à vérifier/gi, en: /to be verified/gi };
const argv = process.argv.slice(2);
const strict = argv.includes('--strict-i18n');
const ri = argv.indexOf('--root');
if (ri >= 0 && (!argv[ri + 1] || argv[ri + 1].startsWith('--'))) { console.error('Usage : node tools/validate.js [--strict-i18n] [--root <dir>] [fichier...]\n--root attend un répertoire.'); process.exit(2); }
const ROOT = ri >= 0 ? path.resolve(argv[ri + 1]) : path.join(__dirname, '..');
const fileArgs = argv.filter((a, i) => !a.startsWith("--") && !(ri >= 0 && i === ri + 1));
const globalChecks = fileArgs.length === 0;

let errors = 0, warns = 0;
const err = (f, m) => { errors++; console.error(`ERREUR  ${path.basename(f)} : ${m}`); };
const warn = (f, m) => { warns++; console.warn(`warn    ${path.basename(f)} : ${m}`); };

function loadModule(file) {
  let mod = null;
  const sandbox = { COURSE: { add(m) { mod = m; } } };
  try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }); }
  catch (e) { err(file, 'ne s\'exécute pas : ' + e.message); return null; }
  if (!mod) { err(file, 'aucun appel COURSE.add'); return null; }
  return mod;
}

// Schéma d'un module (une langue). `folderLang` : dossier d'origine (fr/en) ou null pour un fichier passé en argument.
function checkSchema(file, mod, folderLang) {
  if (folderLang) {
    if (!mod.lang) err(file, 'champ lang manquant (attendu : \'' + folderLang + '\')');
    else if (!LANGS.includes(mod.lang)) err(file, `lang "${mod.lang}" inconnu (fr ou en)`);
    else if (mod.lang !== folderLang) err(file, `lang "${mod.lang}" ≠ dossier modules/${folderLang}/`);
  }
  const expected = /^m(\d+)/.exec(path.basename(file));
  if (expected && mod.id !== 'm' + expected[1]) err(file, `id "${mod.id}" ≠ nom de fichier`);
  if (expected && mod.num !== +expected[1]) err(file, `num ${mod.num} ≠ nom de fichier`);
  for (const k of ['emoji', 'title', 'tagline']) if (!mod[k]) err(file, `champ manquant : ${k}`);
  if (/[<`]/.test(mod.title || '')) err(file, 'title ne doit pas contenir de HTML/backticks');
  if (!Array.isArray(mod.objectives) || mod.objectives.length < 3) err(file, 'objectives : 3 minimum');
  if (!Array.isArray(mod.takeaways) || mod.takeaways.length < 4) err(file, 'takeaways : 4 minimum');
  if (!Array.isArray(mod.slides)) { err(file, 'slides manquant'); return null; }
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
  console.log(`${errors ? '…' : 'ok '}      ${folderLang ? folderLang + '/' : ''}${path.basename(file)} : ${mod.slides.length} slides, ${quizzes} quiz, ${labs} lab`);
  return mod;
}

/* ---------- Parité fr ↔ en (D1) ---------- */
// Lignes de code comparées : sans lignes vides, sans lignes `#…` ni commentaires de fin de ligne (` #` précédé d'un blanc,
// hors guillemets ; ils se traduisent). Limite : un guillemet ou une apostrophe non appariés avant le `#` (ex. `echo it's # x`)
// masque le commentaire ; les commentaires `//`, `--`, `;` ne sont pas retirés.
function stripTrailingComment(l) {
  let q = null;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && i > 0 && /\s/.test(l[i - 1])) return l.slice(0, i);
  }
  return l;
}
const codeLines = c => String(c || '').split('\n').map(l => stripTrailingComment(l).replace(/\s+$/, '')).filter(l => l.trim() && !/^\s*#/.test(l));
const digits = d => (String(d === undefined ? '' : d).match(/\d+/g) || []).join(',');
const len = x => (Array.isArray(x) ? x.length : undefined);

function parity(file, fr, en) {
  const e = m => err(file, 'parité fr/en : ' + m);
  for (const k of ['id', 'num', 'emoji']) if (fr[k] !== en[k]) e(`champ ${k} différent (fr « ${fr[k]} », en « ${en[k]} »)`);
  // duration : seuls les nombres comptent (« ≈ 60 min + lab 20 min » ↔ « ≈ 60 min + 20 min lab »).
  if (digits(fr.duration) !== digits(en.duration)) e(`champ duration différent (fr « ${fr.duration} », en « ${en.duration} »)`);
  for (const k of ['objectives', 'takeaways']) if (len(fr[k]) !== len(en[k])) e(`${k} : ${len(fr[k])} en fr, ${len(en[k])} en en`);
  if (fr.slides.length !== en.slides.length) { e(`nombre de slides différent (fr ${fr.slides.length}, en ${en.slides.length})`); return; }
  fr.slides.forEach((fs_, i) => {
    const es = en.slides[i], at = `slide ${i + 1}`;
    if (fs_.layout !== es.layout) e(`${at} : layout différent (fr « ${fs_.layout} », en « ${es.layout} »)`);
    if (!fs_.tag !== !es.tag) e(`${at} : tag présent dans une seule langue`);
    const fb = fs_.blocks || [], eb = es.blocks || [];
    if (fb.length !== eb.length) { e(`${at} : nombre de blocs différent (fr ${fb.length}, en ${eb.length})`); return; }
    fb.forEach((b, j) => {
      const c = eb[j], bt = `${at} bloc ${j + 1}`;
      if (b.t !== c.t) { e(`${bt} : type de bloc différent (fr ${b.t}, en ${c.t})`); return; }
      const w = `${bt} (${b.t})`;
      for (const k of ['frag', 'wide']) if (!b[k] !== !c[k]) e(`${w} : ${k} différent`);
      for (const k of ['caption', 'verdict', 'goal', 'explain', 'label', 'title']) if (!b[k] !== !c[k]) e(`${w} : champ ${k} présent dans une seule langue`);
      if (b.t === 'compare') for (const side of ['left', 'right']) if (!(b[side] || {}).title !== !(c[side] || {}).title) e(`${w} : compare.${side}.title présent dans une seule langue`);
      if (['flow', 'layers'].includes(b.t) && len(b.items || b.nodes) === len(c.items || c.nodes)) (b.items || b.nodes || []).forEach((x, k) => {
        const y = (c.items || c.nodes)[k];
        for (const f of ['hl', 'base']) if (!(x && x[f]) !== !(y && y[f])) e(`${w} : ${b.t}, élément ${k + 1}, ${f} différent`);
      });
      if (b.kind !== c.kind) e(`${w} : kind différent (fr « ${b.kind} », en « ${c.kind} »)`);
      for (const [k, label] of [['items', 'items'], ['options', 'options'], ['steps', 'steps'], ['nodes', 'nodes']]) if (len(b[k]) !== len(c[k])) e(`${w} : nombre d'${label} différent (fr ${len(b[k])}, en ${len(c[k])})`);
      if (b.t === 'table') {
        if (len(b.head) !== len(c.head)) e(`${w} : table, nombre de colonnes (head) différent (fr ${len(b.head)}, en ${len(c.head)})`);
        if (len(b.rows) !== len(c.rows)) e(`${w} : table, nombre de lignes (rows) différent (fr ${len(b.rows)}, en ${len(c.rows)})`);
      }
      if (b.t === 'compare') for (const side of ['left', 'right']) if (len((b[side] || {}).items) !== len((c[side] || {}).items)) e(`${w} : compare.${side}, nombre d'items différent`);
      if (b.t === 'quiz' && b.answer !== c.answer) e(`${w} : answer différent (fr ${b.answer}, en ${c.answer})`);
      if (b.t === 'cmds' && len(b.items) === len(c.items)) b.items.forEach((x, k) => { if (Array.isArray(x) && Array.isArray(c.items[k]) && x[0] !== c.items[k][0]) e(`${w} : cmds, commande ${k + 1} différente (fr « ${x[0]} », en « ${c.items[k][0]} »)`); });
      if (b.t === 'code') {
        if (b.file !== c.file) e(`${w} : code, file différent (fr « ${b.file} », en « ${c.file} »)`);
        if (b.lang !== c.lang) e(`${w} : code, lang différent (fr « ${b.lang} », en « ${c.lang} »)`);
        const fl = codeLines(b.code), cl = codeLines(c.code);
        if (fl.length !== cl.length) e(`${w} : code, nombre de lignes non commentaires différent (fr ${fl.length}, en ${cl.length})`);
        else fl.forEach((l, k) => { if (l !== cl[k]) e(`${w} : code, ligne différente (fr « ${l} », en « ${cl[k]} »)`); });
      }
    });
  });
  // Marqueur d'incertitude : « à vérifier » (fr) ↔ « to be verified » (en), même nombre.
  const count = (m, re) => (JSON.stringify(m).match(re) || []).length;
  const nf = count(fr, MARK.fr), ne = count(en, MARK.en);
  if (nf !== ne) e(`marqueurs d'incertitude : ${nf} « à vérifier » en fr, ${ne} « to be verified » en en`);
  if (count(en, MARK.fr)) e('marqueur « à vérifier » non traduit dans le module en (écrire « to be verified »)');
}

/* ---------- Chargement des langues ---------- */
const loaded = { fr: {}, en: {} }; // loaded[lang][nom de fichier] = module
const paths = { fr: {}, en: {} };
if (!globalChecks) {
  for (const f of fileArgs) {
    const mod = loadModule(f); if (!mod) continue;
    const folder = path.basename(path.dirname(path.resolve(f)));
    checkSchema(f, mod, LANGS.includes(folder) ? folder : null);
  }
  console.log(`\n${fileArgs.length} module(s), ${errors} erreur(s), ${warns} avertissement(s).`);
  process.exit(errors ? 1 : 0);
}

for (const lang of LANGS) {
  const dir = path.join(ROOT, 'modules', lang);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter(f => /^m\d+.*\.js$/.test(f)).sort()) {
    const file = path.join(dir, name);
    paths[lang][name] = file;
    const mod = loadModule(file); if (!mod) continue;
    loaded[lang][name] = checkSchema(file, mod, lang) || null;
  }
}

// Parité, module manquant, empreinte de source.
const frNames = Object.keys(paths.fr), enNames = Object.keys(paths.en);
for (const name of enNames) if (!paths.fr[name]) err(paths.en[name], 'module en sans équivalent fr (modules/fr/' + name + ' absent)');
for (const name of frNames) {
  if (!paths.en[name]) {
    (strict ? err : warn)(paths.fr[name], `module en absent (modules/en/${name}) — non traduit`);
    continue;
  }
  const fr = loaded.fr[name], en = loaded.en[name];
  if (fr && en && Array.isArray(fr.slides) && Array.isArray(en.slides)) parity(paths.en[name], fr, en);
  const m = SOURCE_RE.exec(fs.readFileSync(paths.en[name], 'utf8')), expected = hashFile(paths.fr[name]);
  const hint = `lancer node tools/i18n-hash.js --write ${/^m\d+/.exec(name)[0]} après avoir mis l'en à jour`;
  if (!m) (strict ? err : warn)(paths.en[name], `empreinte source absente (attendu ${expected}) — ${hint}`);
  else if (m[2] !== expected) (strict ? err : warn)(paths.en[name], `empreinte source périmée (trouvé ${m[2]}, attendu ${expected}) : le fr a changé — ${hint}`);
}

/* ---------- Contrôles globaux : i18n.js, plan.js, index.html ---------- */
const sbx = (file, key) => {
  let out = null;
  const COURSE = {}; Object.defineProperty(COURSE, key, { set(v) { out = v; }, get() { return out; } });
  try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), { COURSE }, { filename: file }); }
  catch (e) { err(file, 'ne s\'exécute pas : ' + e.message); }
  return out;
};
const i18nFile = path.join(ROOT, 'assets', 'i18n.js');
if (fs.existsSync(i18nFile)) {
  const tr = sbx(i18nFile, 'i18n');
  if (!tr || typeof tr !== 'object') err(i18nFile, 'COURSE.i18n absent');
  else {
    for (const lang of LANGS) if (!tr[lang] || typeof tr[lang] !== 'object') err(i18nFile, `i18n.js : langue ${lang} absente`);
    if (tr.fr && tr.en) {
      const ph = v => (String(v).match(/\{\w+\}/g) || []).sort().join(',');
      for (const k of Object.keys(tr.fr)) { if (!(k in tr.en)) err(i18nFile, `i18n.js : clé "${k}" manquante en en`); else if (ph(tr.fr[k]) !== ph(tr.en[k])) err(i18nFile, `i18n.js : clé "${k}", paramètres {…} différents entre fr et en`); }
      for (const k of Object.keys(tr.en)) if (!(k in tr.fr)) err(i18nFile, `i18n.js : clé "${k}" manquante en fr`);
    }
  }
} else err(i18nFile, 'assets/i18n.js absent');

const planFile = path.join(ROOT, 'assets', 'plan.js');
const plan = sbx(planFile, 'plan');
if (plan) {
  const ids = new Set(plan.map(p => p.id));
  if (ids.size !== plan.length) err('plan.js', 'id en doublon');
  if (new Set(plan.map(p => p.num)).size !== plan.length) err('plan.js', 'num en doublon');
  plan.forEach(p => { if (p.id !== 'm' + String(p.num).padStart(2, '0')) err('plan.js', `id "${p.id}" incohérent avec num ${p.num}`); });
  plan.forEach(p => { if (!p.id || p.num === undefined || !p.emoji || !p.title) err('plan.js', `entrée incomplète : ${JSON.stringify(p)}`); });
  plan.forEach(p => {
    const t = p.title;
    if (!t || typeof t !== 'object') { err('plan.js', `${p.id} : title doit être { fr, en }`); return; }
    for (const lang of LANGS) {
      if (typeof t[lang] !== 'string' || !t[lang]) { err('plan.js', `${p.id} : title.${lang} manquant`); continue; }
      const name = Object.keys(paths[lang]).find(n => n.startsWith(p.id + '-'));
      const m = name && loaded[lang][name];
      if (m) {
        if (m.title !== t[lang]) err('plan.js', `${p.id} : title ${lang} « ${t[lang]} » ≠ module « ${m.title} »`);
        if (m.emoji !== p.emoji) err('plan.js', `${p.id} : emoji ≠ module ${lang}`);
      }
    }
  });
  for (const lang of LANGS) for (const name of Object.keys(paths[lang])) { const m = /^(m\d+)/.exec(name); if (m && !ids.has(m[1])) err(paths[lang][name], 'module absent du manifeste assets/plan.js'); }
}
const indexFile = path.join(ROOT, 'index.html');
if (fs.existsSync(indexFile)) {
  const html = fs.readFileSync(indexFile, 'utf8');
  for (const m of html.matchAll(/<script src="([^"]+)"/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) err('index.html', `script inexistant (404) : ${m[1]}`);
  for (const lang of LANGS) for (const name of Object.keys(paths[lang])) if (!html.includes(`modules/${lang}/${name}`)) (strict ? err : warn)(paths[lang][name], `module non chargé par index.html (ajouter <script src="modules/${lang}/${name}"></script> : le moteur ne charge rien dynamiquement)`);
}
const total = frNames.length + enNames.length;
console.log(`\n${total} module(s) (${frNames.length} fr, ${enNames.length} en), ${errors} erreur(s), ${warns} avertissement(s)${strict ? ' [--strict-i18n]' : ''}.`);
process.exit(errors ? 1 : 0);
