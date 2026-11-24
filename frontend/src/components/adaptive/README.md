# Adaptive UI components

Native-style phone and tablet UI for the console. Desktop (≥ 1280px) is unchanged.
Plan and audit: [`docs/mobile-tablet/AUDIT.md`](../../../../docs/mobile-tablet/AUDIT.md).

## Device classes

| Device  | Rule                                         | `useDevice().device` |
|---------|----------------------------------------------|----------------------|
| mobile  | < 768px wide, or a phone in landscape (< 500px tall) | `'mobile'` |
| tablet  | 768–1279px                                   | `'tablet'` |
| desktop | ≥ 1280px                                     | `'desktop'` |

`DeviceProvider` (in `App.tsx`) sets `html[data-device]` and `html[data-orientation]` before first paint.
**Prefer CSS** keyed on those attributes (see `src/adaptive.css`); use `useDevice()` only when the
component tree must differ.

```tsx
const { device, isMobile, isTablet, isTouchLayout, isPortrait } = useDevice();
```

Utility classes: `.only-mobile`, `.only-tablet`, `.only-desktop`, `.touch-only`, `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe`.

## Shell (automatic)

`layout/Layout.tsx` renders one shell for every device; pages need no changes.

- **mobile** – `MobileTopBar` + `BottomTabBar` (4 tabs by `TAB_PRIORITY` in `lib/nav.tsx`, rest in the "More" sheet)
- **tablet** – `NavigationRail` (expand/collapse remembered) + the desktop `TopBar`
- **desktop** – `Sidebar` + `TopBar`, exactly as before

### `usePageMeta`

```tsx
usePageMeta({
  title: `Order #${order.ticketNumber}`, // top-bar title (default: nav label)
  back: '/orders',                      // or -1 for history back; shows a back chevron on phones
  actions: <button className="m-icon-btn" aria-label="Print"><IconPrinter /></button>,
  largeTitle: false,                    // page has no PageHeader → compact title always visible
  hideTabBar: true,                     // full-screen flows (checkout)
}, [order?.ticketNumber]);
```

## Overlays

Existing `<Modal>` and `<Drawer>` adapt on their own: phones get a bottom sheet (`sm`/`md` modal), or a
full-screen sheet with a sticky action bar (`lg`/`xl` modal, every drawer). Tablets get focus trap, Esc and
scroll lock.

```tsx
<BottomSheet open={open} onClose={close} title="Filters" snapPoints={[0.4, 0.9]}
  footer={<button className="btn btn-primary" onClick={apply}>Apply</button>}>
  …
</BottomSheet>

<ActionSheet open={open} onClose={close} title="Table A4"
  actions={[
    { label: 'Move table', icon: <IconArrowsMove />, onSelect: move },
    { label: 'Void check', destructive: true, onSelect: voidCheck },
  ]} />

<FullScreenModal open={open} onClose={close} title="New customer"
  footer={<button className="btn btn-primary" onClick={save}>Save</button>}>…</FullScreenModal>
```

All overlays trap focus, close on Esc, return focus to the trigger and lock page scroll. Focused fields
inside sheets scroll clear of the on-screen keyboard (`useKeyboardSafeFocus`).

## Content

### `ResponsiveTable`

Full table on desktop · condensed on tablet (priority 3 hidden) · cards on phones.

```tsx
<ResponsiveTable<Order>
  rows={orders}
  rowKey={(o) => o.id}
  onRowClick={(o) => setOpenId(o.id)}
  empty={<Empty title="No orders found" />}
  columns={[
    { key: 'no', header: '#', cell: (o) => `#${o.ticketNumber}`, slot: 'title', className: 'strong' },
    { key: 'guest', header: 'Table / guest', cell: (o) => o.table?.name || '—', slot: 'subtitle' },
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge … />, slot: 'trailing' },
    { key: 'server', header: 'Server', cell: (o) => o.user?.name, priority: 2 },
    { key: 'time', header: 'Time', cell: (o) => dateTime(o.createdAt), priority: 3 },
    { key: 'total', header: 'Total', cell: (o) => money(o.total), align: 'right' },
  ]}
/>
```

Mark cells that contain their own controls with `interactive: true` so taps don't open the row.

**Automatic fallback:** until a table is converted, every `table.data-table` with a `<thead>` is shown as
cards on phones (`useAutoTableCards` copies header text into `data-label`). Key/value tables without a
header stay as they are.

### Lists and cards

```tsx
<ListGroup label="Account" footer="Changes apply to every location">
  <ListItem icon={<IconUser />} title="Profile" subtitle="Name, email" to="/settings" />
  <ListItem title="Theme" trailing="Dark" onClick={openTheme} />
  <ListItem title="Sign out" destructive chevron={false} onClick={signOut} />
</ListGroup>

<SwipeableListItem actions={[{ label: 'Delete', icon: <IconTrash />, tone: 'danger', onSelect: remove }]}>
  <ListItem title="Priya" subtitle="Server" />
</SwipeableListItem>

<MobileCard title="Masala Dosa" subtitle="Tiffin" trailing="₹85.00" onClick={open}
  actions={<button className="btn btn-secondary">Edit</button>}>
  <KeyValue label="Margin">68%</KeyValue>
</MobileCard>
```

Swipe actions are real buttons and also open on keyboard focus, so they are never swipe-only.

### Actions

```tsx
<FloatingActionButton icon={<IconPlus />} label="New order" onClick={create} extended />  {/* phones only */}

<StickyActionBar>   {/* phones: fixed above the tab bar · tablet/desktop: right-aligned row */}
  <button className="btn btn-secondary">Cancel</button>
  <button className="btn btn-primary">Save</button>
</StickyActionBar>

<SegmentedControl ariaLabel="Period" value={range} onChange={setRange}
  options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }]} />  {/* full width on phones */}
```

### Forms

Keyboard hints are automatic on touch devices (`useAutoInputHints`): number keypad for `type="number"`,
email/tel/password autocomplete, search/done enter keys. Explicit props on a field always win.

```tsx
<MobileSelect label="Category" placeholder="All categories" value={cat} onChange={setCat}
  options={categories.map((c) => ({ value: c.id, label: c.name }))} />
{/* native <select> on desktop/tablet and ≤ 6 options; bottom-sheet picker on phones, searchable past 15 */}
```

### Infinite lists

```tsx
const all = useAccumulatedPages(data?.items, page);            // pages merged by id; page 0 starts fresh
<LoadMore hasMore={all.length < total} loading={loading} onLoadMore={() => setPage((p) => p + 1)} />
```

### Polish

```tsx
<PullToRefresh onRefresh={() => reload(true)}>   {/* phones only; renders no wrapper element */}
  <div className="page-container">…</div>
</PullToRefresh>

{loading && !data && (isMobile ? <SkeletonCards label="Loading orders" /> : <LoadingSpinner />)}
<SkeletonKpis count={8} />   <SkeletonTiles count={8} />   <Skeleton w={240} h={28} />

{error && !data && <ErrorState title="Couldn't load orders" message={error} onRetry={() => reload()} />}
```

Page transitions are CSS-only and need no code: on touch layouts each new page element fades/slides in
when it mounts (`adaptive-page-in`), Settings sections push in from the right, and everything respects
`prefers-reduced-motion`.

### Installable app

`public/manifest.webmanifest` (standalone, GMOS icons incl. maskable, shortcuts to POS / Orders / Kitchen)
and `apple-touch-icon.png` are linked from `index.html`. There is deliberately **no service worker**: a POS
must never run a stale cached build, so offline support needs its own design.

## Rules of thumb

- Tap targets ≥ 44px; every `:hover` style has an `:active` equivalent.
- Nothing new may apply at ≥ 1280px. Scope rules with `html[data-device='mobile'|'tablet']` or the
  `.app-layout.is-mobile` / `.is-tablet` shell classes.
- Inputs are 16px on phones (no iOS zoom on focus).
- Respect `prefers-reduced-motion` for any new transition.
