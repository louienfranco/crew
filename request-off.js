/* Request Off: its own view + dedicated modal.
   Storage rule is unchanged: only the requested date is stored, keyed by the
   existing person key. The reason and the generated image never leave the page. */
(function () {
  'use strict';

  var ROOT_KEY = 'crew-scheduler-request-off-v1';
  var CACHE_KEY = 'crew-scheduler-request-off-cache-v1';
  var MESSENGER_URL = 'https://m.me/luwenprangko';
  var GROUPS = [{ role: 'CC', body: 'offBodyCC' }, { role: 'GEL', body: 'offBodyGEL' }, { role: 'CREW', body: 'offBodyCREW' }];

  try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function api() { return (window.CrewApp && window.CrewApp.firebase) || null; }
  function ref(path) { return api().db.ref(path); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Philippine local calendar day: a request is active through its own day. */
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseKey(v) {
    var p = String(v).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function isDateKey(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v === todayKey(parseKey(v)); }
  function prettyDate(v) {
    try { return parseKey(v).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return v; }
  }
  function expiredKeys(obj) {
    var today = todayKey();
    return Object.keys(obj || {}).filter(function (k) { return !isDateKey(k) || k < today; });
  }

  var entries = {};   // { 'YYYY-MM-DD': { personKey: true } }
  var lastPayload = null; // in memory only, for the Share General button
  var view = 'ta';
  var openKey = null;
  var toast = null;

  /* ===== Expiry ===== */
  function purgeExpired(source) {
    var keys = expiredKeys(source === undefined ? entries : source);
    if (!keys.length) return Promise.resolve(0);
    var updates = {};
    keys.forEach(function (k) { updates[k] = null; delete entries[k]; });
    return ref(ROOT_KEY).update(updates).then(function () { render(); return keys.length; }, function (err) {
      console.warn('Request Off cleanup deferred:', err && err.message);
      return 0;
    });
  }
  var midnight = null;
  function scheduleMidnight() {
    clearTimeout(midnight);
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    midnight = setTimeout(function () { purgeExpired(); scheduleMidnight(); }, Math.min(Math.max(next - now, 1000), 2147483000));
  }
  function applyRemote(obj) {
    entries = (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    purgeExpired(entries);
    render();
  }

  /* Privacy: the roster is shared, request details are not. This browser only
     remembers which person *it* filed as, so other people's dates are never
     rendered and no status is revealed for them. */
  function datesFor(key) {
    return Object.keys(entries).filter(function (d) { return entries[d] && entries[d][key] === true; }).sort();
  }
  /* Boolean-only view of the data: which person keys have at least one active
     (non-expired) request. No dates leave this function. */
  function activeKeys() {
    var today = todayKey(), out = {};
    Object.keys(entries).forEach(function (d) {
      if (!isDateKey(d) || d < today) return;
      Object.keys(entries[d] || {}).forEach(function (k) { if (entries[d][k] === true) out[k] = true; });
    });
    return out;
  }

  /* ===== View navigation ===== */
  function showView(name, focusTab) {
    view = name;
    var off = name === 'off';
    $('viewTA').hidden = off;
    $('viewOff').hidden = !off;
    $('viewTabTA').setAttribute('aria-current', off ? 'false' : 'page');
    $('viewTabOff').setAttribute('aria-current', off ? 'page' : 'false');
    if (off) render();
    if (focusTab) $(off ? 'viewTabOff' : 'viewTabTA').focus();
  }

  /* ===== Table (same structure and row pattern as the Directory) ===== */
  function render() {
    if (!window.CrewApp || !window.CrewApp.people) return;
    var people = window.CrewApp.people();
    var q = ($('offSearch').value || '').trim().toLowerCase();
    var terms = q ? q.split(/\s+/) : [];
    var active = activeKeys();
    var count = 0, total = 0;
    GROUPS.forEach(function (g) {
      var rows = people.filter(function (p) { return p.role === g.role; });
      total += rows.length;
      rows = rows.filter(function (p) {
        var hay = [p.row[0], p.row[1], p.row[2], p.role].join(' ').toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      count += rows.length;
      var body = $(g.body);
      body.hidden = rows.length === 0;
      if (!rows.length) { body.innerHTML = ''; return; }
      var html = '<tr class="directory-group"><th scope="rowgroup" colspan="3"><div class="directory-group-line"><span>' + esc(g.role) +
        '</span><span class="directory-group-count">' + rows.length + (rows.length === 1 ? ' person' : ' people') + '</span></div></th></tr>';
      // Same three name columns as the availability table; no date text is shown.
      // Same three name columns as the availability table; no request status is
      // rendered for anyone, so no other crew member's entries appear here.
      rows.forEach(function (p) {
        // Status is a boolean only: solid orange when an active request exists.
        // No date, count or tooltip is ever written into the row or its attributes.
        var hasRequestOff = active[p.key] === true;
        html += '<tr class="directory-person is-clickable" tabindex="0" aria-haspopup="dialog" data-off-key="' + esc(p.key) + '"><td class="directory-name-cell">' +
          '<span class="ta-dot' + (hasRequestOff ? ' has-ro' : '') + '" aria-hidden="true"></span>' +
          esc(p.row[0]) + '</td><td>' + (p.row[1] ? esc(p.row[1]) : '<span class="directory-muted">—</span>') + '</td><td>' + esc(p.row[2]) + '</td></tr>';
      });
      body.innerHTML = html;
    });
    var empty = $('offEmpty');
    empty.hidden = count !== 0;
    empty.querySelector('td').textContent = total ? 'No names found. Try a different search.' : 'No names yet. The admin adds the crew list.';
    $('offCount').textContent = q ? count + ' of ' + total + ' names' : total + ' names';
    $('offStatusRegion').textContent = count ? '' : '';
    if (window.lucide) window.lucide.createIcons();
  }

  /* ===== Dedicated modal ===== */
  function person(key) {
    return window.CrewApp.findPerson ? window.CrewApp.findPerson(key) : null;
  }
  function openModal(key) {
    var p = person(key);
    if (!p) return;
    openKey = key;
    $('requestOffPerson').textContent = p.row[0] + ' ' + p.row[2] + ' · ' + p.group.role;
    $('offDate').value = '';
    $('offDate').min = todayKey();
    $('offReason').value = '';
    $('offReason').removeAttribute('aria-invalid');
    $('offDate').removeAttribute('aria-invalid');
    $('offError').hidden = true;
    $('offError').textContent = '';
    $('offFallback').hidden = true;
    $('requestOffBody').scrollTop = 0;
    lastPayload = null;
    $('offDone').hidden = true;
    $('offShareNote').hidden = true;
    $('offShareNote').textContent = '';
    $('requestOffOverlay').classList.add('open');
    requestAnimationFrame(function () { $('offDate').focus(); });
  }
  function closeModal(restore) {
    var key = openKey;
    $('requestOffOverlay').classList.remove('open');
    openKey = null;
    if (restore && key) {
      // Wait for the shared accessibility helper to release inert background content.
      requestAnimationFrame(function () {
        var row = document.querySelector('#offTable tr.directory-person[data-off-key="' + CSS.escape(key) + '"]');
        if (row && (document.activeElement === document.body || !document.activeElement.closest('#offCard'))) row.focus();
      });
    }
  }

  function showError(message, field) {
    var err = $('offError');
    err.textContent = message || '';
    err.hidden = !message;
    ['offDate', 'offReason'].forEach(function (id) {
      if (!message) $(id).removeAttribute('aria-invalid');
      else if (field === id) $(id).setAttribute('aria-invalid', 'true');
    });
    if (field) {
      if (window.CrewUI && window.CrewUI.focusField) window.CrewUI.focusField(field);
      else if ($(field)) $(field).focus();
    }
  }
  function readForm() {
    if (!openKey) return { error: 'Choose your name in the Request Off table first.', field: null };
    var p = person(openKey);
    if (!p) return { error: 'Choose your name in the Request Off table first.', field: null };
    var date = ($('offDate').value || '').trim();
    var reason = ($('offReason').value || '').trim();
    if (!date) return { error: 'Choose the date you need off.', field: 'offDate' };
    if (!isDateKey(date)) return { error: 'Enter a valid calendar date.', field: 'offDate' };
    if (date < todayKey()) return { error: 'Past dates cannot be requested. Choose today or a later date.', field: 'offDate' };
    if (!reason) return { error: 'Add a short reason for the request.', field: 'offReason' };
    if (datesFor(openKey).indexOf(date) !== -1) return { error: 'You already saved an off request for that date.', field: 'offDate' };
    return {
      key: openKey, date: date, reason: reason, role: p.group.role,
      nickname: p.row[0], firstName: p.row[1] || '', lastName: p.row[2] || ''
    };
  }

  /* ===== Image: Canvas, in memory only ===== */
  function wrap(ctx, text, maxWidth, maxLines) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
        if (lines.length === maxLines) break;
      } else line = test;
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.join(' ').length < String(text).trim().length) {
      var last = lines.length - 1, s = lines[last];
      while (s.length && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
      lines[last] = s + '…';
    }
    return lines;
  }
  function canvasFor(r) {
    var W = 1000, H = 620, scale = 2;
    var canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    var font = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 24, W - 48, H - 48);
    ctx.strokeStyle = '#e4e4e7'; ctx.lineWidth = 1; ctx.strokeRect(24.5, 24.5, W - 49, H - 49);
    ctx.fillStyle = '#18181b'; ctx.fillRect(24, 24, W - 48, 6);
    var x = 64, y = 92;
    ctx.font = '600 30px ' + font; ctx.fillText('Request Off', x, y);
    ctx.fillStyle = '#52525b'; ctx.font = '400 17px ' + font; ctx.fillText('November crew · ' + r.role, x, y + 28);
    y += 76;
    ctx.strokeStyle = '#e4e4e7'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(W - 64, y); ctx.stroke();
    y += 46;
    [['Requested by', r.firstName ? r.firstName + ' ' + r.lastName + ' (' + r.nickname + ')' : r.nickname],
     ['Date off', prettyDate(r.date)],
     ['Reason', r.reason]].forEach(function (f) {
      ctx.fillStyle = '#52525b'; ctx.font = '600 13px ' + font; ctx.fillText(f[0].toUpperCase(), x, y);
      y += 26;
      var lines = f[0] === 'Reason' ? wrap(ctx, f[1], W - 128, 4) : wrap(ctx, f[1], W - 128, 2);
      lines.forEach(function (line, i) {
        ctx.font = (i === 0 ? '600 24px ' : '400 20px ') + font;
        ctx.fillStyle = i === 0 ? '#18181b' : '#3f3f46';
        ctx.fillText(line, x, y);
        y += 30;
      });
      y += 28;
    });
    ctx.fillStyle = '#52525b'; ctx.font = '400 13px ' + font;
    ctx.fillText('Sent from the Crew Directory · ' + prettyDate(todayKey()), x, H - 56);
    return canvas;
  }
  function buildImage(r) {
    return new Promise(function (resolve, reject) {
      canvasFor(r).toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('Image could not be created')); }, 'image/png');
    });
  }
  function bytesFromDataUrl(url) {
    var binary = atob(url.slice(url.indexOf(',') + 1));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  /* Synchronous so the clipboard write starts inside the submit gesture.
     The blob lives in memory only: nothing is downloaded or uploaded. */
  function sharePayload(r) {
    var bytes = bytesFromDataUrl(canvasFor(r).toDataURL('image/png'));
    var name = fileName(r);
    return {
      name: name,
      blob: new Blob([bytes], { type: 'image/png' }),
      file: new File([bytes], name, { type: 'image/png' }),
      text: 'Request Off · ' + prettyDate(r.date) + ' · ' + (r.firstName ? r.firstName + ' ' + r.lastName + ' (' + r.nickname + ')' : r.nickname) + ' · ' + r.reason
    };
  }
  /* The download is the explicit first step of this flow, so it is user-initiated
     and completes before the share options appear. */
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function fileName(r) {
    return ('request-off-' + r.nickname + '-' + r.date).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() + '.png';
  }
  function copyImage(blob) {
    if (!navigator.clipboard || !window.ClipboardItem || !navigator.clipboard.write) return Promise.resolve(false);
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { return true; }, function () { return false; });
  }
  /* Standard https navigation — the same thing as clicking the link. No custom
     scheme, no popup window, no share sheet. */
  function goToMessenger() {
    try {
      var a = document.createElement('a');
      a.href = MESSENGER_URL;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      try { window.location.assign(MESSENGER_URL); } catch (e2) { /* the toast already told the user the URL */ }
    }
  }

  function save(r) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('Save timed out')); }, 10000);
      ref(ROOT_KEY + '/' + r.date + '/' + r.key).set(true).then(function () { clearTimeout(timer); resolve(); }, function (err) { clearTimeout(timer); reject(err); });
    });
  }
  function note(message) {
    if (window.CrewApp && window.CrewApp.showToast) window.CrewApp.showToast(message);
  }

  function shareNote(message, isError) {
    var el = $('offShareNote');
    el.textContent = message || '';
    el.hidden = !message;
    el.classList.toggle('is-error', !!isError);
  }

  /* Step 1: save the date, build the PNG, download it, then reveal the actions. */
  function submit() {
    var r = readForm();
    if (r.error) { showError(r.error, r.field); return; }
    showError('');
    var button = $('btnRequestOff');
    button.disabled = true;
    button.textContent = 'Preparing...';
    $('offDone').hidden = true;
    shareNote('');

    var payload = null;
    try { payload = sharePayload(r); } catch (err) {
      console.error(err);
      showError('The image could not be created. Check the browser storage settings and try again.');
      button.disabled = false;
      button.textContent = 'Submit request';
      return;
    }
    downloadBlob(payload.blob, payload.name);
    lastPayload = payload;

    save(r).then(function () {
      if (!entries[r.date]) entries[r.date] = {};
      entries[r.date][r.key] = true;
      render();
      $('offReason').value = '';
      $('offDone').hidden = false;
      $('btnRequestOffShare').focus();
      note('Request saved for ' + prettyDate(r.date) + '. Image downloaded — share it or open Messenger.');
    }, function (err) {
      console.error(err);
      showError('The image was downloaded, but the date was not saved. Check the internet connection and submit again.');
    }).then(function () {
      button.disabled = false;
      button.textContent = 'Submit request';
    });
  }

  /* Step 2a: any app, via the device share sheet; clipboard image if unavailable. */
  function shareGeneral() {
    var payload = lastPayload;
    if (!payload) { shareNote('Submit the request first, then share it.', true); return; }
    var canFiles = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [payload.file] }));
    var done = function (message, err) { shareNote(message, err); };
    if (canFiles) {
      navigator.share({ files: [payload.file], title: 'Request Off', text: payload.text }).then(function () {
        done('Shared.');
      }, function (err) {
        if (err && err.name === 'AbortError') { done(''); return; }
        console.warn('Native share failed:', err && err.message);
        copyFallback(payload, done);
      });
      return;
    }
    copyFallback(payload, done);
  }
  function copyFallback(payload, done) {
    if (!navigator.clipboard || !window.ClipboardItem || !navigator.clipboard.write) {
      done('This browser cannot share files or copy images. Use the downloaded image instead.', true);
      return;
    }
    navigator.clipboard.write([new ClipboardItem({ 'image/png': payload.blob })]).then(function () {
      done('Image copied — paste it (Ctrl+V / Cmd+V) into any chat, including Messenger.');
    }, function (err) {
      console.warn('Clipboard image copy refused:', err && err.message);
      done('This browser blocked sharing and copying. Use the downloaded image instead.', true);
    });
  }

  function wire(crew) {
    $('viewTabTA').addEventListener('click', function () { showView('ta'); });
    $('viewTabOff').addEventListener('click', function () { showView('off'); });
    $('offSearch').addEventListener('input', render);
    $('offCard').addEventListener('click', function (e) {
      var tr = e.target.closest('tr.directory-person');
      if (tr) openModal(tr.dataset.offKey);
    });
    $('offCard').addEventListener('keydown', function (e) {
      var tr = e.target.closest('tr.directory-person');
      if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openModal(tr.dataset.offKey); }
    });

    $('btnRequestOff').addEventListener('click', submit);
    $('btnRequestOffShare').addEventListener('click', shareGeneral);
    $('btnRequestOffMessenger').addEventListener('click', goToMessenger);   // unchanged direct navigation
    $('btnRequestOffClose').addEventListener('click', function () { closeModal(true); });
    $('btnRequestOffCancel').addEventListener('click', function () { closeModal(true); });
    $('requestOffOverlay').addEventListener('click', function (e) { if (e.target === this) closeModal(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('requestOffOverlay').classList.contains('open')) closeModal(true);
    });
    ['offDate', 'offReason'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        $(id).removeAttribute('aria-invalid');
        if (!$('offError').hidden) showError('');
      });
    });

    crew.firebase.db.ref(ROOT_KEY).on('value', function (snap) { applyRemote(snap.val()); }, function (err) {
      console.warn('Request Off live data unavailable:', err && err.message);
      applyRemote({});
    });
    window.addEventListener('focus', function () { purgeExpired(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') purgeExpired();
    });
    scheduleMidnight();
    // The Directory rows are rendered from Firebase; mirror them once that data lands.
    var paint = setInterval(function () { if (crew.people().length) { render(); clearInterval(paint); } }, 150);
    setTimeout(function () { clearInterval(paint); render(); }, 12000);
    render();
  }

  window.CrewApp = window.CrewApp || {};
  var hooks = window.CrewApp;
  hooks.requestOff = {
    todayKey: todayKey, isDateKey: isDateKey, expiredKeys: expiredKeys, purgeExpired: purgeExpired,
    applyRemote: applyRemote, buildImage: buildImage, submit: submit, showView: showView,
    openModal: openModal, closeModal: closeModal,
    getEntries: function () { return entries; }
  };
  if (hooks.firebase) wire(hooks);
  else document.addEventListener('crewapp:ready', function () { wire(hooks); }, { once: true });
})();
