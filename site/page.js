// One interactive page from an order, full screen (My orders → "Open full screen" / "Download"; docs/KINDS-INTERACTIVE-FORMAT.md).
// This page loads the file itself (signed in, from private storage), so a phone that pauses the My orders tab doesn't cut
// the download short. The page runs in a sandboxed frame: its own scripts run, but it can't reach this site, its
// storage or the network (and its own Content-Security-Policy forbids requests). "Download" saves it as an .html file.
(function () {
  'use strict';
  var q = new URLSearchParams(location.search), path = q.get('p') || '', file = q.get('n') || path.split('/').pop() || 'page.html';
  var msg = document.getElementById('msg'), nameEl = document.getElementById('name'), dl = document.getElementById('dl');
  nameEl.textContent = file; document.title = file;
  function fail(text) { msg.hidden = false; msg.textContent = text; }
  // only an order's preview or final page in the deliverables bucket, and only .html
  if (!/^[0-9a-f-]{36}\/[\w.-]+\/(preview|final)\/[\w.-]+\.html$/i.test(path)) { fail('This link is not a page from your orders.'); return; }
  PPBackend.load().then(function (backend) {
    if (!backend) throw new Error('Sign in on My orders first.');
    if (!backend.user()) throw new Error('Sign in on My orders first, then open the page again.');
    return backend.signedUrl('deliverables', path, 600).then(backend.fetchBytes);
  }).then(function (bytes) {
    var f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts allow-modals allow-downloads');
    f.setAttribute('title', 'Interactive page, as a student sees it');
    f.srcdoc = new TextDecoder().decode(bytes);
    document.body.appendChild(f); msg.hidden = true;
    dl.hidden = false;
    dl.onclick = function () {   // a tap here, so phones allow the download
      var url = URL.createObjectURL(new Blob([bytes], { type: 'text/html' })), a = document.createElement('a');
      a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    };
    if (q.get('dl') === '1') dl.focus();
  }).catch(function (e) {
    var st = e && e.status ? ' (' + e.status + ')' : '';
    fail(((e && e.message) || 'This page could not be opened.') + st + ' Go back to My orders, refresh, and try again.');
  });
})();
