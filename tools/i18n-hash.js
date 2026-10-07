#!/usr/bin/env node
/* Empreintes de source fr → en (D6). Chaque module en porte `source: '<12 premiers hex du sha256 du fichier fr>'`.
   Usage : node tools/i18n-hash.js --check [--root <dir>]          liste les modules en périmés ou sans empreinte (exit 1 s'il y en a)
           node tools/i18n-hash.js --write [<mNN>|all] [--root <dir>]  recalcule `source` du module en (à lancer après avoir mis à jour l'en)
   Le hash porte sur le contenu du fichier fr avec fins de ligne normalisées (CRLF → LF). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const hashOf = text => crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
const hashFile = f => hashOf(fs.readFileSync(f, 'utf8'));
const SOURCE_RE = /^(\s*source:\s*)'([^']*)'/m;

function pairs(root) {
  const fr = path.join(root, 'modules', 'fr'), en = path.join(root, 'modules', 'en');
  if (!fs.existsSync(fr)) return [];
  return fs.readdirSync(fr).filter(f => /^m\d+.*\.js$/.test(f)).sort().map(f => ({
    name: f, id: /^(m\d+)/.exec(f)[1], fr: path.join(fr, f), en: path.join(en, f), hasEn: fs.existsSync(path.join(en, f))
  }));
}
// État de l'empreinte d'un module en : { state: 'ok' | 'stale' | 'missing', expected, found }
function status(p) {
  const expected = hashFile(p.fr);
  const m = SOURCE_RE.exec(fs.readFileSync(p.en, 'utf8'));
  if (!m) return { state: 'missing', expected, found: null };
  return { state: m[2] === expected ? 'ok' : 'stale', expected, found: m[2] };
}
function write(p) {
  const expected = hashFile(p.fr);
  let src = fs.readFileSync(p.en, 'utf8');
  if (SOURCE_RE.test(src)) src = src.replace(SOURCE_RE, (m, a) => `${a}'${expected}'`);
  else if (/^  title:.*$/m.test(src)) src = src.replace(/^(  title:.*)$/m, `$1\n  source: '${expected}',`);
  else throw new Error(`${p.name} : ligne "title:" introuvable, impossible d'insérer source`);
  fs.writeFileSync(p.en, src);
  return expected;
}

module.exports = { hashOf, hashFile, pairs, status, write, SOURCE_RE };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const ri = argv.indexOf('--root');
  if (ri >= 0 && (!argv[ri + 1] || argv[ri + 1].startsWith('--'))) { console.error('Usage : node tools/i18n-hash.js --check | --write [<mNN>|all] [--root <dir>]\n--root attend un répertoire.'); process.exit(2); }
  const root = ri >= 0 ? path.resolve(argv[ri + 1]) : path.join(__dirname, '..');
  const rest = argv.filter((a, i) => !(i === ri || i === ri + 1));
  const list = pairs(root).filter(p => p.hasEn);
  if (rest.includes('--check')) {
    let bad = 0;
    for (const p of list) {
      const s = status(p);
      if (s.state === 'ok') continue;
      bad++;
      console.log(`${p.name} : empreinte source ${s.state === 'missing' ? 'absente' : `périmée (trouvé ${s.found})`}, attendu ${s.expected} — fr modifié ? mettre à jour l'en puis : node tools/i18n-hash.js --write ${p.id}`);
    }
    process.exit(bad ? 1 : 0);
  } else if (rest.includes('--write')) {
    const target = rest[rest.indexOf('--write') + 1];
    const sel = !target || target === 'all' || target.startsWith('--') ? list : list.filter(p => p.id === target || p.name === target || p.name === target + '.js');
    if (!sel.length) { console.error('Aucun module en correspondant.'); process.exit(1); }
    sel.forEach(p => console.log(`${p.name} : source = ${write(p)}`));
  } else {
    console.error('Usage : node tools/i18n-hash.js --check | --write [<mNN>|all] [--root <dir>]');
    process.exit(2);
  }
}
