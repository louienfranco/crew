(function () {
  'use strict';

  /* ===== Storage: Firebase Realtime Database (same key and structure as the main app) =====
     A local cache is kept so the directory paints at once; Firebase is the source of truth. */
  var AVAIL_KEY = 'crew-scheduler-availability-v1';
  var firebaseConfig = {
    apiKey: "AIzaSyAkK0mXoKWohNlVapFRv7EoCwPySubDzkI",
    authDomain: "louien-cloud.firebaseapp.com",
    databaseURL: "https://louien-cloud-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "louien-cloud",
    storageBucket: "louien-cloud.firebasestorage.app",
    messagingSenderId: "1060435920199",
    appId: "1:1060435920199:web:6dbe178c53c3dfed913862"
  };
  firebase.initializeApp(firebaseConfig);
  var db = firebase.database();
  var entriesRef = db.ref(AVAIL_KEY);

  var Store = {
    load: function () {
      try {
        var p = JSON.parse(localStorage.getItem(AVAIL_KEY));
        return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
      } catch (e) { return {}; }
    },
    cache: function (entries) {
      try {
        if (Object.keys(entries).length) localStorage.setItem(AVAIL_KEY, JSON.stringify(entries));
        else localStorage.removeItem(AVAIL_KEY);
      } catch (e) {}
    },
    // live updates from Firebase (also fires for this browser's own writes)
    listen: function (onRemote) {
      entriesRef.on('value', function (snap) {
        var v = snap.val();
        var obj = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
        Store.cache(obj);
        onRemote(obj);
      }, function (err) { console.error(err); });
    },
    // one person at a time: writes only that person's TA fields, the name fields stay
    saveOne: function (key, n) {
      var upd = toDb(n);
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { reject(new Error('Save timed out')); }, 10000);
        entriesRef.child(key).update(upd).then(function () {
          clearTimeout(timer); resolve();
        }, function (err) {
          clearTimeout(timer); reject(err);
        });
      });
    },
    // many people at once (TA import and names import): a multi-path update, so nothing else is removed
    updateMany: function (updates) {
      return entriesRef.update(updates);
    }
  };

  /* ===== Crew list (same names as the main app's directory) ===== */
  var directoryGroups = [
    { role: 'CC', rows: [], tbody: 'directoryCC' },
    { role: 'GEL', rows: [], tbody: 'directoryGEL' },
    { role: 'CREW', rows: [], tbody: 'directoryCrew' }
  ];
  var SECTIONS = ['PRODUCTION', 'SERVICE', 'MARKETING', 'MAINTENANCE'];
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var SHIFTS = [
    { v: 'open', l: 'Open', ta: '5AM-11AM' },
    { v: 'mid', l: 'Mid', ta: '11AM-5PM' },
    { v: 'close', l: 'Close', ta: '5PM-11PM' },
    { v: 'specify', l: 'Specify time', ta: 'SPECIFY' },
    { v: 'rest', l: 'Rest / Not Available', ta: 'REST / N/A' }
  ];

  var dirLoaded = false, dirError = false;
  // Placeholder rows that copy the real table: a group header, then person rows with the same cell styling.
  function skeletonRows(count) {
    var head = '<tr class="directory-group directory-skeleton" aria-hidden="true"><th colspan="3"><div class="directory-group-line">' +
      '<span class="sk-bar" style="width:72px;height:10px;background:rgba(255,255,255,.6)"></span>' +
      '<span class="sk-bar" style="width:56px;height:10px;background:rgba(255,255,255,.6)"></span></div></th></tr>';
    var html = head;
    var widths = [['78%', '62%', '70%'], ['64%', '48%', '66%'], ['82%', '55%', '60%'], ['70%', '66%', '74%']];
    for (var i = 0; i < count; i++) {
      var w = widths[i % widths.length];
      html += '<tr class="directory-person directory-skeleton" aria-hidden="true">' +
        '<td><span class="sk-bar" style="width:' + w[0] + '"></span></td>' +
        '<td><span class="sk-bar" style="width:' + w[1] + '"></span></td>' +
        '<td><span class="sk-bar" style="width:' + w[2] + '"></span></td></tr>';
    }
    return html;
  }
  // One record per person in Firebase: name fields and TA fields together. Rows and TA come from the same data.
  function applyRemote(obj) {
    dirLoaded = true; dirError = false;
    entries = obj;
    directoryGroups.forEach(function (g) {
      var people = Object.keys(obj).map(function (k) { return obj[k]; }).filter(function (p) {
        return p && p.group === g.role && typeof p.nickname === 'string';
      });
      people.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      g.rows = people.map(function (p) { return [p.nickname, p.firstName || '', p.lastName || '']; });
    });
    renderDirectory();
  }
  function known_keys() {
    var out = [];
    directoryGroups.forEach(function (g) { g.rows.forEach(function (r) { out.push(keyOf(r, g)); }); });
    return out;
  }

  // Request Off (request-off.js) shares this dialog and needs the same open-person context.
  // Read-only hooks; TA state and saving are unchanged.
  var crewHooks = window.CrewApp = window.CrewApp || {};
  crewHooks.firebase = { db: db, ref: entriesRef };

  var entries = Store.load();  // { "GROUP|NICK|LAST": { days: {Monday: ['open']}, sections: [...], custom: {...} } }
  var current = null;          // key being edited
  var specifyTimes = {};       // { Monday: {from, to} } while the dialog is open
  var dialogTrigger = null;

  var $ = function (id) { return document.getElementById(id); };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function keyOf(row, g) { return g.role + '|' + row[0] + '|' + row[2]; }
  function dayShort(d) { return d.slice(0, 3); }
  function hourLabel(h) { if (h === 0) return '12AM'; if (h < 12) return h + 'AM'; if (h === 12) return '12NN'; return (h - 12) + 'PM'; }
  function taFormat(a, b) { return hourLabel(a) + '-' + hourLabel(b); }
  function shiftOk(v) { return SHIFTS.some(function (s) { return s.v === v; }); }

  // Same shape as the main app. Also accepts the older shape.
  function normalize(e) {
    var out = { days: {}, sections: [], custom: {} };
    if (!e || typeof e !== 'object') return out;
    var days = (e.days && typeof e.days === 'object') ? e.days : (Array.isArray(e.sections) ? {} : e);
    DAYS.forEach(function (d) {
      var v = days[d];
      var list;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        // database format: { open: true, mid: false, close: false, specify: false, rest: false }
        list = SHIFTS.map(function (sh) { return sh.v; }).filter(function (k) { return v[k] === true; });
      } else {
        list = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
      }
      list = list.filter(shiftOk);
      if (list.indexOf('rest') !== -1) list = ['rest'];
      if (list.indexOf('specify') !== -1) list = ['specify'];
      var c = (e.custom && typeof e.custom === 'object') ? e.custom[d] : null;
      if (list[0] === 'specify') {
        var t = c && c.specify, from = t && Number(t.from), to = t && Number(t.to);
        if (!t || !isFinite(from) || !isFinite(to) || from < 0 || to < 0 || from > 23 || to > 23 || from === to) list = [];
        else out.custom[d] = { specify: { from: from, to: to } };
      }
      if (list.length) out.days[d] = list;
    });
    if (Array.isArray(e.sections)) out.sections = SECTIONS.filter(function (x) { return e.sections.indexOf(x) !== -1; });
    else if (e.sections && typeof e.sections === 'object') out.sections = SECTIONS.filter(function (x) { return e.sections[x] === true; });
    return out;
  }
  function hasData(n) { return Object.keys(n.days).length > 0 || n.sections.length > 0; }
  // Database shape for one person's TA. Every shift and section is stored as true (selected) or false.
  function toDb(n) {
    var out = { days: null, sections: null, custom: null };
    if (Object.keys(n.days).length) {
      out.days = {};
      DAYS.forEach(function (d) {
        if (!n.days[d]) return;
        var row = {};
        SHIFTS.forEach(function (sh) { row[sh.v] = n.days[d].indexOf(sh.v) !== -1; });
        out.days[d] = row;
      });
    }
    if (n.sections.length) {
      out.sections = {};
      SECTIONS.forEach(function (x) { out.sections[x] = n.sections.indexOf(x) !== -1; });
    }
    if (Object.keys(n.custom).length) out.custom = n.custom;
    return out;
  }
  function hasTA(key) { return hasData(normalize(entries[key])); }

  /* ===== Directory (same markup classes as the main app) ===== */
  // A re-render (for example the live echo of this browser's own save) replaces
  // the focused row. Keep keyboard focus on that person rather than the body.
  function focusedRowKey() {
    var ae = document.activeElement, table = $('directoryTable');
    var row = ae && ae.closest && table ? ae.closest('tr.directory-person') : null;
    return row && table.contains(row) ? row.dataset.key : null;
  }
  function restoreRowFocus(key) {
    if (!key || document.querySelector('.overlay.open') || document.activeElement !== document.body) return;
    var row = document.querySelector('tr.directory-person[data-key="' + CSS.escape(key) + '"]');
    if (row) row.focus();
  }
  function renderDirectory() {
    var keepKey = focusedRowKey();
    if (!dirLoaded) {
      var skel = { CC: 5, GEL: 8, CREW: 10 };
      directoryGroups.forEach(function (g) {
        var body = $(g.tbody);
        body.hidden = false;
        body.innerHTML = dirError ? '' : skeletonRows(skel[g.role] || 6);
        body.classList.add('directory-skeleton-body');
      });
      $('directoryEmpty').hidden = !dirError;
      if (dirError) $('directoryEmpty').querySelector('td').textContent = 'Could not load the crew names. Check the internet connection.';
      $('directoryCount').textContent = dirError ? '' : 'Loading names...';
      restoreRowFocus(keepKey);
      return;
    }
    var q = $('directorySearch').value.trim().toLowerCase();
    var terms = q ? q.split(/\s+/) : [];
    var count = 0, total = 0;
    directoryGroups.forEach(function (g) {
      total += g.rows.length;
      var body = $(g.tbody);
      var rows = g.rows.filter(function (r) {
        var hay = [r[0], r[1], r[2], g.role].join(' ').toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      count += rows.length;
      body.hidden = rows.length === 0;
      if (!rows.length) { body.innerHTML = ''; return; }
      var html = '<tr class="directory-group"><th scope="rowgroup" colspan="3"><div class="directory-group-line"><span>' +
        esc(g.role) + '</span><span class="directory-group-count">' + rows.length + (rows.length === 1 ? ' person' : ' people') + '</span></div></th></tr>';
      rows.forEach(function (r) {
        var key = keyOf(r, g);
        var has = hasTA(key);
        html += '<tr class="directory-person is-clickable" tabindex="0" aria-haspopup="dialog" data-key="' + esc(key) + '"><td class="directory-name-cell">' +
          '<span class="ta-dot' + (has ? ' has' : '') + '" role="img" aria-label="' + (has ? 'TA saved' : 'No TA saved') + '"></span>' +
          esc(r[0]) + '</td><td>' + (r[1] ? esc(r[1]) : '<span class="directory-muted">—</span>') + '</td><td>' + esc(r[2]) + '</td></tr>';
      });
      body.innerHTML = html;
    });
    $('directoryEmpty').hidden = count !== 0;
    $('directoryEmpty').querySelector('td').textContent = total ? 'No names found. Try a different search.' : 'No names yet. The admin adds the crew list.';
    $('directoryCount').textContent = q ? count + ' of ' + total + ' names' : total + ' names';
    if (window.lucide) window.lucide.createIcons();
    restoreRowFocus(keepKey);
  }

  function findPerson(key) {
    var found = null;
    directoryGroups.forEach(function (g) { g.rows.forEach(function (r) { if (keyOf(r, g) === key) found = { row: r, group: g }; }); });
    return found;
  }

  /* ===== TA dialog (same markup classes as the main app) ===== */
  function openTA(key, trigger) {
    var p = findPerson(key);
    if (!p) return;
    current = key;
    dialogTrigger = trigger || null;
    $('availName').textContent = p.row[0] + ' ' + p.row[2] + ' · ' + p.group.role;
    // Every open starts blank, so the person picks their TA again. The saved TA in the database is replaced only when they save.
    var saved = normalize({});
    specifyTimes = {};
    Object.keys(saved.custom).forEach(function (d) { specifyTimes[d] = { from: saved.custom[d].specify.from, to: saved.custom[d].specify.to }; });

    var html = '<p class="av-instructions">You can select more than one option in each list.</p>' +
      '<fieldset class="av-day"><legend>Can duty in</legend><div class="av-opts av-grid av-grid-2">';
    SECTIONS.forEach(function (sec) {
      var id = 'av-sec-' + sec;
      html += '<input class="av-input" type="checkbox" name="av-sec" id="' + id + '" value="' + sec + '"' + (saved.sections.indexOf(sec) !== -1 ? ' checked' : '') + '>' +
        '<label class="av-opt" for="' + id + '">' + sec + '</label>';
    });
    html += '</div></fieldset>';

    DAYS.forEach(function (d) {
      var s = dayShort(d), list = saved.days[d] || [];
      html += '<fieldset class="av-day"><legend>' + d + '</legend><div class="av-opts av-grid">';
      SHIFTS.forEach(function (sh) {
        var id = 'av-' + s + '-' + sh.v;
        html += '<input class="av-input" type="checkbox" name="av-' + s + '" id="' + id + '" value="' + sh.v + '" data-day="' + d + '" data-v="' + sh.v + '"' + (list.indexOf(sh.v) !== -1 ? ' checked' : '') + '>' +
          '<label class="av-opt' + (sh.v === 'specify' || sh.v === 'rest' ? ' av-wide' : '') + '" for="' + id + '">' + sh.l + '</label>';
      });
      html += '</div><div class="av-times" id="av-times-' + s + '"></div></fieldset>';
    });
    $('availDays').innerHTML = html;
    syncRules(null);
    renderTimes();
    updateOutput();
    $('availOverlay').classList.add('open');
    if (window.lucide) window.lucide.createIcons();
    requestAnimationFrame(function () {
      var first = document.querySelector('#availForm input.av-input:checked') || document.querySelector('#availForm input.av-input');
      if (first) first.focus();
    });
  }

  function shiftBox(d, v) { return document.querySelector('#availDays input.av-input[data-day="' + d + '"][data-v="' + v + '"]'); }

  function readForm() {
    var out = { days: {}, sections: [], custom: {} };
    out.sections = Array.prototype.slice.call(document.querySelectorAll('#availDays input[name="av-sec"]:checked')).map(function (i) { return i.value; });
    DAYS.forEach(function (d) {
      var list = Array.prototype.slice.call(document.querySelectorAll('#availDays input.av-input[data-day="' + d + '"]:checked:not(:disabled)')).map(function (i) { return i.dataset.v; });
      if (list.length) out.days[d] = list;
      if (list.indexOf('specify') !== -1 && specifyTimes[d]) out.custom[d] = { specify: { from: specifyTimes[d].from, to: specifyTimes[d].to } };
    });
    return out;
  }

  function renderOutput(sel) {
    var lines = DAYS.map(function (d) {
      var list = sel.days[d];
      if (!list || !list.length) return d + ': —';
      if (list.indexOf('rest') !== -1) return d + ': REST / N/A';
      if (list.indexOf('specify') !== -1) {
        var c = sel.custom[d] && sel.custom[d].specify;
        return d + ': SPECIFY ' + (c ? taFormat(c.from, c.to) : '—');
      }
      return d + ': ' + SHIFTS.filter(function (sh) { return list.indexOf(sh.v) !== -1; }).map(function (sh) {
        return sh.v === 'rest' ? sh.ta : sh.v.toUpperCase() + ' ' + sh.ta;
      }).join(' / ');
    });
    lines.push('Sections: ' + (sel.sections.length ? sel.sections.join(', ') : '—'));
    return lines.join('\n');
  }

  function updateOutput() {
    var sel = readForm();
    $('availOutput').textContent = renderOutput(sel);
    // Every day (Monday to Sunday) needs a shift before the TA can be saved.
    var missing = DAYS.filter(function (d) { return !(sel.days[d] && sel.days[d].length); });
    var timeErr = !!document.querySelector('#availDays .av-time-err');
    var hint = $('availHint');
    var msg = missing.length ? 'Choose a shift for every day. Missing: ' + missing.join(', ') + '.' : '';
    hint.textContent = msg;
    hint.hidden = !msg;
    $('btnAvailSave').disabled = timeErr;
  }

  // Days are locked until at least one "Can duty in" section is ticked.
  // Rest is exclusive. Specify time is exclusive with Open, Mid and Close.
  function syncRules(changed) {
    var anySec = !!document.querySelector('#availDays input[name="av-sec"]:checked');
    if (!anySec) {
      document.querySelectorAll('#availDays input.av-input[data-day]').forEach(function (i) { i.checked = false; });
    }
    DAYS.forEach(function (d) {
      var rest = shiftBox(d, 'rest');
      var on = !!(rest && rest.checked);
      if (changed && changed.dataset && changed.dataset.day === d && changed.checked) {
        if (changed.dataset.v === 'specify') {
          ['open', 'mid', 'close'].forEach(function (v) { var el = shiftBox(d, v); if (el) el.checked = false; });
        } else if (['open', 'mid', 'close'].indexOf(changed.dataset.v) !== -1) {
          var sp = shiftBox(d, 'specify'); if (sp) sp.checked = false;
        }
      }
      ['open', 'mid', 'close', 'specify', 'rest'].forEach(function (v) {
        var el = shiftBox(d, v);
        if (!el) return;
        if (on && v !== 'rest') el.checked = false;
        el.disabled = !anySec || (on && v !== 'rest');
      });
    });
  }

  function renderTimes() {
    DAYS.forEach(function (d) {
      var box = $('av-times-' + dayShort(d));
      if (!box) return;
      var on = shiftBox(d, 'specify');
      if (!on || !on.checked) { box.innerHTML = ''; return; }
      var t = specifyTimes[d] || (specifyTimes[d] = { from: 9, to: 17 });
      var opts = function (sel) {
        var h = '';
        for (var k = 0; k < 24; k++) h += '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + hourLabel(k) + '</option>';
        return h;
      };
      // Update existing controls in place: no lost focus or needless option rebuilds.
      var existing = box.querySelectorAll('select.av-time-sel');
      if (existing.length === 2) {
        existing[0].value = String(t.from);
        existing[1].value = String(t.to);
        var error = box.querySelector('.av-time-err');
        if (t.from === t.to && !error) {
          error = document.createElement('span');
          error.className = 'av-time-err';
          error.textContent = 'Start and end must differ';
          box.firstElementChild.appendChild(error);
        } else if (t.from !== t.to && error) error.remove();
        return;
      }
      // Stable ids keep the custom dropdown wrapper/button intact across re-renders.
      var idFor = function (end) { return 'av-time-' + dayShort(d) + '-' + end; };
      box.innerHTML = '<div class="av-time-row">' +
        '<label class="av-time-lbl" for="' + idFor('from') + '">from <select class="av-time-sel" id="' + idFor('from') + '" data-day="' + d + '" data-end="from" aria-label="' + d + ' from">' + opts(t.from) + '</select></label>' +
        '<label class="av-time-lbl" for="' + idFor('to') + '">to <select class="av-time-sel" id="' + idFor('to') + '" data-day="' + d + '" data-end="to" aria-label="' + d + ' to">' + opts(t.to) + '</select></label>' +
        (t.from === t.to ? '<span class="av-time-err" role="status">Start and end must differ</span>' : '') + '</div>';
      if (window.CrewUI) window.CrewUI.enhance(box);
    });
  }

  $('availForm').addEventListener('change', function (e) {
    var t = e.target;
    if (t.tagName === 'SELECT') {
      specifyTimes[t.dataset.day] = specifyTimes[t.dataset.day] || { from: 9, to: 17 };
      specifyTimes[t.dataset.day][t.dataset.end] = Number(t.value);
    } else if (t.classList.contains('av-input')) {
      syncRules(t);
    }
    syncRules(null);
    renderTimes();
    updateOutput();
  });

  function closeTA(restoreFocus) {
    $('availOverlay').classList.remove('open');
    current = null;
    if (restoreFocus && dialogTrigger && dialogTrigger.focus) dialogTrigger.focus();
    var back = returnTo;
    returnTo = null;
    if (back === 'person' && returnKey) openPersonPreview(returnKey, personPreviewTrigger);
    returnKey = null;
  }

  function showToast(message, ms) {
    var t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      t.className = 'app-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, ms || 3000);
  }

  $('btnAvailSave').addEventListener('click', function () {
    if (!current) return;
    var n = readForm();
    var noDay = DAYS.some(function (d) { return !(n.days[d] && n.days[d].length); });
    if (noDay) { showToast('All days are required. Fill out a shift for every day, Monday to Sunday.'); return; }
    if (hasData(n)) entries[current] = n; else delete entries[current];
    var key = current;
    // Private: after saving, no preview opens. The person gets their own TA as an image instead.
    returnTo = null;
    returnKey = null;
    Store.saveOne(key, n).then(function () {
      showToast('Saved to the database. Downloading your TA image...');
      downloadPersonImage(key, n);
    }, function (err) {
      console.error(err);
      showToast('Not saved. Check the internet connection and save again.', 8000);
    });
    closeTA(false);
    renderDirectory();
    var row = document.querySelector('tr.directory-person[data-key="' + CSS.escape(key) + '"]');
    if (row) row.focus();
  });
  $('btnAvailCancel').addEventListener('click', function () { closeTA(true); });
  $('btnAvailClose').addEventListener('click', function () { closeTA(true); });
  $('btnAvailClear').addEventListener('click', function () {
    document.querySelectorAll('#availDays input.av-input').forEach(function (i) { i.checked = false; i.disabled = false; });
    specifyTimes = {};
    syncRules(null);
    renderTimes();
    updateOutput();
  });
  $('availOverlay').addEventListener('click', function (e) { if (e.target === this) closeTA(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('availOverlay').classList.contains('open')) closeTA(true);
  });

  /* ===== Open a person: click, Enter or Space ===== */
  $('directoryCard').addEventListener('click', function (e) {
    var tr = e.target.closest('tr.directory-person');
    if (tr) openTA(tr.dataset.key, tr); // no preview: a name opens the TA editor only
  });
  $('directoryCard').addEventListener('keydown', function (e) {
    var tr = e.target.closest && e.target.closest('tr.directory-person');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openTA(tr.dataset.key, tr); }
  });

  $('directorySearch').addEventListener('input', renderDirectory);


  /* ===== Person preview: click a name to see that person's TA, day by day ===== */
  var personPreviewKey = null, personPreviewTrigger = null, returnTo = null, returnKey = null;
  function personInfo(key) {
    var found = null;
    directoryGroups.forEach(function (g) { g.rows.forEach(function (r) { if (keyOf(r, g) === key) found = { r: r, g: g }; }); });
    return found;
  }
  function openPersonPreview(key, trigger) {
    var info = personInfo(key);
    if (!info) return;
    personPreviewKey = key;
    personPreviewTrigger = trigger || null;
    $('personPreviewTitle').textContent = info.r[0] + ' ' + info.r[2];
    $('personPreviewSub').textContent = info.g.role + (info.r[1] ? ' · ' + info.r[1] : '');
    var sel = normalize(entries[key]);
    var html;
    if (!hasData(sel)) {
      html = '<p class="py-6 text-center text-[13px] text-ink-3">No TA saved yet.</p>';
    } else {
      html = '<div class="mb-3 rounded-sm bg-gray-50 px-3 py-2 text-[12px] text-gray-700"><span class="font-bold">Can duty in:</span> ' +
        (sel.sections.length ? esc(sel.sections.join(', ')) : '—') + '</div>';
      html += DAYS.map(function (d) {
        var t = taCellText(sel.days[d], sel, d);
        return '<div class="flex items-baseline justify-between gap-3 border-b border-line-soft py-2 last:border-b-0">' +
          '<span class="text-[13px] font-bold text-gray-800">' + d + '</span>' +
          '<span class="text-right text-[13px] ' + (t === '—' ? 'text-gray-300' : 'text-gray-800') + '">' + esc(t) + '</span></div>';
      }).join('');
    }
    $('personPreviewBody').innerHTML = html;
    $('personPreviewOverlay').classList.add('open');
    requestAnimationFrame(function () { $('btnPersonPreviewEdit').focus(); });
  }
  function closePersonPreview(restoreFocus) {
    $('personPreviewOverlay').classList.remove('open');
    if (restoreFocus && personPreviewTrigger && personPreviewTrigger.isConnected) personPreviewTrigger.focus();
  }
  function editFromPersonPreview() {
    var key = personPreviewKey;
    var info = personInfo(key);
    if (!info) return;
    closePersonPreview(false);
    returnTo = 'person';
    returnKey = key;
    openTA(key, personPreviewTrigger);
  }
  $('btnPersonPreviewClose').addEventListener('click', function () { closePersonPreview(true); });
  $('btnPersonPreviewEdit').addEventListener('click', editFromPersonPreview);
  $('personPreviewOverlay').addEventListener('click', function (e) { if (e.target === this) closePersonPreview(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('personPreviewOverlay').classList.contains('open')) closePersonPreview(true);
  });

  function taCellText(list, sel, d) {
    if (!list || !list.length) return '—';
    if (list.indexOf('rest') !== -1) return 'REST / N/A';
    if (list.indexOf('specify') !== -1) {
      var c = sel.custom && sel.custom[d] && sel.custom[d].specify;
      return 'SPECIFY ' + (c ? taFormat(c.from, c.to) : '—');
    }
    return SHIFTS.filter(function (sh) { return list.indexOf(sh.v) !== -1; }).map(function (sh) {
      return sh.v.toUpperCase();
    }).join(' / ');
  }
  /* ===== Save as Image (directory): every name, with the TA indicator; the saved image is also the link preview cover ===== */
  var h2cLoader = null, capturedDataURL = null, captureFilePrefix = 'crew-directory-';
  function loadHtml2canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!h2cLoader) h2cLoader = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = function () { resolve(window.html2canvas); };
      s.onerror = function () { h2cLoader = null; reject(new Error('Failed to load html2canvas')); };
      document.head.appendChild(s);
    });
    return h2cLoader;
  }
  // One person's TA as a JPG, downloaded only to the person who saved it (no other crew see it).
  async function downloadPersonImage(key, entry) {
    var info = personInfo(key);
    if (!info) return;
    var sel = normalize(entry);
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px;padding:24px;background:#ffffff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b;box-sizing:border-box';
    var html = '<div style="font-size:18px;font-weight:700">' + esc(info.r[0] + ' ' + info.r[2]) + '</div>' +
      '<div style="margin-top:4px;font-size:13px;color:#71717a">' + esc(info.g.role + (info.r[1] ? ' · ' + info.r[1] : '')) + '</div>' +
      '<div style="margin:16px 0 8px;padding:8px 12px;background:#f4f4f5;border-radius:6px;font-size:13px"><b>Can duty in:</b> ' +
      esc(sel.sections.length ? sel.sections.join(', ') : '—') + '</div>';
    html += DAYS.map(function (d) {
      var t = taCellText(sel.days[d], sel, d);
      return '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #e4e4e7;font-size:13px">' +
        '<span style="font-weight:700">' + d + '</span><span style="color:' + (t === '—' ? '#a1a1aa' : '#18181b') + '">' + esc(t) + '</span></div>';
    }).join('');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    try {
      var h2c = await loadHtml2canvas();
      var canvas = await h2c(wrap, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg', 0.95);
      a.download = ('TA-' + info.r[0] + '-' + info.r[2]).replace(/\s+/g, '_') + '.jpg';
      a.click();
    } catch (err) {
      console.error(err);
      showToast('Saved, but the image could not be made. Try again from the TA list.', 8000);
    } finally {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
  }

  crewHooks.findPerson = findPerson;
  // Read-only copy of the rendered roster, for the separate Request Off view.
  crewHooks.people = function () {
    var out = [];
    directoryGroups.forEach(function (g) { g.rows.forEach(function (r) { out.push({ role: g.role, key: keyOf(r, g), row: r }); }); });
    return out;
  };
  crewHooks.showToast = showToast;
  Object.defineProperty(crewHooks, 'currentKey', { get: function () { return current; }, enumerable: true });

  renderDirectory();
  Store.listen(applyRemote);
  document.dispatchEvent(new CustomEvent('crewapp:ready'));
  setTimeout(function () { if (!dirLoaded) { dirError = true; renderDirectory(); } }, 12000);
  // The icon script loads after this runs, so draw the icons again once the page has loaded.
  window.addEventListener('load', function () { if (window.lucide) window.lucide.createIcons(); });
})();
