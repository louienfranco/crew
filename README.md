# crewApp — standalone Crew Directory

This folder is the updated **standalone app from `uploads/index (1).html`**, not a copy of the three-view scheduler in `src/`. The uploaded original and all `src/` files were left unchanged.

## Run

Serve this folder with a static HTTP server, for example:

```sh
cd crewApp
python -m http.server 8001
```

Open `http://localhost:8001` in your browser. No Node.js, npm, framework, compilation, or build step is required.

Internet access is required for the official executable Tailwind Play CDN (`https://cdn.tailwindcss.com`), Firebase, and on-demand html2canvas image export. The local Tailwind configuration immediately follows the CDN script.

**Live-data caution:** the original Firebase configuration, database path, local-storage key, and save methods are preserved. Running the app normally connects to that configured database; “Save and download” can update live records. Browser verification used intercepted Firebase scripts with an in-memory fixture, never the production database.

## Files

- `index.html` — semantic standalone Directory page, retained preview and TA-editor dialogs.
- `styles.css` — consolidated responsive layout, compact visual system, internal focus indicators, and intentional scrolling.
- `tailwind.config.js` — shared theme tokens and compact control components.
- `request-off.js` — Request Off view and modal: table rendering, navigation, validation, date-only save, expiry purge, Canvas image, clipboard/download, Messenger opening.
- `app.js` — the uploaded app's existing Directory/TA/storage/image-download behavior, plus read-only person/database/roster hooks and row-focus restoration after re-render.
- `boot.js` — the existing startup readiness fallback, extracted without behavior changes.
- `ui-controls.js` — custom date picker and dropdown, mirrored from the main app in `src/`: each wraps the native input/select, keeps it as the value source, and emits the same `input`/`change` events the existing logic listens for.
- `icons.js` — local decorative SVG icons, including subtree-aware rendering.
- `accessibility.js` — background inertness, dialog Tab containment, and focus restoration.
- `VERIFICATION.md` — preservation checks, browser coverage, and remaining limitations.

## Applied conventions

- 15px/20px semibold titles; 13px/20px subtitles and control text.
- 32px controls, 26px count pills, 8px toolbar gaps.
- Count and search stay on one row; the search shrinks and caps at 240px.
- Neutral palette, existing colored role bands, 6px control/8px card-dialog radii.
- One 1px internal focus indicator, never stacked rings or an external black outline. Checked checkbox labels and dark actions receive a light indicator; forced-colors uses the system Highlight color.
- Border-box sizing, shrinkable wrappers, no static inline presentation attributes.
- Table scrolling remains inside its region; the 470px minimum table width deliberately preserves readable columns on phones. Dialog bodies scroll when necessary; headers/footers stay available.

## Views: Time of Availability and Request Off

A compact tab bar above the cards switches between two views. "Time of Availability" is the original Directory table and TA maker, unchanged; "Request Off" is a sibling card that mirrors the same header, count pill, search, role groups, row styling and row-click trigger.

| | Time of Availability | Request Off |
| --- | --- | --- |
| Columns | Nickname, First Name, Last Name (equal thirds) | identical three columns, no date column |
| Row trigger | opens the TA generator | opens the Request Off modal |
| Modal | `#availOverlay` (untouched) | `#requestOffOverlay` — date, reason, Submit |

Both tables share one geometry rule (`.app-view .directory-table`): `width:100%`, `table-layout:fixed`, `min-width:470px`, three equal thirds, identical card/scroll wrappers, padding and header rows. Every column edge, the table box and the card edges match to the pixel, so switching tabs moves nothing. Cell text, filters and empty states cannot resize either table.

**Status dot:** a solid orange dot (same 9px size, circle shape and 7px spacing as the green TA dot) marks crew members with at least one active, non-expired request off; everyone else keeps the hollow circle. The dot is driven by a boolean only — no dates, counts, tooltips or data attributes.

**Privacy:** no Request Off dates are ever shown in the app. The roster only exists to pick your own name, the table shows plain names with no status markers, and the modal contains just the helper text, the Date off field, the Reason field and the buttons. The downloaded/shared image is the only place a crew member sees their request details. Submitting still saves only the date to the database, and expiry cleanup is unchanged.

### Time of Availability day card

Each day is one `fieldset.av-day` (14px/12px padding, legend floated inside the card) with the same three stacked rows as `src/`: "Open / Mid / Close" across three equal columns, then full-width "Specify time", then full-width "Rest / Not Available" — every button centred at a uniform 32px height. "Specify time" adds a `from … to …` row directly beneath the buttons, wrapped in the custom dropdown via `CrewUI.enhance`; the native select still holds the value, so the saved/exported TA text is unchanged.

### Custom controls (parity with `src/`)

| Native control | Replacement in `crewApp/` |
| --- | --- |
| `<input type="date">` (Date off) | Button showing "Pick a date" or the formatted date, opening a custom calendar: month navigation, weekday row, disabled past days, today underlined, selected day filled, Clear date, arrow-key movement, Escape to cancel. The native input stays in the DOM, hidden, and still holds the ISO value. |
| `<select>` (TA "Specify time" from/to) | Listbox popup with the same 24 hour options, selected option highlighted, roving arrow keys, Home/End, Escape/Tab to close, outside-click close, focus returned to the button. `sel.value` still matches `app.js`'s expectations and fires `change`. |

Both are enhanced automatically after any render (a single delegated observer, no per-render listeners), close on outside click or scroll, and keep the one 1px internal focus indicator. Field labels and `aria-describedby` move to the visible button so screen readers announce the same name and error.

### Request Off rules

- **Validation:** required date, required reason (trimmed), no past dates, and one request per person per date.
- **Database:** only `crew-scheduler-request-off-v1/{YYYY-MM-DD}/{GROUP|NICKNAME|LASTNAME}: true`. The reason and image are never written to Firebase, file storage, `localStorage`, `sessionStorage`, or IndexedDB.
- **Expiry:** a request stays through its requested day and is deleted after it. Purges run on load, on incoming data, on tab focus/visibility, at local midnight, and before each submission. Realtime Database has no native TTL, so purging requires a client to open the app; guaranteed deletion with nobody online would need a scheduled backend job.
- **Download first, then choose (no automatic redirect):** an A4-portrait PNG (**2480×3508**, i.e. 1240×1754 CSS px at 2× — exactly 1:1.414) drawn with Canvas as a plain, borderless, pure-white business letter: solid `#FFFFFF` throughout (no frame, rules, boxes, tints, header or footer text) with standard 1-inch margins and black serif type. Layout: centred "REQUEST FOR DAY OFF" title, left-aligned date line, `To: Management / Scheduling Team`, `From: <name> (<nickname>)`, `Requested Date Off: <long date>`, `Dear Manager,`, then the user's exact message as the body (word-wrapped at 1.6 line spacing, line breaks preserved, never truncated), closing with `Respectfully,` and the printed name — **no signature line, blank or approval box**. On submit the app:
  1. saves only the date, downloads `request-off-<nick>-<date>.png`, and reveals an action panel in the modal;
  2. **Share General** — `navigator.share({ files: [file], title: 'Request Off' })` when file sharing is available; otherwise the PNG is copied to the clipboard with a paste instruction (and a clear message if the browser blocks copying too);
  3. **Messenger** — the unchanged direct navigation to `https://m.me/luwenprangko` (standard link click).

  Reopening the modal resets the panel. No share sheet opens on its own, and nothing is stored on the server.

## Preserved standalone behavior

Selecting a name opens the TA editor directly. Every open intentionally starts with a blank TA selection, just as in the uploaded app. Section requirements, shift exclusivity, seven-day validation, time validation, one-person Firebase updates, local caching, and personal JPEG download behavior remain intact. The retained preview code is not made into a new public navigation path.

This folder does **not** add Daily Schedule, an administrative Add Person action, or the separate TA table from `src/`; those were not features of this uploaded standalone page.
