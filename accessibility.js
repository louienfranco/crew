/* Dialog keyboard/focus behavior only; existing save/cancel controllers remain
   the source of truth. No storage, data conversion, or scheduling rules here. */
(function () {
  'use strict';
  var main = document.getElementById('mainContent');
  var overlays = Array.prototype.slice.call(document.querySelectorAll('.overlay'));
  var lastOutside = null, opener = null, openerKey = null, current = null;
  function visible(el) { return el && el.isConnected && el.getClientRects().length > 0; }
  function items(panel) {
    return Array.prototype.filter.call(panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])'), function (el) {
      return visible(el) && el.tabIndex >= 0 && !el.closest('[hidden],[inert]');
    });
  }
  document.addEventListener('focusin', function (event) {
    if (!event.target.closest('.overlay')) lastOutside = event.target;
  });
  function sync() {
    var open = overlays.filter(function (overlay) { return overlay.classList.contains('open'); });
    var next = open.length ? open[open.length - 1] : null;
    if (next && next !== current) {
      if (!current) {
        opener = next.contains(document.activeElement) ? lastOutside : document.activeElement;
        var row = opener && opener.closest('tr[data-key],tr[data-off-key]');
        openerKey = row ? (row.dataset.key || row.dataset.offKey) : null;
      }
      main.setAttribute('inert', '');
      var body = next.querySelector('.ui-dialog-body');
      if (body) body.scrollTop = 0; // every open starts at the top of the dialog
      requestAnimationFrame(function () {
        if (!next.classList.contains('open') || next.contains(document.activeElement)) return;
        var first = items(next)[0];
        if (first) first.focus();
      });
    } else if (!next && current) {
      main.removeAttribute('inert');
      var target = visible(opener) ? opener : openerKey ? document.querySelector('tr[data-key="' + CSS.escape(openerKey) + '"],tr[data-off-key="' + CSS.escape(openerKey) + '"]') : null;
      if (target && (document.activeElement === document.body || current.contains(document.activeElement))) target.focus();
      opener = null; openerKey = null;
    }
    current = next;
  }
  overlays.forEach(function (overlay) {
    new MutationObserver(sync).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    // Query the state directly so synchronous opening/closing is respected too.
    var open = overlays.filter(function (overlay) { return overlay.classList.contains('open'); });
    var active = open[open.length - 1];
    if (!active) return;
    var choices = items(active);
    if (!choices.length) return;
    var first = choices[0], last = choices[choices.length - 1];
    if (event.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  sync();
})();
