import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ClockInBanner } from '@/components/ClockInBanner';
import { Badge, Button, Chip, Empty, ErrorBanner, Header, IconButton, Input, Loading, Screen, Sheet } from '@/components/ui';
import { duration, label, useMoney } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import { useCart, useSession } from '@/lib/store';
import { useBrand } from '@/lib/theme';

interface OpenOrder {
  id: string; ticketNumber: number | null; orderType: string; total: number; balanceDue: number; status: string; paymentStatus: string;
  guestCount: number | null; createdAt: string; table: { id: string; name: string } | null; items: { id: string; status: string; quantity: number }[];
}

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  DINE_IN: 'restaurant-outline', TAKEAWAY: 'bag-handle-outline', PICKUP: 'walk-outline', DELIVERY: 'bicycle-outline',
  DRIVE_THRU: 'car-outline', CATERING: 'people-outline', ROOM_SERVICE: 'bed-outline',
};

export default function OrdersScreen() {
  const brand = useBrand();
  const config = useSession((s) => s.config)!;
  const caps = config.capabilities;
  const money = useMoney();
  const params = useLocalSearchParams<{ new?: string }>();
  const startCart = useCart((s) => s.start);
  const { data, error, loading, refreshing, reload } = useQuery<{ openOrders: OpenOrder[] }>(Q.OPEN_ORDERS);
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'takeaway'>('all');
  const [newOpen, setNewOpen] = useState(false);
  const takeawayTypes = config.orderTypes.filter((t) => t !== 'DINE_IN');
  const [newType, setNewType] = useState(takeawayTypes[0] || 'TAKEAWAY');
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    if (params.new && caps.takeaway) {
      // Opened from the Tables tab 'new takeaway' button via a route param.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewOpen(true);
      router.setParams({ new: undefined });
    }
  }, [params.new, caps.takeaway]);

  const orders = (data?.openOrders || []).filter((o) =>
    typeFilter === 'table' ? !!o.table : typeFilter === 'takeaway' ? !o.table : true,
  );

  const startTakeaway = () => {
    setNewOpen(false);
    startCart({ kind: 'takeaway', orderType: newType, label: guestName.trim() || undefined });
    setGuestName('');
    router.push('/menu');
  };

  return (
    <Screen>
      <Header
        large
        title="Orders"
        subtitle={`${data?.openOrders.length ?? 0} open check${data?.openOrders.length === 1 ? '' : 's'}${caps.allTables ? '' : ' · yours'}`}
        right={caps.takeaway ? <IconButton icon="add" onPress={() => setNewOpen(true)} /> : null}
      />
      <ClockInBanner />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 pb-3">
          <Chip label="All" active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
          {caps.tables ? <Chip label="Tables" icon="restaurant-outline" active={typeFilter === 'table'} onPress={() => setTypeFilter('table')} /> : null}
          <Chip label="Takeaway" icon="bag-handle-outline" active={typeFilter === 'takeaway'} onPress={() => setTypeFilter('takeaway')} />
        </ScrollView>
      </View>
      {error && !data ? <ErrorBanner message={error} onRetry={() => reload('initial')} /> : null}

      {loading && !data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pb-10"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload('pull')} tintColor={brand[500]} />}
        >
          {orders.length === 0 ? (
            <Empty
              icon="receipt-outline"
              title="No open checks"
              hint={caps.tables ? 'Seat a table or start a takeaway order.' : 'Start a new order to get going.'}
              action={caps.takeaway ? <Button title="New takeaway order" icon="bag-add-outline" onPress={() => setNewOpen(true)} /> : undefined}
            />
          ) : (
            orders.map((o) => {
              const live = o.items.filter((i) => i.status !== 'VOIDED');
              const unsent = live.filter((i) => i.status === 'PENDING').length;
              const ready = live.filter((i) => i.status === 'READY').length;
              const cooking = live.filter((i) => i.status === 'FIRED' || i.status === 'PREPARING').length;
              return (
                <Pressable key={o.id} onPress={() => router.push(`/check/${o.id}`)} className="mb-3 rounded-2xl border border-line bg-surface p-4 active:bg-canvas">
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                      {o.table ? <Text className="text-[16px] font-extrabold text-brand-700">{o.table.name}</Text> : <Ionicons name={TYPE_ICON[o.orderType] || 'bag-handle-outline'} size={22} color={brand[700]} />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-bold text-ink">{o.table ? `Table ${o.table.name}` : label(o.orderType)} · #{o.ticketNumber ?? '—'}</Text>
                      <Text className="text-[12px] text-ink-muted">
                        {live.reduce((s, i) => s + i.quantity, 0)} items{o.guestCount ? ` · ${o.guestCount} guests` : ''} · {duration(o.createdAt)} ago
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[17px] font-extrabold text-ink">{money(o.balanceDue)}</Text>
                      {o.paymentStatus === 'PARTIAL' ? <Text className="text-[11px] font-semibold text-amber-600">Part paid</Text> : null}
                    </View>
                  </View>
                  {unsent || ready || cooking ? (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {unsent ? <Badge tone="amber" icon="alert-circle-outline" label={`${unsent} not sent`} /> : null}
                      {cooking ? <Badge tone="violet" icon="flame-outline" label={`${cooking} cooking`} /> : null}
                      {ready ? <Badge tone="green" icon="notifications" label={`${ready} ready`} /> : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <Sheet visible={newOpen} onClose={() => setNewOpen(false)} title="New order" subtitle="For guests who aren't at a table">
        <Text className="mb-2 text-[13px] font-semibold text-ink-soft">Order type</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {takeawayTypes.map((t) => <Chip key={t} label={label(t)} icon={TYPE_ICON[t]} active={newType === t} onPress={() => setNewType(t)} />)}
        </View>
        <Input label="Guest name or note (optional)" value={guestName} onChangeText={setGuestName} placeholder="e.g. Priya, blue shirt" />
        <Button title="Open menu" icon="restaurant-outline" size="lg" onPress={startTakeaway} className="mb-2" />
      </Sheet>
    </Screen>
  );
}
