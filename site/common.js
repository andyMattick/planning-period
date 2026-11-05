// Shared by the order page and the samples gallery: loads brand.config.json and fills [data-brand] spots.
// The product name is never written in the pages; it comes from the config at runtime.
(function (root) {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.json();
    });
  }
  function loadBrand() {
    return getJSON('../brand.config.json').then(function (brand) {
      document.querySelectorAll('[data-brand]').forEach(function (el) {
        var v = brand[el.getAttribute('data-brand')];
        if (v) el.textContent = v;
      });
      var page = document.documentElement.getAttribute('data-page-title');
      document.title = (page ? page + ' · ' : '') + (brand.shortName || brand.name || '');
      return brand;
    });
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    var m = n / 1024 / 1024; return (m % 1 ? m.toFixed(1) : m) + ' MB';
  }
  root.PP = { esc: esc, getJSON: getJSON, loadBrand: loadBrand, fmtBytes: fmtBytes };
})(window);
