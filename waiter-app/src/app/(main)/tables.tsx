import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ClockInBanner } from '@/components/ClockInBanner';
import { useManagerApproval } from '@/components/ManagerPin';
import {
  Avatar, Badge, Button, Chip, Empty, ErrorBanner, Header, IconButton, Loading, Screen, Sheet, Stepper, TABLE_STATUS, tap, toast,
} from '@/components/ui';
import { gql } from '@/lib/api';
import { duration, useMoney } from '@/lib/format';
import { useAction, useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import { useCart, useSession } from '@/lib/store';
import type { FloorTable, TableStatus, Zone } from '@/lib/types';
import { useBrand } from '@/lib/theme';

type Filter = 'all' | 'mine' | 'free' | 'attention';

interface MySession {
  id: string; guestCount: number; startTime: string; tableId: string; readyItemCount: number;
  orders: { id: string; ticketNumber: number | null; total: number; balanceDue: number; status: string; items: { id: string; status: string }[] }[];
}

export default function TablesScreen() {
  const brand = useBrand();
  const config = useSession((s) => s.config)!;
  const caps = config.capabilities;
  const me = config.user.id;
  const locationId = config.location?.id;
  const money = useMoney();
  const startCart = useCart((s) => s.start);

  const floor = useQuery<{ zones: Zone[] }>(Q.FLOOR, { locationId }, { skip: !locationId || !caps.tables });
  const mine = useQuery<{ myTables: MySession[] }>(Q.MY_TABLES, {}, { skip: !caps.tables });
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<FloorTable | null>(null);
  const [guests, setGuests] = useState(2);
  const [transferFor, setTransferFor] = useState<FloorTable | null>(null);
  const { busy, run } = useAction();
  const { withApproval, element: approvalSheet } = useManagerApproval();

  const sessions = useMemo(() => new Map((mine.data?.myTables || []).map((s) => [s.tableId, s])), [mine.data]);
  const zones = floor.data?.zones || [];
  const allTables = zones.flatMap((z) => z.tables.map((t) => ({ ...t, zoneName: z.name, zoneId: z.id })));

  const isMine = (t: FloorTable) => t.activeSession?.serverUserId === me;
  const tables = allTables
    .filter((t) => !zoneId || t.zoneId === zoneId)
    .filter((t) =>
      filter === 'mine' ? isMine(t)
        : filter === 'free' ? t.status === 'AVAILABLE'
          : filter === 'attention' ? t.status === 'READY_FOR_PAYMENT' || t.status === 'NEEDS_CLEANING' || (t.activeSession?.readyItemCount ?? 0) > 0
            : true,
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (!caps.tables) return <Redirect href="/orders" />;

  const counts = {
    mine: allTables.filter(isMine).length,
    free: allTables.filter((t) => t.status === 'AVAILABLE').length,
    attention: allTables.filter((t) => t.status === 'READY_FOR_PAYMENT' || t.status === 'NEEDS_CLEANING' || (isMine(t) && (t.activeSession?.readyItemCount ?? 0) > 0)).length,
  };

  const reload = () => { floor.reload('silent'); mine.reload('silent'); };

  const openTable = (t: FloorTable) => {
    tap();
    if (t.activeSession && !isMine(t) && !caps.allTables) {
      if (caps.transfer) return setTransferFor(t);
      return toast.error(`${t.name} is served by ${t.activeSession.server?.name || 'someone else'}`);
    }
    setGuests(Math.min(2, t.capacity) || 2);
    setActive(t);
  };

  const seat = (thenOrder: boolean) => active && run(async () => {
    try {
      await gql(Q.SEAT, { id: active.id, guestCount: guests });
      const t = active;
      setActive(null);
      reload();
      if (thenOrder && caps.menu) {
        startCart({ kind: 'table', tableId: t.id, tableName: t.name, guestCount: guests });
        router.push('/menu');
      } else {
        toast.ok(`${t.name} seated · ${guests} guests`);
      }
    } catch (e: any) { toast.error(e.message); }
  });

  const takeOrder = (t: FloorTable, orderId?: string) => {
    setActive(null);
    startCart({ kind: 'table', tableId: t.id, tableName: t.name, guestCount: t.activeSession?.guestCount || 1, orderId: orderId || null });
    router.push('/menu');
  };

  const setStatus = (t: FloorTable, status: TableStatus, msg: string) => run(async () => {
    try {
      if (status === 'NEEDS_CLEANING') await gql(Q.CHECKOUT_TABLE, { id: t.id });
      else await gql(Q.TABLE_STATUS, { id: t.id, status });
      setActive(null);
      reload();
      toast.ok(msg);
    } catch (e: any) { toast.error(e.message); }
  });

  const takeOver = async (t: FloorTable) => {
    const res = await withApproval((approverPin) => gql(Q.ASSIGN, { tableId: t.id, serverUserId: me, approverPin }));
    if (res) { setTransferFor(null); reload(); toast.ok(`${t.name} is now yours`); }
  };

  const activeSession = active ? sessions.get(active.id) : undefined;

  return (
    <Screen>
      <Header
        large
        title="Tables"
        subtitle={`${config.location?.name ?? ''} · ${counts.mine} yours · ${counts.free} free`}
        right={caps.takeaway ? <IconButton icon="bag-add-outline" onPress={() => router.push('/orders?new=1')} /> : null}
      />
      <ClockInBanner />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 pb-3">
          <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Mine" icon="person" count={counts.mine} active={filter === 'mine'} onPress={() => setFilter('mine')} />
          <Chip label="Free" count={counts.free} active={filter === 'free'} onPress={() => setFilter('free')} />
          <Chip label="Needs you" icon="alert-circle-outline" count={counts.attention} active={filter === 'attention'} onPress={() => setFilter('attention')} />
        </ScrollView>
        {zones.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 pb-3">
            <ZoneTab label="All areas" active={!zoneId} onPress={() => setZoneId(null)} />
            {zones.map((z) => <ZoneTab key={z.id} label={z.name} active={zoneId === z.id} onPress={() => setZoneId(z.id)} />)}
          </ScrollView>
        ) : null}
      </View>

      {floor.error && !floor.data ? <ErrorBanner message={floor.error} onRetry={() => floor.reload('initial')} /> : null}

      {floor.loading && !floor.data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerClassName="flex-row flex-wrap justify-between px-4 pb-8"
          refreshControl={<RefreshControl refreshing={floor.refreshing} onRefresh={() => { floor.reload('pull'); mine.reload('silent'); }} tintColor={brand[500]} />}
        >
          {tables.length === 0 ? (
            <View className="w-full">
              <Empty
                icon="grid-outline"
                title={allTables.length ? 'Nothing here' : 'No tables set up'}
                hint={allTables.length ? 'Try another filter.' : 'Add a floor plan in the POS under Tables.'}
              />
            </View>
          ) : (
            tables.map((t) => <TableTile key={t.id} table={t} mine={isMine(t)} onPress={() => openTable(t)} />)
          )}
        </ScrollView>
      )}

      {/* ---- table actions */}
      <Sheet
        visible={!!active}
        onClose={() => setActive(null)}
        title={active ? `Table ${active.name}` : ''}
        subtitle={active ? `${TABLE_STATUS[active.status].label} · seats ${active.capacity}${active.activeSession ? ` · ${duration(active.activeSession.startTime)}` : ''}` : ''}
      >
        {active && (active.status === 'AVAILABLE' || (!active.activeSession && active.status !== 'NEEDS_CLEANING')) ? (
          <View className="pb-2">
            <Text className="mb-3 text-[14px] font-semibold text-ink-soft">How many guests?</Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {Array.from({ length: Math.max(active.capacity, 6) }, (_, i) => i + 1).slice(0, 8).map((n) => (
                <Pressable key={n} onPress={() => { tap(); setGuests(n); }} className={`h-12 w-12 items-center justify-center rounded-xl border ${guests === n ? 'border-brand-500 bg-brand-500' : 'border-line bg-surface'}`}>
                  <Text className={`text-[17px] font-bold ${guests === n ? 'text-white' : 'text-ink'}`}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-[13px] text-ink-muted">Bigger party?</Text>
              <Stepper value={guests} onChange={(v) => setGuests(Math.max(1, v))} min={1} max={99} />
            </View>
            {caps.menu ? <Button title="Seat & take order" icon="restaurant-outline" size="lg" loading={busy} onPress={() => seat(true)} /> : null}
            <Button title="Seat only" variant="secondary" className="mt-2" disabled={busy} onPress={() => seat(false)} />
          </View>
        ) : active?.status === 'NEEDS_CLEANING' && !active.activeSession ? (
          <View className="pb-2">
            <Text className="mb-4 text-[14px] text-ink-muted">Guests have left. Mark the table clean when it’s reset.</Text>
            <Button title="Table is clean" icon="sparkles-outline" variant="success" size="lg" loading={busy} onPress={() => setStatus(active, 'AVAILABLE', `${active.name} is ready for guests`)} />
          </View>
        ) : active ? (
          <View className="pb-2">
            <View className="mb-4 flex-row items-center gap-3 rounded-2xl bg-canvas p-3">
              <Avatar name={active.activeSession?.server?.name || '?'} size={36} tone="light" />
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-ink">{isMine(active) ? 'Your table' : active.activeSession?.server?.name || 'Unassigned'}</Text>
                <Text className="text-[12px] text-ink-muted">{active.activeSession?.guestCount} guests · seated {duration(active.activeSession?.startTime)}</Text>
              </View>
              {active.activeSession?.readyItemCount ? <Badge tone="green" icon="notifications" label={`${active.activeSession.readyItemCount} ready`} /> : null}
            </View>

            {(activeSession?.orders || []).map((o) => (
              <Pressable key={o.id} onPress={() => { setActive(null); router.push(`/check/${o.id}`); }} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-line p-4 active:bg-canvas">
                <Ionicons name="receipt-outline" size={22} color="#3A3F4B" />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">Check #{o.ticketNumber ?? '—'}</Text>
                  <Text className="text-[12px] text-ink-muted">{o.items.filter((i) => i.status !== 'VOIDED').length} items · {o.items.filter((i) => i.status === 'PENDING').length ? 'has unsent items' : 'all sent'}</Text>
                </View>
                <Text className="text-[16px] font-bold text-ink">{money(o.balanceDue)}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            ))}

            {caps.menu ? (
              <Button
                title={activeSession?.orders.length ? 'Add items' : 'Take order'}
                icon="add-circle-outline" size="lg" className="mt-2"
                onPress={() => takeOrder(active, activeSession?.orders.length === 1 ? activeSession.orders[0]!.id : undefined)}
              />
            ) : null}
            <View className="mt-2 flex-row gap-2">
              {caps.transfer && isMine(active) ? (
                <Button title="Transfer" icon="swap-horizontal" variant="secondary" className="flex-1" onPress={() => { const t = active; setActive(null); setTransferFor(t); }} />
              ) : null}
              {activeSession && activeSession.orders.length === 0 ? (
                <Button title="Guests left" icon="exit-outline" variant="secondary" className="flex-1" loading={busy} onPress={() => setStatus(active, 'NEEDS_CLEANING', `${active.name} cleared`)} />
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>

      <TransferSheet table={transferFor} me={me} onClose={() => setTransferFor(null)} onTakeOver={takeOver} onDone={reload} withApproval={withApproval} />
      {approvalSheet}
    </Screen>
  );
}

function ZoneTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} className={`rounded-lg px-3 py-1.5 ${active ? 'bg-brand-100' : ''}`}>
      <Text className={`text-[13px] font-semibold ${active ? 'text-brand-700' : 'text-ink-muted'}`}>{label}</Text>
    </Pressable>
  );
}

function TableTile({ table: t, mine, onPress }: { table: FloorTable & { zoneName: string }; mine: boolean; onPress: () => void }) {
  const meta = TABLE_STATUS[t.status];
  const s = t.activeSession;
  const ready = s?.readyItemCount ?? 0;
  return (
    <Pressable onPress={onPress} className="mb-3 w-[48.5%] active:opacity-80">
      <View style={{ backgroundColor: meta.soft, borderColor: mine ? meta.color : 'transparent' }} className="min-h-[124px] overflow-hidden rounded-2xl border-2 p-3.5">
        <View className="flex-row items-start justify-between">
          <Text style={{ color: meta.color }} className="text-[26px] font-extrabold">{t.name}</Text>
          {ready && mine ? (
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-600 px-2 py-1">
              <Ionicons name="notifications" size={11} color="#fff" />
              <Text className="text-[11px] font-bold text-white">{ready}</Text>
            </View>
          ) : (
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          )}
        </View>
        <View className="mt-auto pt-3">
          <Text style={{ color: meta.color }} className="text-[13px] font-bold">{meta.label}</Text>
          {s ? (
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Ionicons name="people" size={12} color="#6B7280" />
              <Text className="text-[12px] text-ink-muted">{s.guestCount}/{t.capacity} · {duration(s.startTime)}</Text>
            </View>
          ) : (
            <Text className="mt-0.5 text-[12px] text-ink-muted">Seats {t.capacity}</Text>
          )}
          {s?.server ? <Text numberOfLines={1} className="mt-0.5 text-[11px] font-semibold text-ink-soft">{mine ? 'You' : s.server.name}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

function TransferSheet({ table, me, onClose, onTakeOver, onDone, withApproval }: {
  table: FloorTable | null; me: string; onClose: () => void; onTakeOver: (t: FloorTable) => void; onDone: () => void;
  withApproval: <T>(run: (pin?: string) => Promise<T>) => Promise<T | undefined>;
}) {
  const brand = useBrand();
  const servers = useQuery<{ servers: { user: { id: string; name: string; role: string }; clockedInAt: string | null; openTables: number }[] }>(Q.SERVERS, {}, { skip: !table, live: false });
  if (!table) return null;
  const mineTable = table.activeSession?.serverUserId === me;

  const assign = async (userId: string, name: string) => {
    const res = await withApproval((approverPin) => gql(Q.ASSIGN, { tableId: table.id, serverUserId: userId, approverPin }));
    if (res) { onClose(); onDone(); toast.ok(`${table.name} handed to ${name}`); }
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={mineTable ? `Hand over ${table.name}` : `Table ${table.name}`}
      subtitle={mineTable ? 'Pick who takes this table. Open checks move with it.' : `Served by ${table.activeSession?.server?.name || 'someone else'}`}
    >
      {!mineTable ? (
        <View className="pb-2">
          <Text className="mb-4 text-[14px] leading-5 text-ink-muted">You can take over this table with a manager’s approval, for example at shift change.</Text>
          <Button title="Take over table" icon="hand-left-outline" size="lg" onPress={() => onTakeOver(table)} />
        </View>
      ) : servers.loading ? (
        <Loading />
      ) : (
        (servers.data?.servers || []).filter((s) => s.user.id !== me).map((s) => (
          <Pressable key={s.user.id} onPress={() => assign(s.user.id, s.user.name)} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-line p-3 active:bg-canvas">
            <Avatar name={s.user.name} size={40} tone={s.clockedInAt ? 'brand' : 'light'} />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">{s.user.name}</Text>
              <Text className="text-[12px] text-ink-muted">{s.clockedInAt ? 'On shift' : 'Not clocked in'} · {s.openTables} tables</Text>
            </View>
            <Ionicons name="arrow-forward-circle-outline" size={24} color={brand[500]} />
          </Pressable>
        ))
      )}
    </Sheet>
  );
}
