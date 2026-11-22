import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useManagerApproval } from '@/components/ManagerPin';
import {
  Badge, Button, Card, Chip, Empty, ErrorBanner, Header, IconButton, ITEM_STATUS, Loading, Screen, SectionTitle, Sheet, TABLE_STATUS, tap, toast,
  type IconName,
} from '@/components/ui';
import { gql } from '@/lib/api';
import { clock, label, useMoney } from '@/lib/format';
import { useAction, useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import { useCart, useSession } from '@/lib/store';
import type { Order, OrderItem, Zone } from '@/lib/types';
import { useBrand } from '@/lib/theme';

const VOID_REASONS = ['Customer changed mind', 'Wrong item', 'Kitchen error', 'Too long wait', 'Quality issue'];
const COURSE_NAMES = ['', 'Starters', 'Mains', 'Desserts'];

export default function CheckScreen() {
  const brand = useBrand();
  const { id } = useLocalSearchParams<{ id: string }>();
  const config = useSession((s) => s.config)!;
  const caps = config.capabilities;
  const money = useMoney();
  const startCart = useCart((s) => s.start);
  const q = useQuery<{ order: Order | null }>(Q.ORDER, { id });
  const { busy, run } = useAction();
  const { withApproval, element: approvalSheet } = useManagerApproval();
  const [itemSheet, setItemSheet] = useState<OrderItem | null>(null);
  const [voidFor, setVoidFor] = useState<OrderItem | 'order' | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [more, setMore] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitSel, setSplitSel] = useState<Set<string>>(new Set());
  const [transfer, setTransfer] = useState(false);
  const [discount, setDiscount] = useState(false);

  const order = q.data?.order;

  if (q.loading && !q.data) return <Screen><Header back title="Check" /><Loading /></Screen>;
  if (!order) {
    return (
      <Screen>
        <Header back title="Check" />
        {q.error ? <ErrorBanner message={q.error} onRetry={() => q.reload('initial')} /> : null}
        <Empty icon="receipt-outline" title="Check not found" hint="It may have been closed, or it belongs to another server." action={<Button title="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const live = order.items.filter((i) => i.status !== 'VOIDED');
  const unsent = live.filter((i) => i.status === 'PENDING');
  const ready = live.filter((i) => i.status === 'READY');
  const closed = ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const title = order.table ? `Table ${order.table.name}` : label(order.orderType);
  const setOrder = (o: Order) => q.setData({ order: o });

  const act = (fn: () => Promise<any>, ok?: string) => run(async () => {
    try { const r = await fn(); if (ok) toast.ok(ok); q.reload('silent'); return r; } catch (e: any) { toast.error(e.message); }
  });

  const fire = () => act(async () => setOrder((await gql<{ fireOrder: Order }>(Q.FIRE, { orderId: order.id })).fireOrder), `${unsent.length} item${unsent.length === 1 ? '' : 's'} sent to the kitchen`);
  const serve = (ids: string[]) => act(() => gql(Q.SERVED, { itemIds: ids }), 'Marked served');
  const bill = () => act(() => gql(Q.BILL, { orderId: order.id }), 'Bill requested. Table marked for payment');

  const addItems = () => {
    if (order.table) startCart({ kind: 'table', tableId: order.table.id, tableName: order.table.name, guestCount: order.guestCount || 1, orderId: order.id });
    else startCart({ kind: 'order', orderId: order.id, label: `${title} #${order.ticketNumber ?? ''}` });
    router.push('/menu');
  };

  const removeUnsent = (item: OrderItem) => act(async () => {
    setOrder((await gql<{ voidOrderItem: Order }>(Q.VOID_ITEM, { itemId: item.id, reason: 'Removed before sending' })).voidOrderItem);
    setItemSheet(null);
  }, `${item.name} removed`);

  const confirmVoid = async () => {
    const reason = voidReason.trim();
    if (!reason) return toast.error('Pick or type a reason');
    if (voidFor === 'order') {
      const res = await withApproval((approverPin) => gql(Q.CANCEL, { orderId: order.id, reason, approverPin }));
      if (res) { setVoidFor(null); toast.ok('Check cancelled'); router.back(); }
    } else if (voidFor) {
      const res = await withApproval((approverPin) => gql<{ voidOrderItem: Order }>(Q.VOID_ITEM, { itemId: voidFor.id, reason, approverPin }));
      if (res) { setOrder(res.voidOrderItem); setVoidFor(null); setItemSheet(null); toast.ok('Item voided'); }
    }
  };

  const doSplit = () => act(async () => {
    const { splitOrder } = await gql<{ splitOrder: { id: string } }>(Q.SPLIT, { orderId: order.id, itemIds: [...splitSel] });
    setSplitMode(false);
    setSplitSel(new Set());
    router.push(`/check/${splitOrder.id}`);
  }, 'Check split');

  // Group by course when coursing is on.
  const groups = caps.courses
    ? [...new Set(order.items.map((i) => i.course))].sort().map((c) => ({ key: c, title: COURSE_NAMES[c] || `Course ${c}`, items: order.items.filter((i) => i.course === c) }))
    : [{ key: 0, title: '', items: order.items }];

  const moreActions: { icon: IconName; label: string; onPress: () => void; danger?: boolean; show: boolean }[] = [
    { icon: 'git-branch-outline', label: 'Split check', show: caps.split && !closed && live.length > 1 && order.paidAmount === 0, onPress: () => { setMore(false); setSplitMode(true); } },
    { icon: 'swap-horizontal', label: 'Move to another table', show: caps.transfer && !!order.table && !closed, onPress: () => { setMore(false); setTransfer(true); } },
    { icon: 'pricetag-outline', label: order.discountAmount ? 'Change discount' : 'Apply discount', show: caps.discounts && !closed, onPress: () => { setMore(false); setDiscount(true); } },
    { icon: 'close-circle-outline', label: 'Cancel check', danger: true, show: caps.voids && !closed && order.paidAmount === 0, onPress: () => { setMore(false); setVoidReason(''); setVoidFor('order'); } },
  ];

  return (
    <Screen>
      <Header
        back
        title={`${title} · #${order.ticketNumber ?? '—'}`}
        subtitle={`${order.guestCount ? `${order.guestCount} guests · ` : ''}opened ${clock(order.createdAt)}`}
        right={moreActions.some((a) => a.show) ? <IconButton icon="ellipsis-horizontal" onPress={() => setMore(true)} /> : null}
      />

      <ScrollView
        contentContainerClassName="px-4 pb-48"
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={() => q.reload('pull')} tintColor={brand[500]} />}
      >
        {closed ? (
          <View className={`mb-3 flex-row items-center gap-3 rounded-2xl p-4 ${order.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-ink'}`}>
            <Ionicons name={order.status === 'COMPLETED' ? 'checkmark-circle' : 'close-circle'} size={28} color="#fff" />
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-white">{order.status === 'COMPLETED' ? 'Paid in full' : label(order.status)}</Text>
              <Text className="text-[13px] text-white/80">{order.status === 'COMPLETED' ? `Thank the guests! ${order.table ? 'Clear the table when they leave.' : ''}` : 'This check is closed.'}</Text>
            </View>
          </View>
        ) : null}

        {splitMode ? (
          <View className="mb-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <Text className="text-[15px] font-bold text-brand-800">Split check</Text>
            <Text className="mt-0.5 text-[13px] text-brand-800/80">Tap the items that move to a new check.</Text>
          </View>
        ) : null}

        {ready.length && !closed ? (
          <Pressable onPress={() => serve(ready.map((i) => i.id))} className="mb-3 flex-row items-center gap-3 rounded-2xl bg-emerald-50 p-4 active:bg-emerald-100">
            <Ionicons name="notifications" size={22} color="#059669" />
            <Text className="flex-1 text-[15px] font-semibold text-emerald-800">{ready.length} item{ready.length === 1 ? '' : 's'} ready at the pass</Text>
            <Text className="text-[14px] font-bold text-emerald-700">Mark served</Text>
          </Pressable>
        ) : null}

        <Card className="px-4">
          {live.length === 0 ? <Empty icon="fast-food-outline" title="No items yet" hint="Add something from the menu." /> : null}
          {groups.map((g) => (
            <View key={g.key}>
              {g.title && g.items.length ? <Text className="mt-4 text-[12px] font-bold uppercase tracking-wider text-ink-muted">{g.title}</Text> : null}
              {g.items.map((i) => {
                const s = ITEM_STATUS[i.status];
                const voided = i.status === 'VOIDED';
                const sel = splitSel.has(i.id);
                return (
                  <Pressable
                    key={i.id}
                    disabled={closed || voided}
                    onPress={() => {
                      tap();
                      if (splitMode) setSplitSel((p) => { const n = new Set(p); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; });
                      else setItemSheet(i);
                    }}
                    className={`flex-row items-start gap-3 border-b border-line py-3.5 ${voided ? 'opacity-40' : ''}`}
                  >
                    {splitMode && !voided ? <Ionicons name={sel ? 'checkbox' : 'square-outline'} size={22} color={sel ? brand[500] : '#9CA3AF'} /> : null}
                    <Text className="w-7 text-[15px] font-bold text-ink">{i.quantity}×</Text>
                    <View className="flex-1">
                      <Text className={`text-[15px] font-semibold text-ink ${voided ? 'line-through' : ''}`}>{i.name}</Text>
                      {i.modifiers?.length ? <Text className="text-[13px] text-ink-muted">{i.modifiers.map((m) => m.name).join(', ')}</Text> : null}
                      {i.notes ? <Text className="text-[13px] italic text-amber-700">“{i.notes}”</Text> : null}
                      <View className="mt-1.5 flex-row items-center gap-2">
                        <Badge tone={s.tone} label={s.label} />
                        {i.seat ? <Text className="text-[12px] font-semibold text-ink-muted">Seat {i.seat}</Text> : null}
                        {voided && i.voidReason ? <Text className="text-[12px] text-ink-muted">{i.voidReason}</Text> : null}
                      </View>
                    </View>
                    <Text className="text-[15px] font-semibold text-ink">{money(i.subtotal)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View className="py-3">
            <Line label="Subtotal" value={money(order.subtotal)} />
            {order.discountAmount ? <Line label={`Discount${order.discountReason ? ` · ${order.discountReason.split(' — ')[0]}` : ''}`} value={`−${money(order.discountAmount)}`} tone="text-emerald-700" /> : null}
            {order.serviceCharge ? <Line label="Service charge" value={money(order.serviceCharge)} /> : null}
            {order.taxAmount ? <Line label={config.taxLabel} value={money(order.taxAmount)} /> : null}
            {order.tipAmount ? <Line label="Tip" value={money(order.tipAmount)} /> : null}
            {order.roundingAmount ? <Line label="Rounding" value={money(order.roundingAmount)} /> : null}
            <View className="mt-2 flex-row justify-between border-t border-line pt-3">
              <Text className="text-[17px] font-bold text-ink">Total</Text>
              <Text className="text-[19px] font-extrabold text-ink">{money(order.total)}</Text>
            </View>
            {order.paidAmount ? (
              <>
                <Line label="Paid" value={money(order.paidAmount)} tone="text-emerald-700" />
                <Line label="Balance due" value={money(order.balanceDue)} bold />
              </>
            ) : null}
          </View>
        </Card>

        {order.payments.length ? (
          <>
            <SectionTitle>Payments</SectionTitle>
            <Card className="px-4">
              {order.payments.map((p) => (
                <View key={p.id} className="flex-row items-center gap-3 border-b border-line py-3">
                  <Ionicons name={p.method === 'CASH' ? 'cash-outline' : p.method === 'CARD' ? 'card-outline' : 'phone-portrait-outline'} size={20} color="#3A3F4B" />
                  <Text className="flex-1 text-[14px] text-ink">{label(p.method)}{p.type === 'REFUND' ? ' refund' : ''} · {clock(p.createdAt)}</Text>
                  <Text className="text-[14px] font-semibold text-ink">{money(p.amount)}{p.tip ? ` +${money(p.tip)} tip` : ''}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {order.notes ? (
          <>
            <SectionTitle>Notes</SectionTitle>
            <Card className="p-4"><Text className="text-[14px] text-ink-soft">{order.notes}</Text></Card>
          </>
        ) : null}
      </ScrollView>

      {/* ---- action bar */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-4 pb-7 pt-3">
        {splitMode ? (
          <View className="flex-row gap-2">
            <Button title="Cancel" variant="secondary" className="flex-1" onPress={() => { setSplitMode(false); setSplitSel(new Set()); }} />
            <Button title={`Move ${splitSel.size} to new check`} className="flex-[2]" loading={busy} disabled={!splitSel.size || splitSel.size >= live.length} onPress={doSplit} />
          </View>
        ) : closed ? (
          <Button title="Done" size="lg" variant="dark" onPress={() => router.back()} />
        ) : (
          <View className="gap-2">
            {unsent.length ? (
              <Button title={`Send ${unsent.length} to kitchen`} icon="flame" size="lg" loading={busy} onPress={fire} />
            ) : null}
            <View className="flex-row gap-2">
              {caps.menu ? <Button title="Add" icon="add" variant="secondary" className="flex-1" onPress={addItems} /> : null}
              {order.table ? <Button title="Bill" icon="receipt-outline" variant="secondary" className="flex-1" disabled={busy} onPress={bill} /> : null}
              {caps.payments && order.balanceDue > 0 ? (
                <Button title={`Pay ${money(order.balanceDue)}`} icon="card-outline" variant={unsent.length ? 'dark' : 'primary'} className="flex-[1.6]" onPress={() => router.push(`/pay/${order.id}`)} />
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* ---- item actions */}
      <Sheet visible={!!itemSheet} onClose={() => setItemSheet(null)} title={itemSheet ? `${itemSheet.quantity}× ${itemSheet.name}` : ''} subtitle={itemSheet ? ITEM_STATUS[itemSheet.status].label : ''}>
        {itemSheet ? (
          <View className="gap-2 pb-2">
            {['FIRED', 'PREPARING', 'READY'].includes(itemSheet.status) ? (
              <Button title="Mark served" icon="checkmark-done" variant="success" size="lg" onPress={() => { serve([itemSheet.id]); setItemSheet(null); }} />
            ) : null}
            {itemSheet.status === 'PENDING' ? (
              <Button title="Remove (not sent yet)" icon="trash-outline" variant="danger" loading={busy} onPress={() => removeUnsent(itemSheet)} />
            ) : caps.voids ? (
              <Button title={caps.voidNeedsManager ? 'Void (manager PIN)' : 'Void item'} icon="close-circle-outline" variant="danger" onPress={() => { setVoidReason(''); setVoidFor(itemSheet); }} />
            ) : null}
            {!caps.voids && itemSheet.status !== 'PENDING' ? <Text className="text-center text-[13px] text-ink-muted">Voids are done at the POS terminal.</Text> : null}
          </View>
        ) : null}
      </Sheet>

      {/* ---- void reason */}
      <Sheet visible={!!voidFor} onClose={() => setVoidFor(null)} title={voidFor === 'order' ? 'Cancel this check?' : 'Void item'} subtitle="The reason is saved in the audit log">
        <View className="mb-3 flex-row flex-wrap gap-2">
          {VOID_REASONS.map((r) => <Chip key={r} label={r} active={voidReason === r} onPress={() => setVoidReason(r)} />)}
        </View>
        <TextInput value={voidReason} onChangeText={setVoidReason} placeholder="Or type a reason" placeholderTextColor="#9CA3AF" className="mb-4 h-12 rounded-xl border border-line bg-surface px-4 text-[15px] text-ink" />
        <Button title={voidFor === 'order' ? 'Cancel check' : 'Void item'} variant="danger" size="lg" className="mb-2" onPress={confirmVoid} />
      </Sheet>

      {/* ---- more */}
      <Sheet visible={more} onClose={() => setMore(false)} title="More actions">
        {moreActions.filter((a) => a.show).map((a) => (
          <Pressable key={a.label} onPress={() => { tap(); a.onPress(); }} className="flex-row items-center gap-4 border-b border-line py-4 active:opacity-70">
            <Ionicons name={a.icon} size={22} color={a.danger ? '#DC2626' : '#14161C'} />
            <Text className={`flex-1 text-[16px] font-medium ${a.danger ? 'text-red-600' : 'text-ink'}`}>{a.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        ))}
      </Sheet>

      {transfer ? <MoveTableSheet order={order} onClose={() => setTransfer(false)} onMoved={() => { setTransfer(false); q.reload('silent'); }} /> : null}
      {discount ? <DiscountSheet order={order} withApproval={withApproval} onClose={() => setDiscount(false)} onDone={(o) => { setOrder(o); setDiscount(false); }} /> : null}
      {approvalSheet}
    </Screen>
  );
}

function Line({ label: l, value, tone, bold }: { label: string; value: string; tone?: string; bold?: boolean }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={`text-[14px] ${bold ? 'font-bold text-ink' : 'text-ink-muted'}`}>{l}</Text>
      <Text className={`text-[14px] ${bold ? 'font-bold' : 'font-medium'} ${tone || 'text-ink'}`}>{value}</Text>
    </View>
  );
}

function MoveTableSheet({ order, onClose, onMoved }: { order: Order; onClose: () => void; onMoved: () => void }) {
  const locationId = useSession((s) => s.config?.location?.id);
  const floor = useQuery<{ zones: Zone[] }>(Q.FLOOR, { locationId }, { live: false });
  const { busy, run } = useAction();
  const free = (floor.data?.zones || []).flatMap((z) => z.tables.filter((t) => t.status === 'AVAILABLE' && t.id !== order.tableId).map((t) => ({ ...t, zone: z.name })));

  const move = (tableId: string, name: string) => run(async () => {
    try { await gql(Q.TRANSFER, { orderId: order.id, tableId }); toast.ok(`Moved to table ${name}`); onMoved(); } catch (e: any) { toast.error(e.message); }
  });

  return (
    <Sheet visible onClose={onClose} title="Move to table" subtitle="Guests changed tables? The check moves with them.">
      {floor.loading ? <Loading /> : free.length === 0 ? <Empty icon="grid-outline" title="No free tables right now" /> : (
        <View className="flex-row flex-wrap gap-2 pb-2">
          {free.map((t) => (
            <Pressable key={t.id} disabled={busy} onPress={() => move(t.id, t.name)} style={{ backgroundColor: TABLE_STATUS.AVAILABLE.soft }} className="w-[31%] items-center rounded-2xl py-4 active:opacity-70">
              <Text className="text-[20px] font-extrabold text-emerald-700">{t.name}</Text>
              <Text className="text-[11px] text-ink-muted">{t.zone} · {t.capacity}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}

function DiscountSheet({ order, withApproval, onClose, onDone }: {
  order: Order; onClose: () => void; onDone: (o: Order) => void;
  withApproval: <T>(run: (pin?: string) => Promise<T>) => Promise<T | undefined>;
}) {
  const [pct, setPct] = useState(10);
  const [reason, setReason] = useState('');
  const apply = async () => {
    if (!reason.trim()) return toast.error('Add a reason for the discount');
    const res = await withApproval((approverPin) => gql<{ applyDiscount: Order }>(Q.DISCOUNT, { orderId: order.id, discount: { type: 'PERCENT', value: pct, reason: reason.trim(), approverPin } }));
    if (res) { toast.ok(`${pct}% discount applied`); onDone(res.applyDiscount); }
  };
  const remove = async () => {
    try { const { removeDiscount } = await gql<{ removeDiscount: Order }>(Q.REMOVE_DISCOUNT, { orderId: order.id }); onDone(removeDiscount); toast.ok('Discount removed'); } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Sheet visible onClose={onClose} title="Discount" subtitle="Above the POS limit, a manager approves with their PIN">
      <View className="mb-4 flex-row flex-wrap gap-2">
        {[5, 10, 15, 20, 25, 50].map((p) => <Chip key={p} label={`${p}%`} active={pct === p} onPress={() => setPct(p)} />)}
      </View>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {['Regular guest', 'Staff meal', 'Complaint', 'Birthday'].map((r) => <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />)}
      </View>
      <TextInput value={reason} onChangeText={setReason} placeholder="Reason" placeholderTextColor="#9CA3AF" className="mb-4 h-12 rounded-xl border border-line bg-surface px-4 text-[15px] text-ink" />
      <Button title={`Apply ${pct}% off`} size="lg" onPress={apply} />
      {order.discountAmount ? <Button title="Remove discount" variant="ghost" className="mt-2" onPress={remove} /> : null}
      <View className="h-2" />
    </Sheet>
  );
}
