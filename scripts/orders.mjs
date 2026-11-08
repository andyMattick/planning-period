#!/usr/bin/env node
// The owner's side of online orders (docs/BACKEND.md, docs/RUNBOOK.md), until the automatic runner (roadmap C).
// Uses the Supabase project's service (secret) key from the environment. Never commit it, never put it on the site.
//   export PP_SUPABASE_URL=https://<project>.supabase.co
//   export PP_SUPABASE_SERVICE_KEY=<the service_role or sb_secret_ key>        (e.g. in ~/.pp-owner.env, chmod 600)
//
//   node scripts/orders.mjs list [status]                 orders by status (newest first)
//   node scripts/orders.mjs pull <id>                     the order + her uploads into ~/pp-work/<id>/in/ (runbook layout)
//   node scripts/orders.mjs follow-up <id> <FOLLOW-UP.md> posts the onboarding follow-up (questions from onboarding.json
//                                                         next to it) → needs_answer (no questions: building)
//   node scripts/orders.mjs answer <id>                   her answer → ~/pp-work/<id>/followup-answer.md
//   node scripts/orders.mjs preview <id>                  uploads out-preview/ (+ preview.zip) → preview_ready
//   node scripts/orders.mjs approval <id>                 her approval → approval.json (or her comments → comments-<id>.json)
//   node scripts/orders.mjs final <id>                    uploads out/ + out.zip → final_ready (only after her approval)
//   node scripts/orders.mjs purge <id> [--finals]         deletes her uploads and the preview files (CLAUDE.md rule 1)
//   node scripts/orders.mjs purge --due [days]            the same for every order the database says is due (default 7 days)
//   node scripts/orders.mjs status <id> <status> [note]   sets a status by hand (onboarding, building, failed…) with a note she sees
//   node scripts/orders.mjs show <id>                     the order's row as JSON (status, teacher, tokens, order.json; for scripts)
//   node scripts/orders.mjs style-get <id>                her style notes (if any) → ~/pp-work/<id>/style.md
//   node scripts/orders.mjs style-put <id> <style.md>     keeps her style notes for her own agents (deliverables/<teacher>/style/)
//   node scripts/orders.mjs style-forget <teacher id>     deletes her style notes (CLAUDE.md rule 1: deletable anytime)
//   node scripts/orders.mjs work-put <id> <file…>         keeps working files of a stopped run (deliverables/<teacher>/<id>/work/)
//   node scripts/orders.mjs work-get <id>                 those files → ~/pp-work/<id>/work/ (purge deletes them)
// Options: --work <dir> (default ~/pp-work/<id>), PP_WORK_ROOT (default ~/pp-work).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, basename, resolve } from 'node:path';
import { homedir } from 'node:os';

const STATUSES = ['draft', 'sent', 'onboarding', 'needs_answer', 'building', 'preview_ready', 'changes_requested', 'approved', 'final_ready', 'cancelled', 'failed'];
const TYPES = { '.pdf': 'application/pdf', '.zip': 'application/zip', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/plain; charset=utf-8', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.png': 'image/png', '.svg': 'image/svg+xml' };

class Fail extends Error {}
const die = (m) => { throw new Fail(m); };

function env() {
  const url = (process.env.PP_SUPABASE_URL || '').replace(/\/+$/, ''), key = process.env.PP_SUPABASE_SERVICE_KEY || '';
  if (!url || !key) die('Set PP_SUPABASE_URL and PP_SUPABASE_SERVICE_KEY first (docs/BACKEND.md, "The owner\'s computer").');
  return { url, key };
}
function api() {
  const { url, key } = env();
  const headers = (extra = {}) => ({ apikey: key, ...(/^eyJ/.test(key) ? { Authorization: `Bearer ${key}` } : {}), ...extra });
  async function call(method, path, body, extra = {}) {
    const opts = { method, headers: headers(extra) };
    if (body !== undefined) {
      if (Buffer.isBuffer(body) || body instanceof Uint8Array) opts.body = body;
      else { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    }
    const res = await fetch(url + path, opts);
    if (!res.ok) {
      const t = await res.text(); let m = t; try { const j = JSON.parse(t); m = j.message || j.error || t; } catch {}
      die(`${method} ${path.split('?')[0]}: ${res.status} ${m}`);
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (/json/.test(ct)) { const t = await res.text(); return t ? JSON.parse(t) : null; }
    return Buffer.from(await res.arrayBuffer());
  }
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  return {
    select: (table, q) => call('GET', `/rest/v1/${table}?${q}`),
    update: (table, q, patch) => call('PATCH', `/rest/v1/${table}?${q}`, patch, { Prefer: 'return=minimal' }),
    rpc: (fn, args) => call('POST', `/rest/v1/rpc/${fn}`, args || {}),
    download: (bucket, path) => call('GET', `/storage/v1/object/${bucket}/${enc(path)}`),
    upload: (bucket, path, buf, type) => call('POST', `/storage/v1/object/${bucket}/${enc(path)}`, buf, { 'Content-Type': type || 'application/octet-stream', 'x-upsert': 'true' }),
    remove: (bucket, paths) => paths.length ? call('DELETE', `/storage/v1/object/${bucket}`, { prefixes: paths }) : [],
    // Every file under a folder (the Storage API lists one level at a time; folders come back with id null).
    async listAll(bucket, prefix) {
      const out = [];
      const walk = async (p) => {
        for (let offset = 0; ; offset += 1000) {
          const rows = await call('POST', `/storage/v1/object/list/${bucket}`, { prefix: p, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) || [];
          for (const r of rows) { const full = (p ? p.replace(/\/?$/, '/') : '') + r.name; if (r.id == null) await walk(full); else out.push(full); }
          if (rows.length < 1000) break;
        }
      };
      await walk(prefix.replace(/\/+$/, ''));
      return out;
    },
  };
}

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const workOpt = opt('--work');
const workOf = (id) => resolve(workOpt || join(process.env.PP_WORK_ROOT || join(homedir(), 'pp-work'), id));
const safeId = (id) => { if (!/^pp-\d{4}-\d{2}-\d{2}-[a-z0-9]{6}$/.test(id || '')) die(`"${id}" is not an order id (pp-YYYY-MM-DD-xxxxxx)`); return id; };
const typeOf = (f) => TYPES[(f.match(/\.[^.]+$/) || [''])[0].toLowerCase()] || 'application/octet-stream';
const filesIn = (dir) => readdirSync(dir, { recursive: true }).map(String).filter((f) => statSync(join(dir, f)).isFile()).sort();

async function getOrder(db, id) {
  const rows = await db.select('orders', `select=*&id=eq.${encodeURIComponent(safeId(id))}`);
  if (!rows || !rows.length) die(`no order ${id}`);
  return rows[0];
}
async function setStatus(db, id, status, patch = {}) {
  await db.update('orders', `id=eq.${encodeURIComponent(id)}`, { ...patch, status });
}

const commands = {
  async list(db, status) {
    if (status && !STATUSES.includes(status)) die(`status must be one of ${STATUSES.join(', ')}`);
    const rows = await db.select('orders', `select=id,status,created_at,updated_at,token_total,order_json,teacher${status ? `&status=eq.${status}` : ''}&order=created_at.desc`) || [];
    const teachers = Object.fromEntries((await db.select('teachers', 'select=id,email') || []).map((t) => [t.id, t.email]));
    if (!rows.length) return console.log(status ? `No orders with status ${status}.` : 'No orders yet.');
    const by = {};
    for (const r of rows) (by[r.status] ||= []).push(r);
    for (const s of STATUSES.filter((s) => by[s])) {
      console.log(`\n${s} (${by[s].length})`);
      for (const r of by[s]) {
        const o = r.order_json?.order || {};
        console.log(`  ${r.id}  ${String(r.created_at).slice(0, 16).replace('T', ' ')}  ${String(r.token_total).padStart(4)} tokens  ` +
          `g${o.grade || '?'} ${o.subject || '?'}: ${o.topic || ''} [${(o.items || []).join(', ')}]  ${teachers[r.teacher] || r.teacher}`);
      }
    }
  },

  async pull(db, id) {
    const o = await getOrder(db, id), work = workOf(id), inDir = join(work, 'in');
    mkdirSync(join(inDir, 'sources'), { recursive: true }); mkdirSync(join(inDir, 'training'), { recursive: true });
    writeFileSync(join(inDir, 'order.json'), JSON.stringify(o.order_json, null, 2) + '\n');
    const prefix = `${o.teacher}/${o.id}/`;
    let n = 0;
    for (const p of o.upload_files || []) {
      if (!p.startsWith(prefix)) die(`upload ${p} is outside ${prefix}`);
      const rel = p.slice(prefix.length);
      if (!/^(sources|training)\/[^/]+$/.test(rel)) die(`unexpected upload path ${p}`);
      writeFileSync(join(inDir, rel), await db.download('uploads', p)); n++;
    }
    if (o.answer) writeAnswer(o, work);
    const fu = o.follow_up || {};
    if (fu.onboarding && !existsSync(join(work, 'onboarding.json'))) writeFileSync(join(work, 'onboarding.json'), JSON.stringify(fu.onboarding, null, 2) + '\n');
    if (fu.runLog && !existsSync(join(work, 'run-log.jsonl'))) writeFileSync(join(work, 'run-log.jsonl'), fu.runLog.map((r) => JSON.stringify(r)).join('\n') + '\n');
    if (fu.message && !existsSync(join(work, 'FOLLOW-UP.md'))) writeFileSync(join(work, 'FOLLOW-UP.md'), fu.message);
    if (o.status === 'sent') await setStatus(db, id, 'onboarding');
    console.log(`Pulled ${id} into ${work}/in (order.json and ${n} file${n === 1 ? '' : 's'}; untrusted: never run anything in it).` +
      (o.status === 'sent' ? ' Status: onboarding.' : ` Status stays ${o.status}.`) + `\nNext: the onboarding agent (docs/RUNBOOK.md step 2).`);
  },

  async 'follow-up'(db, id, file) {
    if (!file || !existsSync(file)) die('usage: follow-up <id> <FOLLOW-UP.md> (onboarding.json next to it gives the one-tap questions)');
    const o = await getOrder(db, id);
    if (!['sent', 'onboarding', 'needs_answer', 'building'].includes(o.status)) die(`${id} is ${o.status}; a follow-up goes out before building`);
    const message = readFileSync(file, 'utf8');
    const ob = join(dirname(resolve(file)), 'onboarding.json');
    let questions = [], onboarding = null;
    if (existsSync(ob)) {
      const j = JSON.parse(readFileSync(ob, 'utf8')); onboarding = j;
      questions = (j.questions || []).slice(0, 3).map((q, i) => ({ id: q.id || `q${i + 1}`, ask: q.ask, options: q.options || [], recommended: q.recommended || '', why: q.why || '' }));
    } else console.log(`(no ${ob}: the follow-up goes out as text with a "Go" button only)`);
    const status = questions.length ? 'needs_answer' : 'building';
    // onboarding.json and the run's log so far ride along in the order row (the teacher can read her row but never change it),
    // so the build, maybe on another machine (the runner), starts from exactly what was measured and asked
    const logFile = join(dirname(resolve(file)), 'run-log.jsonl');
    const runLog = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : null;
    await setStatus(db, id, status, { follow_up: { message, questions, at: new Date().toISOString(), ...(onboarding ? { onboarding } : {}), ...(runLog ? { runLog } : {}) },
      answer: null, answers: null, answered_at: null });
    console.log(`Posted the follow-up for ${id} (${questions.length} question${questions.length === 1 ? '' : 's'}). Status: ${status}.`);
  },

  async answer(db, id) {
    const o = await getOrder(db, id);
    if (!o.answer) die(`${id} has no answer yet (status ${o.status})`);
    console.log(`Wrote ${writeAnswer(o, workOf(id))}`);
  },

  async preview(db, id) {
    const o = await getOrder(db, id), work = workOf(id), dir = join(work, 'out-preview');
    if (!existsSync(dir)) die(`${dir} is missing: render the preview first (render-pack.mjs "${work}" --preview)`);
    const reviewFile = join(dir, 'REVIEW.html');
    const m = existsSync(reviewFile) && readFileSync(reviewFile, 'utf8').match(/var D = (\{.*\});/);
    if (!m) die(`${reviewFile} has no review data: render the preview again`);
    const D = JSON.parse(m[1]);
    if (D.orderId !== id) die(`the preview is for "${D.orderId}", not ${id}: set pack.json's id to the order id and render again`);
    // every PDF and interactive page she reviews (docs/KINDS-INTERACTIVE-FORMAT.md); REVIEW.html is only in the zip
    const pdfs = readdirSync(dir).filter((f) => f.endsWith('.pdf') || (f.endsWith('.html') && f !== 'REVIEW.html')).sort();
    const listed = (D.documents || []).map((d) => d.file).sort();
    if (JSON.stringify(pdfs) !== JSON.stringify(listed)) die('out-preview/ PDFs and pages differ from the ones REVIEW.html lists: render the preview again');
    const base = `${o.teacher}/${o.id}/`;
    await db.remove('deliverables', (await db.listAll('deliverables', base + 'preview')));   // an older preview goes
    const up = [];
    // an interactive page goes up as text/plain (storage never serves it as a live page); My orders shows it in a sandboxed frame
    for (const f of pdfs) { await db.upload('deliverables', `${base}preview/${f}`, readFileSync(join(dir, f)), f.endsWith('.html') ? TYPES['.html'] : 'application/pdf'); up.push(`preview/${f}`); }
    const zip = join(work, 'preview.zip');
    if (existsSync(zip)) { await db.upload('deliverables', `${base}preview/preview.zip`, readFileSync(zip), 'application/zip'); up.push('preview/preview.zip'); }
    await setStatus(db, id, 'preview_ready', { review: { packHash: D.packHash, statement: D.statement, documents: D.documents, docTitles: D.docTitles || [] },
      preview_files: up, approval: null });
    console.log(`Uploaded ${up.length} preview file${up.length === 1 ? '' : 's'} for ${id}. Status: preview_ready (she reviews it in My orders).`);
  },

  async approval(db, id) {
    const o = await getOrder(db, id), work = workOf(id);
    mkdirSync(work, { recursive: true });
    if (o.status === 'approved' || (o.approval && o.status === 'final_ready')) {
      writeFileSync(join(work, 'approval.json'), JSON.stringify(o.approval, null, 2) + '\n');
      console.log(`Wrote ${join(work, 'approval.json')} (approved by ${o.approval.name} on ${String(o.approval.date).slice(0, 10)}).\nNext: render-pack.mjs "${work}" --final`);
    } else if (o.status === 'changes_requested' && o.comments) {
      const f = join(work, `comments-${id}.json`);
      writeFileSync(f, JSON.stringify(o.comments, null, 2) + '\n');
      console.log(`${id}: she asked for changes. Wrote ${f}.\nNext: docs/RUNBOOK.md step 11 (comments, a maker round, a fresh recheck, a new preview).`);
    } else die(`${id} is ${o.status}: no approval or comments yet`);
  },

  async final(db, id) {
    const o = await getOrder(db, id), work = workOf(id), dir = join(work, 'out');
    if (o.status !== 'approved') die(`${id} is ${o.status}: the final goes out only after she approves (CLAUDE.md rule 7)`);
    if (!existsSync(join(work, 'approval.json'))) die(`${work}/approval.json is missing: run "approval ${id}" and render-pack.mjs --final first`);
    if (!existsSync(dir)) die(`${dir} is missing: render-pack.mjs "${work}" --final`);
    const base = `${o.teacher}/${o.id}/`, up = [];
    for (const f of filesIn(dir)) { await db.upload('deliverables', `${base}final/${f}`, readFileSync(join(dir, f)), typeOf(f)); up.push(`final/${f}`); }
    const zip = existsSync(join(work, 'out.zip')) ? join(work, 'out.zip') : null;
    if (zip) { await db.upload('deliverables', `${base}final/out.zip`, readFileSync(zip), 'application/zip'); up.unshift('final/out.zip'); }
    else console.log('(no out.zip: she gets the files one by one)');
    await setStatus(db, id, 'final_ready', { final_files: up });
    console.log(`Uploaded ${up.length} final file${up.length === 1 ? '' : 's'} for ${id}. Status: final_ready.\nWhen she has them: purge ${id} (and delete ${work}).`);
  },

  async purge(db, id, days) {
    if (id === '--due') {
      const due = await db.rpc('orders_due_for_purge', { p_days: Number(days) || 7 }) || [];
      if (!due.length) return console.log('Nothing is due for deletion.');
      for (const d of due) await purgeOne(db, d.id, false);
      return;
    }
    await purgeOne(db, id, finals);
  },

  async show(db, id) {
    const o = await getOrder(db, id);
    console.log(JSON.stringify({ id: o.id, status: o.status, teacher: o.teacher, token_total: o.token_total, note: o.note || null,
      order_json: o.order_json, upload_files: o.upload_files || [], answered: !!o.answer, follow_up_at: o.follow_up?.at || null }));
  },

  async 'style-get'(db, id) {
    const o = await getOrder(db, id), work = workOf(id), path = `${o.teacher}/style/style.md`;
    mkdirSync(work, { recursive: true });
    if (!(await db.listAll('deliverables', `${o.teacher}/style`)).includes(path)) return console.log(`No style notes kept for ${o.teacher} yet.`);
    writeFileSync(join(work, 'style.md'), await db.download('deliverables', path));
    console.log(`Wrote ${join(work, 'style.md')} (her style notes: for her own agents only).`);
  },

  async 'style-put'(db, id, file) {
    if (!file || !existsSync(file)) die('usage: style-put <id> <style.md>');
    const o = await getOrder(db, id);
    await db.upload('deliverables', `${o.teacher}/style/style.md`, readFileSync(file), 'text/plain; charset=utf-8');
    console.log(`Kept the style notes for ${o.teacher} (deliverables/${o.teacher}/style/style.md; style-forget deletes them).`);
  },

  async 'style-forget'(db, teacher) {
    if (!/^[0-9a-f-]{36}$/i.test(teacher || '')) die('usage: style-forget <teacher id> (her account id, the order\'s teacher)');
    const files = await db.listAll('deliverables', `${teacher}/style`);
    await db.remove('deliverables', files);
    console.log(`Deleted ${files.length} style file${files.length === 1 ? '' : 's'} for ${teacher}. Also delete ~/pp-styles/${teacher} if it exists.`);
  },

  async 'work-put'(db, id, ...files) {
    if (!files.length) die('usage: work-put <id> <file…>');
    const o = await getOrder(db, id);
    for (const f of files) await db.upload('deliverables', `${o.teacher}/${o.id}/work/${basename(f)}`, readFileSync(f), typeOf(f));
    console.log(`Kept ${files.length} working file${files.length === 1 ? '' : 's'} for ${id} (purge deletes them).`);
  },

  async 'work-get'(db, id) {
    const o = await getOrder(db, id), dir = join(workOf(id), 'work'), base = `${o.teacher}/${o.id}/work/`;
    mkdirSync(dir, { recursive: true });
    const files = await db.listAll('deliverables', base.slice(0, -1));
    for (const p of files) writeFileSync(join(dir, p.slice(base.length).replace(/\//g, '_')), await db.download('deliverables', p));
    console.log(`Wrote ${files.length} file${files.length === 1 ? '' : 's'} to ${dir}.`);
  },

  async status(db, id, status, ...note) {
    if (!STATUSES.includes(status)) die(`status must be one of ${STATUSES.join(', ')}`);
    await getOrder(db, id);
    await setStatus(db, id, status, note.length ? { note: note.join(' ') } : {});
    console.log(`${id}: status ${status}${note.length ? ` (note: ${note.join(' ')})` : ''}.`);
  },
};
const finals = flag('--finals');

function writeAnswer(o, work) {
  mkdirSync(work, { recursive: true });
  const f = join(work, 'followup-answer.md');
  const lines = [`Answer from the teacher (My orders, ${String(o.answered_at || '').slice(0, 16).replace('T', ' ')}), in her words:`, '', o.answer || ''];
  if (o.answers && Object.keys(o.answers).length) {
    lines.push('', 'One-tap answers:');
    const qs = (o.follow_up && o.follow_up.questions) || [];
    for (const [k, v] of Object.entries(o.answers)) { const q = qs.find((x) => x.id === k); lines.push(`- ${k}${q ? ` (${q.ask})` : ''}: ${v}`); }
  }
  writeFileSync(f, lines.join('\n') + '\n');
  return f;
}

async function purgeOne(db, id, alsoFinals) {
  const o = await getOrder(db, id), base = `${o.teacher}/${o.id}/`;
  const uploads = await db.listAll('uploads', base);
  const previews = [...await db.listAll('deliverables', base + 'preview'), ...await db.listAll('deliverables', base + 'work')];
  const fin = alsoFinals ? await db.listAll('deliverables', base + 'final') : [];
  await db.remove('uploads', uploads); await db.remove('deliverables', [...previews, ...fin]);
  await db.update('orders', `id=eq.${encodeURIComponent(id)}`, { uploads_purged_at: new Date().toISOString(), ...(alsoFinals ? { final_files: [] } : {}) });
  console.log(`${id}: deleted ${uploads.length} upload${uploads.length === 1 ? '' : 's'} and ${previews.length} preview file${previews.length === 1 ? '' : 's'}` +
    (alsoFinals ? ` and ${fin.length} final file${fin.length === 1 ? '' : 's'}` : ' (final files kept for her to download; --finals deletes them)') + '.');
  if (existsSync(workOf(id))) console.log(`Your working copy is still at ${workOf(id)}: delete it (docs/RUNBOOK.md step 13).`);
}

const [cmd, ...rest] = args;
if (!cmd || !commands[cmd]) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//   node') || l.startsWith('//   export') || l.startsWith('// Options')).map((l) => l.slice(3)).join('\n'));
  process.exit(cmd ? 2 : 0);
}
try {
  await commands[cmd](api(), ...rest);
} catch (e) {
  if (e instanceof Fail) { console.error(`orders: ${e.message}`); process.exit(1); }
  throw e;
}
