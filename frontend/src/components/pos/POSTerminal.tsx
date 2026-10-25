import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconSearch, IconUser, IconUsers, IconDiscount2, IconSend, IconPlayerPause, IconCreditCard, IconTrash, IconMinus, IconPlus,
  IconClipboardList, IconFileInvoice, IconArrowsSplit, IconBan, IconNote, IconX, IconLayoutGrid, IconStar, IconChefHat,
  IconPencil, IconKeyboard,
} from '@tabler/icons-react';
import { useApi, useCan, useCurrentLocation, useMutate, useOrg } from '@/hooks';
import { CATALOG, ORDERS } from '@/services/api';
import { money, minutesSince } from '@/lib/format';
import { previewTotals } from '@/lib/pricing';
import { ORDER_TYPE_LABELS } from '@/lib/constants';
import { buildIndex, parseQuery, searchMenu } from '@/lib/posSearch';
import { Drawer, Empty, useApproval, withApproval } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';
import ModifierModal, { LineDraft } from './ModifierModal';
import CustomerPicker from './CustomerPicker';
import DiscountModal, { DiscountChoice } from './DiscountModal';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';
import ProductCard, { isVeg, monogram } from './ProductCard';

const ITEM_STATUS_BADGE: Record<string, string> = { PENDING: 'badge-neutral', FIRED: 'badge-warning', PREPARING: 'badge-warning', READY: 'badge-info', SERVED: 'badge-success', VOIDED: 'badge-danger' };

type DietFilter = 'ALL' | 'VEG' | 'NONVEG';
type SortKey = 'MENU' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'MENU', label: 'Menu order' }, { key: 'NAME', label: 'Name A–Z' }, { key: 'PRICE_ASC', label: 'Price ↑' }, { key: 'PRICE_DESC', label: 'Price ↓' },
];

// Shown in the F1 / "?" sheet; keep in sync with the key handler below
const SHORTCUTS: [string, string][][] = [
  [
    ['F2  or  /', 'Search the menu'], ['↑ ↓ ← →', 'Move between items'], ['Enter', 'Add highlighted item'], ['1 – 9', 'Quick-add item by position'],
    ['Esc', 'Clear search / selection'], ['Alt + 0 – 9', 'Category (0 = All)'], ['[  ]', 'Previous / next category'],
  ],
  [
    ['F3', 'Open checks'], ['F4', 'Customer'], ['F6', 'Discount'], ['F7', 'Hold check'], ['F8', 'Send to kitchen'], ['F9', 'Pay'], ['F10', 'Print check'],
  ],
  [
    ['Alt + ↑ ↓', 'Select line in order'], ['+  −', 'Change quantity'], ['Delete', 'Remove line'], ['Alt + I', 'Edit item options'],
    ['Alt + O', 'Next order type'], ['Alt + G  /  Alt + Shift + G', 'Guests + / −'], ['Alt + M', 'Order note'], ['Alt + T', 'Floor plan'],
    ['Alt + S', 'Split check'], ['Alt + X', 'Void check'], ['Alt + N', 'New order'], ['F1  or  ?', 'This help'],
  ],
];
const SHORTCUT_GROUPS = ['Menu & search', 'Order actions', 'Ticket'];
const NO_TERMS: string[] = [];

export const POSTerminal: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const location = useCurrentLocation();
  const { org, settings } = useOrg();
  const can = useCan();
  const mutate = useMutate();
  const approval = useApproval();
  const searchRef = useRef<HTMLInputElement>(null);

  const tableIdParam = new URLSearchParams(routerLocation.search).get('tableId');
  const orderIdParam = new URLSearchParams(routerLocation.search).get('orderId');

  const { data: menu, loading } = useApi(CATALOG.POS_MENU);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [diet, setDiet] = useState<DietFilter>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('MENU');
  /** Keyboard cursor in the item grid (-1 = none) */
  const [cursor, setCursor] = useState(-1);
  const [showKeys, setShowKeys] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  // Typing stays instant; filtering a big menu runs at lower priority
  const deferredSearch = useDeferredValue(search);

  // Ticket state
  const [order, setOrder] = useState<any | null>(null);
  const [drafts, setDrafts] = useState<LineDraft[]>([]);
  const [orderType, setOrderType] = useState<string>('');
  const [guestCount, setGuestCount] = useState(1);
  const [customer, setCustomer] = useState<any | null>(null);
  const [draftDiscount, setDraftDiscount] = useState<DiscountChoice | null>(null);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modals
  const [modProduct, setModProduct] = useState<any | null>(null);
  const [editing, setEditing] = useState<LineDraft | null>(null);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitIds, setSplitIds] = useState<string[]>([]);

  const openChecks = useApi(ORDERS.OPEN, { locationId: location?.id }, { skip: !showChecks, live: location?.id });

  const orderTypes = settings?.orderTypes?.length ? settings.orderTypes : ['TAKEAWAY'];
  useEffect(() => {
    if (!orderType || !orderTypes.includes(orderType)) setOrderType(tableIdParam ? 'DINE_IN' : orderTypes[0]);
  }, [orderTypes, orderType, tableIdParam]);

  const loadOrder = useCallback((o: any) => {
    setOrder(o);
    setDrafts([]);
    setOrderType(o.orderType);
    setGuestCount(o.guestCount || 1);
    setCustomer(o.customer || null);
    setNotes(o.notes || '');
    setDraftDiscount(null);
    setSelected(null);
  }, []);

  const resetTicket = useCallback(() => {
    setOrder(null); setDrafts([]); setCustomer(null); setDraftDiscount(null); setNotes(''); setGuestCount(1); setSelected(null);
    setSplitMode(false); setSplitIds([]);
    if (tableIdParam || orderIdParam) navigate('/pos', { replace: true });
  }, [navigate, tableIdParam, orderIdParam]);

  // Deep links: /pos?tableId=… resumes the table's open check; /pos?orderId=… resumes an order.
  useEffect(() => {
    (async () => {
      try {
        if (tableIdParam) {
          const res = await mutate(ORDERS.TABLE_ORDER, { tableId: tableIdParam });
          if (res.tableOrder) loadOrder(res.tableOrder);
          else { setOrder(null); setDrafts([]); setOrderType('DINE_IN'); }
        } else if (orderIdParam) {
          const res = await mutate(ORDERS.GET, { id: orderIdParam });
          if (res.order) loadOrder(res.order);
        }
      } catch (e: any) { toast.error(e.message); }
    })();
  }, [tableIdParam, orderIdParam, mutate, loadOrder]);

  // One window listener for every POS shortcut; the handler is reassigned each render (see keyRef.current below)
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Menu-derived lookups, rebuilt only when the menu or location changes
  const allProducts: any[] = useMemo(() => menu?.products || [], [menu]);
  const index = useMemo(() => buildIndex(allProducts), [allProducts]);
  const productById = useMemo(() => new Map<string, any>(allProducts.map((p) => [p.id, p])), [allProducts]);
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of allProducts) if (p.categoryId) c[p.categoryId] = (c[p.categoryId] || 0) + 1;
    return c;
  }, [allProducts]);
  const vegMarks = useMemo(() => allProducts.some(isVeg), [allProducts]);
  const tracksStock = useMemo(() => allProducts.some((p) => p.trackStock), [allProducts]);
  const stockFor = useCallback((p: any) => (p.trackStock ? (p.inventory.find((i: any) => i.locationId === location?.id)?.quantity ?? 0) : null), [location?.id]);

  const query = useMemo(() => parseQuery(deferredSearch), [deferredSearch]);
  const searching = query.terms.length > 0 || query.min !== undefined || query.max !== undefined;
  const products = useMemo(() => {
    // Searching looks across every category, so the cashier never has to switch first
    let list = searching ? searchMenu(index, query).map((x) => x.p) : allProducts.filter((p) => category === 'ALL' || p.categoryId === category);
    if (diet !== 'ALL') list = list.filter((p) => (diet === 'VEG') === isVeg(p));
    if (inStockOnly) list = list.filter((p) => { const s = stockFor(p); return s === null || s > 0; });
    if (sort !== 'MENU') {
      list = [...list].sort((a, b) => (sort === 'NAME' ? a.name.localeCompare(b.name) : sort === 'PRICE_ASC' ? a.price - b.price : b.price - a.price));
    }
    return list;
  }, [searching, index, query, allProducts, category, diet, inStockOnly, sort, stockFor]);

  // Search puts the cursor on the best match so Enter adds it; browsing starts with no cursor
  useEffect(() => { setCursor(searching ? 0 : -1); }, [searching, query, category, diet, inStockOnly, sort]);
  useEffect(() => {
    if (cursor >= 0) gridRef.current?.querySelector('.kb-active')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const addProduct = (p: any, qty = 1) => {
    if (order && !['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'].includes(order.status)) { toast.error('This order is closed. Start a new one.'); return; }
    if (stockFor(p) === 0) { toast.error(`${p.name} is sold out`); return; }
    const needsModal = p.modifierGroups.length > 0 || p.isOpenPrice || settings?.pos.courses || settings?.pos.seats;
    if (needsModal) { setEditing(null); setModProduct(p); return; }
    // Merge identical simple lines
    const existing = drafts.find((d) => d.productId === p.id && !d.modifierIds.length && !d.notes);
    if (existing) { setDrafts(drafts.map((d) => (d.key === existing.key ? { ...d, quantity: d.quantity + qty } : d))); setSelected(existing.key); }
    else {
      const key = `${p.id}-${Date.now()}`;
      setDrafts([...drafts, { key, productId: p.id, name: p.name, basePrice: p.price, unitPrice: p.price, taxRate: p.tax?.rate ?? 0, quantity: qty, modifierIds: [], modifiers: [], course: 1 }]);
      setSelected(key);
    }
    if (search) setSearch('');
  };
  // Stable callback for the memoized cards; always calls the latest addProduct
  const addRef = useRef(addProduct);
  addRef.current = addProduct;
  const onCardAdd = useCallback((p: any) => addRef.current(p), []);

  const sentItems = (order?.items || []) as any[];
  const activeSent = sentItems.filter((i) => i.status !== 'VOIDED');
  const svcPct = orderType === 'DINE_IN' && settings && settings.pos.serviceChargePct > 0 && (!settings.pos.serviceChargeMinGuests || guestCount >= settings.pos.serviceChargeMinGuests) ? settings.pos.serviceChargePct : 0;

  const totals = useMemo(() => {
    if (order && !drafts.length) {
      return { subtotal: order.subtotal, discount: order.discountAmount, tax: order.taxAmount, service: order.serviceCharge, total: order.total - order.tipAmount, estimate: false };
    }
    const lines = [
      ...activeSent.map((i) => ({ unitPrice: i.price, quantity: i.quantity, taxRate: i.taxRate })),
      ...drafts.map((d) => ({ unitPrice: d.unitPrice, quantity: d.quantity, taxRate: d.taxRate })),
    ];
    const discount = order?.discountAmount ? { type: 'FIXED', value: order.discountAmount } : draftDiscount?.type ? { type: draftDiscount.type, value: draftDiscount.value! } : null;
    return { ...previewTotals(lines, { taxInclusive: !!org?.taxInclusive, discount, serviceChargePct: svcPct }), estimate: true };
  }, [order, drafts, activeSent, draftDiscount, org?.taxInclusive, svcPct]);

  const itemInputs = (list: LineDraft[]) => list.map((d) => ({
    productId: d.productId, quantity: d.quantity, modifierIds: d.modifierIds, notes: d.notes || null,
    seat: d.seat ?? null, course: d.course, priceOverride: d.priceOverride ?? null,
  }));

  /** Persists the ticket (create or append). Returns the saved order. */
  const save = async (fire: boolean): Promise<any | null> => {
    if (!order && !drafts.length) { toast.error('Add items first'); return null; }
    if (orderType === 'DELIVERY' && !customer) { setShowCustomer(true); toast('Attach a customer for delivery'); return null; }
    setBusy(true);
    try {
      let saved = order;
      if (!order) {
        const run = (pin?: string) => mutate(ORDERS.CREATE, {
          input: {
            locationId: location?.id, orderType, channel: 'POS', tableId: tableIdParam || null,
            guestCount, customerId: customer?.id || null, notes: notes || null, items: itemInputs(drafts), fire,
            discount: draftDiscount ? { discountId: draftDiscount.discountId || null, type: draftDiscount.type || null, value: draftDiscount.value || null, reason: draftDiscount.reason || null, approverPin: pin || null } : null,
            idempotencyKey: `${location?.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        }).then((r) => r.createOrder);
        saved = await withApproval(run, approval.request);
        if (!saved) return null;
      } else {
        if (drafts.length) saved = (await mutate(ORDERS.ADD_ITEMS, { orderId: order.id, items: itemInputs(drafts), fire })).addOrderItems;
        if (fire && saved.items.some((i: any) => i.status === 'PENDING')) saved = (await mutate(ORDERS.FIRE, { orderId: order.id })).fireOrder;
        if (notes !== (order.notes || '') || guestCount !== (order.guestCount || 1) || orderType !== order.orderType || (customer?.id || null) !== (order.customerId || null)) {
          saved = (await mutate(ORDERS.UPDATE, { orderId: order.id, input: { notes, guestCount, orderType, customerId: customer?.id || null } })).updateOrder;
        }
      }
      setOrder(saved);
      setDrafts([]);
      setDraftDiscount(null);
      return saved;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const saved = await save(true);
    if (saved) {
      toast.success(`Sent to kitchen · #${saved.ticketNumber}`);
      if (settings?.serviceModel === 'TABLE_SERVICE' || tableIdParam) resetTicket();
    }
  };

  const hold = async () => {
    const saved = await save(false);
    if (saved) { toast.success(`Check #${saved.ticketNumber} saved`); resetTicket(); }
  };

  const pay = async () => {
    const saved = drafts.length || !order ? await save(!!settings?.pos.autoFire) : order;
    if (saved) setShowPay(true);
  };

  const applyDiscount = async (d: DiscountChoice) => {
    setShowDiscount(false);
    if (!order) { setDraftDiscount(d); return; }
    try {
      const res = await withApproval(
        (pin) => mutate(ORDERS.APPLY_DISCOUNT, { orderId: order.id, discount: { discountId: d.discountId || null, type: d.type || null, value: d.value || null, reason: d.reason || null, approverPin: pin || null } }),
        approval.request,
      );
      if (res) { setOrder(res.applyDiscount); toast.success(`Discount applied: ${d.label}`); }
    } catch (e: any) { toast.error(e.message); }
  };

  const removeDiscount = async () => {
    setShowDiscount(false);
    if (!order) { setDraftDiscount(null); return; }
    try { setOrder((await mutate(ORDERS.REMOVE_DISCOUNT, { orderId: order.id })).removeDiscount); } catch (e: any) { toast.error(e.message); }
  };

  const voidItem = async (item: any) => {
    const reason = window.prompt(`Void "${item.name}" — reason?`, item.status === 'PENDING' ? 'Removed before send' : 'Guest changed mind');
    if (!reason) return;
    try {
      const res = await withApproval((pin) => mutate(ORDERS.VOID_ITEM, { itemId: item.id, reason, approverPin: pin || null }), approval.request);
      if (res) setOrder(res.voidOrderItem);
    } catch (e: any) { toast.error(e.message); }
  };

  const cancelOrder = async () => {
    if (!order) { resetTicket(); return; }
    const reason = window.prompt('Cancel this check — reason?', 'Guest left');
    if (!reason) return;
    try {
      const res = await withApproval((pin) => mutate(ORDERS.CANCEL, { orderId: order.id, reason, approverPin: pin || null }), approval.request);
      if (res) { toast.success('Check cancelled'); resetTicket(); }
    } catch (e: any) { toast.error(e.message); }
  };

  const doSplit = async () => {
    if (!order || !splitIds.length) return;
    try {
      const res = await mutate(ORDERS.SPLIT, { orderId: order.id, itemIds: splitIds });
      toast.success(`Created check #${res.splitOrder.ticketNumber}`);
      setSplitMode(false); setSplitIds([]);
      const refreshed = await mutate(ORDERS.GET, { id: order.id });
      setOrder(refreshed.order);
    } catch (e: any) { toast.error(e.message); }
  };

  const printCheck = async () => {
    if (order?.tableId) mutate(ORDERS.REQUEST_BILL, { orderId: order.id }).catch(() => null);
    setTimeout(() => window.print(), 50);
  };

  if (loading) return <div className="page-container"><LoadingSpinner text="Loading menu..." /></div>;

  const selectedDraft = drafts.find((d) => d.key === selected);
  const isClosed = order && !['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'].includes(order.status);
  const courses = [...new Set([...activeSent.map((i) => i.course), ...drafts.map((d) => d.course)])].sort();
  const showCourses = !!settings?.pos.courses && courses.length > 1;

  const colorOf = (p: any) => p?.color || p?.category?.color || 'var(--color-primary)';
  const showImages = !!settings?.modules?.menuImages;
  // Plain computation (not a hook): we're past the early `loading` return
  const inTicket: Record<string, number> = {};
  for (const d of drafts) inTicket[d.productId] = (inTicket[d.productId] || 0) + d.quantity;

  const setQty = (key: string, delta: number) => {
    const line = drafts.find((x) => x.key === key);
    if (!line) return;
    if (line.quantity + delta < 1) { setDrafts(drafts.filter((x) => x.key !== key)); return; }
    setDrafts(drafts.map((x) => (x.key === key ? { ...x, quantity: x.quantity + delta } : x)));
  };

  const thumb = (p: any, name: string) => (
    <div className="tl-thumb" style={{ ['--c' as any]: colorOf(p) }}>
      {showImages && p?.imageUrl ? <img src={p.imageUrl} alt="" /> : monogram(name)}
    </div>
  );

  const renderSent = (i: any) => (
    <div key={i.id} className={`tl${i.status === 'VOIDED' ? ' voided' : ''}${splitIds.includes(i.id) ? ' selected' : ''}${splitMode ? ' pickable' : ''}`}
      onClick={() => splitMode && i.status !== 'VOIDED' && setSplitIds(splitIds.includes(i.id) ? splitIds.filter((x) => x !== i.id) : [...splitIds, i.id])}>
      {thumb(productById.get(i.productId), i.name)}
      <div className="tl-main">
        <div className="tl-top">
          <div className="tl-name">{i.name}{i.seat ? <span className="muted"> · S{i.seat}</span> : null}</div>
          {!isClosed && !splitMode && i.status !== 'VOIDED' && order?.paidAmount === 0 && (
            <button className="tl-x" title="Void item" onClick={(e) => { e.stopPropagation(); voidItem(i); }}><IconBan size={14} /></button>
          )}
        </div>
        {(i.modifiers || []).length > 0 && <div className="tl-mods">{i.modifiers.map((m: any) => m.name).join(', ')}</div>}
        {i.notes && <div className="tl-mods text-warning">“{i.notes}”</div>}
        <div className="tl-foot">
          <span className="tl-price">{money(i.subtotal)}</span>
          <span className={`badge ${ITEM_STATUS_BADGE[i.status]}`}>{i.status === 'PENDING' ? 'Not sent' : i.status.toLowerCase()}</span>
          <span className="tl-qty-static">× {i.quantity}</span>
        </div>
      </div>
    </div>
  );

  const renderDraft = (d: LineDraft) => {
    const p = productById.get(d.productId);
    const editable = p && (p.modifierGroups.length > 0 || p.isOpenPrice || settings?.pos.courses || settings?.pos.seats);
    return (
      <div key={d.key} className={`tl${selected === d.key ? ' active' : ''}`} onClick={() => setSelected(d.key)}>
        {thumb(p, d.name)}
        <div className="tl-main">
          <div className="tl-top">
            <div className="tl-name">{d.name}{d.seat ? <span className="muted"> · S{d.seat}</span> : null}</div>
            <button className="tl-x" title="Remove" onClick={() => setDrafts(drafts.filter((x) => x.key !== d.key))}><IconTrash size={14} /></button>
          </div>
          {d.modifiers.length > 0 && <div className="tl-mods">{d.modifiers.map((m) => m.name).join(', ')}</div>}
          {d.notes && <div className="tl-mods text-warning">“{d.notes}”</div>}
          {editable && <button className="tl-edit" onClick={() => { setEditing(d); setModProduct(p); }}><IconPencil size={11} /> Edit options</button>}
          <div className="tl-foot">
            <span className="tl-price">{money(d.unitPrice * d.quantity)}</span>
            <div className="stepper">
              <button aria-label="Decrease" onClick={() => setQty(d.key, -1)}><IconMinus size={14} /></button>
              <span>{d.quantity}</span>
              <button aria-label="Increase" className="plus" onClick={() => setQty(d.key, 1)}><IconPlus size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tableName = order?.table?.name;
  const lineCount = activeSent.length + drafts.length;
  const payAmount = order?.paidAmount > 0 && !drafts.length ? order.balanceDue : totals.total;
  const categories: any[] = menu?.categories || [];
  const canSend = settings?.modules.kds !== false && !busy && !isClosed && (drafts.length > 0 || activeSent.some((i) => i.status === 'PENDING'));
  const canHold = !busy && !isClosed && (drafts.length > 0 || !!order);
  const canPay = canHold;
  const canSplit = !!order && !isClosed && order.paidAmount === 0 && activeSent.length >= 2;
  const canVoid = !isClosed && (!!order || drafts.length > 0) && !(order?.paidAmount > 0);
  const filtersOn = diet !== 'ALL' || inStockOnly || sort !== 'MENU';

  /** Columns currently laid out in the item grid (for ↑ ↓ navigation). */
  const gridColumns = () => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>('.pc');
    if (!cards?.length) return 1;
    const top = cards[0].offsetTop;
    let n = 0;
    while (n < cards.length && cards[n].offsetTop === top) n++;
    return Math.max(1, n);
  };
  const moveCursor = (delta: number) => {
    if (!products.length) return;
    setCursor((c) => Math.min(products.length - 1, Math.max(0, c < 0 ? 0 : c + delta)));
  };
  const lineKeys = drafts.map((d) => d.key);
  const selectLine = (delta: number) => {
    if (!lineKeys.length) return;
    const i = selected ? lineKeys.indexOf(selected) : -1;
    setSelected(lineKeys[i < 0 ? (delta > 0 ? 0 : lineKeys.length - 1) : Math.min(lineKeys.length - 1, Math.max(0, i + delta))]);
  };
  const activeLine = drafts.find((d) => d.key === selected) || drafts[drafts.length - 1];
  const pickCategory = (id: string) => { setCategory(id); if (search) setSearch(''); };

  keyRef.current = (e: KeyboardEvent) => {
    // Open dialogs and drawers own the keyboard
    if (document.querySelector('.modal-overlay, .drawer-overlay')) return;
    const el = e.target as HTMLElement;
    const inSearch = el === searchRef.current;
    if (!inSearch && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
    const run = (fn: () => unknown) => { e.preventDefault(); fn(); };
    const plain = !e.altKey && !e.ctrlKey && !e.metaKey;

    switch (e.key) {
      case 'F1': return run(() => setShowKeys(true));
      case 'F2': return run(() => searchRef.current?.select());
      case 'F3': return run(() => setShowChecks(true));
      case 'F4': return run(() => setShowCustomer(true));
      case 'F6': return run(() => !isClosed && setShowDiscount(true));
      case 'F7': return run(() => canHold && hold());
      case 'F8': return run(() => canSend && send());
      case 'F9': return run(() => canPay && pay());
      case 'F10': return run(() => order && printCheck());
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const digit = e.code.match(/^(?:Digit|Numpad)(\d)$/);
      if (digit) {
        const n = parseInt(digit[1], 10);
        return run(() => (n === 0 ? pickCategory('ALL') : categories[n - 1] && pickCategory(categories[n - 1].id)));
      }
      switch (e.code) {
        case 'ArrowUp': return run(() => selectLine(-1));
        case 'ArrowDown': return run(() => selectLine(1));
        case 'KeyI': return run(() => { const p = activeLine && productById.get(activeLine.productId); if (p) { setEditing(activeLine); setModProduct(p); } });
        case 'KeyO': return run(() => setOrderType(orderTypes[(orderTypes.indexOf(orderType) + 1) % orderTypes.length]));
        case 'KeyG': return run(() => setGuestCount(Math.max(1, guestCount + (e.shiftKey ? -1 : 1))));
        case 'KeyM': return run(() => setShowNote(true));
        case 'KeyT': return run(() => settings?.modules.tables && navigate('/tables'));
        case 'KeyS': return run(() => canSplit && setSplitMode((m) => !m));
        case 'KeyX': return run(() => canVoid && cancelOrder());
        case 'KeyN': return run(() => (!drafts.length || window.confirm('Discard the unsent items and start a new order?')) && resetTicket());
      }
      return;
    }
    if (!plain) return;

    if (inSearch) {
      if (e.key === 'ArrowDown') return run(() => moveCursor(gridColumns()));
      if (e.key === 'ArrowUp') return run(() => moveCursor(-gridColumns()));
      if (e.key === 'Escape') return run(() => (search ? setSearch('') : searchRef.current?.blur()));
      if (e.key === 'Enter') {
        return run(() => {
          // Use the live query so a fast barcode scan + Enter isn't lost to the deferred value
          const q = parseQuery(search);
          const hits = q.terms.length || q.min !== undefined || q.max !== undefined ? searchMenu(index, q).map((x) => x.p) : products;
          const pick = search === deferredSearch && cursor >= 0 ? products[cursor] : hits[0];
          if (pick) addProduct(pick, q.qty);
          else if (search.trim()) toast.error(`No item matches “${search.trim()}”`);
        });
      }
      return;
    }

    switch (e.key) {
      case '/': return run(() => searchRef.current?.focus());
      case '?': return run(() => setShowKeys(true));
      case 'ArrowRight': return run(() => moveCursor(1));
      case 'ArrowLeft': return run(() => moveCursor(-1));
      case 'ArrowDown': return run(() => moveCursor(gridColumns()));
      case 'ArrowUp': return run(() => moveCursor(-gridColumns()));
      case 'Enter': if (cursor >= 0 && products[cursor] && el.tagName !== 'BUTTON') return run(() => addProduct(products[cursor])); return;
      case 'Escape': return run(() => { setCursor(-1); setSelected(null); });
      case '[': return run(() => { const i = categories.findIndex((c) => c.id === category); pickCategory(i <= 0 ? 'ALL' : categories[i - 1].id); });
      case ']': return run(() => { const i = categories.findIndex((c) => c.id === category); if (i < categories.length - 1) pickCategory(categories[i + 1].id); });
      case '+': case '=': return run(() => activeLine && setQty(activeLine.key, 1));
      case '-': return run(() => activeLine && setQty(activeLine.key, -1));
      case 'Delete': return run(() => activeLine && setDrafts(drafts.filter((x) => x.key !== activeLine.key)));
    }
    if (/^[1-9]$/.test(e.key)) { const p = products[parseInt(e.key, 10) - 1]; if (p) run(() => addProduct(p)); return; }
    // Any letter starts a search, like a launcher
    if (/^[a-z0-9]$/i.test(e.key)) searchRef.current?.focus();
  };

  return (
    <div className="pos-shell">
      <section className="pos-main">
        <header className="pos-head">
          <div className="pos-search">
            <IconSearch size={16} />
            <input ref={searchRef} placeholder="Search items, SKU, barcode · try “cc”, “3*idli”, “<100”" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search menu" />
            {search ? <button className="pos-search-clear" onClick={() => { setSearch(''); searchRef.current?.focus(); }} aria-label="Clear search"><IconX size={13} /></button>
              : <kbd className="kbd">F2</kbd>}
          </div>
          {vegMarks && (
            <div className="pos-seg" role="group" aria-label="Diet">
              {(['ALL', 'VEG', 'NONVEG'] as DietFilter[]).map((d) => (
                <button key={d} className={diet === d ? 'active' : ''} onClick={() => setDiet(d)}>
                  {d !== 'ALL' && <span className={`veg-dot${d === 'NONVEG' ? ' nonveg' : ''}`} />}{d === 'ALL' ? 'All' : d === 'VEG' ? 'Veg' : 'Non-veg'}
                </button>
              ))}
            </div>
          )}
          {tracksStock && <button className={`pos-head-btn${inStockOnly ? ' on' : ''}`} onClick={() => setInStockOnly((v) => !v)} title="Hide sold-out items">In stock</button>}
          <select className="pos-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort items">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="pos-head-btn" onClick={() => setShowChecks(true)} title="Open checks (F3)"><IconClipboardList size={16} /> <span>Open checks</span></button>
          {settings?.modules.tables && <button className="pos-head-btn" onClick={() => navigate('/tables')} title="Floor plan (Alt+T)"><IconLayoutGrid size={16} /> <span>Floor</span></button>}
          <button className="pos-head-btn icon" onClick={() => setShowKeys(true)} title="Keyboard shortcuts (F1)" aria-label="Keyboard shortcuts"><IconKeyboard size={16} /></button>
        </header>

        <nav className="pos-cats" aria-label="Categories">
          <button className={`pos-cat${category === 'ALL' && !searching ? ' active' : ''}`} onClick={() => pickCategory('ALL')} title="Alt+0">
            All<span className="pos-cat-count">{allProducts.length}</span>
          </button>
          {categories.map((c: any, i: number) => (
            <button key={c.id} className={`pos-cat${category === c.id && !searching ? ' active' : ''}`} onClick={() => pickCategory(c.id)}
              style={{ ['--c' as any]: c.color || 'var(--color-primary)' }} title={i < 9 ? `Alt+${i + 1}` : undefined}>
              <span className="pos-cat-dot" />{c.name}<span className="pos-cat-count">{categoryCounts[c.id] || 0}</span>
            </button>
          ))}
        </nav>

        {(searching || filtersOn) && (
          <div className="pos-results">
            <span><strong>{products.length}</strong> {products.length === 1 ? 'item' : 'items'}{searching ? ` matching “${deferredSearch.trim()}” in all categories` : ''}</span>
            {searching && products.length > 0 && <span className="muted">· Enter adds{query.qty > 1 ? ` ${query.qty} ×` : ''} the highlighted item</span>}
            {filtersOn && <button className="pos-results-reset" onClick={() => { setDiet('ALL'); setInStockOnly(false); setSort('MENU'); }}>Reset filters</button>}
          </div>
        )}

        <div className="pos-grid" ref={gridRef}>
          {products.map((p: any, i: number) => (
            <ProductCard
              key={p.id}
              p={p}
              qty={inTicket[p.id] || 0}
              stock={stockFor(p)}
              color={colorOf(p)}
              showImage={showImages}
              vegMark={vegMarks}
              active={i === cursor}
              terms={searching ? query.terms : NO_TERMS}
              hotkey={!searching && i < 9 ? i + 1 : undefined}
              onAdd={onCardAdd}
            />
          ))}
          {!products.length && <div style={{ gridColumn: '1 / -1' }}><Empty title="No items" hint={searching ? 'Try fewer letters, the item initials (e.g. “cc”), or a price like “<100”.' : 'Try another category or clear the filters.'} /></div>}
        </div>
      </section>

      <aside className="ticket">
        <div className="ticket-head">
          {orderTypes.length > 1 && (
            <div className="pos-types">
              {orderTypes.map((t: string) => (
                <button key={t} className={orderType === t ? 'active' : ''} onClick={() => setOrderType(t)}>{ORDER_TYPE_LABELS[t] || t}</button>
              ))}
            </div>
          )}
          <div className="ticket-title">
            <div>
              <div className="ticket-title-main">{order ? `Check #${order.ticketNumber}` : 'New order'}{tableName ? ` · ${tableName}` : ''}</div>
              <div className="small muted">
                {ORDER_TYPE_LABELS[orderType]}{order ? ` · ${minutesSince(order.createdAt)} min` : ''}{order?.user ? ` · ${order.user.name}` : ''}
              </div>
            </div>
            <div className="spacer" />
            {order && <span className={`badge ${order.paymentStatus === 'PAID' ? 'badge-success' : order.paymentStatus === 'PARTIAL' ? 'badge-info' : 'badge-warning'}`}>{order.paymentStatus.toLowerCase()}</span>}
            {(order || drafts.length > 0) && <button className="ticket-clear" title="Start a new order" onClick={resetTicket}><IconX size={14} /> {order ? 'Close' : 'Clear all'}</button>}
          </div>
          <div className="ticket-chips">
            <button className={`chip${customer ? ' active' : ''}`} onClick={() => setShowCustomer(true)}>
              <IconUser size={14} /> {customer ? customer.name : 'Customer'}
              {customer && settings?.modules.loyalty ? <span><IconStar size={11} /> {customer.loyaltyPoints}</span> : null}
            </button>
            {(orderType === 'DINE_IN') && (
              <span className="chip chip-stepper">
                <IconUsers size={14} />
                <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} aria-label="Fewer guests"><IconMinus size={12} /></button>
                {guestCount}
                <button onClick={() => setGuestCount(guestCount + 1)} aria-label="More guests"><IconPlus size={12} /></button>
              </span>
            )}
            <button className={`chip${notes ? ' active' : ''}`} onClick={() => setShowNote(true)}><IconNote size={14} /> {notes ? 'Note added' : 'Note'}</button>
          </div>
        </div>

        <div className="ticket-items-head">
          <span>Items</span>
          {lineCount > 0 && <span className="ticket-count">{lineCount}</span>}
        </div>

        <div className="ticket-body">
          {!sentItems.length && !drafts.length ? (
            <Empty icon={<IconChefHat size={32} />} title="No items yet" hint="Tap an item, or start typing to search. Press F1 for shortcuts." />
          ) : showCourses ? (
            courses.map((c) => (
              <div key={c}>
                <div className="ticket-course">Course {c}</div>
                {sentItems.filter((i) => i.course === c).map(renderSent)}
                {drafts.filter((d) => d.course === c).map(renderDraft)}
              </div>
            ))
          ) : (
            <>
              {sentItems.map(renderSent)}
              {drafts.length > 0 && sentItems.length > 0 && <div className="ticket-course">New items</div>}
              {drafts.map(renderDraft)}
            </>
          )}
        </div>

        <div className="ticket-foot">
          {splitMode ? (
            <div className="stack" style={{ gap: 6 }}>
              <p className="small muted">Tap sent items to move them to a new check ({splitIds.length} selected).</p>
              <div className="row">
                <button className="btn btn-secondary btn-block" onClick={() => { setSplitMode(false); setSplitIds([]); }}>Cancel</button>
                <button className="btn btn-primary btn-block" disabled={!splitIds.length} onClick={doSplit}><IconArrowsSplit size={14} /> Split</button>
              </div>
            </div>
          ) : (
            <>
              <div className="totals-row"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              {(totals.discount > 0 || draftDiscount) && (
                <div className="totals-row text-success"><span>Discount {order?.discountReason ? `(${order.discountReason})` : draftDiscount ? `(${draftDiscount.label})` : ''}</span><span>-{money(totals.discount)}</span></div>
              )}
              {totals.service > 0 && <div className="totals-row"><span>Service charge {settings?.pos.serviceChargePct}%</span><span>{money(totals.service)}</span></div>}
              <div className="totals-row"><span>{settings?.taxLabel || 'Tax'}{org?.taxInclusive ? ' (included)' : ''}</span><span>{money(totals.tax)}</span></div>
              {order?.paidAmount > 0 && <div className="totals-row text-accent"><span>Paid</span><span>-{money(order.paidAmount)}</span></div>}
              <div className="totals-row grand"><span>{order?.paidAmount > 0 ? 'Balance' : 'Total'}{totals.estimate && (drafts.length > 0) ? ' (est.)' : ''}</span>
                <span>{money(payAmount)}</span></div>

              <div className="ticket-actions">
                <button className="tact" title="Discount (F6)" disabled={!!isClosed} onClick={() => setShowDiscount(true)}><IconDiscount2 size={18} /> Discount</button>
                <button className="tact" title="Split (Alt+S)" disabled={!canSplit} onClick={() => setSplitMode(true)}><IconArrowsSplit size={18} /> Split</button>
                <button className="tact" title="Hold (F7)" disabled={!canHold} onClick={hold}><IconPlayerPause size={18} /> Hold</button>
                <button className="tact" title="Print (F10)" disabled={!order} onClick={printCheck}><IconFileInvoice size={18} /> Print</button>
                <button className="tact danger" title="Void (Alt+X)" disabled={!canVoid} onClick={cancelOrder}><IconBan size={18} /> Void</button>
              </div>
              <div className="ticket-cta">
                {settings?.modules.kds !== false && (
                  <button className="cta cta-secondary" disabled={!canSend} onClick={send} title="Send to kitchen (F8)">
                    <IconSend size={18} /> Send <kbd className="kbd">F8</kbd>
                  </button>
                )}
                <button className="cta cta-primary" disabled={!canPay} onClick={pay} title="Pay (F9)">
                  {busy ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <IconCreditCard size={18} />}
                  Pay {money(payAmount)} <kbd className="kbd">F9</kbd>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <ModifierModal
        product={modProduct}
        initial={editing}
        showSeats={!!settings?.pos.seats && orderType === 'DINE_IN'}
        showCourses={!!settings?.pos.courses}
        guestCount={guestCount}
        onClose={() => { setModProduct(null); setEditing(null); }}
        onConfirm={(line) => {
          setDrafts(editing ? drafts.map((d) => (d.key === line.key ? line : d)) : [...drafts, line]);
          setModProduct(null); setEditing(null); setSearch('');
        }}
      />
      <CustomerPicker open={showCustomer} onClose={() => setShowCustomer(false)} onPick={async (c) => {
        setCustomer(c); setShowCustomer(false);
        if (order) {
          try { setOrder((await mutate(ORDERS.UPDATE, { orderId: order.id, input: { customerId: c?.id || null } })).updateOrder); } catch (e: any) { toast.error(e.message); }
        }
      }} />
      <DiscountModal open={showDiscount} promotions={menu?.discounts || []} approvalLimit={settings?.security.maxDiscountPctWithoutApproval ?? 10}
        onClose={() => setShowDiscount(false)} onApply={applyDiscount} onRemove={order?.discountAmount || draftDiscount ? removeDiscount : undefined} />
      <PaymentModal open={showPay} order={order} onClose={() => setShowPay(false)} onUpdated={setOrder} onPrint={() => setTimeout(() => window.print(), 50)}
        onFinished={() => { setShowPay(false); resetTicket(); }} />
      <Modal isOpen={showKeys} onClose={() => setShowKeys(false)} title="Keyboard shortcuts" size="lg"
        footer={<button className="btn btn-primary" onClick={() => setShowKeys(false)}>Got it</button>}>
        <div className="kb-help">
          {SHORTCUTS.map((group, gi) => (
            <section key={gi}>
              <div className="form-section-title" style={{ marginTop: 0 }}>{SHORTCUT_GROUPS[gi]}</div>
              {group.map(([keys, what]) => (
                <div key={keys} className="kb-row"><span>{what}</span><kbd className="kbd">{keys}</kbd></div>
              ))}
            </section>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Search tips: <strong>cc</strong> finds items by initials · <strong>3*idli</strong> adds three · <strong>&lt;100</strong>, <strong>&gt;200</strong>, <strong>100-200</strong> filter by price · a scanned barcode adds instantly.
        </p>
      </Modal>
      <Modal isOpen={showNote} onClose={() => setShowNote(false)} title="Order note" footer={<button className="btn btn-primary" onClick={() => setShowNote(false)}>Done</button>}>
        <textarea className="form-input" autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery address, allergy info, pickup time…" />
      </Modal>
      <Drawer open={showChecks} onClose={() => setShowChecks(false)} title="Open checks">
        {openChecks.loading ? <LoadingSpinner /> : !(openChecks.data?.openOrders || []).length ? <Empty title="No open checks" /> : (
          <div className="stack" style={{ gap: 6 }}>
            {openChecks.data.openOrders.map((o: any) => (
              <button key={o.id} className="option-btn" onClick={async () => {
                setShowChecks(false);
                try { loadOrder((await mutate(ORDERS.GET, { id: o.id })).order); } catch (e: any) { toast.error(e.message); }
              }}>
                <span>
                  <span className="strong">#{o.ticketNumber}</span> · {ORDER_TYPE_LABELS[o.orderType]}{o.table ? ` · ${o.table.name}` : ''}{o.customer ? ` · ${o.customer.name}` : ''}
                  <div className="small muted">{o.user?.name} · {minutesSince(o.createdAt)} min ago</div>
                </span>
                <span className="strong">{money(o.balanceDue)}</span>
              </button>
            ))}
          </div>
        )}
      </Drawer>
      {approval.element}
      {order && <div className="print-area"><Receipt order={order} org={org} location={location} /></div>}
    </div>
  );
};

export default POSTerminal;
