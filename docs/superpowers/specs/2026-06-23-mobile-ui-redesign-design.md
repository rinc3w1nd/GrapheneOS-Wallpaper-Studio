# Mobile-First UI Redesign — Segmented Tabs

Date: 2026-06-23
Status: Approved (brainstorm)
Scope: `index.html`, `src/style.css`, control/nav portions of `src/app.js`, `tests/wallpaper.spec.js`

## Problem

The UI works but has accumulated cruft: `src/style.css` stacks two "Control redesign
overrides" layers on top of the original rules (duplicate `.control-card`, `summary`,
stepper declarations). Controls use an accordion of `<details>` cards plus −/value/+ steppers
with a tap-to-open precise dialog — functional but busy, and the long accordion scroll is
awkward on mobile.

## Decisions

- Mobile layout: **segmented tabs** — preview pinned on top, a sticky segmented control swaps
  one panel at a time.
- Control mechanism: **visible slider + tappable value chip**; the chip opens the existing
  precise dialog. Drop the inline −/+ steppers from the rows.
- Keep the GrapheneOS dark / green-teal identity; consolidate CSS into one clean,
  token-driven sheet.
- Export buttons stay in the top bar (always one tap away).

## Design

### Layout

- **Preview region** (sticky top, ~48dvh mobile): title, `device·size` line, SVG + Raster
  buttons, floating preview card. Unchanged behavior.
- **Segmented control** (sticky, below preview): four tabs with a sliding active-pill
  indicator. Selecting a tab shows its panel and hides the others.
  - **Setup** — Device, Palette; display chips (Mark / Wordmark / Grain / Fingerprint /
    Official Logo); Fingerprint position/size/display sliders (dimmed when Fingerprint off).
  - **Form** — Seed, Density, Scale X/Y, Depth, Axis X/Y/Z, Origin X/Y, Scaffold, Lines,
    Nodes.
  - **Color** — Accent A/B, Line, BG Top/Mid/Bottom, Accent strength.
  - **Export** — Width, Height, Format, Quality, Scale.
- **Desktop (≥900px):** two columns — preview left, tabbed controls column right (same tab
  mechanism).

### Control mechanism

Each range row renders as `[label] [slider] [value-chip]`:
- The native `input[type=range]` is **visible** again and drag-driven, with
  `touch-action: none` on the slider element only, so dragging it never scrolls the panel
  (the original reason sliders were hidden) while the rest of the panel scrolls normally.
- The **value chip** shows the formatted current value and, when tapped, opens the existing
  `#value-picker` dialog (range + number field + −/+) for precise entry.
- Remove the injected inline −/+ stepper buttons. Keep `setRangeValue`, `formatRangeValue`,
  `mobileNudgeAmount`, `openValuePicker`, and the dialog.

### Aesthetic

- Design tokens in `:root`: spacing scale, radii, type sizes, surfaces, accent. One
  consolidated stylesheet — delete the stacked override blocks.
- Accent reserved for active/selected states (selected tab, checked chip, slider thumb).
- Refined segmented control, floating preview card, consistent field styling.

### app.js changes

- Replace `setupAccordions()` with `setupTabs()`: wire the segmented control to toggle
  `.is-active` on tab buttons and `hidden` on panels; default to the first tab.
- Rework `enhanceRangeControls()`: instead of injecting a `.mobile-stepper`, render the
  value chip and bind it to `openValuePicker`; keep the slider visible. `syncControlReadouts`
  / `syncMobileSteppers` update the chip text.
- Generation, state (`INPUT_IDS`, `readParamsFromInputs`, `setInputsFromParams`), palette/
  device handlers, export, and the value-picker dialog are unchanged.

### Invariants (do not break)

- **Every input `id` is preserved** — state is keyed off them.
- Chip-toggle markup preserved: `label.chip-toggle > input + span`.
- Stable selectors kept: `#device`, `#palette`, `#download-svg`, `#download-png`,
  `#preview > svg`, the input ids.

## Testing

- Keep the existing suite green on Brave + WebKit (toggles, grain×fingerprint matrix,
  generation-structure, lossy export).
- Add: selecting each tab shows its panel and hides the others; the active tab carries
  `aria-selected`/`.is-active`.
- Add: dragging a slider (e.g. `#structureDensity`) or setting its value triggers a
  re-render (preview SVG updates).

## Out of scope

New controls, generation/algorithm changes, palette/device data, URL state.
No new runtime dependencies.
