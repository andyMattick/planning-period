// What runs automatically and what a person runs (owner, Nov 8, 2026: "let's leave the runner for what we see as simple
// and tell them it will be within 24 hours for bigger"). One rule, read from menu.json, for the order page (the
// turnaround it shows before Send) and for scripts/run-order.mjs (which hands a bigger order to the owner).
// docs/BACKEND.md, "What runs automatically".
//
//   PPScope.check({ subject, items, quantities, itemSpecs, tokens }, menu) → { auto, reasons: [{ code, text }] }
//
// Simple (auto) = every item has "auto": true in menu.json, the subject is in menu.automatic.subjects, no reading item,
// no item set to one version per student, at most menu.automatic.maxItems items (counting quantities) and at most
// menu.automatic.maxTokens tokens. Anything else is bigger: a person on our team runs it with the agent team.
(function (root) {
  'use strict';

  var TURNAROUND = {
    auto: 'Usually ready in under an hour: the preview comes to My orders after you answer our questions.',
    bigger: 'Ready within 24 hours: a person on our team runs bigger orders with the agent team.'
  };

  function check(order, menu) {
    order = order || {}; menu = menu || {};
    var rule = menu.automatic || {};
    var items = Array.isArray(order.items) ? order.items : [];
    var specs = order.itemSpecs || {}, qty = order.quantities || {};
    var byId = {};
    (menu.items || []).forEach(function (it) { byId[it.id] = it; });
    var subjects = rule.subjects || [];
    var reasons = [];
    var add = function (code, text) { if (!reasons.some(function (r) { return r.code === code; })) reasons.push({ code: code, text: text }); };

    if (items.some(function (id) { return specs[id] && specs[id].versions === 'student'; })) add('perStudent', 'One version per student');
    if (order.subject === 'ela' || items.indexOf('readingquiz') >= 0) add('reading', order.subject === 'ela' ? 'English / reading' : 'Reading quiz');
    else if (order.subject && subjects.indexOf(order.subject) < 0) add('subject', 'This subject');
    var other = items.filter(function (id) { return id !== 'readingquiz' && !(byId[id] && byId[id].auto === true); });
    if (other.length) add('items', other.map(function (id) { return byId[id] ? byId[id].label : id; }).join(', '));
    var count = items.reduce(function (s, id) { var q = Number(qty[id]); return s + (q >= 1 ? q : 1); }, 0);
    if (rule.maxItems && count > rule.maxItems) add('size', 'More than ' + rule.maxItems + ' items');
    var tokens = Number(order.tokens) || 0;
    if (rule.maxTokens && tokens > rule.maxTokens) add('tokens', 'More than ' + rule.maxTokens + ' tokens');
    return { auto: reasons.length === 0, reasons: reasons };
  }

  root.PPScope = { check: check, TURNAROUND: TURNAROUND };
})(typeof window !== 'undefined' ? window : globalThis);
