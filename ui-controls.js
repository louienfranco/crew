/* Custom UI controls mirrored from the main app (src/):
   - date picker that wraps a hidden native date input
   - dropdown that wraps a hidden native select (single-select listbox)
   Both keep the native element as the single source of truth and emit the same
   events (input/change) that existing app logic already listens for.
   Everything is delegated and cleaned up on re-render, so no listener leaks. */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var open = null;   // { wrap, panel, btn, input, kind }
  var HIDDEN = 'ui-native-control';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(paths, size) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', size || 14);
    s.setAttribute('height', size || 14);
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }
  function parseIso(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function dateLabel(v) {
    var p = parseIso(v);
    if (!p) return 'Pick a date';
    try { return new Date(p.y, p.m - 1, p.d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return v; }
  }

  /* ===== panel placement (shared by both widgets) ===== */
  function close(focusBack) {
    if (!open) return;
    var state = open;
    open = null;
    if (state.panel && state.panel.parentNode) state.panel.parentNode.removeChild(state.panel);
    if (state.btn) {
      state.btn.setAttribute('aria-expanded', 'false');
      state.btn.removeAttribute('aria-controls');
      if (focusBack) state.btn.focus();
    }
    document.removeEventListener('mousedown', onOutside, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onResize, true);
    document.removeEventListener('keydown', onEscape, true);
  }
  function onOutside(e) { if (open && !open.wrap.contains(e.target) && !open.panel.contains(e.target)) close(false); }
  function onResize() { close(false); }
  function onEscape(e) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  }
  function place(wrapEl, btn, panel, width) {
    (wrapEl.closest('.ui-dialog-panel') || document.body).appendChild(panel);
    var r = btn.getBoundingClientRect();
    var w = Math.min(width || r.width, window.innerWidth - 16);
    panel.style.width = w + 'px';
    var height = Math.min(panel.scrollHeight, 320);
    var below = Math.max(0, window.innerHeight - r.bottom - 8);
    var above = Math.max(0, r.top - 8);
    var down = below >= height || below >= above;
    var available = down ? below : above;
    panel.style.maxHeight = available + 'px';
    panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    panel.style.top = Math.max(8, down ? r.bottom + 4 : r.top - Math.min(height, available) - 4) + 'px';
  }
  function begin(wrapEl, btn, panel, width, kind) {
    close(false);
    open = { wrap: wrapEl, panel: panel, btn: btn, kind: kind };
    place(wrapEl, btn, panel, width);
    btn.setAttribute('aria-expanded', 'true');
    if (panel.id) btn.setAttribute('aria-controls', panel.id);
    document.addEventListener('mousedown', onOutside, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    document.addEventListener('keydown', onEscape, true);
  }

  /* ===== date picker ===== */
  function drawCalendar(panel, input, view) {
    panel.innerHTML = '';
    var sel = parseIso(input.value);
    var now = new Date();
    var min = parseIso(input.min);
    var head = document.createElement('div');
    head.className = 'ui-cal-head';
    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'ui-cal-nav';
    prev.setAttribute('aria-label', 'Previous month');
    prev.appendChild(icon(['m15 18-6-6 6-6']));
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'ui-cal-nav';
    next.setAttribute('aria-label', 'Next month');
    next.appendChild(icon(['m9 18 6-6-6-6']));
    var title = document.createElement('span');
    title.className = 'ui-cal-title';
    title.textContent = MONTHS[view.m - 1] + ' ' + view.y;
    head.appendChild(prev); head.appendChild(title); head.appendChild(next);
    panel.appendChild(head);
    prev.addEventListener('click', function () { view.m--; if (view.m < 1) { view.m = 12; view.y--; } drawCalendar(panel, input, view); });
    next.addEventListener('click', function () { view.m++; if (view.m > 12) { view.m = 1; view.y++; } drawCalendar(panel, input, view); });

    var grid = document.createElement('div');
    grid.className = 'ui-cal-grid';
    WEEK.forEach(function (w) {
      var s = document.createElement('span');
      s.className = 'ui-cal-week';
      s.textContent = w;
      grid.appendChild(s);
    });
    var first = new Date(view.y, view.m - 1, 1).getDay();
    var days = new Date(view.y, view.m, 0).getDate();
    for (var b = 0; b < first; b++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= days; d++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      var isSel = sel && sel.y === view.y && sel.m === view.m && sel.d === d;
      var isToday = now.getFullYear() === view.y && now.getMonth() + 1 === view.m && now.getDate() === d;
      var iso = view.y + '-' + pad(view.m) + '-' + pad(d);
      var disabled = !!(min && iso < (min.y + '-' + pad(min.m) + '-' + pad(min.d)));
      btn.className = 'ui-cal-day' + (isSel ? ' is-selected' : '') + (isToday && !isSel ? ' ui-calendar-today' : '');
      btn.textContent = String(d);
      btn.dataset.day = String(d);
      btn.disabled = disabled;
      btn.setAttribute('aria-label', MONTHS[view.m - 1] + ' ' + d + ', ' + view.y);
      if (isSel) btn.setAttribute('aria-current', 'date');
      btn.addEventListener('click', function (isoValue) {
        return function () {
          input.value = isoValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          syncDate(input);
          close(true);
        };
      }(iso));
      grid.appendChild(btn);
    }
    panel.appendChild(grid);

    var foot = document.createElement('div');
    foot.className = 'ui-cal-foot';
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'ui-cal-clear';
    clear.textContent = 'Clear date';
    clear.addEventListener('click', function () {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      syncDate(input);
      close(true);
    });
    foot.appendChild(clear);
    panel.appendChild(foot);
  }
  function syncDate(input) {
    if (!input.__uiBtn) return;
    var label = input.__uiBtn.querySelector('.ui-label');
    if (label) label.textContent = dateLabel(input.value);
    input.__uiBtn.classList.toggle('is-empty', !input.value);
  }
  function openCalendar(input, btn) {
    if (open && open.kind === 'date' && open.btn === btn) { close(true); return; }
    var sel = parseIso(input.value);
    var base = sel || { y: new Date().getFullYear(), m: new Date().getMonth() + 1, d: 1 };
    var view = { y: base.y, m: base.m };
    var panel = document.createElement('div');
    panel.className = 'ui-pop ui-cal';
    panel.id = (input.id || 'uiDate') + 'Calendar';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Choose date');
    drawCalendar(panel, input, view);
    begin(input.__uiWrap, btn, panel, 248, 'date');
    var focusTarget = panel.querySelector('.ui-cal-day.is-selected') || panel.querySelector('.ui-cal-day:not(:disabled)') || panel.querySelector('button');
    if (focusTarget) focusTarget.focus();
    panel.addEventListener('keydown', function (e) {
      var days = Array.prototype.slice.call(panel.querySelectorAll('.ui-cal-day:not(:disabled)'));
      var i = days.indexOf(document.activeElement);
      if (i === -1) return;
      var move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? 7 : e.key === 'ArrowUp' ? -7 : 0;
      if (!move) return;
      e.preventDefault();
      var target = days[i + move];
      if (target) target.focus();
    });
  }
  function enhanceDate(input) {
    if (input.__uiDate || input.type !== 'date') return;
    input.__uiDate = true;
    var wrap = document.createElement('div');
    wrap.className = 'ui-field-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.classList.add(HIDDEN);
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-select-button ui-date-button';
    btn.id = (input.id || 'uiDate') + 'Btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    var label = document.createElement('span');
    label.className = 'ui-label truncate';
    btn.appendChild(label);
    btn.appendChild(icon(['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']));
    wrap.appendChild(btn);
    input.__uiBtn = btn;
    input.__uiWrap = wrap;
    btn.__uiInput = input;
    var vd = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: function () { return vd.get.call(this); },
      set: function (v) { vd.set.call(this, v); syncDate(this); }
    });
    input.addEventListener('change', function () { syncDate(input); });
    Object.defineProperty(input, 'ariaInvalid', { get: function () { return btn.getAttribute('aria-invalid'); } });
    btn.addEventListener('click', function () { openCalendar(input, btn); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCalendar(input, btn); }
    });
    // The visible button carries the field's name and description for assistive tech.
    var fieldLabel = document.querySelector('label[for="' + input.id + '"]');
    if (fieldLabel) {
      fieldLabel.setAttribute('for', btn.id);
      if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', fieldLabel.textContent.trim().replace(/\s*\*$/, ''));
    }
    var described = input.getAttribute('aria-describedby');
    if (described) btn.setAttribute('aria-describedby', described);
    if (input.getAttribute('aria-invalid')) btn.setAttribute('aria-invalid', 'true');
    if (window.MutationObserver) new MutationObserver(function () {
      if (input.getAttribute('aria-invalid')) btn.setAttribute('aria-invalid', 'true');
      else btn.removeAttribute('aria-invalid');
    }).observe(input, { attributes: true, attributeFilter: ['aria-invalid'] });
    syncDate(input);
  }

  /* ===== dropdown (replaces a native select) ===== */
  function syncSelect(sel) {
    if (!sel.__uiBtn) return;
    var opt = sel.options[sel.selectedIndex];
    var label = sel.__uiBtn.querySelector('.ui-label');
    if (label) label.textContent = opt ? opt.text : '';
    sel.__uiBtn.disabled = sel.disabled;
    sel.__uiBtn.classList.toggle('is-empty', !opt);
  }
  function openSelect(sel, btn) {
    if (open && open.kind === 'select' && open.btn === btn) { close(true); return; }
    var panel = document.createElement('div');
    panel.className = 'ui-pop ui-listbox';
    panel.id = (sel.id || 'uiSelect') + 'Listbox';
    panel.setAttribute('role', 'listbox');
    var labelText = sel.getAttribute('aria-label') || '';
    var fieldLabel = document.querySelector('label[for="' + (sel.__uiBtn ? sel.__uiBtn.id : sel.id) + '"]');
    if (!labelText && fieldLabel) labelText = fieldLabel.textContent.trim();
    panel.setAttribute('aria-label', labelText || 'Options');
    Array.prototype.forEach.call(sel.options, function (o, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-opt';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false');
      b.textContent = o.text;
      if (i === sel.selectedIndex) b.classList.add('is-selected');
      b.addEventListener('click', function () {
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        syncSelect(sel);
        close(true);
      });
      panel.appendChild(b);
    });
    begin(sel.__uiWrap, btn, panel, Math.max(140, btn.getBoundingClientRect().width), 'select');
    var current = panel.querySelector('[aria-selected="true"]') || panel.querySelector('.ui-opt');
    if (current) current.focus();
    panel.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(panel.querySelectorAll('[role="option"]'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        if (next) next.focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var edge = e.key === 'Home' ? items[0] : items[items.length - 1];
        if (edge) edge.focus();
      } else if (e.key === 'Tab') {
        close(true);
      }
    });
  }
  function enhanceSelect(sel) {
    if (sel.__uiSelect) return;
    sel.__uiSelect = true;
    var wrap = document.createElement('div');
    wrap.className = 'ui-field-wrap ui-select-wrap';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add(HIDDEN);
    sel.tabIndex = -1;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-select-button';
    btn.id = (sel.id || 'uiSel') + 'Btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    var labelId = sel.getAttribute('aria-label');
    var fieldLabel = document.querySelector('label[for="' + sel.id + '"]');
    if (fieldLabel) {
      fieldLabel.setAttribute('for', btn.id);
    }
    if (labelId) btn.setAttribute('aria-label', labelId);
    else if (fieldLabel) btn.setAttribute('aria-label', fieldLabel.textContent.trim());
    var span = document.createElement('span');
    span.className = 'ui-label truncate';
    btn.appendChild(span);
    btn.appendChild(icon(['m6 9 6 6 6-6'], 12));
    wrap.appendChild(btn);
    sel.__uiBtn = btn;
    sel.__uiWrap = wrap;
    btn.addEventListener('click', function () { openSelect(sel, btn); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openSelect(sel, btn); }
    });
    var vd = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    var sd = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get: function () { return vd.get.call(this); },
      set: function (v) { vd.set.call(this, v); syncSelect(this); }
    });
    Object.defineProperty(sel, 'selectedIndex', {
      configurable: true,
      get: function () { return sd.get.call(this); },
      set: function (v) { sd.set.call(this, v); syncSelect(this); }
    });
    sel.addEventListener('change', function () { syncSelect(sel); });
    if (window.MutationObserver) new MutationObserver(function () { syncSelect(sel); }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    syncSelect(sel);
  }

  /* ===== enhancement pass (idempotent; runs on render and on DOM changes) ===== */
  function enhance(root) {
    (root || document).querySelectorAll('input[type="date"]:not(.ui-native-control)').forEach(enhanceDate);
    (root || document).querySelectorAll('select:not(.ui-native-control), select.av-time-sel:not(.ui-native-control)').forEach(enhanceSelect);
  }
  function syncAll() {
    document.querySelectorAll('input[type="date"].ui-native-control').forEach(function (i) { if (i.__uiBtn) syncDate(i); });
    document.querySelectorAll('select.ui-native-control').forEach(function (s) { if (s.__uiBtn) syncSelect(s); });
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; enhance(); });
  }
  document.addEventListener('DOMContentLoaded', function () { enhance(); });
  if (document.readyState !== 'loading') enhance();
  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  /* Focus the control the user can actually see for a given native field. */
  function focusField(id) {
    var input = document.getElementById(id);
    if (!input) return false;
    if (input.__uiBtn && input.__uiBtn.isConnected) { input.__uiBtn.focus(); return true; }
    input.focus();
    return true;
  }

  window.CrewUI = {
    enhance: enhance,
    focusField: focusField,
    syncAll: syncAll,
    close: function () { close(false); },
    dateLabel: dateLabel,
    isOpen: function () { return !!open; }
  };
})();
