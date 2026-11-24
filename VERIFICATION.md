# Standalone Crew App — implementation and verification

## Source and boundaries

- Source: `/home/user/uploads/index (1).html` (standalone Crew Directory).
- Output: `/home/user/crewApp/`.
- The uploaded source and every existing file in `/home/user/src/` have identical SHA-256 hashes before/after this work.
- No root entry point, framework, Node.js/npm setup, or build pipeline was created.
- The Schedule/Directory/TA app in `src/` remains separate and unchanged.

## Applied work

### Structure and CSS hygiene

Extracted the uploaded monolith into HTML, shared CSS/theme, application JS, startup JS, local icons, and a focused accessibility helper. Replaced the Tailwind v4 browser compiler with the agreed executable `https://cdn.tailwindcss.com` followed by `tailwind.config.js`.

Removed the accumulated legacy schedule/sidebar/editor CSS and conflicting successive restyle blocks from this standalone page. Consolidated the styles actually needed by its Directory, TA editor, retained preview, toast, and loading rows. Original style-element IDs remain as declaration-free source hooks, so all original static IDs survive without duplicate style declarations. There are no static inline `style` attributes in the output HTML. Runtime export positioning/styles and variable skeleton widths remain intentional exceptions.

### Compact layout and responsiveness

- One 15px/20px semibold page title and 13px/20px subtitle.
- Count/search toolbar remains a single flex row: nonshrinking 26px count pill, shrinking 32px search, maximum search width 240px, gap 8px.
- Filtered/loading count text can ellipsize at phone widths rather than displacing the input.
- Shared 32px buttons and native time selectors, 13px control text, compact dialog spacing.
- Explicit border-box sizing and minimum-width/height resets at flex/grid boundaries.
- Dialog bodies shrink and scroll internally. Footer wrapping is deliberate on narrow phones; labels remain one line.
- Table columns stay equal-width and the 470px minimum table scrolls horizontally inside its named region rather than overflowing the document.
- Neutral colors, soft role bands, border/radius/shadow identity retained; secondary text uses the darker shared neutral for contrast.

### Focus/accessibility

- Replaced the uploaded page's global “no outlines anywhere” rule and earlier competing focus rules with one persistent 1px internal indicator (`outline-offset: -1px`).
- No stacked focus shadows, offset rings, or border-width changes.
- Dark action/checked-checkbox focus uses a light stroke. Native hidden checkbox focus is drawn on its visible label instead of its invisible 1px input.
- System Highlight focus variant for forced-colors; reduced-motion support.
- Semantic main, section, header, one page h1, named keyboard-focusable table-scroll region, and generated-output label association.
- Background main content becomes inert while a dialog is open; Tab/Shift+Tab stay inside. Escape still uses the original close controller. Closing restores the original row, including a replacement row after a render.
- Local decorative icons are hidden from assistive technology.

### Vanilla JS changes

Only three of the original 31 function declarations changed:

1. `renderDirectory`: replace repeated skeleton class-name string rewriting with `classList.add`.
2. `openTA`: replace the instructional paragraph's inline presentation with a shared CSS class.
3. `renderTimes`: update already-rendered native time selectors in place and update the existing error node instead of destroying/rebuilding controls after every change. This preserves focus and avoids needless option creation.

The other **28 function declarations are byte-identical** to the uploaded application script. The complete storage/Firebase configuration block, database path, serialization, timeout/update methods, local-cache key, original event handlers, section/shift rules, validation, and personal-image generation remain unchanged.

## Preservation checks — passed

- All **36 original static HTML IDs** retained, including original style/script hook IDs.
- Existing static `data-*` and inline event-handler hooks retained; dynamic checkbox IDs, names, keys, day/end attributes, and row delegation preserved.
- All six local relative script/stylesheet references resolve.
- All five JavaScript files parse successfully.
- Exact comparison of the full original storage/configuration block.
- Same original function-declaration set; 28/31 exact comparisons, with the three UI-only changes above reviewed.
- No static inline style attributes.
- Original upload and `src/` hashes unchanged.

## Chromium browser verification — passed

Firebase compat scripts were intercepted and replaced with an isolated 40-person fixture. The tests did not load the real database SDK or read/write the live database. One successful save was exercised as an **in-memory mock update**, followed by an actual html2canvas JPEG download.

### Layout configurations

320×568, 375×812, 640×900, 768×900, 899×900, 900×900, 1024×900, 1440×900, and 667×320.

At all nine configurations:

- 32px search height, single-row toolbar, no count/search overlap.
- No document horizontal overflow.
- TA editor fits within viewport bounds and its body has no horizontal overflow.
- A custom specify-time change preserves the focused select.
- Equal start/end displays validation and disables save.
- Checked/unchecked visible checkbox labels use a single internal focus stroke.
- Backward/forward keyboard focus wraps within the dialog.
- Escape closes and restores row focus; background inertness is removed.

### Focus and flow checks

- **425 successful focused-control checks** over Directory, invalid-time editor, and retained-preview contexts: no stacked shadows, no heavy outline, no focus-induced border-box dimension changes, and no new ancestor overflow flags.
- Separate checked/unchecked checkbox-label assertions at each layout configuration.
- Multi-term search filtering and empty-state/reset behavior.
- Enter on a Directory row opens the editor.
- Blank-on-open behavior retained even when the fixture has saved TA.
- Seven-day TA completion and successful one-person mock-save payload.
- Real personal JPEG download: `TA-TEST_CC_0-Person_0.jpg`, 58,742 bytes for the fixture.
- Focus restored after the table re-renders following save.
- Long search text retains caret scrolling.
- 1px native input focus confirmed under emulated forced-colors.
- **Zero uncaught JavaScript errors.**

### Automated accessibility

axe-core 4.10.3, WCAG 2 A/AA and WCAG 2.1 AA tags, after entry animations settled:

| State | Violations |
| --- | ---: |
| Directory, 320px | 0 |
| Directory, 1440px | 0 |
| TA editor with invalid time, 320px | 0 |
| TA editor with invalid time, 1440px | 0 |
| TA editor with invalid time, 667×320 | 0 |
| Retained person-preview shell | 0 |
| Complete weekly TA | 0 |

## Remaining limitations

- These checks do not certify full WCAG compliance. Manual screen-reader and Firefox/Safari testing remain advisable.
- Real Firebase connectivity, security rules, production writes, and failure/retry behavior were not tested. Existing production configuration is preserved; ordinary use of Save can affect that database.
- Native operating-system select popups are browser/OS surfaces outside page CSS.
- Intentional horizontal table scrolling, vertical dialog scrolling, subtitle truncation, and small-screen filtered-count ellipsis remain. No claim of zero scrollbars or zero layout shifts for all data/error states is made.
- External CDN/network dependencies are retained by the requested zero-build architecture.
- Preview controllers retained from the attachment are not newly exposed to users; their shell received styling/focus checks. The normal standalone path is direct TA editing.
- Temporary test dependencies, fixtures, screenshots, and generated test images were removed from the final package.

## Request Off verification (mocked Firebase, Chromium)

- Expired key `2020-01-01` purged on load with a single update `{ '2020-01-01': null }`; a future key (`2026-11-23`) kept because it is still active.
- Empty date, past date, and whitespace-only reason all blocked with an inline, focused error and zero database writes.
- Valid submission wrote exactly `{ path: 'crew-scheduler-request-off-v1/2026-11-25/CC|TEST CC 0|Person 0', value: true }`; the reason text appeared in no write and in neither web storage.
- Duplicate date refused without a second write.
- PNG verified as a real 2000×1240 image (128,278 bytes in mock run); filename `request-off-<nick>-<date>.png`.
- `window.open` received exactly `https://m.me/luwenprangko`.
- Clipboard write of `image/png` verified with clipboard permission granted; the download fallback remains available when it is refused.
- TA maker regression in the same dialog: seven-day form saved once, JPEG downloaded, focus restored to the row, no changes to existing storage path or payload.
- Layout: side-by-side at 1440, 900, 768, 640 and 667×320; stacked at 375 and 320. Dialog stayed within viewport bounds, no document or form horizontal overflow.
- axe-core 4.10.3 (WCAG 2.0/2.1 A/AA): 0 violations in the validation state at 1440px and in the populated state at 375px.
- Zero uncaught JavaScript errors.

Additional fix retained from this pass: a live re-render after a save no longer drops keyboard focus to `<body>`; the focused person row is restored. Dialog bodies also reset scroll to the top on open.

## Request Off view refactor (mocked Firebase, Chromium)

- Navigation: Time of Availability is the default (`aria-current="page"`); switching tabs toggles only view visibility and active state, with 32px tabs that stay on one row at 320px.
- Table parity: the Request Off table reuses the Directory table classes. Measured header padding/background/size/color and cell padding/font/border are identical; role banner markup and counts match. The Request Off table adds one "Date off" column (min width 560px vs 470px) and keeps the existing internal horizontal scroll.
- View content: 40 rows across CC/GEL/CREW; active date `Nov 23, 2026` shown from the database; the expired `2020-01-01` entry was purged on load with a single update and never rendered.
- Dedicated modal: row click/Enter/Space opens `#requestOffOverlay` only; `#availOverlay` stays closed and contains no Request Off fields. Date and reason are `required`, the date has a `min` of today, and focus lands on the date field.
- Validation: empty date, past date and whitespace-only reason are blocked with focused inline errors and zero writes; a duplicate date is refused without a write.
- Submission: exactly `{ path: 'crew-scheduler-request-off-v1/2026-11-26/CC|TEST CC 0|Person 0', value: true }` was written; the reason appears in no database write and in neither web storage. PNG verified at 2000×1240; clipboard held `image/png`; `window.open` received exactly `https://m.me/luwenprangko`. The new date appeared in the table immediately.
- Expiry: `2020-01-01` nulled on load; a future date kept; midnight/focus/visibility purge handlers installed.
- Close restores focus to the originating Request Off row; `inert` is released.
- Time of Availability regression: the availability dialog still measures 520px, has its original eight fieldsets and no Request Off content; a full seven-day TA save plus JPEG download succeeded on the original database path with no reason text in the payload, and focus returned to the Directory row.
- Layouts: 16 dialog/view combinations across 1440×900, 900×900, 768×900, 640×900, 480×800, 375×812, 320×568 and 667×320 — every dialog stayed inside the viewport with no page-level horizontal overflow.
- axe-core 4.10.3 (WCAG 2.0/2.1 A/AA): 0 violations for the Request Off modal at 1440px and 375px.
- Focus audit at 320px across tabs, search and modal controls: 48 controls, all with the single 1px internal stroke and no stacked shadows.
- Zero uncaught JavaScript errors.

## Cross-view width parity (mocked Firebase, Chromium)

- Shared geometry: both views now resolve `.app-view .directory-table` (`width:100%`, `table-layout:fixed`, `min-width:470px`) plus equal-share column rules; the previous `#offTable{min-width:560px}` override is removed.
- Measured at 1440×900, 1200×900, 900×900, 768×900, 640×900, 480×800, 375×812, 320×568 and 667×320: content wrapper, views wrapper, card box, scroll-region client/scroll width, table box, table `min-width`/`max-width`/layout, and page width are identical between views at every size.
- Table scroll geometry matches: 1058px visible with no inner scroll at ≥1440; 470px table inside a 294px scroll region at 320px in both views.
- Columns are equal shares within each view (3 × 352.66px at 1440 in the roster table; 4 × 264.5px in the Request Off table), so a column boundary cannot land on the other view's grid — only the column count differs.
- Stability: six consecutive tab switches returned byte-identical metrics. Replacing a date cell with a very long string, shortening a nickname, hiding a whole role group, and filtering to zero matches left the card and table width unchanged.
- Regression: both modals still open from their own tables, the availability dialog is still 520px with eight fieldsets, the saved Request Off date is still listed, Escape restores focus, and no runtime errors occurred.

## Name-only Request Off table and identical columns

- The Request Off table now uses the same three columns and the same header labels as the availability table; `colspan` for group rows and the empty state changed from 4 to 3.
- No date text is rendered in the table. A saved request appears only as the filled green dot with `aria-label="Request off saved: <date>"`; the date is still listed in the Request Off modal.
- Headers, header x-positions, cell x-positions, per-column widths, table width and scroll width are byte-identical between the two views at 1440×900, 1000×760, 900×900, 768×900, 640×900, 375×812, 320×568 and 667×320 (e.g. three columns of 352.66px at 1440; three of 156.66px with a 470px table at 320).
- Removed the now-unused `shortDate()` helper and the Request Off-only column CSS.
- Request Off submission unchanged: the date-only write, PNG (2000×1240), clipboard, Messenger open and zero reason storage all still pass; the TA dialog still opens with its eight fieldsets and no errors were logged.

## Request Off native share flow (mocked Firebase, Chromium)

- **Auto-download removed:** the `<a download>` helper is deleted; `request-off.js` contains no download trigger. No scenario below produced a download event.
- **Native share:** with `navigator.canShare`/`navigator.share` stubbed, one `navigator.share` call carried `title: "Request Off"`, a text summary, and a 135,919-byte `image/png` file named `request-off-test-cc-2-2026-12-02.png`. No Messenger tab opened, no download occurred, and the toast read "Pick Messenger in the share sheet".
- **Fallback:** with the APIs absent, the clipboard held `image/png` and `window.open` received exactly `https://m.me/luwenprangko`; toast asked for Ctrl+V / Cmd+V; the Messenger link notice stayed hidden; no download.
- **Share failure:** a rejected `navigator.share` (NotAllowedError) fell back to clipboard image + Messenger with no download.
- **Clipboard blocked entirely:** image and text writes rejected; the reason was preserved in the form, the toast explained it, and the Messenger fallback notice was shown; no download.
- **User cancellation:** an `AbortError` did not open Messenger or fall back; the date remained saved and the toast reported the cancellation.
- **Storage rules unchanged:** every case wrote exactly `crew-scheduler-request-off-v1/<date>/<person key>: true`; the reason never appeared in any write or web storage; the expired 2020 entry was still purged on load.
- **Regression:** the TA maker still opened with eight fieldsets and produced its JPEG download; no runtime errors in any scenario.

## Request Off: clipboard copy + direct link navigation (mocked Firebase, Chromium)

- **Removed:** `navigator.share`, `navigator.canShare`, the popup `window.open` path, the `<a download>` helper and all file downloads. No custom URI schemes exist in the code.
- **Normal case (desktop and 375px mobile):** one anchor click to `https://m.me/luwenprangko` (`rel="noopener"`, no `target`), clipboard held `image/png`, zero `navigator.share` calls, zero popups, zero downloads.
- **Clipboard refused (`NotAllowedError`):** navigation still occurred; toast confirmed the date was saved; no download.
- **Clipboard API missing entirely:** navigation still occurred.
- **Clipboard write never resolves:** navigation still occurred — the redirect does not await the copy.
- **Database:** exactly `crew-scheduler-request-off-v1/<date>/<person key>: true` was written in every case; the reason appeared in no database write and neither web storage; the expired 2020 entry was still purged on load.
- **Regression:** Request Off keeps three columns; the TA maker still opened with eight fieldsets and produced its JPEG; no runtime errors in any scenario.

## Request Off: download-first with "Share General" / "Messenger" (mocked Firebase, Chromium)

- **Submit:** downloaded `request-off-test-cc-2-2026-12-15.png` immediately, revealed the action panel with buttons labelled exactly "Share General" and "Messenger", moved focus to Share General, and performed **no navigation** (`__nav` empty).
- **Database:** exactly `crew-scheduler-request-off-v1/2026-12-15/CC|TEST CC 2|Person 2: true` was written; the reason appeared in no write nor in `localStorage`/`sessionStorage`; the expired 2020 entry was still purged on load.
- **Share General (supported):** one `navigator.share` call with `title: "Request Off"`, the text summary and a single `image/png` file; the panel reported "Shared."
- **Share General (unsupported):** clipboard held `image/png` and the panel reported the paste instruction; no navigation occurred.
- **Share General (rejected):** fell back to the clipboard image with the same instruction.
- **Messenger:** produced exactly one anchor click to `https://m.me/luwenprangko` (`rel="noopener"`, no `target`), identical to the previous behaviour; zero popups.
- **Mobile 375px:** dialog stayed within the viewport (16px margins), both buttons visible, no page-level overflow.
- **Reset/regression:** reopening the modal hides the action panel; the TA maker still opened with eight fieldsets and produced its JPEG; no runtime errors.

## Request Off privacy restriction (mocked Firebase, Chromium)

Fixture contained other crew members' requests for 2026-11-23, 2026-12-20, 2026-12-21 plus an expired 2020-01-01 entry.

- **View:** zero `.ta-dot.has`, zero `[aria-label]` dots, zero own-row markers and no date text in `#offTable`; the table contains only names. No other member's request status is inferable.
- **Modal, other person:** opening a member who has a request in the database showed no saved-dates list (`#offSavedWrap` hidden, empty `#offPending`) and none of the other dates anywhere in the dialog; the note states that other crew members' requests are private.
- **Own requests only:** after filing for GEL 1 / 2026-12-24, the modal listed only `December 24, 2026` — the pre-existing 2026-11-23 entry on that same person key (filed from elsewhere) stayed hidden — and only that one row was marked in the table.
- **Duplicate check:** a second submission for the same date was refused with the neutral message "You already saved an off request for that date." (database check retained).
- **Writes unchanged:** exactly `crew-scheduler-request-off-v1/2026-12-24/GEL|TEST GEL 1|Person 1: true`; the reason appeared in no write and neither web storage. Only the person key and the filed date are remembered in `sessionStorage` for this tab.
- **Flows preserved:** download-first submit, "Share General" (PGN file named `request-off-test-gel-1-2026-12-24.png`) and "Messenger" (`https://m.me/luwenprangko`) all still worked. Expired 2020-01-01 was still purged on load.
- **Fresh session:** no markers anywhere and no other request data, confirming nothing is derived from other users' records.
- **Regression:** the Time of Availability view and its eight-fieldset dialog remain unchanged; no runtime errors.

## "Saved dates" removed from the Request Off UI

- Deleted from markup: `#offSavedWrap`, `#offSavedTitle`, `#offPending` and their CSS. Deleted from code: `renderSaved()`, `ownDates()`, `filedHere()`, `rememberFiled()`, the own-person session marker, the `is-own` row class and the own-status dot. Replaced the helper copy that mentioned dates appearing below.
- Modal contents measured (fixture with requests on 2026-11-23, 2026-12-20, 2026-12-21 and an expired 2020-01-01): inputs are exactly `offDate` and `offReason`; labels are exactly "Date off *" and "Reason *"; buttons are Cancel / Submit request (plus Share General / Messenger only after a submission). None of those dates, nor the strings "Saved dates" or "appear below", appears in the dialog text or HTML.
- The table renders plain name rows with zero `aria-label` dots and zero status markers; no date text anywhere.
- Re-opening rows for other members with existing database requests still shows the form-only dialog, and the post-submit panel is reset.
- After submitting for GEL 1 / 2026-12-24, no date list appeared; only "Request saved. Image downloaded." with Share General / Messenger. Share General produced `request-off-test-gel-1-2026-12-24.png`; Messenger navigated to `https://m.me/luwenprangko`.
- Database: exactly `crew-scheduler-request-off-v1/2026-12-24/GEL|TEST GEL 1|Person 1: true`; the reason appeared in no write and neither web storage; expired 2020-01-01 still purged on load.
- Mobile 375px: dialog 343×438 within bounds. TA maker unchanged (eight fieldsets). No runtime errors.

## Boolean-only orange status dot (mocked Firebase, Chromium)

- `activeKeys()` replaced the date-returning helper and yields only `{ personKey: true }` for requests on or after today; the table row receives a single `hasRequestOff` boolean.
- With a fixture of one expired date, one tomorrow, one today: exactly the three members holding a non-expired request rendered `.ta-dot.has-ro`; the expired-only member stayed hollow (`class="ta-dot"`, transparent background, attributes exactly `class` and `aria-hidden`).
- Geometry matches the TA dot exactly — 9×9px, `border-radius: 50%`, `margin-right: 7px` — with solid `rgb(234, 88, 12)` fill instead of green.
- No leaks: a DOM sweep of `#offTable` found no `title` attributes, no `aria-label`, no `data-*` carrying dates and no ISO date or month-name text; hovering a row produced no tooltip.
- Modal unchanged in scope: inputs are `offDate` and `offReason`, labels "Date off *" / "Reason *", buttons Cancel / Submit request (Share General and Messenger only after submitting). The only ISO date present is the date input's own `min` attribute (today). No "Saved dates", no "appear below".
- Submission: downloaded `request-off-test-gel-1-<tomorrow>.png`, wrote exactly `crew-scheduler-request-off-v1/<tomorrow>/GEL|TEST GEL 1|Person 1: true`, purged the expired key, and Share General / Messenger still produced the same file share and `https://m.me/luwenprangko` navigation.
- Empty request branch: after `applyRemote({})`, zero orange dots and 40 hollow circles.
- Source check: the table-rendering function contains no date formatting, no date lookups, no `title=` and no `aria-label`, and does contain `hasRequestOff`.
- Time of Availability view and its eight-fieldset dialog remain unchanged; no runtime errors.

## Custom UI parity with src/ (mocked Firebase, Chromium)

**Date picker (Request Off)**
- The native `#offDate` is visually hidden (1px, `display:none` for `type=date`) and its value is untouched; the visible button reads "Pick a date" and carries `aria-haspopup="dialog"`, `aria-expanded`, `aria-label="Date off"` and `aria-describedby="offError"`.
- Opening shows a `role="dialog"` calendar with 30 day buttons for November 2026, 22 of them disabled for dates before the `min` (today), and focus moved inside.
- Choosing tomorrow set the ISO value, emitted `input` + `change`, updated the button label, closed the panel and returned focus to the button.
- The value drives submission: the downloaded PNG and the single date-only write succeeded after picking through the calendar.
- Escape closes without changing the value; Clear date empties the field and restores "Pick a date"; ArrowRight/ArrowLeft/ArrowUp/ArrowDown and Home/End move between days.
- Validation still focuses the visible control: an empty date focuses `offDateBtn` and marks it `aria-invalid`.

**Custom dropdown (TA "Specify time")**
- Both native `<select>` elements are hidden and replaced by buttons labelled "Monday from"/"Monday to" reading "9AM"/"5PM".
- The popup is `role="listbox"` with 24 `role="option"` buttons, the current option selected and focused; ArrowDown + Enter changed the value to `10`, the button label to `10AM`, and the generated TA to `Monday: SPECIFY 10AM-5PM` — proving the same `change` contract `app.js` relies on.
- Equal start/end still shows "Start and end must differ" and disables Save; disabling the native select disables the button; Escape, outside click and scrolling close the panel and restore focus.
- Full seven-day save produced `TA-TEST_CC_1-Person_1.jpg` and wrote `custom.Monday.specify = {from: 10, to: 17}` to the existing database path.

**Layout, accessibility and hygiene**
- Date popup stayed inside the viewport at 1440×900, 900×800, 375×812, 320×568 and 667×320 with no page-level horizontal overflow.
- axe-core 4.10.3 (WCAG 2.0/2.1 A/AA): 0 violations for the Request Off modal, the open calendar (also at 375 and 320), the TA dialog and the open time listbox. Weekday labels were darkened from 2.56:1 to pass contrast.
- Focus stays a single 1px internal stroke with no stacked shadow on both new controls; selected list options and days keep the dark fill.
- No console or runtime errors in any scenario. `src/` was not modified; `crewApp.zip` rebuilt (10 files, no nested archive).

### Revision: Time of Availability day card (legend spacing, 3 + 2 grid, custom time dropdowns)

- **Legend spacing:** `.av-day` padding is `14px 12px 12px`, the legend floats inside the card (`float:left;width:100%;margin:0 0 10px`), so its top sits 15px from the card border instead of hugging it.
- **Balanced grid:** `.av-opts` is a flex-wrap row with a 6px gap; `.av-opt` is `(100% - 12px)/3` wide and the two `av-wide` buttons are `(100% - 6px)/2`, giving a 3 + 2 layout whose rows fill the card width. `.av-opt` is a centred flex box (`min-height:32px;line-height:16px`), so all five buttons share one height and "Specify time" is no longer a tall empty cell.
- **Custom dropdowns:** `renderTimes()` keeps the stable ids `av-time-<Short>-from|to`, wraps each caption + select in `.av-time-lbl` (two-column grid: `2.5em` caption + flexible control) and calls `CrewUI.enhance(box)`, so the native selects become the same popover widget used elsewhere in the app. The native select remains the value holder, so the saved/exported TA text is unchanged.
- Verified (mocked Firebase, same run as `src/`): 8 day cards, legend gap 15px, 3 + 2 rows with equal heights, two custom buttons at 32px with the same top/width, 24-option popover, picking `10AM` yields `Monday: SPECIFY 10AM-5PM`, zero console errors. Screenshot `crewApp/.qa-avail-crew.png`.

### Revision: day cards rebuilt as the 3-row stacked layout

`.av-day .av-opts` is now a three-row grid (`repeat(3, minmax(0,1fr))`, 6px gap): "Open / Mid / Close" fill three equal columns, "Specify time" and "Rest / Not Available" are `grid-column:1/-1` so each takes a full row. All five buttons keep one height/radius/padding, the legend keeps its 15px breathing room, and "Specify time" still renders the custom `from`/`to` dropdowns directly beneath the buttons. The "Can duty in" card keeps its two-column `av-grid-2` variant.

Verified at 1440/375/320px with mocked Firebase: seven day cards each `[3, 1, 1]` columns, one button height, full-width rows 2–3, no overflow, all 7 × 5 shift states toggle, custom dropdowns 32px/equal width/24 options, picking `10AM` yields `Monday: SPECIFY 10AM-5PM`, Rest exclusivity intact, zero console errors.

### Revision: Request Off card redesigned as an A4 bond-paper document

`request-off.js` `canvasFor()` no longer draws the old 1000×620 landscape strip. The card is now a document sheet:

- **Canvas:** `A4 = { w: 1240, h: 1754, scale: 2 }` → a **2480×3508** PNG, exactly the ISO A4 portrait ratio (1:1.414). A light desk colour fills the image and a white sheet (`40px` edge) carries a 1px hairline frame plus a second inner keyline.
- **Hierarchy:** centred letterhead (`CREW DIRECTORY`, tracked) → rule → serif "REQUEST OFF FORM" title with a wide-tracked "LEAVE / REQUEST OFF NOTICE" subline → double rule → metadata rows (document no., date filed, crew member with nickname, role/group, requested date off in long form) each separated by a light rule → "REASON / DETAILS" heading and rule → serif body.
- **Body text:** `wrapAll()` preserves embedded newlines and wrapping paragraphs, never truncates, and auto-reduces line height/font (down to 15px) so a very long reason still fits above the footer. The reason is drawn verbatim — nothing is hardcoded or rewritten.
- **No signature block:** the only footer content is provenance ("CREW DIRECTORY · REQUEST OFF" and "FILED …"); no Signature/Approved-by/sign-off wording exists anywhere in the renderer.
- **Privacy and flow untouched:** `buildImage()`, `sharePayload()`, `downloadBlob()`, `submit()` and the Share General / Messenger handlers are unchanged — only the drawing code was replaced. The cached blob/file is still built from the same canvas and never persisted.

Verified with mocked Firebase (`.qa_a4.py`, 9 assertions, 0 failures, 0 console errors) for a one-line reason and a three-paragraph reason: both downloads are 2480×3508 (ratio 0.70696 = 1/1.414), filenames stay `request-off-<nick>-<date>.png`, the post-submit action panel (Share General + Messenger) appears, database writes are date-only booleans and the reason appears in neither the database writes nor `localStorage`/`sessionStorage`, and no signature/approval text is painted. Rendered samples: `.qa-a4-short.png`, `.qa-a4-long.png` (scratch, removed from the archive).
