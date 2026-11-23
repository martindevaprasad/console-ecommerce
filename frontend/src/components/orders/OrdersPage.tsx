import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IconReceiptRefund, IconPrinter, IconDownload, IconDeviceDesktop, IconChevronLeft, IconChevronRight, IconAdjustmentsHorizontal, IconX, IconClipboardList } from '@tabler/icons-react';
import { useApi, useCan, useCurrentLocation, useMutate, useOrg } from '@/hooks';
import { ORDERS } from '@/services/api';
import { money, dateTime, periodRange, downloadCsv, label } from '@/lib/format';
import { ORDER_TYPE_LABELS, ORDER_STATUS_BADGE, PAYMENT_STATUS_BADGE, PAYMENT_LABELS } from '@/lib/constants';
import { PageHeader, SearchBox, Drawer, StatusBadge, Empty, Field, Segmented, useApproval, withApproval } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';
import Receipt from '../pos/Receipt';
import { useDevice } from '../adaptive/device';
import { BottomSheet } from '../adaptive/BottomSheet';
import { ResponsiveTable, Column } from '../adaptive/ResponsiveTable';
import { LoadMore, useAccumulatedPages } from '../adaptive/content';

const PAGE = 50;

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useCurrentLocation();
  const { org } = useOrg();
  const can = useCan();
  const mutate = useMutate();
  const approval = useApproval();
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7d' | '30d'>('today');
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [search, setSearch] = useState('');
  const [allLocations, setAllLocations] = useState(false);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refund, setRefund] = useState<{ amount: string; reason: string; method: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Phones: cards + infinite scroll + filters sheet. Landscape tablets: list/detail split view.
  const { device, isPortrait, isMobile } = useDevice();
  const split = device === 'tablet' && !isPortrait;

  const filter = useMemo(() => ({
    ...periodRange(period),
    status: status || null,
    orderType: orderType || null,
    search: search || null,
    locationId: allLocations ? null : location?.id,
  }), [period, status, orderType, search, allLocations, location?.id]);

  const { data, loading, reload } = useApi(ORDERS.LIST, { filter, limit: PAGE, offset: page * PAGE });
  const detail = useApi(ORDERS.GET, { id: openId }, { skip: !openId });
  const order = detail.data?.order;
  const allLoaded = useAccumulatedPages<any>(data?.orders.items, page);

  const exportCsv = () => downloadCsv(`orders-${period}.csv`, (data?.orders.items || []).map((o: any) => ({
    ticket: o.ticketNumber, order: o.orderNumber, created: o.createdAt, location: o.location?.name, type: o.orderType, channel: o.channel,
    status: o.status, payment: o.paymentStatus, method: o.paymentMethod, total: o.total, tips: o.tipAmount, refunded: o.refundedAmount, server: o.user?.name, customer: o.customer?.name,
  })));

  const doRefund = async () => {
    if (!order || !refund) return;
    try {
      const res = await withApproval((pin) => mutate(ORDERS.REFUND, {
        orderId: order.id, amount: parseFloat(refund.amount), method: refund.method, reason: refund.reason, approverPin: pin || null,
      }), approval.request);
      if (res) { toast.success('Refund issued'); setRefund(null); detail.reload(true); reload(true); }
    } catch (e: any) { toast.error(e.message); }
  };

  const total = data?.orders.total || 0;
  const rows = isMobile ? allLoaded : (data?.orders.items || []);

  // Split view always shows something on the right: select the first order.
  useEffect(() => {
    if (split && !openId && data?.orders.items.length) setOpenId(data.orders.items[0].id);
  }, [split, openId, data]);

  const setPeriodAndReset = (v: any) => { setPeriod(v); setPage(0); };
  const statusSelect = (style?: React.CSSProperties) => (
    <select className="form-select" style={style} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status">
      <option value="">All statuses</option>
      {['OPEN', 'COMPLETED', 'CANCELLED', 'REFUNDED'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
    </select>
  );
  const typeSelect = (style?: React.CSSProperties) => (
    <select className="form-select" style={style} value={orderType} onChange={(e) => { setOrderType(e.target.value); setPage(0); }} aria-label="Order type">
      <option value="">All types</option>
      {Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
  const allLocationsToggle = org?.settings.modules.multiLocation && (
    <label className="check"><input type="checkbox" checked={allLocations} onChange={(e) => setAllLocations(e.target.checked)} /> All locations</label>
  );
  const activeFilters = (status ? 1 : 0) + (orderType ? 1 : 0) + (allLocations ? 1 : 0);
  const periodOptions = [{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }];

  const columns: Column<any>[] = [
    { key: 'no', header: '#', cell: (o) => `#${o.ticketNumber ?? '—'}`, className: 'strong', slot: 'title' },
    { key: 'time', header: 'Time', cell: (o) => dateTime(o.createdAt), slot: 'subtitle' },
    { key: 'type', header: 'Type', priority: 2, cell: (o) => <>{ORDER_TYPE_LABELS[o.orderType]}{o.channel !== 'POS' && <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{o.channel}</span>}</> },
    { key: 'guest', header: 'Table / guest', cell: (o) => o.table?.name || o.customer?.name || '—' },
    { key: 'server', header: 'Server', priority: 3, cell: (o) => o.user?.name || '—' },
    ...(allLocations ? [{ key: 'loc', header: 'Location', priority: 3 as const, cell: (o: any) => o.location?.name }] : []),
    { key: 'status', header: 'Status', cell: (o) => <StatusBadge value={o.status} map={ORDER_STATUS_BADGE} /> },
    { key: 'pay', header: 'Payment', priority: 2, cell: (o) => <><StatusBadge value={o.paymentStatus} map={PAYMENT_STATUS_BADGE} /> <span className="small muted">{PAYMENT_LABELS[o.paymentMethod]}</span></> },
    { key: 'total', header: 'Total', align: 'right', className: 'strong', slot: 'trailing', cell: (o) => money(o.total) },
  ];

  const pager = (
    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
      <span className="small muted">{page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}</span>
      <button className="btn btn-secondary btn-icon btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><IconChevronLeft size={12} /></button>
      <button className="btn btn-secondary btn-icon btn-sm" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)} aria-label="Next page"><IconChevronRight size={12} /></button>
    </div>
  );

  const list = loading && !data ? <LoadingSpinner /> : !rows.length ? <Empty title="No orders found" hint="Adjust filters or period." /> : (
    <>
      <ResponsiveTable
        variant={split ? 'cards' : 'auto'}
        cardPriority={split ? 1 : 2}
        columns={columns}
        rows={rows}
        rowKey={(o: any) => o.id}
        onRowClick={(o: any) => setOpenId(o.id)}
        rowClassName={split ? (o: any) => (o.id === openId ? 'selected' : undefined) : undefined}
      />
      {isMobile
        ? <LoadMore hasMore={allLoaded.length < total} loading={loading} onLoadMore={() => setPage((p) => p + 1)} />
        : pager}
    </>
  );

  const detailTitle = order ? `Order #${order.ticketNumber} · ${order.orderNumber}` : 'Order';
  const detailFooter = order && <>
    {['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'].includes(order.status) && can('pos.access') && (
      <button className="btn btn-secondary" onClick={() => navigate(`/pos?orderId=${order.id}`)}><IconDeviceDesktop size={14} /> Open in POS</button>
    )}
    <button className="btn btn-secondary" onClick={() => setTimeout(() => window.print(), 50)}><IconPrinter size={14} /> Reprint</button>
    {order.paidAmount - order.refundedAmount > 0 && (can('pos.refund') || can('pos.access')) && (
      <button className="btn btn-danger" onClick={() => setRefund({ amount: String((order.paidAmount - order.refundedAmount).toFixed(2)), reason: '', method: order.paymentMethod === 'SPLIT' ? 'CASH' : order.paymentMethod })}>
        <IconReceiptRefund size={14} /> Refund
      </button>
    )}
  </>;
  const detailBody = !order ? <LoadingSpinner /> : (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="stack">
        <div className="row row-wrap">
          <StatusBadge value={order.status} map={ORDER_STATUS_BADGE} />
          <StatusBadge value={order.paymentStatus} map={PAYMENT_STATUS_BADGE} />
          <span className="badge badge-neutral">{ORDER_TYPE_LABELS[order.orderType]}</span>
          <span className="badge badge-neutral">{order.channel}</span>
        </div>
        <table className="data-table"><tbody>
          <tr><td className="muted">Created</td><td>{dateTime(order.createdAt)}</td></tr>
          <tr><td className="muted">Completed</td><td>{dateTime(order.completedAt)}</td></tr>
          <tr><td className="muted">Location</td><td>{order.location?.name}</td></tr>
          <tr><td className="muted">Server</td><td>{order.user?.name || '—'}</td></tr>
          <tr><td className="muted">Table</td><td>{order.table?.name || '—'}{order.guestCount ? ` · ${order.guestCount} guests` : ''}</td></tr>
          <tr><td className="muted">Customer</td><td>{order.customer?.name || '—'}</td></tr>
          {order.discountReason && <tr><td className="muted">Discount</td><td>{order.discountReason}</td></tr>}
          {order.notes && <tr><td className="muted">Notes</td><td style={{ whiteSpace: 'pre-wrap' }}>{order.notes}</td></tr>}
        </tbody></table>
        <div>
          <div className="form-section-title">Payments</div>
          {!order.payments.length ? <p className="small muted">No payments.</p> : order.payments.map((p: any) => (
            <div key={p.id} className="totals-row">
              <span>{p.type === 'REFUND' ? <span className="text-danger">Refund</span> : PAYMENT_LABELS[p.method]} · {dateTime(p.createdAt)} · {p.user?.name}{p.reason ? ` · ${p.reason}` : ''}</span>
              <span className={p.type === 'REFUND' ? 'text-danger' : ''}>{p.type === 'REFUND' ? '-' : ''}{money(p.amount)}{p.tip ? ` +${money(p.tip)}` : ''}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="form-section-title">Items</div>
          {order.items.map((i: any) => (
            <div key={i.id} className="totals-row" style={{ opacity: i.status === 'VOIDED' ? 0.5 : 1 }}>
              <span>{i.quantity}× {i.name}{i.status === 'VOIDED' ? ` (void: ${i.voidReason})` : ''}</span>
              <span>{money(i.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ background: 'var(--color-bg-primary)' }}>
        <Receipt order={order} org={org} location={order.location} />
      </div>
      <div className="print-area"><Receipt order={order} org={org} location={order.location} /></div>
    </div>
  );

  return (
    <div className="page-container">
      <PageHeader title="Orders" subtitle={`${total} orders · ${allLocations ? 'all locations' : location?.name}`}
        actions={<button className="btn btn-secondary btn-sm" onClick={exportCsv}><IconDownload size={13} /> Export CSV</button>} />

      {isMobile ? (
        <div className="toolbar">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Ticket #, order # or customer" />
          <Segmented ariaLabel="Period" value={period} onChange={setPeriodAndReset} options={periodOptions} />
          <button className="btn btn-secondary m-filter-btn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <IconAdjustmentsHorizontal size={16} /> Filters{activeFilters > 0 && <span className="m-filter-count">{activeFilters}</span>}
          </button>
        </div>
      ) : (
        <div className="toolbar">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Ticket #, order # or customer" />
          <Segmented ariaLabel="Period" value={period} onChange={setPeriodAndReset} options={periodOptions} />
          {statusSelect({ width: 140 })}
          {typeSelect({ width: 140 })}
          {allLocationsToggle}
        </div>
      )}

      {split ? (
        <div className="md-split">
          <div className="md-list">{list}</div>
          <section className="md-detail" aria-label="Order detail">
            {openId ? (
              <>
                <header className="md-detail-head">
                  <h2>{detailTitle}</h2>
                  <button className="btn btn-ghost btn-icon" onClick={() => setOpenId(null)} aria-label="Close order"><IconX size={16} /></button>
                </header>
                <div className="md-detail-body">{detailBody}</div>
                {detailFooter && <div className="md-detail-foot">{detailFooter}</div>}
              </>
            ) : <Empty icon={<IconClipboardList size={28} />} title="Select an order" hint="Its items, payments and receipt appear here." />}
          </section>
        </div>
      ) : (
        <>
          {list}
          <Drawer open={!!openId} onClose={() => setOpenId(null)} wide title={detailTitle} footer={detailFooter}>
            {detailBody}
          </Drawer>
        </>
      )}

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setStatus(''); setOrderType(''); setAllLocations(false); setPage(0); }}>Reset</button>
          <button className="btn btn-primary" onClick={() => setFiltersOpen(false)}>Show {total} orders</button>
        </>}
      >
        <Field label="Status">{statusSelect()}</Field>
        <Field label="Order type">{typeSelect()}</Field>
        {allLocationsToggle}
      </BottomSheet>

      <Modal isOpen={!!refund} onClose={() => setRefund(null)} title="Issue refund"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setRefund(null)}>Cancel</button>
          <button className="btn btn-danger" disabled={!refund?.reason || !(parseFloat(refund?.amount || '0') > 0)} onClick={doRefund}>Refund {money(parseFloat(refund?.amount || '0'))}</button>
        </>}
      >
        {refund && (
          <div className="form-grid">
            <Field label="Amount"><input className="form-input" type="number" step="0.01" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} /></Field>
            <Field label="Refund to">
              <select className="form-select" value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })}>
                {['CASH', 'CARD', 'DIGITAL', 'GIFT_CARD', 'OTHER'].map((m) => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
              </select>
            </Field>
            <Field label="Reason" full>
              <select className="form-select" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })}>
                <option value="">Select…</option>
                {['Food quality', 'Wrong order', 'Long wait', 'Overcharged', 'Duplicate charge', 'Other'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        )}
      </Modal>
      {approval.element}
    </div>
  );
};

export default OrdersPage;
