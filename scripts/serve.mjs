// A tiny static server for the repo root. Run: npm run serve (PORT env, default 4321).
// Open http://localhost:4321/ for the order page. Directories list their files (JSON when asked for JSON).
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, normalize, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/') { res.writeHead(302, { Location: '/site/' }); return res.end(); }
    let rel = decodeURIComponent(url.pathname);
    const file = normalize(join(ROOT, rel));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403); return res.end('Forbidden'); }
    if (rel.split('/').some((p) => p.startsWith('.') && p.length > 1)) { res.writeHead(404); return res.end('Not found'); }
    let path = file, info = await stat(path);
    if (info.isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' + url.search }); return res.end(); }
      const index = join(path, 'index.html');
      const hasIndex = await stat(index).then((s) => s.isFile(), () => false);
      if (hasIndex && !(req.headers.accept || '').includes('application/json')) { path = index; info = await stat(path); }
      else {
        const names = (await readdir(path, { withFileTypes: true }))
          .filter((d) => !d.name.startsWith('.'))
          .map((d) => d.name + (d.isDirectory() ? '/' : '')).sort();
        if ((req.headers.accept || '').includes('application/json')) {
          res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
          return res.end(JSON.stringify(names));
        }
        res.writeHead(200, { 'Content-Type': TYPES['.html'] });
        return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(rel)}</title><style>body{font:16px system-ui,sans-serif;margin:1.5rem;line-height:1.7}</style>
<h1 style="font-size:1.2rem">${esc(rel)}</h1><ul>${names.map((n) => `<li><a href="${esc(encodeURIComponent(n.replace(/\/$/, '')) + (n.endsWith('/') ? '/' : ''))}">${esc(n)}</a></li>`).join('')}</ul>`);
      }
    }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (e) {
    res.writeHead(e && e.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(e && e.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}/  (order page: /site/, samples: /site/samples.html)`));
