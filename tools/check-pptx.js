#!/usr/bin/env node
/* Contrôle l'export PPTX : nb de slides exportées = couverture + slides + « À retenir » par module (+ pages de suite).
 * Usage : node tools/check-pptx.js [fichier.pptx]   (génère l'export s'il est absent)
 *         node tools/check-pptx.js --selftest        (modules vides / module 00 / non évaluable, dans un dossier temporaire)
 * Sortie : code 0 si OK. Dépendance de dev : pptxgenjs (jszip en transitif). */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const JSZip = require('jszip');
const { loadModules, buildDeck, plain } = require('./export-pptx.js');

const ROOT = path.join(__dirname, '..');
let errors = 0;
const ko = m => { errors++; console.error('ERREUR  ' + m); };
const ok = m => console.log('ok      ' + m);
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');

async function slideTexts(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(z.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +/(\d+)\.xml/.exec(a)[1] - +/(\d+)\.xml/.exec(b)[1]);
  const out = [];
  for (const n of names) out.push([...(await z.file(n).async('string')).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decode(m[1])).join('\n'));
  return out;
}

async function check(file, modulesDir) {
  const manifestFile = file.replace(/\.pptx$/, '.manifest.json');
  if (!fs.existsSync(manifestFile)) return ko(`manifeste absent : ${manifestFile}`);
  const mf = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const { modules } = loadModules(modulesDir);
  const texts = await slideTexts(file);

  if (mf.modules.length !== modules.length) ko(`${mf.modules.length} module(s) dans le manifeste, ${modules.length} exportable(s) dans modules/`);
  const expectedTotal = 1 + mf.modules.reduce((n, m) => n + m.exported, 0);
  if (texts.length !== expectedTotal) ko(`${texts.length} slide(s) dans le .pptx, ${expectedTotal} attendue(s) d'après le manifeste`);
  else ok(`${texts.length} slide(s) dans le .pptx (1 ouverture + ${expectedTotal - 1})`);

  let cursor = 1;
  for (const m of mf.modules) {
    const src = modules.find(x => x.id === m.id);
    if (!src) { ko(`${m.id} : module du manifeste introuvable dans modules/`); continue; }
    const logical = 1 + src.slides.length + (src.takeaways && src.takeaways.length ? 1 : 0);
    const got = m.logical.cover + m.logical.slides + m.logical.recap;
    if (got !== logical) ko(`${m.id} : ${got} slide(s) logiques exportées, ${logical} attendues (couverture + ${src.slides.length} + À retenir)`);
    if (m.exported < logical) ko(`${m.id} : ${m.exported} slide(s) PPTX < ${logical} logiques`);
    // chaque titre attendu apparaît, dans l'ordre, dans les slides du module
    const slice = texts.slice(cursor, cursor + m.exported);
    const wanted = [`MODULE ${String(src.num).padStart(2, '0')}`, ...src.slides.map(s => plain(s.title || '')), ...(m.logical.recap ? ['À retenir'] : [])];
    let at = 0, missing = [];
    for (const t of wanted) {
      const i = slice.findIndex((x, k) => k >= at && x.includes(t));
      if (i < 0) missing.push(t); else at = i;
    }
    if (missing.length) ko(`${m.id} : titre(s) absent(s) ou hors ordre : ${missing.slice(0, 3).join(' | ')}`);
    else ok(`${m.id} : ${m.exported} slide(s) PPTX, ${logical} logiques${m.exported > logical ? ` (+${m.exported - logical} page(s) de suite)` : ''}`);
    cursor += m.exported;
  }
}

/* Auto-test : module 00, module vide, module à venir, fichier non évaluable. */
async function selftest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-selftest-'));
  const mk = (n, extra) => `COURSE.add(${JSON.stringify({ id: 'm' + n, num: +n, emoji: '🧪', title: 'Module ' + n, tagline: 'x', duration: '≈ 60 min + lab 20 min',
    objectives: ['a', 'b', 'c'], takeaways: ['1', '2', '3', '4'], ...extra })});`;
  const slides = [{ title: 'S1', blocks: [{ t: 'text', html: 'Bonjour <b>monde</b>' }, { t: 'quiz', q: 'Q ?', options: ['a', 'b'], answer: 1, explain: 'e' }] }];
  fs.writeFileSync(path.join(dir, 'm00-env.js'), mk('00', { slides }));
  fs.writeFileSync(path.join(dir, 'm03-vide.js'), mk('03', { slides: [] }));
  fs.writeFileSync(path.join(dir, 'm04-avenir.js'), "COURSE.add({ id: 'm04', num: 4, title: 'À venir' });");
  fs.writeFileSync(path.join(dir, 'm05-casse.js'), 'ceci n\'est pas du js (');
  fs.writeFileSync(path.join(dir, 'm07-inconnu.js'), mk('07', { slides: [{ title: 'X', blocks: [{ t: 'futur', html: 'y' }] }] }));
  const { modules, skipped } = loadModules(dir);
  if (modules.map(m => m.num).join() !== '0,7') ko(`selftest : modules chargés ${modules.map(m => m.num)} (attendu 0,7)`);
  if (skipped.length !== 3) ko(`selftest : ${skipped.length} ignoré(s) (attendu 3)`);
  const { pptx, manifest } = buildDeck(modules, { version: 'test' });
  const out = path.join(dir, 'selftest.pptx');
  await pptx.writeFile({ fileName: out });
  fs.writeFileSync(out.replace(/\.pptx$/, '.manifest.json'), JSON.stringify(manifest));
  if (!manifest.warnings.some(w => w.includes('futur'))) ko('selftest : bloc inconnu non signalé');
  await check(out, dir);
  fs.rmSync(dir, { recursive: true, force: true });
}

(async () => {
  const arg = process.argv[2];
  if (arg === '--selftest') await selftest();
  else {
    const version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
    const file = path.resolve(arg || path.join(ROOT, `dist/openshift-course-${version}.pptx`));
    if (!fs.existsSync(file)) execFileSync(process.execPath, [path.join(__dirname, 'export-pptx.js'), '--out', file], { stdio: 'inherit' });
    await check(file);
  }
  console.log(`\n${errors} erreur(s).`);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
