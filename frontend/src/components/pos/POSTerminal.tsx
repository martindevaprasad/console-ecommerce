import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconSearch, IconUser, IconUsers, IconDiscount2, IconSend, IconPlayerPause, IconCreditCard, IconTrash, IconMinus, IconPlus,
  IconClipboardList, IconFileInvoice, IconArrowsSplit, IconBan, IconNote, IconX, IconLayoutGrid, IconStar, IconChefHat,
  IconPencil, IconCategory,
} from '@tabler/icons-react';
import { useApi, useAuth, useCan, useCurrentLocation, useMutate, useOrg } from '@/hooks';
import { CATALOG, ORDERS } from '@/services/api';
import { money, minutesSince } from '@/lib/format';
import { previewTotals } from '@/lib/pricing';
import { ORDER_TYPE_LABELS } from '@/lib/constants';
import { Drawer, Empty, useApproval, withApproval } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';
import ModifierModal, { LineDraft } from './ModifierModal';
import CustomerPicker from './CustomerPicker';
import DiscountModal, { DiscountChoice } from './DiscountModal';
import PaymentModal from './PaymentModal';
import Receipt from './Receipt';

const ITEM_STATUS_BADGE: Record<string, string> = { PENDING: 'badge-neutral', FIRED: 'badge-warning', PREPARING: 'badge-warning', READY: 'badge-info', SERVED: 'badge-success', VOIDED: 'badge-danger' };

/** Two-letter monogram for items without a photo, e.g. "Masala Dosa" → "MD". */
const monogram = (name: string) => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const isVeg = (p: any) => (p?.dietary || []).includes('VEGETARIAN') || (p?.dietary || []).includes('VEGAN');

export const POSTerminal: React.FC = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const location = useCurrentLocation();
  const { org, settings } = useOrg();
  const { user } = useAuth();
  const can = useCan();
  const mutate = useMutate();
  const approval = useApproval();
  const searchRef = useRef<HTMLInputElement>(null);

  const tableIdParam = new URLSearchParams(routerLocation.search).get('tableId');
  const orderIdParam = new URLSearchParams(routerLocation.search).get('orderId');

  const { data: menu, loading } = useApi(CATALOG.POS_MENU);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

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

  // F2 focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const products = useMemo(() => {
    const list = menu?.products || [];
    const q = search.trim().toLowerCase();
    return list.filter((p: any) => (category === 'ALL' || p.categoryId === category) && (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase() === q || p.barcode === q));
  }, [menu, category, search]);

  const stockFor = (p: any) => (p.trackStock ? (p.inventory.find((i: any) => i.locationId === location?.id)?.quantity ?? 0) : null);

  const addProduct = (p: any) => {
    if (order && !['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'].includes(order.status)) { toast.error('This order is closed. Start a new one.'); return; }
    const needsModal = p.modifierGroups.length > 0 || p.isOpenPrice || settings?.pos.courses || settings?.pos.seats;
    if (needsModal) { setEditing(null); setModProduct(p); return; }
    // Merge identical simple lines
    const existing = drafts.find((d) => d.productId === p.id && !d.modifierIds.length && !d.notes);
    if (existing) setDrafts(drafts.map((d) => (d.key === existing.key ? { ...d, quantity: d.quantity + 1 } : d)));
    else setDrafts([...drafts, { key: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, basePrice: p.price, unitPrice: p.price, taxRate: p.tax?.rate ?? 0, quantity: 1, modifierIds: [], modifiers: [], course: 1 }]);
    if (search) setSearch('');
  };

  const onSearchEnter = () => {
    if (products.length === 1) addProduct(products[0]);
  };

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

  const productById = new Map<string, any>((menu?.products || []).map((p: any) => [p.id, p]));
  const colorOf = (p: any) => p?.color || p?.category?.color || 'var(--color-primary)';
  const showImages = !!settings?.modules?.menuImages;
  // Show veg/non-veg marks only when the menu actually carries dietary tags
  const vegMarks = (menu?.products || []).some(isVeg);
  // Plain computations (not hooks): we're past the early `loading` return
  const inTicket: Record<string, number> = {};
  for (const d of drafts) inTicket[d.productId] = (inTicket[d.productId] || 0) + d.quantity;
  const categoryCounts: Record<string, number> = {};
  for (const p of menu?.products || []) if (p.categoryId) categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] || 0) + 1;

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
      <div key={d.key} className="tl">
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
  const firstName = user?.name?.split(' ')[0] || 'Staff';
  const userInitials = (user?.name || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const payAmount = order?.paidAmount > 0 && !drafts.length ? order.balanceDue : totals.total;

  return (
    <div className="pos-shell">
      <section className="pos-main">
        <header className="pos-head">
          <div className="pos-staff">
            <span className="pos-avatar">{userInitials}</span>
            <div>
              <div className="pos-staff-name">{firstName}</div>
              <div className="pos-staff-meta">{location?.name || org?.name}</div>
            </div>
          </div>
          <div className="pos-search">
            <IconSearch size={18} />
            <input ref={searchRef} placeholder="Search by name, SKU or scan barcode (F2)" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()} />
            {search && <button className="pos-search-clear" onClick={() => setSearch('')} aria-label="Clear search"><IconX size={14} /></button>}
          </div>
          <button className="pos-head-btn" onClick={() => setShowChecks(true)}><IconClipboardList size={18} /> <span>Open checks</span></button>
          {settings?.modules.tables && <button className="pos-head-btn" onClick={() => navigate('/tables')}><IconLayoutGrid size={18} /> <span>Floor</span></button>}
        </header>

        <nav className="pos-cats">
          <button className={`pos-cat${category === 'ALL' ? ' active' : ''}`} onClick={() => setCategory('ALL')}>
            <span className="pos-cat-icon"><IconCategory size={16} /></span>
            <span className="pos-cat-label">All<small>{menu?.products?.length || 0} items</small></span>
          </button>
          {(menu?.categories || []).map((c: any) => (
            <button key={c.id} className={`pos-cat${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)} style={{ ['--c' as any]: c.color || 'var(--color-primary)' }}>
              <span className="pos-cat-icon">{monogram(c.name)}</span>
              <span className="pos-cat-label">{c.name}<small>{categoryCounts[c.id] || 0} items</small></span>
            </button>
          ))}
        </nav>

        <div className="pos-grid">
          {products.map((p: any) => {
            const stock = stockFor(p);
            const soldOut = stock !== null && stock <= 0;
            const qty = inTicket[p.id] || 0;
            return (
              <button key={p.id} className={`pc${soldOut ? ' disabled' : ''}${qty ? ' in-ticket' : ''}`} style={{ ['--c' as any]: colorOf(p) }} onClick={() => addProduct(p)}>
                <div className="pc-media">
                  {showImages && p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : <span className="pc-mono">{monogram(p.name)}</span>}
                  {vegMarks && <span className={`veg-mark${isVeg(p) ? '' : ' nonveg'}`} title={isVeg(p) ? 'Vegetarian' : 'Non-vegetarian'} />}
                  {qty > 0 && <span className="pc-qty">{qty}</span>}
                  {soldOut && <span className="pc-flag danger">Sold out</span>}
                  {!soldOut && stock !== null && <span className="pc-flag">{stock} left</span>}
                </div>
                <div className="pc-body">
                  <div className="pc-name">{p.name}</div>
                  {p.description && <div className="pc-desc">{p.description}</div>}
                  <div className="pc-foot">
                    <span className="pc-price">{p.isOpenPrice ? 'Open price' : money(p.price)}</span>
                    {p.modifierGroups.length > 0 && <span className="pc-opts">Options</span>}
                    <span className="pc-add"><IconPlus size={16} /></span>
                  </div>
                </div>
              </button>
            );
          })}
          {!products.length && <div style={{ gridColumn: '1 / -1' }}><Empty title="No items" hint="Try another category or search term." /></div>}
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
            <Empty icon={<IconChefHat size={32} />} title="No items yet" hint="Tap a menu item to add it to the order." />
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
                <button className="tact" title="Discount" disabled={!!isClosed} onClick={() => setShowDiscount(true)}><IconDiscount2 size={18} /> Discount</button>
                <button className="tact" title="Split" disabled={!order ||!!isClosed || order.paidAmount > 0 || activeSent.length < 2} onClick={() => setSplitMode(true)}><IconArrowsSplit size={18} /> Split</button>
                <button className="tact" title="Hold" disabled={busy || !!isClosed || (!drafts.length && !order)} onClick={hold}><IconPlayerPause size={18} /> Hold</button>
                <button className="tact" title="Print" disabled={!order} onClick={printCheck}><IconFileInvoice size={18} /> Print</button>
                <button className="tact danger" title="Void" disabled={!!isClosed || (!order && !drafts.length) || (order?.paidAmount > 0)} onClick={cancelOrder}><IconBan size={18} /> Void</button>
              </div>
              <div className="ticket-cta">
                {settings?.modules.kds !== false && (
                  <button className="cta cta-secondary" disabled={busy || !!isClosed || (!drafts.length && !activeSent.some((i) => i.status === 'PENDING'))} onClick={send}>
                    <IconSend size={18} /> Send
                  </button>
                )}
                <button className="cta cta-primary" disabled={busy || !!isClosed || (!drafts.length && !order)} onClick={pay}>
                  {busy ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <IconCreditCard size={18} />}
                  Pay {money(payAmount)}
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
