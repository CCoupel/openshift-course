#!/usr/bin/env node
/* Contrôle l'export PPTX : nb de slides exportées = couverture + slides + « À retenir » par module (+ pages de suite).
 * Usage : node tools/check-pptx.js [fichier.pptx]   (génère l'export s'il est absent)
 *         node tools/check-pptx.js --selftest        (modules vides / module 00 / non évaluable, dans un dossier temporaire)
 * Sortie : code 0 si OK. Dépendance de dev : pptxgenjs (jszip en transitif). */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const JSZip = require('jszip');
const { loadModules, buildDeck, plain, readVersion } = require('./export-pptx.js');

const ROOT = path.join(__dirname, '..');
let errors = 0;
const ko = m => { errors++; console.error('ERREUR  ' + m); };
const ok = m => console.log('ok      ' + m);
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&');

async function slideTexts(file) {
  const z = await JSZip.loadAsync(fs.readFileSync(file));
  const byNum = (a, b) => +/(\d+)\.xml/.exec(a)[1] - +/(\d+)\.xml/.exec(b)[1];
  const read = async names => { const out = []; for (const n of names) out.push([...(await z.file(n).async('string')).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decode(m[1])).join('\n')); return out; };
  const slides = await read(Object.keys(z.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort(byNum));
  const notes = await read(Object.keys(z.files).filter(n => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)).sort(byNum));
  return { slides, notes };
}
const squash = s => s.replace(/\s+/g, '');

/* Toutes les chaînes d'un module susceptibles de contenir <...> une fois décodées (hors contenu envoyé en notes : cherché dans les notes). */
const TOKEN = /<[A-Za-z\/][^<>\n]*>/g;
function tokens(mod) {
  const out = new Set();
  const walk = (v, key, raw) => {
    if (typeof v === 'string') {
      const txt = raw ? v : plain(v);
      for (const m of txt.match(TOKEN) || []) out.add(m);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, key, raw || (key === 'items' && i === 0 && false)));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, raw || (k === 'code' && typeof x === 'string'));
  };
  mod.slides.forEach(s => (s.blocks || []).forEach(b => {
    if (b.t === 'diagram') return; // non rendu (placeholder)
    if (b.t === 'cmds') { (b.items || []).forEach(([c, d]) => { (String(c).match(TOKEN) || []).forEach(x => out.add(x)); walk(d, 'html', false); }); return; }
    walk(b, '', false);
  }));
  return [...out];
}

async function check(file, modulesDir) {
  const manifestFile = file.replace(/\.pptx$/, '.manifest.json');
  if (!fs.existsSync(manifestFile)) return ko(`manifeste absent : ${manifestFile}`);
  const mf = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const { modules } = loadModules(modulesDir);
  const { slides: texts, notes } = await slideTexts(file);
  const notesAll = squash(notes.join(''));

  // Contrôle indépendant du chargeur : chaque fichier modules/m*.js doit être exporté, ou déclaré « à venir » ET ne contenir aucune slide.
  if (mf.failed && mf.failed.length) mf.failed.forEach(f => ko(`${f.file} : module cassé (${f.reason})`));
  const dir = modulesDir || path.join(ROOT, 'modules');
  const inManifest = new Set(mf.modules.map(m => m.file));
  const skippedSet = new Set((mf.skipped || []).map(s => s.file));
  const failedSet = new Set((mf.failed || []).map(s => s.file));
  for (const f of fs.readdirSync(dir).filter(f => /^m\d+.*\.js$/.test(f))) {
    if (inManifest.has(f)) continue;
    if (failedSet.has(f)) continue;
    if (!skippedSet.has(f)) { ko(`${f} : fichier de module absent du manifeste d'export`); continue; }
    if (/\bblocks\s*:/.test(fs.readFileSync(path.join(dir, f), 'utf8'))) ko(`${f} : ignoré comme « à venir » alors qu'il contient des slides`);
  }

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
    // aucune perte de <...> (ex. oc debug node/<n>) : chaque jeton du source doit se retrouver dans les slides ou les notes
    const hay = squash(slice.join('')) + notesAll;
    const lost = tokens(src).filter(tk => !hay.includes(squash(tk)));
    if (lost.length) ko(`${m.id} : ${lost.length} jeton(s) <...> perdu(s) à l'export : ${lost.slice(0, 4).join(' ')}`);
    else ok(`${m.id} : aucun <...> perdu`);
    // les lignes de code et commandes sont reprises intégralement
    const bad = [];
    src.slides.forEach(s => (s.blocks || []).forEach(b => {
      if (b.t === 'cmds') (b.items || []).forEach(([c]) => { if (!hay.includes(squash(String(c)))) bad.push(String(c)); });
      if (b.t === 'code') String(b.code).split('\n').filter(l => l.trim()).forEach(l => { if (!hay.includes(squash(l))) bad.push(l.trim()); });
    }));
    if (bad.length) ko(`${m.id} : ${bad.length} commande(s)/ligne(s) de code absente(s) du PPTX : ${bad.slice(0, 3).join(' | ')}`);
    cursor += m.exported;
  }
}

/* Auto-test : module 00, module vide, module à venir, fichier non évaluable. */
async function selftest() {
  // Dossier temporaire sous _work/tmp/ du projet (gitignoré), jamais hors du projet ; nettoyé même en cas d'échec.
  const base = path.join(ROOT, '_work', 'tmp');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'export-selftest-'));
  try { await selftestIn(dir); }
  finally {
    fs.rmSync(dir, { recursive: true, force: true });
    try { fs.rmdirSync(base); } catch (e) { /* non vide : laissé (autre usage) */ }
  }
}

async function selftestIn(dir) {
  const mk = (n, extra) => `COURSE.add(${JSON.stringify({ id: 'm' + n, num: +n, emoji: '🧪', title: 'Module ' + n, tagline: 'x', duration: '≈ 60 min + lab 20 min',
    objectives: ['a', 'b', 'c'], takeaways: ['1', '2', '3', '4'], ...extra })});`;
  const slides = [{ title: 'S1', blocks: [{ t: 'text', html: 'Bonjour <b>monde</b>' }, { t: 'quiz', q: 'Q ?', options: ['a', 'b'], answer: 1, explain: 'e' }] }];
  fs.writeFileSync(path.join(dir, 'm00-env.js'), mk('00', { slides }));
  fs.writeFileSync(path.join(dir, 'm03-vide.js'), mk('03', { slides: [] }));
  fs.writeFileSync(path.join(dir, 'm04-avenir.js'), "COURSE.add({ id: 'm04', num: 4, title: 'À venir' });");
  fs.writeFileSync(path.join(dir, 'm05-casse.js'), 'ceci n\'est pas du js (');
  fs.writeFileSync(path.join(dir, 'm07-inconnu.js'), mk('07', { slides: [{ title: 'X', blocks: [{ t: 'futur', html: 'y' }] }] }));
  // commande avec <placeholder> + entités : ne doivent pas être perdues
  fs.writeFileSync(path.join(dir, 'm08-cmds.js'), mk('08', { slides: [{ title: 'C', blocks: [
    { t: 'cmds', items: [['oc debug node/<n>', 'Shell <b>sur</b> le nœud &rarr; <i>root</i>'], ['oc get pod <p> -o yaml', 'x']] },
    { t: 'code', code: '$ oc get <res> -n <ns>\n# note <x>' }, { t: 'text', html: 'Saisir &lt;nom&gt; &amp; &#8212; fin' }] }] }));
  const broken = path.join(dir, 'm05-casse.js');
  const { modules, skipped, failed } = loadModules(dir);
  if (modules.map(m => m.num).join() !== '0,7,8') ko(`selftest : modules chargés ${modules.map(m => m.num)} (attendu 0,7,8)`);
  if (skipped.length !== 2) ko(`selftest : ${skipped.length} ignoré(s) (attendu 2 : vide, à venir)`);
  if (failed.length !== 1 || failed[0].file !== 'm05-casse.js') ko('selftest : le module cassé doit être « failed », pas ignoré en silence');
  const build = async mods => {
    const { pptx, manifest } = buildDeck(mods, { version: 'test' });
    const out = path.join(dir, 'selftest.pptx');
    await pptx.writeFile({ fileName: out });
    manifest.skipped = skipped; manifest.failed = failed;
    fs.writeFileSync(out.replace(/\.pptx$/, '.manifest.json'), JSON.stringify(manifest));
    return { out, manifest };
  };
  const { out, manifest } = await build(modules);
  if (!manifest.warnings.some(w => w.includes('futur'))) ko('selftest : bloc inconnu non signalé');
  // 1) cas nominal avec un module cassé : l'erreur DOIT être détectée (on la retire du compteur)
  const before = errors;
  await check(out, dir);
  const detected = errors - before;
  errors = before;
  if (!detected) ko('selftest : un module cassé n\'a pas fait échouer le contrôle');
  else ok('selftest : module cassé détecté');
  // 2) sans module cassé : tout doit passer
  fs.rmSync(broken);
  failed.length = 0;
  await build(modules);
  await check(out, dir);
  // 3) une perte de <...> est détectée
  const mfFile = out.replace(/\.pptx$/, '.manifest.json');
  const lossy = modules.map(m => m.num === 8 ? { ...m, slides: m.slides.map(s => ({ ...s, blocks: s.blocks.map(b => b.t === 'cmds' ? { ...b, items: b.items.map(([c, d]) => [c.replace('<n>', '<n>'), d]) } : b) })) } : m);
  const deck = buildDeck(lossy, { version: 'test' });
  await deck.pptx.writeFile({ fileName: out });
  fs.writeFileSync(mfFile, JSON.stringify({ ...deck.manifest, skipped, failed: [] }));
  const srcFile = path.join(dir, 'm08-cmds.js');
  fs.writeFileSync(srcFile, fs.readFileSync(srcFile, 'utf8').replace('oc debug node/<n>', 'oc debug node/<n> --to <x>'));
  const b2 = errors;
  await check(out, dir);   // la source a changé après l'export : <x> n'existe pas dans le PPTX → perte détectée
  const lostDetected = errors - b2;
  errors = b2;
  if (!lostDetected) ko('selftest : une perte de <...> n\'a pas été détectée');
  else ok('selftest : perte de <...> détectée');
}

(async () => {
  const arg = process.argv[2];
  if (arg === '--selftest') await selftest();
  else {
    const version = readVersion();
    const file = path.resolve(arg || path.join(ROOT, `dist/openshift-course-${version}.pptx`));
    if (!fs.existsSync(file)) execFileSync(process.execPath, [path.join(__dirname, 'export-pptx.js'), '--out', file], { stdio: 'inherit' });
    await check(file);
  }
  console.log(`\n${errors} erreur(s).`);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
