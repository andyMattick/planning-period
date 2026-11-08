// Every version's key in one place (owner, Nov 8, 2026: "we print out the correct number of keys"): for a document with
// several versions (A, B, C…) or one version per student (doc.pool), the teacher gets
//   <doc>-all-versions-key.pdf   every version's key, printable (preview and final), one block per version
//   <doc>-teacher-key.html       a key page for the teacher only (final only, never shared with students): she types a
//                                version letter, a 5-letter version code or a student's name and gets that version's
//                                full key on one page. One offline file, no network (the same CSP as the student page).
// The student page never holds a key (checks/interactive-format.mjs); the name-to-version rule here is the student
// page's own (page.js poolIndex), so a name gives the same version on both.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, vv, questionsOf, keyText, partsOf, hasPool, poolDocs } from './util.mjs';
import { mathHtml as mh, withMathCss, plainMath, katexCss } from './math.mjs';
import { baseCss } from './html.mjs';
import { CSP, poolSalt } from './interactive-format.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The versions a key covers: [{label, code, ver, doc}] — a pool's codes, or the document's letters.
export function keyVersions(doc) {
  if (hasPool(doc)) return poolDocs(doc).map(({ code, doc: d }) => ({ label: `Version code ${code}`, code, ver: null, doc: d }));
  return (Array.isArray(doc.versions) ? doc.versions : []).map((v) => ({ label: `Version ${v}`, code: v, ver: v, doc }));
}
// A document gets the all-versions key and the key page when it has more than one version, or one per student.
export const needsAllKeys = (doc) => questionsOf(doc).length > 0 && (hasPool(doc) || (Array.isArray(doc.versions) && doc.versions.length >= 2));

function keyRows(d, ver) {
  return questionsOf(d).map(({ q, n }) => {
    const parts = partsOf(q, ver);
    return { n, type: q.type || 'short', prompt: vv(q.prompt, ver) ?? '', key: parts.length ? '' : keyText(q, ver), why: String(vv(q.why, ver) ?? ''),
      parts: parts.map((p) => ({ label: p.label, answer: p.answer == null ? '' : String(p.answer), checklist: p.checklist, points: p.points })) };
  });
}

/* The printable key: every version, its code and each question's key (and each part's checklist). */
export function allVersionsKeyHtml(doc, ctx) {
  const vs = keyVersions(doc);
  const css = baseCss(ctx) + ` .kv { border: 1.5pt solid #000; border-radius: 3pt; padding: 5pt 8pt; margin: 0 0 9pt; break-inside: avoid; }
    .kv h2 { margin: 0 0 4pt; font-size: 12pt; border: 0; } .kv h2 .code { font-family: monospace; letter-spacing: 1.5pt; font-size: 13pt; }
    .kv table { font-size: 9.5pt; } .kv td { padding: 2pt 5pt; } .kv td.n { width: 5%; } .kv ul { margin: 1pt 0 0; padding-left: 12pt; }`;
  const body = `<div class="tbanner">TEACHER KEY · every version${hasPool(doc) ? ' (one per student)' : ''} · never hand this to students</div>
  <h1>${esc(doc.title)}: all ${vs.length} keys</h1>
  <p class="small">${hasPool(doc)
    ? `Each student's page shows a 5-letter version code at the top and on her printed answer sheet. Find that code below (or type the code or her name into ${esc('the teacher key page')}). Every version asks the same questions at the same level; only the numbers change.`
    : 'Each student copy shows its version at the top. Every version asks the same skills at the same level, question for question.'}</p>
  ${vs.map((v) => `<div class="kv"><h2>${hasPool(doc) ? `Version code <span class="code">${esc(v.code)}</span>` : esc(v.label)}</h2><table>${keyRows(v.doc, v.ver).map((r) => `<tr><td class="n">${r.n}</td><td>${r.parts.length
    ? r.parts.map((p) => `<b>(${esc(p.label)})</b> ${mh(p.answer, { bold: true })}${p.checklist.length ? `<ul>${p.checklist.map((c) => `<li>${mh(c)}</li>`).join('')}</ul>` : ''}`).join('<br>')
    : `<b>${mh(r.key, { bold: true })}</b>`}</td></tr>`).join('')}</table></div>`).join('')}`;
  return withMathCss(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}: all keys</title><style>${css}</style></head><body>${body}</body></html>`);
}

/* The teacher's key page: one offline HTML file. */
export function teacherKeyPageHtml(pack, doc, base, ctx = {}) {
  const vs = keyVersions(doc);
  const data = {
    title: String(doc.title || ''), pool: hasPool(doc), salt: hasPool(doc) ? poolSalt(pack, doc, base) : null,
    versions: vs.map((v) => ({ code: v.code, rows: keyRows(v.doc, v.ver).map((r) => ({ n: r.n, prompt: mh(r.prompt), key: r.key ? mh(r.key, { bold: true }) : '',
      why: r.why ? mh(r.why) : '', parts: r.parts.map((p) => ({ label: p.label, answer: mh(p.answer, { bold: true }), checklist: p.checklist.map((c) => mh(c)) })) })) })),
    build: `Build ${String(ctx.packHash || '').slice(0, 8)} · ${pack.id || ''}`,
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const math = json.includes('class=\\"katex') ? `<style>${katexCss()}</style>` : '';
  const engine = fs.readFileSync(path.join(HERE, 'apps/engine.js'), 'utf8');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="no-referrer"><meta name="color-scheme" content="light">
<meta name="pp-format" content="teacher-key">
<title>${esc(doc.title)}: teacher key page</title>
<style>
body { margin: 0; font: 17px/1.5 Arial, "Liberation Sans", sans-serif; color: #111; background: #fff; }
.wrap { max-width: 860px; margin: 0 auto; padding: 16px; overflow-wrap: anywhere; }
.warn { border: 3px solid #000; background: #f3f3f3; padding: 8px 10px; font-weight: 700; border-radius: 8px; }
label { display: block; font-weight: 700; margin: 14px 0 4px; } input { font: inherit; width: 100%; max-width: 26em; padding: 9px 10px; border: 2px solid #555; border-radius: 8px; box-sizing: border-box; }
.btn { font: inherit; font-weight: 700; min-height: 44px; padding: 8px 16px; border: 2px solid #000; border-radius: 8px; background: #fff; cursor: pointer; margin: 8px 8px 0 0; }
.code { font-family: monospace; letter-spacing: 2px; } ol { padding-left: 1.6em; } li { margin: 8px 0; } .why { color: #333; font-size: 15px; } .err { font-weight: 700; color: #a01b1b; }
.small { font-size: 14px; color: #333; } h2 { margin: 18px 0 4px; } :focus-visible { outline: 3px solid #c25e00; outline-offset: 2px; }
@media print { .noprint { display: none !important; } }
</style>${math}</head><body><main class="wrap">
<p class="warn">Teacher key page: it holds every answer. Keep it to yourself; never share it with students or post it with their pages.</p>
<h1>${esc(doc.title)}: keys for ${vs.length} versions</h1>
<form class="noprint" id="f" onsubmit="return false"><label for="who">${hasPool(doc) ? 'Version code (5 letters) or the student’s name as she typed it' : 'Version letter'}</label>
<input id="who" autocomplete="off" spellcheck="false"><button type="submit" class="btn" id="go">Show the key</button><button type="button" class="btn" id="pr">Print this key</button></form>
<p id="msg" role="status" aria-live="polite"></p><section id="out" aria-live="polite"></section>
<p class="small">${esc(data.build)}</p></main>
<script>window.PPA_DATA={};window.PPK_DATA=${json};</script>
<script>${engine}</script>
<script>
(function () {
  'use strict';
  var K = window.PPK_DATA, P = window.PPA;
  function normName(n) { return String(n || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function byName(name) {
    var b = P.sha256Sync(new TextEncoder().encode('PPS1|' + K.salt + '|' + normName(name)));
    return K.versions[(((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0) % K.versions.length];
  }
  function find(t) {
    var s = String(t || '').trim(); if (!s) return null;
    var up = s.toUpperCase().replace(/[^A-Z]/g, '');
    for (var i = 0; i < K.versions.length; i++) if (K.versions[i].code === up) return { v: K.versions[i], how: 'code' };
    return K.pool ? { v: byName(s), how: 'name' } : null;
  }
  function show() {
    var t = document.getElementById('who').value, r = find(t), out = document.getElementById('out'), msg = document.getElementById('msg');
    if (!r) { out.innerHTML = ''; msg.innerHTML = '<span class="err">No version ' + P.esc(t) + '.</span>'; return; }
    msg.textContent = r.how === 'name' ? 'The name “' + t.trim() + '” gives version code ' + r.v.code + '. Check that it matches the code on her sheet.' : '';
    out.innerHTML = '<h2>' + (K.pool ? 'Version code <span class="code">' + r.v.code + '</span>' : 'Version ' + r.v.code) + '</h2><ol>' + r.v.rows.map(function (q) {
      return '<li value="' + q.n + '"><div>' + q.prompt + '</div>' + (q.parts.length ? q.parts.map(function (p) {
        return '<div><b>(' + P.esc(p.label) + ')</b> ' + p.answer + (p.checklist.length ? '<ul>' + p.checklist.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      }).join('') : '<div>Key: ' + q.key + '</div>') + (q.why ? '<div class="why">Why: ' + q.why + '</div>' : '') + '</li>';
    }).join('') + '</ol>';
    out.setAttribute('data-code', r.v.code);
  }
  document.getElementById('f').addEventListener('submit', show);
  document.getElementById('pr').addEventListener('click', function () { window.print(); });
})();
</script></body></html>
`;
}
