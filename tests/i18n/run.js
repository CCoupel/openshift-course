#!/usr/bin/env node
/* Fixtures de parité fr/en — lance tools/validate.js (et tools/i18n-hash.js) sur des arbres de test.
   Usage : node tests/i18n/run.js [--dry (applique les éditions sans lancer les outils)] [--verbose] [--exit-only] [--only <id>] [--keep] [--refresh-hashes]
   Sans dépendance. Ne modifie jamais le dépôt : chaque cas travaille sur une copie de fixtures/base/
   sous un dossier unique _work/tmp/i18n-fixtures-XXXXXX/<id>/ (sauf --refresh-hashes, qui recalcule les empreintes de fixtures/base/).

   ┌─ ATTENTES SUPPOSÉES (écrites à partir du plan _work/reports/planner-i18n.md, avant tools/validate.js T4) ─┐
   │ A1. validate.js accepte `--root <dir>` : <dir> est un arbre de type dépôt (assets/, modules/fr|en/, index.html). │
   │ A2. `--strict-i18n` : module en absent / empreinte périmée = erreur (exit 1) ; sans l'option = avertissement (exit 0). │
   │ A3. Erreur = ligne « ERREUR … » et exit 1 ; avertissement = ligne « warn … » ; les motifs de message ci-dessous │
   │     (champ `out`) sont volontairement larges : à ajuster dans CASES si les libellés réels diffèrent.             │
   │ A4. Empreinte = 12 premiers hex du sha256 du fichier fr, dans le champ `source` du module en.                    │
   │ A5. `i18n-hash.js --check --root <dir>` : exit 1 et nomme les modules périmés ; exit 0 et rien sinon ;          │
   │     `--write <module> --root <dir>` recalcule l'empreinte.                                                      │
   │ Tout ce qui est supposé est dans la section CONFIG et dans le champ `expect` de chaque cas.                       │
   └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// ───────────── CONFIG (à ajuster si le contrat réel de validate.js diffère) ─────────────
const REPO = path.join(__dirname, '..', '..');
const BASE = path.join(__dirname, 'fixtures', 'base');
const WORK_PARENT = path.join(REPO, '_work', 'tmp');   // chaque exécution crée son propre sous-dossier unique (exécutions parallèles sûres)
const TOOLS = { validate: path.join(REPO, 'tools', 'validate.js'), hash: path.join(REPO, 'tools', 'i18n-hash.js') };
const rootArgs = dir => ['--root', dir];                       // A1
const hashOf = src => crypto.createHash('sha256').update(src).digest('hex').slice(0, 12); // A4
// ─────────────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const opt = n => argv.includes(n);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;

const FR = ['m00', 'm01'].map(m => `modules/fr/${m}-demo.js`), EN = f => f.replace('/fr/', '/en/');
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const write = (dir, f, s) => fs.writeFileSync(path.join(dir, f), s);

/** Recalcule `source` de chaque module en d'après le fichier fr correspondant. */
function refreshHashes(dir) {
  for (const f of FR) {
    const en = EN(f);
    if (!fs.existsSync(path.join(dir, f)) || !fs.existsSync(path.join(dir, en))) continue;
    const s = read(dir, en);
    write(dir, en, s.replace(/source: '[^']*'/, `source: '${hashOf(read(dir, f))}'`));
  }
}
if (opt('--refresh-hashes')) { refreshHashes(BASE); console.log('Empreintes de fixtures/base/ recalculées.'); process.exit(0); }

// ───────────── Éditions (mutations d'un fichier de la copie) ─────────────
const sub = (from, to) => src => { if (!src.includes(from)) throw new Error(`fixture : « ${from} » introuvable`); return src.replace(from, to); };
const cutSlide4 = src => { const r = /\/\*S4\*\/[\s\S]*?\/\*E4\*\//; if (!r.test(src)) throw new Error('fixture : marqueurs S4/E4 introuvables'); return src.replace(r, ''); };
const EN1 = 'modules/en/m01-demo.js', FR1 = 'modules/fr/m01-demo.js', PLAN = 'assets/plan.js', I18N = 'assets/i18n.js', INDEX = 'index.html';
const ed = (file, fn) => ({ file, fn });                         // fn === null : supprime le fichier

// ───────────── Cas ─────────────
// expect : { exit, out:[regex qui doivent apparaître], notOut:[regex qui ne doivent pas apparaître] }
const ERR = (...res) => ({ exit: 1, out: [/ERREUR/, ...res] });
const OK = { exit: 0, notOut: [/ERREUR/] };
const CASES = [
  // — Paire valide (smoke) —
  { id: 'V01', title: 'paire fr/en valide, mode normal', tags: ['smoke'], edits: [], args: [], expect: OK },
  { id: 'V02', title: 'paire fr/en valide, --strict-i18n', tags: ['smoke'], edits: [], args: ['--strict-i18n'], expect: OK },
  { id: 'V03', title: 'commentaires de code traduits (# …) : pas une différence', edits: [ed(EN1, sub('# Platform health', '# État de santé'))], args: ['--strict-i18n'], expect: OK },

  // — Parité structurelle (une règle cassée par cas) —
  { id: 'P01', title: 'nombre de slides différent', edits: [ed(EN1, cutSlide4)], args: [], expect: ERR(/slide/i) },
  { id: 'P02', title: 'type de bloc différent (bullets → text)', edits: [ed(EN1, sub("{ t: 'bullets', frag: true, items: ['Item A', 'Item B'] }", "{ t: 'text', frag: true, html: '<p>Item A, Item B</p>' }"))], args: [], expect: ERR(/bloc|block|bullets|text/i) },
  { id: 'P03', title: 'quiz : `answer` différent', edits: [ed(EN1, sub('answer: 1', 'answer: 2'))], args: [], expect: ERR(/answer/i) },
  { id: 'P04', title: 'quiz : nombre d\'options différent', edits: [ed(EN1, sub("['One', 'Two', 'Three']", "['One', 'Two']"))], args: [], expect: ERR(/option/i) },
  { id: 'P05', title: 'cmds : commande modifiée (cmds[0])', edits: [ed(EN1, sub("['oc get co', 'Lists the operators']", "['oc get clusteroperators', 'Lists the operators']"))], args: [], expect: ERR(/cmds|commande|command/i) },
  { id: 'P06', title: 'cmds : nombre d\'items différent', edits: [ed(EN1, sub(", ['oc get nodes', 'Lists the nodes']", ''))], args: [], expect: ERR(/cmds|items/i) },
  { id: 'P07', title: 'code : ligne non commentaire modifiée', edits: [ed(EN1, sub('$ oc get clusterversion', '$ oc get clusterversion -o yaml'))], args: [], expect: ERR(/code|ligne|line/i) },
  { id: 'P08', title: 'code : nom de fichier `file` modifié (précision entre parenthèses conservée)', edits: [ed(EN1, sub("file: 'demo.sh (lab example)'", "file: 'demo-en.sh (lab example)'"))], args: [], expect: ERR(/file|code/i) },
  { id: 'P09', title: 'code : `lang` du bloc modifié', edits: [ed(EN1, sub("lang: 'bash'", "lang: 'yaml'"))], args: [], expect: ERR(/lang|code/i) },
  { id: 'P10', title: 'table : nombre de lignes différent', edits: [ed(EN1, sub(", ['B', 'Two']", ''))], args: [], expect: ERR(/table|rows|lignes/i) },
  { id: 'P11', title: 'table : nombre de colonnes différent', edits: [ed(EN1, sub("head: ['Term', 'Definition'], rows: [['A', 'One'], ['B', 'Two']]", "head: ['Term'], rows: [['A'], ['B']]"))], args: [], expect: ERR(/table|head|colonne|column/i) },
  { id: 'P12', title: 'bloc : `frag` présent en fr, absent en en', edits: [ed(EN1, sub("{ t: 'bullets', frag: true,", "{ t: 'bullets',"))], args: [], expect: ERR(/frag/i) },
  { id: 'P13', title: 'callout : `kind` différent', edits: [ed(EN1, sub("kind: 'tip'", "kind: 'warn'"))], args: [], expect: ERR(/kind|callout/i) },
  { id: 'P14', title: 'module : `emoji` différent', edits: [ed(EN1, sub("emoji: '⚖️'", "emoji: '🧪'"))], args: [], expect: ERR(/emoji/i) },
  { id: 'P15', title: 'module : `duration` différente', edits: [ed(EN1, sub("'≈ 10 min + 5 min lab'", "'≈ 12 min + 5 min lab'"))], args: [], expect: ERR(/duration/i) },
  { id: 'P16', title: 'module : `num` différent', edits: [ed(EN1, sub('num: 1,', 'num: 2,'))], args: [], expect: ERR(/num/i) },
  { id: 'P17', title: 'module : nombre d\'objectifs différent', edits: [ed(EN1, sub(", 'Objective 3']", ']'))], args: [], expect: ERR(/objectives|objectifs/i) },
  { id: 'P18', title: 'module : nombre de takeaways différent', edits: [ed(EN1, sub(", 'Point 4']", ']'))], args: [], expect: ERR(/takeaways/i) },

  // — Marqueur d'incertitude « à vérifier » ↔ « to be verified » —
  { id: 'M01', title: 'marqueur non traduit (« à vérifier » resté dans en)', edits: [ed(EN1, sub('(to be verified)', '(à vérifier)'))], args: [], expect: ERR(/vérifier|verified|marqueur|marker/i) },
  { id: 'M02', title: 'marqueur perdu en en', edits: [ed(EN1, sub(' (to be verified)', ''))], args: [], expect: ERR(/vérifier|verified|marqueur|marker/i) },
  { id: 'M03', title: 'marqueur ajouté en en seulement', edits: [ed(EN1, sub("explain: 'Because", "explain: '(to be verified) Because"))], args: [], expect: ERR(/vérifier|verified|marqueur|marker/i) },

  // — Champ `lang` —
  { id: 'L01', title: '`lang` ≠ dossier (en/ contient lang: \'fr\')', edits: [ed(EN1, sub("lang: 'en'", "lang: 'fr'"))], args: [], expect: ERR(/lang/i) },
  { id: 'L02', title: '`lang` absent', edits: [ed(EN1, sub("lang: 'en', ", ''))], args: [], expect: ERR(/lang/i) },
  { id: 'L03', title: '`lang` inconnu (de)', edits: [ed(EN1, sub("lang: 'en'", "lang: 'de'"))], args: [], expect: ERR(/lang/i) },

  // — assets/i18n.js —
  { id: 'I01', title: 'clé de libellé manquante en en', edits: [ed(I18N, sub("home: 'Home'", ''))], args: [], expect: ERR(/i18n|home|clé|key/i) },
  { id: 'I02', title: 'clé de libellé en trop en en', edits: [ed(I18N, sub("home: 'Home'", "home: 'Home', extra: 'Extra'"))], args: [], expect: ERR(/i18n|extra|clé|key/i) },
  { id: 'I03', title: 'clé de libellé manquante en fr', edits: [ed(I18N, sub("search: 'Rechercher', ", ''))], args: [], expect: ERR(/i18n|search|clé|key/i) },
  { id: 'I04', title: 'langue en entièrement absente de i18n.js', edits: [ed(I18N, sub(",\n  en: { prev: '← Previous', next: 'Next →', search: 'Search', home: 'Home' }", ''))], args: [], expect: ERR(/i18n|en/i) },

  // — assets/plan.js (titres bilingues) —
  { id: 'T01', title: 'titre plan.js (en) ≠ titre du module en', edits: [ed(PLAN, sub("en: 'Demo module'", "en: 'Another title'"))], args: [], expect: ERR(/plan|title|titre/i) },
  { id: 'T02', title: 'titre plan.js (fr) ≠ titre du module fr', edits: [ed(PLAN, sub("fr: 'Module démo'", "fr: 'Autre titre'"))], args: [], expect: ERR(/plan|title|titre/i) },
  { id: 'T03', title: 'titre plan.js sans langue en', edits: [ed(PLAN, sub(", en: 'Demo module'", ''))], args: [], expect: ERR(/plan|title|titre|en/i) },
  { id: 'T04', title: 'titre plan.js en chaîne simple (non bilingue)', edits: [ed(PLAN, sub("{ fr: 'Module démo', en: 'Demo module' }", "'Module démo'"))], args: [], expect: ERR(/plan|title|titre/i) },

  // — Module en manquant : avertissement, erreur en strict —
  { id: 'S01', title: 'module en absent, mode normal : avertissement', edits: [ed(EN1, null), ed(INDEX, sub('<script src="modules/en/m01-demo.js"></script>\n', ''))], args: [], expect: { exit: 0, out: [/warn/i, /m01/], notOut: [/ERREUR/] } },
  { id: 'S02', title: 'module en absent, --strict-i18n : erreur', tags: ['smoke'], edits: [ed(EN1, null), ed(INDEX, sub('<script src="modules/en/m01-demo.js"></script>\n', ''))], args: ['--strict-i18n'], expect: ERR(/m01/) },
  { id: 'S03', title: 'module fr absent alors que en existe : erreur même sans strict', edits: [ed(FR1, null), ed(INDEX, sub('<script src="modules/fr/m01-demo.js"></script>\n', ''))], args: [], expect: ERR(/m01/) },

  // — Empreinte de source (D6) —
  { id: 'H01', title: 'empreinte périmée (fr modifié, en non recalculé), mode normal : avertissement', staleHash: true, edits: [ed(FR1, sub("'Fixture de parité fr/en.'", "'Fixture de parité fr/en, retouchée.'"))], args: [], expect: { exit: 0, out: [/warn/i, /m01/, /source|empreinte|hash|périm|stale/i], notOut: [/ERREUR/] } },
  { id: 'H02', title: 'empreinte périmée, --strict-i18n : erreur', tags: ['smoke'], staleHash: true, edits: [ed(FR1, sub("'Fixture de parité fr/en.'", "'Fixture de parité fr/en, retouchée.'"))], args: ['--strict-i18n'], expect: ERR(/m01/, /source|empreinte|hash|périm|stale/i) },
  { id: 'H03', title: 'empreinte à jour après retouche du fr : aucun avertissement d\'empreinte', edits: [ed(FR1, sub("'Fixture de parité fr/en.'", "'Fixture de parité fr/en, retouchée.'"))], args: ['--strict-i18n'], expect: OK },
  { id: 'H04', title: 'empreinte absente du module en, --strict-i18n : erreur', edits: [ed(EN1, src => src.replace(/ *source: '[^']*',\n/, ''))], keepSource: true, args: ['--strict-i18n'], expect: ERR(/m01/, /source|empreinte|hash/i) },

  // — tools/i18n-hash.js —
  { id: 'K01', title: 'i18n-hash --check : rien à signaler sur la paire valide', edits: [], steps: [{ tool: 'hash', args: ['--check'], expect: { exit: 0, notOut: [/m0[01]/] } }] },
  { id: 'K02', title: 'i18n-hash --check : liste le module périmé', staleHash: true, edits: [ed(FR1, sub("'Fixture de parité fr/en.'", "'Fixture de parité fr/en, retouchée.'"))], steps: [{ tool: 'hash', args: ['--check'], expect: { exit: 1, out: [/m01/], notOut: [/m00/] } }] },
  { id: 'K03', title: 'i18n-hash --write m01 puis --check : plus rien de périmé', staleHash: true, edits: [ed(FR1, sub("'Fixture de parité fr/en.'", "'Fixture de parité fr/en, retouchée.'"))],
    steps: [{ tool: 'hash', args: ['--check'], expect: { exit: 1, out: [/m01/] } }, { tool: 'hash', args: ['--write', 'm01'], expect: { exit: 0 } },
            { tool: 'hash', args: ['--check'], expect: { exit: 0, notOut: [/m0[01]/] } }, { tool: 'validate', args: ['--strict-i18n'], expect: OK }] },
  // — Contrôles complémentaires (revue phase 1, dev-course 9c4e379 / ebfdfd5) —
  { id: 'R01', title: 'module en présent mais non référencé par index.html : avertissement', edits: [ed(INDEX, sub('<script src="modules/en/m01-demo.js"></script>\n', ''))], args: [], expect: { exit: 0, out: [/warn/i, /index\.html|m01/], notOut: [/ERREUR/] } },
  { id: 'R02', title: 'module en non référencé par index.html, --strict-i18n : erreur', tags: ['smoke'], edits: [ed(INDEX, sub('<script src="modules/en/m01-demo.js"></script>\n', ''))], args: ['--strict-i18n'], expect: ERR(/index\.html|m01/) },
  { id: 'R03', title: 'module fr non référencé par index.html, --strict-i18n : erreur', edits: [ed(INDEX, sub('<script src="modules/fr/m01-demo.js"></script>\n', ''))], args: ['--strict-i18n'], expect: ERR(/index\.html|m01/) },
  { id: 'R04', title: 'caption de bloc code perdue en en', edits: [ed(EN1, sub("caption: 'Code caption.', ", ''))], args: [], expect: ERR(/caption/i) },
  { id: 'R05', title: 'caption de bloc flow perdue en en', edits: [ed(EN1, sub(", caption: 'The CVO drives the operators.'", ''))], args: [], expect: ERR(/caption/i) },
  { id: 'R06', title: 'verdict de bloc compare perdu en en', edits: [ed(EN1, sub(", verdict: 'Verdict.'", ''))], args: [], expect: ERR(/verdict/i) },
  { id: 'R07', title: 'explain de quiz perdu en en', edits: [ed(EN1, sub(", explain: 'Because <b>two</b>.'", ''))], args: [], expect: ERR(/explain/i) },
  { id: 'R08', title: 'compare : titre de colonne perdu en en', edits: [ed(EN1, sub("left: { title: 'Left', items: ['a'] }", "left: { items: ['a'] }"))], args: [], expect: ERR(/title|compare/i) },
  { id: 'R09', title: 'flow : `hl` d\'un nœud absent en en', edits: [ed(EN1, sub(", hl: true }", ' }'))], args: [], expect: ERR(/hl|flow/i) },
  { id: 'R10', title: 'flow : `hl` ajouté sur un autre nœud en en seulement', edits: [ed(EN1, sub("{ label: 'Operators', sub: 'Every component' }", "{ label: 'Operators', sub: 'Every component', hl: true }"))], args: [], expect: ERR(/hl|flow/i) },
  { id: 'R11', title: 'duration : « + lab 5 min » ↔ « + 5 min lab » accepté (base)', edits: [], args: ['--strict-i18n'], expect: OK },
  { id: 'R12', title: 'duration : nombre différent (6 au lieu de 5) : erreur', edits: [ed(EN1, sub("'≈ 10 min + 5 min lab'", "'≈ 10 min + 6 min lab'"))], args: [], expect: ERR(/duration/i) },
  { id: 'R13', title: 'code : commentaire de fin « cmd  # note » traduit : accepté', edits: [ed(EN1, sub('$ oc get nodes  # note', '$ oc get nodes  # remarque'))], args: ['--strict-i18n'], expect: OK },
  { id: 'R14', title: 'code : commentaire de fin supprimé en en : accepté', edits: [ed(EN1, sub('$ oc get nodes  # note', '$ oc get nodes'))], args: ['--strict-i18n'], expect: OK },
  { id: 'R15', title: 'code : `echo "a # b"` modifié (# entre guillemets = code) : erreur', edits: [ed(EN1, sub('echo "a # b"', 'echo "a # c"'))], args: [], expect: ERR(/code|ligne|line/i) },
  { id: 'R16', title: 'code : commande avant le commentaire de fin modifiée : erreur', edits: [ed(EN1, sub('$ oc get nodes  # note', '$ oc get pods  # note'))], args: [], expect: ERR(/code|ligne|line/i) },
  { id: 'F01', title: 'code : précision de `file` entre parenthèses traduite (« (exemple de lab) » ↔ « (lab example) ») : accepté', edits: [], args: ['--strict-i18n'], expect: OK },
  { id: 'F02', title: 'code : précision de `file` supprimée en en : accepté', edits: [ed(EN1, sub("file: 'demo.sh (lab example)'", "file: 'demo.sh'"))], args: ['--strict-i18n'], expect: OK },
  { id: 'F03', title: 'code : nom de fichier modifié, précision traduite : erreur', edits: [ed(EN1, sub("file: 'demo.sh (lab example)'", "file: 'demo.conf (lab example)'"))], args: [], expect: ERR(/file/i) },
  { id: 'F04', title: 'code : `file` absent en en alors que fr en a un : erreur', edits: [ed(EN1, sub("file: 'demo.sh (lab example)', ", ''))], args: [], expect: ERR(/file|code/i) },
  { id: 'R17', title: 'validate.js --root sans valeur : usage, exit 2', edits: [], steps: [{ tool: 'validate', raw: true, args: ['--root'], expect: { exit: 2, out: [/usage/i] } }] },
  { id: 'R18', title: 'validate.js --root suivi d\'une option : usage, exit 2', edits: [], steps: [{ tool: 'validate', raw: true, args: ['--root', '--strict-i18n'], expect: { exit: 2, out: [/usage/i] } }] },
  { id: 'R19', title: 'i18n-hash.js --root sans valeur : usage, exit 2', edits: [], steps: [{ tool: 'hash', raw: true, args: ['--check', '--root'], expect: { exit: 2, out: [/usage/i] } }] },
];

// ───────────── Exécution ─────────────
function copyTree(from, to) { fs.mkdirSync(to, { recursive: true }); for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name); e.isDirectory() ? copyTree(a, b) : fs.copyFileSync(a, b); } }
function run(tool, dir, args, raw) {
  const r = spawnSync(process.execPath, [TOOLS[tool], ...(raw ? [] : rootArgs(dir)), ...args], { encoding: 'utf8', timeout: 60000 });
  return { exit: r.status, out: (r.stdout || '') + (r.stderr || ''), spawnError: r.error && r.error.message };
}
function check(expect, res) {
  const problems = [];
  if (res.spawnError) problems.push(`exécution impossible : ${res.spawnError}`);
  if (expect.exit !== undefined && res.exit !== expect.exit) problems.push(`EXIT attendu ${expect.exit}, obtenu ${res.exit}`);
  for (const re of expect.out || []) if (!re.test(res.out)) problems.push(`MSG absent : ${re}`);
  for (const re of expect.notOut || []) if (re.test(res.out)) problems.push(`MSG interdit présent : ${re}`);
  return problems;
}

const missing = Object.entries(TOOLS).filter(([, p]) => !fs.existsSync(p)).map(([k]) => k);
fs.mkdirSync(WORK_PARENT, { recursive: true });
const WORK = fs.mkdtempSync(path.join(WORK_PARENT, 'i18n-fixtures-'));
// Nettoyage garanti à la sortie (succès, échec ou exception), sauf --keep (conservé pour le diagnostic).
process.on('exit', () => { if (!opt('--keep')) fs.rmSync(WORK, { recursive: true, force: true }); else console.log(`Fixtures conservées : ${WORK}`); });
let fail = 0, total = 0, skipped = 0;
for (const c of CASES) {
  if (only && c.id !== only) continue;
  const steps = c.steps || [{ tool: 'validate', args: c.args, expect: c.expect }];
  if (!opt('--dry') && steps.some(s => missing.includes(s.tool))) { skipped++; console.log(`SKIP ${c.id}  ${c.title}  (tools/${path.basename(TOOLS[steps.find(s => missing.includes(s.tool)).tool])} absent)`); continue; }
  total++;
  const dir = path.join(WORK, c.id);
  copyTree(BASE, dir);
  try {
    for (const e of c.edits) { if (e.fn === null) fs.rmSync(path.join(dir, e.file)); else write(dir, e.file, e.fn(read(dir, e.file))); }
    if (!c.staleHash && !c.keepSource) refreshHashes(dir);
  } catch (e) { fail++; console.log(`FAIL ${c.id}  ${c.title}\n       fixture invalide : ${e.message}`); continue; }
  if (opt('--dry')) { console.log(`edit ${c.id}  ${c.title}`); continue; }
  const problems = [];
  steps.forEach((s, i) => { const res = run(s.tool, dir, s.args, s.raw); const p = check(s.expect, res); p.forEach(x => problems.push(`${steps.length > 1 ? `étape ${i + 1} (${s.tool} ${s.args.join(' ')}) : ` : ''}${x}`)); if (p.length && opt('--verbose')) problems.push('sortie :\n' + res.out.replace(/^/gm, '         | ')); });
  const msgOnly = problems.length && problems.every(p => p.startsWith('MSG') || /: MSG/.test(p));
  if (problems.length && !(opt('--exit-only') && msgOnly)) { fail++; console.log(`FAIL ${c.id}  ${c.title}\n${problems.map(p => '       ' + p).join('\n')}`); }
  else console.log(`ok   ${c.id}  ${c.title}${c.tags ? '  [' + c.tags.join(',') + ']' : ''}`);
}
console.log(`\n${total} cas exécutés, ${fail} en échec, ${skipped} ignorés (outil absent).`);
process.exit(fail || (skipped && !total) ? 1 : 0);
