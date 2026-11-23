# Mobile & tablet audit

Branch: `feat/native-mobile-tablet`. Scope: UI/layout only. No business logic, API calls, routes or data shapes change.

## Device classes

| Device  | Width        | How it is targeted |
|---------|--------------|--------------------|
| Mobile  | < 768px      | `@media (max-width: 767.98px)`, `useDevice() === 'mobile'` |
| Tablet  | 768–1279px   | `@media (min-width: 768px) and (max-width: 1279.98px)`, `'tablet'` |
| Desktop | ≥ 1280px     | Unchanged. No new rule applies at ≥ 1280px. |

## Deviation from the brief: no Tailwind

The brief assumes Tailwind. This app has no Tailwind: it uses ~3,350 lines of hand-written CSS with design tokens
(`index.css`, `enterprise.css`, `theme-bistro.css`) and runtime themes (`data-theme`, `data-palette`, `data-density`).
Adding Tailwind would mean its preflight reset touches every desktop element (breaking "desktop must look identical"),
and two styling systems would coexist. Instead, every Tailwind item in the brief maps onto the existing system:

| Brief (Tailwind)                         | Implemented as |
|------------------------------------------|----------------|
| `tablet` / `desktop` screens             | Media queries above, plus `useDevice()` |
| `portrait` / `landscape` variants        | `(orientation: …)` media queries, `isPortrait` from `useDevice()` |
| `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` | `.pt-safe` … utility classes and `--safe-*` tokens using `env(safe-area-inset-*)` |
| Colour / radius / shadow / z-index tokens | `--z-*`, `--m-*` tokens in `src/adaptive.css`, reusing the existing colour tokens so all themes keep working |
| `h-dvh` / `min-h-dvh`                    | `--vh` already exists (needed for the desktop 80% zoom); mobile sets it to `1dvh` |
| `darkMode: 'class'`                      | Already implemented via `data-theme` |
| `active:` variants                       | `:active` pressed styles added for touch in `adaptive.css` |

## Findings

1. **Phones have no navigation at all (blocking).** At ≤ 900px the sidebar is translated off-screen
   (`index.css` `.sidebar { transform: translateX(-260px) }`) and nothing replaces it.
2. **Desktop is zoomed to 80%** on `min-width: 1024px` + fine pointer (`enterprise.css`). Media queries use real
   pixels, so device classes are unaffected, but nothing new may apply at ≥ 1280px.
3. **Existing breakpoints are 900 / 1100 / 1200px**, not 768 / 1280. Old rules are kept; new rules layer on top.
4. **Shared primitives give leverage.** 21 `<Modal>`, 14 `<Drawer>`, 6 `<Tabs>`, 13 `<Segmented>` and 27 `.data-table`
   uses all go through `shared/Modal.tsx`, `shared/ui.tsx` and the `.data-table` class. Converting those converts most pages.
5. **Wide tables** (27) overflow on phones inside `.table-container`.
6. **Fixed widths:** drawer 460 / 640px, POS ticket 400px, `.grid-main-side` 320px side column, toolbar search 220px min,
   onboarding 260px rail, `bar-row` 120 / 80px columns.
7. **Hover-only affordances:** `title=` tooltips (≈ 90) and row hover states; the user menu opens a click popover.
8. **Small tap targets:** `btn-sm` (26–28px), `.topbar-select` (26px), table row actions, sidebar toggle (24px).
9. **Inputs below 16px** (`--font-size-sm` / `xs`) trigger iOS zoom-on-focus.
10. **Toasts** sit at top-right; on phones they collide with the top bar.

## Inventory

Effort: S < ½ day, M ≈ 1 day, L 2+ days.

### Shell & shared

| Component | Current behaviour | Mobile plan | Tablet plan | Effort |
|---|---|---|---|---|
| `layout/Layout.tsx` | Sidebar + fixed TopBar + content | `AppShell` → `MobileLayout` | `AppShell` → `TabletLayout` | M |
| `layout/Sidebar.tsx` | 216px sidebar, collapsible to icon rail | Hidden; replaced by `BottomTabBar` + `MoreSheet` | `NavigationRail` (icon + label), expandable to full sidebar, state in localStorage | M |
| `layout/TopBar.tsx` | Title, location select, drawer status, clock, user popover | `MobileTopBar`: compact title on scroll, location chip, account button → `ActionSheet` | Same TopBar, offset by rail width; bigger tap targets | M |
| `shared/Modal.tsx` | Centered dialog, max 520px, no focus trap | Bottom sheet (drag handle, swipe-down dismiss); `lg`/`xl` → full-screen with Cancel/Title/Save bar | Centered, max-w 560 (lg/xl up to 90vw) | M |
| `shared/ui.tsx` `Drawer` | 460/640px right panel | Full-screen sheet sliding up, sticky footer | Side drawer (max 80vw) | S |
| `shared/ui.tsx` `Tabs` | Underlined tab row | Horizontally scrollable segmented strip | Unchanged | S |
| `shared/ui.tsx` `Segmented` | Button group | Full-width, 44px tall | Unchanged | S |
| `shared/ui.tsx` `PageHeader` | Title + actions row | Large title; actions wrap to full-width row / FAB | Title + actions | S |
| `shared/ui.tsx` `SearchBox`, `Field` | 13px inputs | 16px inputs, correct `inputMode` | Unchanged | S |
| `.data-table` (27 uses) | Full table, scrolls sideways | `ResponsiveTable` card list (column `priority`, `mobileLabel`) | Condensed: low-priority columns hidden | L |
| Toaster (`App.tsx`) | top-right | bottom-center, above tab bar | top-right | S |
| `index.html` | Basic viewport | `viewport-fit=cover`, theme-color, apple web-app meta | Same | S |

### Pages

| Page | Current behaviour | Mobile plan | Tablet plan | Effort |
|---|---|---|---|---|
| Dashboard | KPI grid, chart, table | KPIs 2-up, chart full width, table → cards | KPIs 3–4-up, 2-column panels | S |
| POS Terminal | Product grid + 400px ticket | Product grid full screen; ticket as bottom sheet with sticky "Charge" bar showing total | Grid + 320–340px ticket (landscape); portrait: ticket as sheet | L |
| Orders | Filters + table + detail drawer | Card list, filters in bottom sheet, detail full screen | Master–detail split in landscape | M |
| Floor & Tables | Floor plan canvas + editor | Pinch/scroll canvas, table actions in action sheet; editor desktop/tablet only | Canvas fills pane, actions in popover | M |
| Reservations | Table + modals | Grouped list by time, FAB "New booking" | Condensed table | M |
| Kitchen Display | Ticket grid | 1 column, swipe/tap to bump | 2–3 columns | S |
| Cash & Shifts | KPIs + tables + modals | Cards, sticky "Open/Close drawer" bar | 2 columns | S |
| Menu | Category list + item table + modals | Category segmented strip, item cards, full-screen editors | Master–detail (categories → items) | L |
| Promotions | Table + drawer | Cards, full-screen editor | Condensed table | S |
| Inventory | Tabs + 6 tables + drawers | Segmented tabs, cards, filters in sheet | Condensed tables | M |
| Customers | Table + drawers | List rows with avatar, detail full screen | Master–detail | M |
| Staff | Tabs + tables + drawers | List rows, detail full screen | Master–detail | M |
| Reports | Charts + table | Stacked charts, cards | 2-up charts | S |
| Locations | Tables + modals + drawer | Grouped list | Condensed table | S |
| Settings | 280px side menu + forms | iOS-settings list → pushed section pages | Split view (menu + form) | M |
| Onboarding | 260px step rail + forms | Step indicator on top, single column, sticky Next bar | Single pane, 2-column forms | M |
| Login / Register | Split hero + form (already stacks ≤ 900px) | 16px inputs, safe areas, sticky submit | Unchanged | S |
| Landing | Already responsive (previous work) | – | – | – |

## Phases

1. Tokens, global CSS, viewport meta, `useDevice` / `DeviceProvider` ✅
2. `AppShell`, `MobileLayout`, `TabletLayout`, `BottomTabBar`, `MobileTopBar`, `NavigationRail`, `MoreSheet` ✅
3. Overlays: `BottomSheet`, `ActionSheet`, `FullScreenModal`, shared `Modal`/`Drawer` adaptive, toast placement ✅
4. Content: `ListItem`/`ListGroup`, `SwipeableListItem`, `MobileCard`, `ResponsiveTable` (+ automatic card
   fallback for every existing `.data-table`), `SegmentedControl`, `FAB`, `StickyActionBar` ✅ — usage in
   `frontend/src/components/adaptive/README.md`
5. Forms: `MobileSelect`, input attributes, keyboard-safe focus
6. Pages, in the order above (most used first: POS, Orders, Dashboard, Tables, KDS …), **after approval of this table**
7. Polish: transitions, pull-to-refresh, skeletons, PWA manifest
