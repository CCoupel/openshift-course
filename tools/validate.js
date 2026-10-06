#!/usr/bin/env node
/* Valide le schéma des modules. Usage : node tools/validate.js [fichier...] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// À garder synchronisé avec assets/engine.js (objet R) et le CSS des callouts.
const BLOCKS = ['text', 'bullets', 'code', 'cmds', 'table', 'compare', 'callout', 'flow', 'layers', 'cards', 'quiz', 'reveal', 'lab', 'diagram'];
const CALLOUTS = ['tip', 'warn', 'trap', 'cloud', 'onprem', 'k8s', 'ocp'];

const dir = path.join(__dirname, '..', 'modules');
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

  let quizzes = 0, labs = 0;
  mod.slides.forEach((s, i) => {
    const at = `slide ${i + 1} "${s.title}"`;
    if (!s.title) err(file, `slide ${i + 1} sans title`);
    else if (/[<`]/.test(s.title)) err(file, `${at} : title en texte brut (pas de HTML/backticks)`);
    if (!Array.isArray(s.blocks) || !s.blocks.length) { err(file, `${at} : pas de blocs`); return; }
    s.blocks.forEach((b, j) => {
      const bt = `${at} bloc ${j + 1} (${b.t})`;
      if (!BLOCKS.includes(b.t)) return err(file, `${bt} : type inconnu`);
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
    for (const f of files) if (!html.includes('modules/' + path.basename(f))) warn(f, 'module non chargé par index.html');
  }
}
console.log(`\n${files.length} module(s), ${errors} erreur(s), ${warns} avertissement(s).`);
process.exit(errors ? 1 : 0);
