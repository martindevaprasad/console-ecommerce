import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Badge, Button, Empty, ErrorBanner, Header, Loading, Screen, tap, toast } from '@/components/ui';
import { gql } from '@/lib/api';
import { label } from '@/lib/format';
import { useAction, useLive, useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import type { OrderItem } from '@/lib/types';
import { useBrand } from '@/lib/theme';

interface PickupOrder {
  id: string; ticketNumber: number | null; orderType: string; guestCount: number | null;
  table: { id: string; name: string } | null;
  items: Pick<OrderItem, 'id' | 'name' | 'quantity' | 'status' | 'seat' | 'course' | 'notes' | 'modifiers'>[];
}

/** Food waiting at the pass for this waiter. The phone buzzes when this fills up. */
export default function PickupScreen() {
  const brand = useBrand();
  const { data, error, loading, refreshing, reload } = useQuery<{ openOrders: PickupOrder[] }>(Q.PICKUP);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { busy, run } = useAction();
  const online = useLive((s) => s.online);

  const groups = (data?.openOrders || [])
    .map((o) => ({ ...o, ready: o.items.filter((i) => i.status === 'READY'), cooking: o.items.filter((i) => i.status === 'FIRED' || i.status === 'PREPARING') }))
    .filter((o) => o.ready.length || o.cooking.length)
    .sort((a, b) => b.ready.length - a.ready.length);
  const readyCount = groups.reduce((s, g) => s + g.ready.length, 0);

  const toggle = (id: string) => {
    tap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const serve = (ids: string[], what: string) => run(async () => {
    try {
      await gql(Q.SERVED, { itemIds: ids });
      setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      toast.ok(`${what} served`);
      reload('silent');
    } catch (e: any) { toast.error(e.message); }
  });

  return (
    <Screen>
      <Header large title="Pickup" subtitle={readyCount ? `${readyCount} item${readyCount === 1 ? '' : 's'} waiting at the pass` : 'Nothing waiting at the pass'} />
      {!online ? <ErrorBanner message="Offline. Pickup alerts are paused until the connection is back." /> : null}
      {error && !data ? <ErrorBanner message={error} onRetry={() => reload('initial')} /> : null}

      {loading && !data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pb-32"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload('pull')} tintColor={brand[500]} />}
        >
          {groups.length === 0 ? (
            <Empty icon="notifications-outline" title="All caught up" hint="When the kitchen marks your food ready, it shows up here and your phone buzzes." />
          ) : (
            groups.map((g) => {
              const name = g.table ? `Table ${g.table.name}` : `${label(g.orderType)} #${g.ticketNumber ?? '—'}`;
              return (
                <View key={g.id} className={`mb-3 overflow-hidden rounded-2xl border bg-surface ${g.ready.length ? 'border-emerald-300' : 'border-line'}`}>
                  <View className={`flex-row items-center gap-3 px-4 py-3 ${g.ready.length ? 'bg-emerald-50' : 'bg-canvas'}`}>
                    <Text className="flex-1 text-[17px] font-extrabold text-ink">{name}</Text>
                    {g.ready.length ? <Badge tone="green" icon="checkmark-circle" label={`${g.ready.length} ready`} /> : <Badge tone="violet" icon="flame-outline" label="Cooking" />}
                  </View>
                  {[...g.ready, ...g.cooking].map((i) => {
                    const isReady = i.status === 'READY';
                    const on = selected.has(i.id);
                    return (
                      <Pressable key={i.id} disabled={!isReady} onPress={() => toggle(i.id)} className="flex-row items-center gap-3 border-t border-line px-4 py-3 active:bg-canvas">
                        {isReady ? (
                          <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? '#059669' : '#9CA3AF'} />
                        ) : (
                          <Ionicons name="flame-outline" size={22} color="#7C3AED" />
                        )}
                        <View className="flex-1">
                          <Text className={`text-[15px] font-semibold ${isReady ? 'text-ink' : 'text-ink-muted'}`}>
                            {i.quantity}× {i.name}{i.seat ? `  · seat ${i.seat}` : ''}
                          </Text>
                          {i.modifiers?.length ? <Text className="text-[12px] text-ink-muted">{i.modifiers.map((m) => m.name).join(', ')}</Text> : null}
                          {i.notes ? <Text className="text-[12px] italic text-amber-700">“{i.notes}”</Text> : null}
                        </View>
                        {!isReady ? <Text className="text-[12px] font-semibold text-violet-600">Cooking</Text> : null}
                      </Pressable>
                    );
                  })}
                  {g.ready.length ? (
                    <View className="border-t border-line p-3">
                      <Button title={`Served all ${g.ready.length}`} icon="checkmark-done" variant="success" size="sm" disabled={busy} onPress={() => serve(g.ready.map((i) => i.id), name)} />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {selected.size ? (
        <View className="absolute bottom-4 left-4 right-4">
          <Button title={`Mark ${selected.size} served`} icon="checkmark-done" variant="dark" size="lg" loading={busy} onPress={() => serve([...selected], `${selected.size} item${selected.size === 1 ? '' : 's'}`)} />
        </View>
      ) : null}
    </Screen>
  );
}
