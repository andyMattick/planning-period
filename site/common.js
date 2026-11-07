// Shared by every page: loads brand.config.json and fills [data-brand] spots, and adds the app layer
// (service worker, phone tab bar, install prompt). One codebase for the website and the phone app.
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
      var short = brand.shortName || brand.name || '';
      document.title = (page ? page + ' · ' : '') + short;
      // The iPhone home-screen title comes from the config too.
      var m = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'apple-mobile-web-app-title'); document.head.appendChild(m); }
      m.setAttribute('content', short);
      return brand;
    });
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    var m = n / 1024 / 1024; return (m % 1 ? m.toFixed(1) : m) + ' MB';
  }
  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) { return null; }
  }

  // ---------- the app layer ----------
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('standalone');
  function phone() { return !!(window.matchMedia && matchMedia('(max-width: 640px)').matches); }

  // The app shell: one list of places, shown as a left sidebar on a computer (CSS: 960 px and wider) and as the bottom
  // tab bar on a phone (640 px or less). In between, the header's own links show. The current page is highlighted.
  var TABS = [
    { href: './', file: 'index.html', label: 'New order', tab: 'Order', icon: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5"/><path d="M12.5 11.5v6M9.5 14.5h6"/>' },
    { href: 'orders.html', file: 'orders.html', label: 'My orders', tab: 'Orders', icon: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6"/>' },
    { href: 'review.html', file: 'review.html', label: 'Review a preview', tab: 'Review', icon: '<path d="M4.5 12.5l4.5 4.5L19.5 6.5"/>' },
    { href: 'samples.html', file: 'samples.html', label: 'Sample packs', tab: 'Samples', icon: '<path d="M3.5 7.5V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9.5A1.5 1.5 0 0 0 19 8h-7l-2-2.5H5A1.5 1.5 0 0 0 3.5 7z"/>' },
    { href: 'about.html', file: 'about.html', label: 'Help and about', tab: 'About', icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>' }
  ];
  function svgIcon(path) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function links(kind) {
    var here = location.pathname.split('/').pop() || 'index.html';
    return TABS.map(function (t) {
      return '<a href="' + t.href + '"' + (t.file === here ? ' aria-current="page"' : '') + '>' + svgIcon(t.icon) +
        '<span>' + (kind === 'tab' ? t.tab : t.label) + '</span></a>';
    }).join('');
  }
  function tabBar() {
    document.body.classList.add('shell');
    // Keyboard users skip the top bar and sidebar.
    var main = document.querySelector('main');
    if (main && !document.querySelector('.skip')) {
      if (!main.id) main.id = 'main';
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      var skip = document.createElement('a');
      skip.className = 'skip'; skip.href = '#' + main.id; skip.textContent = 'Skip to the page';
      document.body.insertBefore(skip, document.body.firstChild);
    }
    var side = document.createElement('nav');
    side.className = 'sidebar'; side.setAttribute('aria-label', 'Main');
    side.innerHTML = '<div class="side-in">' + links('side') + '</div>';
    var top = document.querySelector('.top');
    if (top) top.insertAdjacentElement('afterend', side); else document.body.insertBefore(side, document.body.firstChild);
    var nav = document.createElement('nav');
    nav.className = 'tabbar'; nav.setAttribute('aria-label', 'App');
    nav.innerHTML = links('tab');
    document.body.appendChild(nav);
    // The signed-in teacher, in the top bar (backend.js calls PP.setWho when she signs in or out).
    var wrap = top && top.querySelector('.wrap');
    if (wrap && !wrap.querySelector('.who')) {
      var who = document.createElement('a');
      who.className = 'who'; who.href = 'orders.html'; who.hidden = true;
      wrap.appendChild(who);
    }
    try { var s = JSON.parse(localStorage.getItem('pp-session') || 'null'); if (s && s.user) setWho(s.user); } catch (e) {}
  }
  function setWho(u) {
    var who = document.querySelector('.top .who'); if (!who) return;
    var email = u && u.email;
    who.hidden = !email;
    if (email) {
      who.innerHTML = '<span class="avatar" aria-hidden="true">' + esc(email.charAt(0).toUpperCase()) + '</span><span class="who-text"><span class="who-label">Signed in</span> ' + esc(email) + '</span>';
      who.setAttribute('aria-label', 'Signed in as ' + email + ': my orders');
    }
  }

  // Install the app: Chrome and Android send beforeinstallprompt; iPhone and iPad Safari need Share, then Add to Home Screen.
  var deferred = null, DISMISS = 'pp-install-dismissed';
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
  var SHARE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 11v9h14v-9"/></svg>';

  function installBanner(kind) {
    if (standalone || store(DISMISS) || document.querySelector('.install') || !phone()) return;
    var box = document.createElement('div');
    box.className = 'install'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Install the app');
    box.innerHTML = '<img src="icons/icon-192.png" alt="" width="40" height="40"><div class="install-text">' +
      (kind === 'ios'
        ? '<b>Add it to your Home Screen</b><span>Tap Share <span class="share">' + SHARE_SVG + '</span> then “Add to Home Screen”.</span>'
        : '<b>Install the app</b><span>It opens like an app and works offline.</span>') +
      '</div><div class="install-actions">' + (kind === 'ios' ? '' : '<button type="button" class="btn primary" data-install>Install</button>') +
      '<button type="button" class="btn link" data-dismiss>Not now</button></div>';
    var main = document.querySelector('main');
    if (main) main.insertBefore(box, main.firstChild); else document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-dismiss]')) { store(DISMISS, '1'); box.remove(); }
      if (e.target.closest('[data-install]')) { install(); box.remove(); }
    });
  }
  function install() {
    if (!deferred) return false;
    var d = deferred; deferred = null;
    d.prompt();
    d.userChoice.then(function (c) { if (c && c.outcome !== 'accepted') store(DISMISS, '1'); }).catch(function () {});
    document.querySelectorAll('[data-install-here]').forEach(function (b) { b.hidden = true; });
    return true;
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    installBanner('prompt');
    document.querySelectorAll('[data-install-here]').forEach(function (b) { b.hidden = false; });
  });
  window.addEventListener('appinstalled', function () { store(DISMISS, '1'); var b = document.querySelector('.install'); if (b) b.remove(); });

  function startApp() {
    tabBar();
    if (isIOS && isSafari) setTimeout(function () { installBanner('ios'); }, 800);
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp); else startApp();

  root.PP = { esc: esc, getJSON: getJSON, loadBrand: loadBrand, fmtBytes: fmtBytes, store: store, install: install,
    isIOS: isIOS, isSafari: isSafari, standalone: standalone, phone: phone, setWho: setWho };
})(window);
