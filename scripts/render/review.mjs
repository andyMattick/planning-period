// REVIEW.html: the teacher's offline sign-off page that ships in the preview zip.
// It works with no network: plain HTML, inline CSS and JS, files saved with a Blob download.

import { esc, BLIND_SKIPPED_LINE, blindSkipped } from './util.mjs';
import { judgmentCalls } from './audit.mjs';

// A judgment call's first option is always "keep it as it is" (agents/reporter.md): picking any other option asks for a
// change, so it goes out with Request changes, never with an approval of the files as they are.
export const KEEP_OPTION = 0;

export const CHECKLIST = [
  'I checked the answers.',
  'The level fits my students.',
  'The wording and content are right for my class.',
  'Nothing needs a change.',
];

export const STATEMENT =
  'I have reviewed every document listed in this approval. I checked the answers, the level fits my students, ' +
  'the wording and content are right for my class, and nothing needs a change. I agree to release my files.';

// pdfs: [{file, title, sha256}] — every PDF in the preview, including the audit report, and every interactive page.
export function reviewHtml(pack, ctx, pdfs, packHash) {
  const id = pack.id || 'order';
  const docs = (pack.documents || []).map((d) => d.title);
  const calls = judgmentCalls(pack).map(({ id, where, issue, text, options, recommend, why }) => ({ id, where, issue, text, options, recommend, why }));
  const data = { orderId: id, packHash, statement: STATEMENT, documents: pdfs, docTitles: docs, judgments: calls, ...(blindSkipped(pack) ? { blindSkipped: true } : {}) };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review your pack</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f5f2; color: #111; font: 16px/1.5 Arial, "Liberation Sans", Helvetica, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 60px; }
  .brand { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #444; }
  h1 { font-size: 28px; margin: 6px 0 4px; }
  h2 { font-size: 19px; margin: 26px 0 8px; }
  .card { background: #fff; border: 1.5px solid #222; border-radius: 8px; padding: 14px 16px; margin: 10px 0; }
  .files a { color: #0b4a8b; font-weight: 700; }
  .files li { margin: 4px 0; }
  .hash { font: 11px/1.3 monospace; color: #555; word-break: break-all; }
  label.check { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; font-size: 17px; cursor: pointer; }
  label.check input { width: 22px; height: 22px; margin-top: 2px; flex: none; }
  textarea { width: 100%; min-height: 80px; font: inherit; padding: 8px; border: 1.5px solid #666; border-radius: 6px; }
  input[type=text] { width: 100%; font: inherit; padding: 9px; border: 1.5px solid #666; border-radius: 6px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
  button { font: inherit; font-weight: 700; padding: 12px 18px; border-radius: 8px; border: 2px solid #111; cursor: pointer; background: #fff; color: #111; }
  button.agree { background: #111; color: #fff; }
  button:disabled { background: #ddd; color: #777; border-color: #aaa; cursor: not-allowed; }
  .statement { border-left: 4px solid #111; padding: 6px 12px; background: #fff; }
  .msg { margin-top: 12px; font-weight: 700; min-height: 1.5em; }
  .why { font-size: 14px; color: #333; }
  .jc fieldset { border: 0; padding: 0; margin: 6px 0 0; }
  .jc label { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; cursor: pointer; }
  .jc input { width: 20px; height: 20px; margin-top: 2px; flex: none; }
  .pick { font-size: 12px; font-weight: 700; border: 1.5px solid #111; border-radius: 10px; padding: 0 7px; margin-left: 6px; white-space: nowrap; }
</style></head><body><main>
<div class="brand">${esc(ctx.brand.name)} · Preview for your OK</div>
<h1>Review your pack before it is released</h1>
<p>${esc([pack.order?.topic, pack.order?.grade && `grade ${pack.order.grade}`, pack.order?.teacher && `for ${pack.order.teacher}`].filter(Boolean).join(' · '))} · order ${esc(id)}</p>
${blindSkipped(pack) ? `<div class="card" style="border-color:#8a5a00;background:#fff6e0"><b>${esc(BLIND_SKIPPED_LINE)}</b></div>
` : ''}<div class="card"><b>Nothing is released until you agree.</b> These preview files are watermarked (PDFs, and any interactive page, which opens in your browser: try it as a student would) and there are no Word or PowerPoint files yet. Read every page, then tick the boxes below. If anything needs a change, write it in the comments and press <b>Request changes</b>.</div>

<h2>1. Read the preview files</h2>
<div class="card files"><ul>${pdfs.map((p) => `<li><a href="${esc(p.file)}" target="_blank">${esc(p.file)}</a> · ${esc(p.title)}</li>`).join('')}</ul>
<p class="why">${esc(ctx.brand.aiNotice)}</p></div>

<h2>2. Comments on each document</h2>
${docs.map((t, i) => `<div class="card"><label for="c${i}"><b>${esc(t)}</b></label><textarea id="c${i}" data-title="${esc(t)}" placeholder="What should change? (question numbers help)"></textarea></div>`).join('')}

${calls.length ? `<h2>Your decisions</h2>
<p class="why">These are matters of your style, so the checkers left them for you. Our pick is chosen; tap another to change it. Keeping a question as it is lets you approve; any other choice goes to us with <b>Request changes</b>, and the next round makes it.</p>
${calls.map((c) => `<div class="card jc"><b>${esc(c.where)}.</b> ${esc(c.issue)}${c.options.length ? `<fieldset><legend class="why">${c.why ? `Why we suggest it: ${esc(c.why)}` : 'Choose one'}</legend>${c.options.map((o, i) => `<label><input type="radio" name="${esc(c.id)}" value="${i}"${i === c.recommend ? ' checked' : ''}> <span>${esc(o)}${i === c.recommend ? '<span class="pick">our pick</span>' : ''}</span></label>`).join('')}</fieldset>` : `<p class="why">${esc(c.text)} Write your choice in the comments above.</p>`}</div>`).join('')}` : ''}

<h2>3. Sign off</h2>
<div class="card">
${CHECKLIST.map((c, i) => `<label class="check"><input type="checkbox" id="k${i}"> <span>${esc(c)}</span></label>`).join('')}
<p><label for="name"><b>Type your name</b></label><br><input type="text" id="name" autocomplete="name"></p>
<p class="statement" id="statement"></p>
<div class="row"><button id="changes" type="button">Request changes</button><button id="agree" class="agree" type="button" disabled>I agree — release my files</button></div>
<div class="msg" id="msg" role="status"></div>
<p class="why">Each button saves a small file to your computer. Send it back with your order: <b>approval-${esc(id)}.json</b> releases your files; <b>comments-${esc(id)}.json</b> asks for changes.</p>
</div>
</main>
<script>
(function () {
  var D = ${json};
  var boxes = [].slice.call(document.querySelectorAll('input[type=checkbox]'));
  var name = document.getElementById('name');
  var agree = document.getElementById('agree');
  var msg = document.getElementById('msg');
  document.getElementById('statement').textContent = D.statement;
  function picks() {
    var p = {};
    (D.judgments || []).forEach(function (c) { var r = document.querySelector('input[name="' + c.id + '"]:checked'); if (r) p[c.id] = Number(r.value); });
    return p;
  }
  function changePicks() { var p = picks(); return (D.judgments || []).filter(function (c) { return c.options.length && p[c.id] != null && p[c.id] !== ${KEEP_OPTION}; }); }
  function decisions() {
    var p = picks();
    return (D.judgments || []).filter(function (c) { return c.options.length && p[c.id] != null; }).map(function (c) {
      return { id: c.id, where: c.where, choice: c.options[p[c.id]], option: p[c.id], recommended: c.recommend, change: p[c.id] !== ${KEEP_OPTION} };
    });
  }
  function decisionsComment() {
    var d = changePicks(), p = picks();
    return d.length ? { title: 'Your decisions', comment: d.map(function (c) { return c.where + ': ' + c.options[p[c.id]]; }).join(' · ') } : null;
  }
  function ready() { return boxes.every(function (b) { return b.checked; }) && name.value.trim().length > 1 && !changePicks().length; }
  function update() { agree.disabled = !ready(); }
  boxes.forEach(function (b) { b.addEventListener('change', update); });
  name.addEventListener('input', update);
  [].slice.call(document.querySelectorAll('.jc input[type=radio]')).forEach(function (r) { r.addEventListener('change', function () { update(); msg.textContent = changePicks().length ? 'One of your decisions asks for a change: press Request changes to send it.' : ''; }); });
  function comments() {
    return [].slice.call(document.querySelectorAll('textarea')).map(function (t) { return { title: t.getAttribute('data-title'), comment: t.value.trim() }; });
  }
  function save(file, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2) + '\\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  document.getElementById('changes').addEventListener('click', function () {
    var c = comments(), dc = decisionsComment();
    if (dc) c.push(dc);
    if (!c.some(function (x) { return x.comment; })) { msg.textContent = 'Write at least one comment first.'; return; }
    save('comments-' + D.orderId + '.json', { orderId: D.orderId, name: name.value.trim(), date: new Date().toISOString(), packHash: D.packHash,
      checklist: boxes.map(function (b, i) { return { item: b.parentNode.textContent.trim(), checked: b.checked }; }), comments: c, judgments: decisions() });
    msg.textContent = 'Saved comments-' + D.orderId + '.json. Send it back and we will make the changes and send a new preview.';
  });
  agree.addEventListener('click', function () {
    if (!ready()) return;
    save('approval-' + D.orderId + '.json', { orderId: D.orderId, name: name.value.trim(), date: new Date().toISOString(), statement: D.statement,
      packHash: D.packHash, documents: D.documents, judgments: decisions() });
    msg.textContent = 'Saved approval-' + D.orderId + '.json. Send it back and your files will be released.';
  });
})();
</script></body></html>`;
}
