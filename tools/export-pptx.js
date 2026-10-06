#!/usr/bin/env node
/* Exporte le cours en PowerPoint à partir de modules/*.js (source unique).
 * Usage : node tools/export-pptx.js [--out dist/fichier.pptx]
 * Dépendance de dev : pptxgenjs (jamais utilisée par le cours HTML).
 * Les modules sont lus, jamais modifiés. Tout fichier non évaluable ou sans slides est ignoré. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function readVersion() {
  const f = path.join(ROOT, 'VERSION');
  if (!fs.existsSync(f)) throw new Error('fichier VERSION introuvable : ' + f);
  const v = fs.readFileSync(f, 'utf8').trim();
  if (!v) throw new Error('fichier VERSION vide');
  return v;
}

/* ---------- Chargement des modules (même mécanisme que validate.js) ---------- */
function loadModules(dir = path.join(ROOT, 'modules')) {
  const modules = [], skipped = [], failed = [];
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^m\d+.*\.js$/.test(f)).sort() : [];
  for (const f of files) {
    let mod = null;
    // Attention : vm n'est pas un sandbox. Les modules sont du code du dépôt (revu en PR) ; ne pas exécuter l'export sur des PR de forks avec secrets.
    try { vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8'), { COURSE: { add(m) { mod = m; } } }, { filename: f, timeout: 2000 }); }
    catch (e) { failed.push({ file: f, reason: 'non évaluable : ' + e.message }); continue; }
    if (!mod) { failed.push({ file: f, reason: 'aucun appel COURSE.add' }); continue; }
    if (!Array.isArray(mod.slides) || !mod.slides.length) { skipped.push({ file: f, reason: 'sans slides (module à venir)' }); continue; }
    mod.__file = f;
    modules.push(mod);
  }
  const num = m => (Number.isFinite(m.num) ? m.num : Infinity);
  modules.sort((a, b) => num(a) - num(b) || a.__file.localeCompare(b.__file));
  return { modules, skipped, failed };
}

/* ---------- HTML minimal → runs de texte ---------- */
const ENT = { nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", amp: '&', rarr: '→', larr: '←', harr: '↔', uarr: '↑', darr: '↓', mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»',
  times: '×', middot: '·', bull: '•', check: '✓', eacute: 'é', egrave: 'è', agrave: 'à', ecirc: 'ê', ccedil: 'ç', copy: '©', reg: '®', deg: '°', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const cp = n => { try { return String.fromCodePoint(n); } catch (e) { return ''; } };
// une seule passe : pas de double décodage (&amp;lt; reste &lt;)
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) =>
  e[0] === '#' ? cp(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (e in ENT ? ENT[e] : (e.toLowerCase() in ENT ? ENT[e.toLowerCase()] : m)));
const MONO = 'Consolas';
const SANS = 'Calibri';
const C = { bg: 'FAF9F7', text: '1C1B1A', muted: '6B6560', border: 'E4E0DB', surface: 'FFFFFF', surface2: 'F3F1EE', accent: 'EE0000', accentSoft: 'FDE8E8', accentText: 'B80000',
  codeBg: '1E1E24', codeText: 'E8E6E3', codeDim: '8B8B99', codePrompt: 'FF7B72', head: '2B2A2E', k8s: '326CE5', ocp: 'C9190B' };
const CALLOUT = {
  tip: ['💡', 'Astuce', '1A7F4B', 'E6F5EC'], warn: ['⚠️', 'Attention', '9A6700', 'FFF4D6'], trap: ['🪤', 'Piège', '8250DF', 'F1E9FD'],
  cloud: ['☁️', 'Écart cloud', '0B6BCB', 'E5F1FC'], onprem: ['🏢', 'On-prem', '0F766E', 'DFF5F2'], k8s: ['☸️', 'Côté K8s', '326CE5', 'E8EFFD'], ocp: ['🔴', 'Côté OCP', 'C9190B', 'FDE8E8']
};

function runs(html, base = {}) {
  const out = [];
  let bold = 0, ital = 0, code = 0;
  for (const p of String(html == null ? '' : html).split(/(<[^>]+>)/)) {
    if (!p) continue;
    const m = /^<\s*(\/?)\s*([a-z0-9]+)[^>]*>$/i.exec(p);
    if (m) {
      const d = m[1] ? -1 : 1, tag = m[2].toLowerCase();
      if (tag === 'b' || tag === 'strong') bold = Math.max(0, bold + d);
      else if (tag === 'i' || tag === 'em') ital = Math.max(0, ital + d);
      else if (tag === 'code') code = Math.max(0, code + d);
      else if (tag === 'br' || (d < 0 && /^(p|li|div|ul|ol|tr)$/.test(tag))) { if (out.length && out[out.length - 1].text !== '\n') out.push({ text: '\n', options: { ...base } }); }
      continue;
    }
    const text = decode(p).replace(/\s+/g, ' ');
    if (!text) continue;
    const o = { ...base };
    if (bold) o.bold = true;
    if (ital) o.italic = true;
    if (code) { o.fontFace = MONO; o.color = C.accentText; }
    out.push({ text, options: o });
  }
  if (!out.length) out.push({ text: '', options: { ...base } });
  return out;
}
const plain = html => (Array.isArray(html) ? html : runs(html)).map(r => r.text).join('').trim();
const raw = s => [{ text: String(s), options: {} }]; // texte brut (cmds[0]) : jamais interprété comme HTML

/* Un paragraphe = runs dont le dernier porte breakLine ; le premier porte les options de paragraphe. */
function paragraphs(items, base, para = {}) {
  const out = [];
  items.forEach((it, i) => {
    const rs = Array.isArray(it) ? it : runs(it, base);
    Object.assign(rs[0].options, para);
    rs[rs.length - 1].options = { ...rs[rs.length - 1].options, breakLine: i < items.length - 1 };
    out.push(...rs);
  });
  return out;
}

/* ---------- Estimation de hauteur (pouces) ---------- */
const lineH = pt => pt * 1.3 / 72;
const isWide = c => c.codePointAt(0) > 0x2000;
const wlen = w => [...w].reduce((n, c) => n + (isWide(c) ? 2 : 1), 0);
// Retour à la ligne par mot, largeur moyenne volontairement pessimiste (0,55 em proportionnel, 0,62 em mono)
function lines(text, pt, w, mono) {
  const per = Math.max(4, Math.floor(w / (pt * (mono ? 0.62 : 0.55) / 72)));
  return String(text).split('\n').reduce((n, para) => {
    let l = 1, cur = 0;
    for (const word of para.split(' ')) {
      let len = wlen(word);
      if (len > per) { if (cur) { l++; cur = 0; } l += Math.floor((len - 1) / per); len = len % per || per; cur = len + 1; continue; }
      if (cur && cur + len > per) { l++; cur = 0; }
      cur += len + 1;
    }
    return n + l;
  }, 0);
}
const textH = (text, pt, w, mono) => lines(text, pt, w, mono) * lineH(pt);
const listH = (items, pt, w, gap) => items.reduce((n, i) => n + textH(plain(i), pt, w - 0.3) + gap, 0);
const MINPT = 10, MINS = 0.75; // police minimale lisible ; en dessous, on pagine
const fs_ = (pt, s) => Math.max(MINPT, Math.round(pt * s));

const GAP = 0.18;
const BULLET = { indent: 16 };

/* ---------- Blocs : measure(b, w, s) → hauteur ; draw(ctx, b, x, y, w, s) ; split(b, w, avail, s) → [tête, reste] ---------- */
function splitItems(b, key, perItem, w, avail, s, extra = 0) {
  const items = b[key];
  let h = extra, n = 0;
  for (; n < items.length; n++) { const ih = perItem(items[n], w, s); if (h + ih > avail) break; h += ih; }
  if (n === 0 || n >= items.length) return null;
  return [{ ...b, [key]: items.slice(0, n) }, { ...b, [key]: items.slice(n) }];
}

function colWidths(head, rows, w) {
  const wt = head.map((h, j) => {
    const lens = [plain(h), ...rows.map(r => plain(r[j]))].map(t => t.length);
    const max = Math.max(...lens), avg = lens.reduce((a, c) => a + c, 0) / lens.length;
    return Math.max(8, Math.min(60, 0.5 * avg + 0.5 * max));
  });
  const sum = wt.reduce((a, c) => a + c, 0);
  return wt.map(x => w * x / sum);
}
function tableRowH(cells, cw, pt, mono0) {
  return Math.max(...cells.map((c, j) => textH(plain(c), pt, cw[j] - 0.25, mono0 && j === 0))) + 0.14;
}
function drawTable(ctx, head, rows, x, y, w, s, opts = {}) {
  const pt = fs_(opts.pt || 12, s), cw = colWidths(head, rows, w);
  const cell = (c, o) => ({ text: Array.isArray(c) ? c.map(r => ({ text: r.text, options: { fontSize: pt, fontFace: SANS, ...o.run, ...r.options } })) : runs(c, { fontSize: pt, fontFace: SANS, ...o.run }), options: o.cell });
  const rowsX = [head.map(h => cell(h, { run: { bold: true, color: 'FFFFFF' }, cell: { fill: { color: C.head }, valign: 'middle' } }))];
  rows.forEach((r, i) => rowsX.push(r.map((c, j) => cell(c, opts.monoFirst && j === 0
    ? { run: { fontFace: MONO, color: C.accentText }, cell: { fill: { color: i % 2 ? C.surface2 : C.surface }, valign: 'top' } }
    : { run: { color: C.text }, cell: { fill: { color: i % 2 ? C.surface2 : C.surface }, valign: 'top' } }))));
  // hauteurs minimales seulement : PowerPoint agrandit chaque ligne selon son texte (la pagination a déjà réservé une estimation pessimiste)
  const rowH = rowsX.map(() => 0.3);
  ctx.slide.addTable(rowsX, { x, y, w, colW: cw, rowH, border: { type: 'solid', pt: 0.5, color: C.border }, margin: [0.04, 0.08, 0.04, 0.08] });
}
const tableH = (head, rows, w, s, mono0) => {
  const cw = colWidths(head, rows, w), pt = fs_(12, s);
  return [tableRowH(head, cw, pt), ...rows.map(r => tableRowH(r, cw, pt, mono0))].reduce((a, c) => a + c, 0) + 0.05;
};
const tableSplit = (b, head, rowsKey, w, avail, s, mono0) => {
  const cw = colWidths(head, b[rowsKey], w), pt = fs_(12, s);
  return splitItems(b, rowsKey, (r) => tableRowH(r, cw, pt, mono0), w, avail, s, tableRowH(head, cw, pt) + 0.05);
};

const HANDLERS = {
  text: {
    measure: (b, w, s) => textH(plain(b.html), fs_(16, s), w) + 0.05,
    draw(ctx, b, x, y, w, s, h) { ctx.slide.addText(runs(b.html, { fontSize: fs_(16, s), fontFace: SANS, color: C.text }), { x, y, w, h, margin: 0, valign: 'top' }); }
  },
  bullets: {
    measure: (b, w, s) => listH(b.items, fs_(16, s), w, 0.09 * s) + 0.05,
    split: (b, w, avail, s) => splitItems(b, 'items', (i) => textH(plain(i), fs_(16, s), w - 0.3) + 0.09 * s, w, avail, s),
    draw(ctx, b, x, y, w, s, h) {
      ctx.slide.addText(paragraphs(b.items, { fontSize: fs_(16, s), fontFace: SANS, color: C.text }, { bullet: BULLET, paraSpaceAfter: 5 }), { x, y, w, h, margin: 0, valign: 'top' });
    }
  },
  code: {
    measure: (b, w, s) => 0.3 + codeLines(b, w, s) * lineH(fs_(11, s)) + 0.2 + (b.caption ? 0.3 : 0),
    split(b, w, avail, s) {
      const ls = String(b.code).replace(/\n$/, '').split('\n');
      const per = Math.max(4, Math.floor((w - 0.4) / (fs_(11, s) * 0.62 / 72)));
      let h = 0.5, n = 0;
      for (; n < ls.length; n++) { const lh = Math.max(1, Math.ceil(ls[n].length / per)) * lineH(fs_(11, s)); if (h + lh > avail) break; h += lh; }
      if (n < 3 || n >= ls.length) return null;
      return [{ ...b, code: ls.slice(0, n).join('\n'), caption: undefined }, { ...b, code: ls.slice(n).join('\n') }];
    },
    draw(ctx, b, x, y, w, s, h) {
      const pt = fs_(11, s), ch = h - (b.caption ? 0.3 : 0);
      ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y, w, h: ch, fill: { color: C.codeBg }, line: { color: C.codeBg }, rectRadius: 0.06 });
      ctx.slide.addText(b.file || b.lang || '', { x: x + 0.15, y: y + 0.03, w: w - 0.3, h: 0.24, fontSize: 9, fontFace: MONO, color: C.codeDim, margin: 0 });
      const ls = String(b.code).replace(/\n$/, '').split('\n').map((l, i, a) => {
        const o = { fontSize: pt, fontFace: MONO, color: C.codeText, breakLine: i < a.length - 1 };
        if (/^\s*#/.test(l)) return [{ text: l, options: { ...o, color: C.codeDim } }];
        if (/^\$ /.test(l)) return [{ text: '$ ', options: { ...o, color: C.codePrompt, breakLine: false } }, { text: l.slice(2), options: o }];
        return [{ text: l, options: o }];
      });
      ctx.slide.addText(ls.flat(), { x: x + 0.15, y: y + 0.32, w: w - 0.3, h: ch - 0.4, margin: 0, valign: 'top' });
      if (b.caption) ctx.slide.addText(runs(b.caption, { fontSize: fs_(11, s), italic: true, color: C.muted, fontFace: SANS }), { x, y: y + ch + 0.04, w, h: 0.25, margin: 0 });
    }
  },
  cmds: {
    measure: (b, w, s) => tableH(['Commande', 'Rôle'], cmdRows(b), w, s, true),
    split(b, w, avail, s) {
      const r = tableSplit({ rows: cmdRows(b) }, ['Commande', 'Rôle'], 'rows', w, avail, s, true);
      const back = rows => ({ ...b, items: rows.map(([c, d]) => [plain(c), d]) });
      return r && [back(r[0].rows), back(r[1].rows)];
    },
    draw(ctx, b, x, y, w, s) { drawTable(ctx, ['Commande', 'Rôle'], cmdRows(b), x, y, w, s, { monoFirst: true }); }
  },
  table: {
    measure: (b, w, s) => tableH(b.head, b.rows, w, s),
    split: (b, w, avail, s) => tableSplit(b, b.head, 'rows', w, avail, s),
    draw(ctx, b, x, y, w, s) { drawTable(ctx, b.head, b.rows, x, y, w, s); }
  },
  compare: {
    measure(b, w, s) { const cw = (w - 0.2) / 2; return 0.5 + Math.max(listH(b.left.items, fs_(14, s), cw - 0.3, 0.07), listH(b.right.items, fs_(14, s), cw - 0.3, 0.07)) + 0.1 + (b.verdict ? textH(plain(b.verdict), fs_(14, s), w - 0.3) + 0.3 : 0); },
    draw(ctx, b, x, y, w, s, h) {
      const cw = (w - 0.2) / 2, vh = b.verdict ? textH(plain(b.verdict), fs_(14, s), w - 0.3) + 0.3 : 0, bh = h - vh;
      [[b.left, C.k8s, 'E8EFFD', x], [b.right, C.ocp, 'FDE8E8', x + cw + 0.2]].forEach(([side, col, bg, sx]) => {
        ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x: sx, y, w: cw, h: bh, fill: { color: bg }, line: { color: col, width: 1 }, rectRadius: 0.06 });
        ctx.slide.addText(runs(side.title, { fontSize: fs_(16, s), bold: true, color: col, fontFace: SANS }), { x: sx + 0.15, y: y + 0.08, w: cw - 0.3, h: 0.35, margin: 0 });
        ctx.slide.addText(paragraphs(side.items, { fontSize: fs_(14, s), fontFace: SANS, color: C.text }, { bullet: BULLET, paraSpaceAfter: 4 }), { x: sx + 0.15, y: y + 0.5, w: cw - 0.3, h: bh - 0.55, margin: 0, valign: 'top' });
      });
      if (b.verdict) {
        ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y: y + bh + 0.1, w, h: vh - 0.1, fill: { color: C.surface2 }, line: { color: C.border }, rectRadius: 0.06 });
        ctx.slide.addText(runs(b.verdict, { fontSize: fs_(14, s), bold: true, fontFace: SANS, color: C.text }), { x: x + 0.15, y: y + bh + 0.1, w: w - 0.3, h: vh - 0.1, margin: 0, valign: 'middle' });
      }
    }
  },
  callout: {
    measure: (b, w, s) => 0.2 + 0.3 + textH(plain(b.html), fs_(14, s), w - 0.5) + 0.05,
    draw(ctx, b, x, y, w, s, h) {
      const [ic, label, col, bg] = CALLOUT[b.kind] || CALLOUT.tip;
      ctx.slide.addShape(ctx.pptx.ShapeType.rect, { x, y, w, h, fill: { color: bg }, line: { color: bg } });
      ctx.slide.addShape(ctx.pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: col }, line: { color: col } });
      ctx.slide.addText(`${ic} ${plain(b.title || label)}`, { x: x + 0.22, y: y + 0.08, w: w - 0.4, h: 0.28, fontSize: fs_(13, s), bold: true, color: col, fontFace: SANS, margin: 0 });
      ctx.slide.addText(runs(b.html, { fontSize: fs_(14, s), fontFace: SANS, color: C.text }), { x: x + 0.22, y: y + 0.38, w: w - 0.4, h: h - 0.44, margin: 0, valign: 'top' });
    }
  },
  flow: {
    measure(b, w, s) { const g = flowGeo(b, w, s); return g.rows * g.pitch + (b.caption ? 0.3 : 0); },
    draw(ctx, b, x, y, w, s) {
      const g = flowGeo(b, w, s), nh = g.nh;
      b.nodes.forEach((n, i) => {
        const o = typeof n === 'string' ? { label: n } : n, r = Math.floor(i / g.per), c = i % g.per;
        const nx = x + c * (g.nw + 0.35), ny = y + r * g.pitch;
        ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x: nx, y: ny, w: g.nw, h: nh, fill: { color: o.hl ? C.accentSoft : C.surface }, line: { color: o.hl ? C.accent : C.border, width: 1.25 }, rectRadius: 0.08 });
        const rs = runs(o.label, { fontSize: fs_(13, s), bold: true, color: C.text, fontFace: SANS, breakLine: !!o.sub });
        if (o.sub) rs.push(...runs(o.sub, { fontSize: fs_(10, s), color: C.muted, fontFace: SANS }));
        ctx.slide.addText(rs, { x: nx + 0.05, y: ny, w: g.nw - 0.1, h: nh, align: 'center', valign: 'middle', margin: 0 });
        if (c < g.per - 1 && i < b.nodes.length - 1) ctx.slide.addText('→', { x: nx + g.nw, y: ny, w: 0.35, h: nh, align: 'center', valign: 'middle', fontSize: 16, color: C.muted, margin: 0 });
      });
      if (b.caption) ctx.slide.addText(runs(b.caption, { fontSize: fs_(11, s), italic: true, color: C.muted, fontFace: SANS }), { x, y: y + g.rows * g.pitch, w, h: 0.25, margin: 0 });
    }
  },
  layers: {
    measure: (b, w, s) => b.items.reduce((n, l) => n + layerH(l, w, s) + 0.07, 0),
    split: (b, w, avail, s) => splitItems(b, 'items', (l) => layerH(l, w, s) + 0.07, w, avail, s),
    draw(ctx, b, x, y, w, s) {
      let ly = y;
      b.items.forEach((l) => {
        const hh = layerH(l, w, s), cy = ly;
        ly += hh + 0.07;
        {
        ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y: cy, w, h: hh, fill: { color: l.hl ? C.accentSoft : l.base ? C.surface2 : C.surface }, line: { color: l.hl ? C.accent : C.border, width: 1 }, rectRadius: 0.05 });
        ctx.slide.addText(runs(l.name, { fontSize: fs_(14, s), bold: true, color: C.text, fontFace: SANS }), { x: x + 0.15, y: cy, w: w * 0.3, h: hh, valign: 'middle', margin: 0 });
        ctx.slide.addText(runs(l.desc || '', { fontSize: fs_(12, s), color: C.muted, fontFace: SANS }), { x: x + w * 0.3 + 0.2, y: cy, w: w * 0.7 - 0.35, h: hh, valign: 'middle', margin: 0 });
        }
      });
    }
  },
  cards: { // cartes retournables → tableau terme / définition (interactivité perdue)
    measure: (b, w, s) => tableH(['Terme', 'Définition'], b.items.map(c => [c.front, c.back]), w, s),
    split(b, w, avail, s) {
      const r = tableSplit({ rows: b.items.map(c => [c.front, c.back]) }, ['Terme', 'Définition'], 'rows', w, avail, s);
      const back = rows => ({ ...b, items: rows.map(([front, back]) => ({ front, back })) });
      return r && [back(r[0].rows), back(r[1].rows)];
    },
    draw(ctx, b, x, y, w, s) { drawTable(ctx, ['Terme', 'Définition'], b.items.map(c => [c.front, c.back]), x, y, w, s); }
  },
  quiz: {
    measure: (b, w, s) => 0.2 + 0.3 + textH(plain(b.q), fs_(16, s), w - 0.4) + 0.1 + b.options.reduce((n, o) => n + textH(plain(o), fs_(14, s), w - 0.7) + 0.1, 0),
    draw(ctx, b, x, y, w, s, h) {
      ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.surface }, line: { color: C.accent, width: 1.25 }, rectRadius: 0.08 });
      ctx.slide.addText('🎯 QUIZ', { x: x + 0.2, y: y + 0.08, w: 2, h: 0.25, fontSize: 10, bold: true, color: C.accentText, fontFace: SANS, margin: 0 });
      const qh = textH(plain(b.q), fs_(16, s), w - 0.4) + 0.1;
      ctx.slide.addText(runs(b.q, { fontSize: fs_(16, s), bold: true, color: C.text, fontFace: SANS }), { x: x + 0.2, y: y + 0.35, w: w - 0.4, h: qh, margin: 0, valign: 'top' });
      const opts = b.options.map((o, i) => [{ text: String.fromCharCode(65 + i) + '.  ', options: { bold: true, color: C.accentText, fontSize: fs_(14, s), fontFace: SANS } }, ...runs(o, { fontSize: fs_(14, s), fontFace: SANS, color: C.text })]);
      ctx.slide.addText(paragraphs(opts, {}, { paraSpaceAfter: 6 }), { x: x + 0.2, y: y + 0.35 + qh + 0.05, w: w - 0.4, h: h - qh - 0.5, margin: 0, valign: 'top' });
      if (Number.isInteger(b.answer) && b.options[b.answer] !== undefined) ctx.notes.push(`QUIZ — réponse : ${String.fromCharCode(65 + b.answer)}. ${plain(b.options[b.answer])}${b.explain ? '\n' + plain(b.explain) : ''}`);
      else ctx.warn('quiz sans réponse valide');
    }
  },
  reveal: {
    measure: (b, w, s) => 0.7 * s,
    draw(ctx, b, x, y, w, s, h) {
      ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.surface }, line: { color: C.accent, width: 1, dashType: 'dash' }, rectRadius: 0.08 });
      ctx.slide.addText(`💭 ${plain(b.label || 'Réfléchis, puis réponds à voix haute')}`, { x: x + 0.2, y, w: w - 0.4, h, fontSize: fs_(15, s), bold: true, color: C.accentText, fontFace: SANS, valign: 'middle', margin: 0 });
      ctx.notes.push('RÉPONSE — ' + plain(b.html));
    }
  },
  lab: {
    measure: (b, w, s) => 0.2 + 0.4 + (b.goal ? textH(plain(b.goal), fs_(13, s), w - 0.4) + 0.08 : 0) + b.steps.reduce((n, t) => n + textH(plain(t), fs_(14, s), w - 0.9) + 0.08, 0),
    split(b, w, avail, s) {
      const base = 0.6 + (b.goal ? textH(plain(b.goal), fs_(13, s), w - 0.4) + 0.08 : 0);
      const r = splitItems(b, 'steps', (t) => textH(plain(t), fs_(14, s), w - 0.9) + 0.08, w, avail, s, base);
      return r && [{ ...r[0], __n: b.__n || 0 }, { ...r[1], __n: (b.__n || 0) + r[0].steps.length, goal: undefined }];
    },
    draw(ctx, b, x, y, w, s, h) {
      ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.surface }, line: { color: C.border, width: 1 }, rectRadius: 0.08 });
      ctx.slide.addText(`🧪 ${plain(b.title)}`, { x: x + 0.2, y: y + 0.08, w: w - 0.4, h: 0.32, fontSize: fs_(16, s), bold: true, color: C.accentText, fontFace: SANS, margin: 0 });
      let cy = y + 0.45;
      if (b.goal) { const gh = textH(plain(b.goal), fs_(13, s), w - 0.4) + 0.08; ctx.slide.addText(runs(b.goal, { fontSize: fs_(13, s), italic: true, color: C.muted, fontFace: SANS }), { x: x + 0.2, y: cy, w: w - 0.4, h: gh, margin: 0, valign: 'top' }); cy += gh; }
      const n0 = b.__n || 0;
      const steps = b.steps.map((t, i) => [{ text: `☐  ${n0 + i + 1}.  `, options: { fontSize: fs_(14, s), color: C.accentText, bold: true, fontFace: SANS } }, ...runs(t, { fontSize: fs_(14, s), fontFace: SANS, color: C.text })]);
      ctx.slide.addText(paragraphs(steps, {}, { paraSpaceAfter: 5 }), { x: x + 0.2, y: cy, w: w - 0.4, h: y + h - cy - 0.05, margin: 0, valign: 'top' });
    }
  },
  diagram: { // SVG/HTML libre : non rendu, renvoi vers la version HTML
    measure: (b, w, s) => 1.6 * s + (b.caption ? 0.3 : 0),
    draw(ctx, b, x, y, w, s, h) {
      const bh = h - (b.caption ? 0.3 : 0);
      ctx.slide.addShape(ctx.pptx.ShapeType.roundRect, { x, y, w, h: bh, fill: { color: C.surface2 }, line: { color: C.border, width: 1, dashType: 'dash' }, rectRadius: 0.08 });
      ctx.slide.addText('📐 Schéma disponible dans la version HTML du cours', { x, y, w, h: bh, align: 'center', valign: 'middle', fontSize: fs_(14, s), color: C.muted, fontFace: SANS, margin: 0 });
      if (b.caption) ctx.slide.addText(runs(b.caption, { fontSize: fs_(11, s), italic: true, color: C.muted, fontFace: SANS }), { x, y: y + bh + 0.04, w, h: 0.25, margin: 0 });
      ctx.warn(`diagramme non exporté (placeholder)${b.caption ? ' : ' + plain(b.caption) : ''}`);
      const txt = plain(String(b.html).replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ').replace(/<\/?(text|tspan)[^>]*>/gi, ' '));
      if (txt) ctx.notes.push('SCHÉMA (texte extrait) — ' + txt.slice(0, 600));
    }
  }
};
// cmds[0] est du texte brut (le moteur HTML l'échappe) : on le passe en runs bruts, jamais dans le parseur HTML.
const cmdRows = b => b.items.map(([c, d]) => [raw(c), d]);
const layerH = (l, w, s) => Math.max(0.55, textH(plain(l.desc || ''), fs_(12, s), w * 0.7 - 0.45) + 0.16, textH(plain(l.name), fs_(14, s), w * 0.3 - 0.2) + 0.16);
function codeLines(b, w, s) {
  const per = Math.max(4, Math.floor((w - 0.4) / (fs_(11, s) * 0.62 / 72)));
  return String(b.code).replace(/\n$/, '').split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / per)), 0);
}
function flowGeo(b, w, s = 1) {
  const n = b.nodes.length, per = Math.max(1, Math.min(n, Math.floor((w + 0.35) / (1.7 + 0.35))));
  const nw = (w - (per - 1) * 0.35) / per;
  const nh = Math.max(0.75 * s, ...b.nodes.map(x => { const o = typeof x === 'string' ? { label: x } : x;
    return textH(plain(o.label), fs_(13, s), nw - 0.2) + (o.sub ? textH(plain(o.sub), fs_(10, s), nw - 0.2) : 0) + 0.2; }));
  return { per, rows: Math.ceil(n / per), nw, nh, pitch: nh + 0.1 };
}
const UNKNOWN = { measure: () => 0.7, draw(ctx, b, x, y, w, s, h) {
  ctx.slide.addText(`Bloc « ${b.t} » non exporté`, { x, y, w, h, fontSize: 12, color: C.muted, italic: true, fontFace: SANS, margin: 0 });
  ctx.warn(`bloc non exporté : ${b.t}`);
} };
const handler = b => HANDLERS[b.t] || UNKNOWN;

/* ---------- Pagination : répartit les blocs d'une slide sur 1..n pages PowerPoint ---------- */
const SW = 13.333, SH = 7.5, MX = 0.55, TOP = 1.3, BOTTOM = 7.0, CW = SW - 2 * MX;

function paginate(blocks, layout, warn = () => {}) {
  const two = layout === 'two', cw = two ? (CW - 0.35) / 2 : CW;
  const fresh = () => ({ items: [], ys: two ? [TOP, TOP] : [TOP] });
  const colX = c => MX + c * (cw + 0.35);
  const pages = [fresh()];
  const queue = blocks.slice();
  while (queue.length) {
    const b = queue.shift(), hd = handler(b), pg = pages[pages.length - 1];
    const full = !two || !!b.wide;
    const w = full ? CW : cw;
    const cols = full ? [{ c: 0, y: Math.max(...pg.ys) }] : pg.ys.map((y, c) => ({ c, y })).sort((p, q) => p.y - q.y || p.c - q.c);
    const isTop = pg.ys.every(y => y === TOP);
    const fit = cols.find(col => hd.measure(b, w, 1) <= BOTTOM - col.y);
    const place = (blk, col, s) => {
      const need = handler(blk).measure(blk, w, s), h = Math.min(need, BOTTOM - col.y);
      if (need > h + 0.01) warn(`bloc « ${blk.t} » trop haut pour la page (${need.toFixed(1)} in > ${h.toFixed(1)} in) : débordement possible, à vérifier visuellement`);
      pg.items.push({ b: blk, x: full ? MX : colX(col.c), y: col.y, w, h, s });
      if (full) pg.ys = pg.ys.map(() => col.y + h + GAP); else pg.ys[col.c] = col.y + h + GAP;
    };
    if (fit) { place(b, fit, 1); continue; }
    // bloc non découpable : une légère réduction de police (85 %) évite souvent une page de suite
    const fit85 = hd.split ? null : cols.find(col => hd.measure(b, w, 0.85) <= BOTTOM - col.y);
    if (fit85) { place(b, fit85, 0.85); continue; }
    const col = cols[0], avail = BOTTOM - col.y;
    const sp = hd.split && avail >= 1.0 ? hd.split(b, w, avail, 1) : null;
    if (sp) { place(sp[0], col, 1); queue.unshift(sp[1]); pages.push(fresh()); continue; }
    if (!isTop) { pages.push(fresh()); queue.unshift(b); continue; }
    // page vierge : découper si possible, sinon réduire la police (jusqu'à 75 %, jamais sous 10 pt)
    const sp2 = hd.split ? hd.split(b, w, BOTTOM - TOP, 1) : null;
    if (sp2) { place(sp2[0], col, 1); queue.unshift(sp2[1]); pages.push(fresh()); continue; }
    let s = 1;
    while (s > MINS && hd.measure(b, w, s) > BOTTOM - TOP) s = Math.round((s - 0.05) * 100) / 100;
    place(b, col, s);
  }
  return pages.filter(p => p.items.length);
}

/* ---------- Construction du deck ---------- */
function buildDeck(modules, opts = {}) {
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'OpenShift, du K8s à OCP';
  pptx.subject = 'Support de cours OpenShift on-premise';
  const manifest = { version: opts.version || '', intro: 1, modules: [], warnings: [], total: 0 };
  const sw = [];

  const newSlide = (ctx0, footer) => {
    const slide = pptx.addSlide();
    slide.background = { color: C.bg };
    if (footer) {
      slide.addText(footer, { x: MX, y: 7.1, w: 9, h: 0.28, fontSize: 9, color: C.muted, fontFace: SANS, margin: 0 });
      slide.slideNumber = { x: SW - MX - 0.8, y: 7.1, w: 0.8, h: 0.28, fontSize: 9, color: C.muted, align: 'right', fontFace: SANS };
    }
    manifest.total++;
    return slide;
  };
  const withNotes = (slide, notes) => { if (notes.length) slide.addNotes(notes.join('\n\n')); };
  const title = (slide, text, tag, cont) => {
    const t = plain(text) + (cont ? ' (suite)' : '');
    const tw = tag ? Math.min(2.6, 0.4 + tag.length * 0.1) : 0;
    slide.addText(t, { x: MX, y: 0.3, w: CW - tw - (tag ? 0.2 : 0), h: 0.7, fontSize: t.length > 55 ? 22 : 26, bold: true, color: C.text, fontFace: SANS, margin: 0, valign: 'middle' });
    if (tag) slide.addText(plain(tag), { x: SW - MX - tw, y: 0.45, w: tw, h: 0.38, fontSize: 11, bold: true, color: C.accentText, fill: { color: C.accentSoft }, align: 'center', valign: 'middle', fontFace: SANS, margin: 0, shape: pptx.ShapeType.roundRect, rectRadius: 0.1 });
    slide.addShape(pptx.ShapeType.rect, { x: MX, y: 1.05, w: 0.9, h: 0.05, fill: { color: C.accent }, line: { color: C.accent } });
  };

  // Slide d'ouverture du cours
  {
    const s = newSlide(null, null);
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: SH, fill: { color: C.accent }, line: { color: C.accent } });
    s.addText('🔴 OpenShift, du K8s à OCP', { x: 1, y: 2.3, w: 11, h: 1.1, fontSize: 44, bold: true, color: C.text, fontFace: SANS, margin: 0 });
    s.addText('Support de cours · on-premise · pour qui maîtrise déjà Kubernetes', { x: 1, y: 3.5, w: 11, h: 0.5, fontSize: 20, color: C.muted, fontFace: SANS, margin: 0 });
    s.addText(`${modules.length} module(s)${opts.version ? ' · v' + opts.version : ''}`, { x: 1, y: 4.2, w: 11, h: 0.4, fontSize: 14, color: C.muted, fontFace: SANS, margin: 0 });
    s.addNotes('Version PowerPoint du cours : le HTML interactif (quiz, cartes, labs à cocher) reste la source de vérité.');
  }

  for (const m of modules) {
    const nn = Number.isFinite(m.num) ? String(m.num).padStart(2, '0') : '??';
    const mtitle = m.title || m.id;
    const footer = `OpenShift — Module ${nn} · ${mtitle}`;
    const entry = { id: m.id, num: m.num, title: mtitle, file: m.__file, logical: { cover: 1, slides: m.slides.length, recap: m.takeaways && m.takeaways.length ? 1 : 0 }, exported: 0, titles: [] };
    const startTotal = manifest.total;
    const warn = msg => manifest.warnings.push(`${m.__file} : ${msg}`);

    // Couverture
    {
      const s = newSlide(null, footer), obj = m.objectives || [];
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: SH, fill: { color: C.accent }, line: { color: C.accent } });
      s.addText(m.emoji || '', { x: 1, y: 0.6, w: 1.4, h: 1.2, fontSize: 54, margin: 0, fontFace: SANS });
      s.addText(`MODULE ${nn}`, { x: 1, y: 1.85, w: 6, h: 0.35, fontSize: 14, bold: true, color: C.accentText, fontFace: SANS, margin: 0 });
      s.addText(plain(mtitle), { x: 1, y: 2.2, w: 11.4, h: 0.9, fontSize: 38, bold: true, color: C.text, fontFace: SANS, margin: 0, valign: 'middle' });
      s.addText(runs(m.tagline || '', { fontSize: 18, color: C.muted, fontFace: SANS }), { x: 1, y: 3.15, w: 11.4, h: 0.6, margin: 0, valign: 'top' });
      if (obj.length) {
        s.addText('🎯 À la fin de ce module', { x: 1, y: 3.95, w: 11, h: 0.35, fontSize: 15, bold: true, color: C.text, fontFace: SANS, margin: 0 });
        s.addText(paragraphs(obj, { fontSize: 15, color: C.text, fontFace: SANS }, { bullet: BULLET, paraSpaceAfter: 4 }), { x: 1, y: 4.35, w: 11.4, h: 2.4, margin: 0, valign: 'top' });
      }
      const quizzes = m.slides.reduce((n, sl) => n + (sl.blocks || []).filter(b => b.t === 'quiz').length, 0);
      s.addText([m.slides.length + ' slides', m.duration, quizzes ? quizzes + ' quiz' : ''].filter(Boolean).join(' · '), { x: 1, y: 6.75, w: 11, h: 0.3, fontSize: 12, color: C.muted, fontFace: SANS, margin: 0 });
      entry.titles.push('cover');
    }

    // Slides
    for (const sl of m.slides) {
      const pages = paginate(sl.blocks || [], sl.layout, warn);
      pages.forEach((pg, pi) => {
        const s = newSlide(null, footer), notes = [];
        title(s, sl.title || '', sl.tag, pi > 0);
        const ctx = { pptx, slide: s, notes, warn };
        pg.items.forEach(it => handler(it.b).draw(ctx, it.b, it.x, it.y, it.w, it.s, it.h));
        withNotes(s, notes);
        if (pi === 0) entry.titles.push(plain(sl.title || ''));
      });
    }

    // À retenir
    if (entry.logical.recap) {
      const s = newSlide(null, footer);
      title(s, '✅ À retenir');
      const qt = m.slides.reduce((n, sl) => n + (sl.blocks || []).filter(b => b.t === 'quiz').length, 0);
      const h = Math.min(BOTTOM - TOP - (qt ? 0.5 : 0), m.takeaways.length * 0.75);
      s.addText(paragraphs(m.takeaways, { fontSize: m.takeaways.length > 6 ? 16 : 18, color: C.text, fontFace: SANS }, { bullet: BULLET, paraSpaceAfter: 10 }), { x: MX, y: TOP, w: CW, h, margin: 0, valign: 'top' });
      if (qt) s.addText(`🎯 ${qt} quiz dans ce module`, { x: MX, y: BOTTOM - 0.4, w: CW, h: 0.35, fontSize: 13, color: C.muted, fontFace: SANS, margin: 0 });
      entry.titles.push('recap');
    }
    entry.exported = manifest.total - startTotal;
    manifest.modules.push(entry);
  }
  return { pptx, manifest };
}

/* ---------- CLI ---------- */
async function main() {
  const i = process.argv.indexOf('--out');
  const version = readVersion();
  const out = path.resolve(ROOT, i > -1 ? process.argv[i + 1] : `dist/openshift-course-${version}.pptx`);
  const { modules, skipped, failed } = loadModules();
  skipped.forEach(s => console.log(`info    ${s.file} ignoré : ${s.reason}`));
  if (failed.length) { failed.forEach(f => console.error(`ERREUR  ${f.file} : ${f.reason}`)); console.error('Export annulé : un module présent en fichier est inutilisable.'); process.exit(1); }
  if (!modules.length) { console.error('ERREUR  aucun module exportable.'); process.exit(1); }
  const { pptx, manifest } = buildDeck(modules, { version });
  manifest.skipped = skipped;
  manifest.failed = failed;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await pptx.writeFile({ fileName: out });
  fs.writeFileSync(out.replace(/\.pptx$/, '.manifest.json'), JSON.stringify(manifest, null, 2));
  manifest.modules.forEach(m => console.log(`ok      ${m.file} : ${m.exported} slide(s) PPTX (${m.logical.slides} logiques)`));
  manifest.warnings.forEach(w => console.warn('warn    ' + w));
  console.log(`\n${modules.length} module(s), ${manifest.total} slide(s) → ${path.relative(process.cwd(), out)}`);
}

module.exports = { loadModules, buildDeck, plain, runs, readVersion, decode };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
