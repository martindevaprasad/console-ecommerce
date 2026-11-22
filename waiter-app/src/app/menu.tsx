import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ProductSheet } from '@/components/ProductSheet';
import { Button, Chip, Empty, ErrorBanner, Header, Loading, Screen, Sheet, Stepper, toast } from '@/components/ui';
import { gql } from '@/lib/api';
import { initials, label, useMoney } from '@/lib/format';
import { useAction, useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import { lineUnitPrice, useCart, useSession } from '@/lib/store';
import type { Category, Order, Product } from '@/lib/types';
import { useBrand } from '@/lib/theme';

const newKey = () => `wa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function MenuScreen() {
  const brand = useBrand();
  const config = useSession((s) => s.config)!;
  const caps = config.capabilities;
  const locationId = config.location?.id ?? null;
  const money = useMoney();
  const { target, lines, notes, add, setQty, remove, setNotes, clear } = useCart();
  const menu = useQuery<{ categories: Category[]; products: Product[] }>(Q.MENU, {}, { live: false });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Product | null>(null);
  const [review, setReview] = useState(false);
  const { busy, run } = useAction();
  // One idempotency key per cart, so a retry after a timeout can't create a second check.
  const idem = useRef(newKey());

  const products = useMemo(() => menu.data?.products || [], [menu.data]);
  const categories = useMemo(
    () => (menu.data?.categories || []).filter((c) => products.some((p) => p.categoryId === c.id)).sort((a, b) => a.sortOrder - b.sortOrder),
    [menu.data, products],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => (q ? p.name.toLowerCase().includes(q) : !categoryId || p.categoryId === categoryId));
  }, [products, categoryId, search]);

  const inCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.product.id, (m.get(l.product.id) || 0) + l.quantity);
    return m;
  }, [lines]);

  const priceOf = (p: Product) => {
    const o = locationId ? p.priceOverrides?.[locationId] : undefined;
    return typeof o === 'number' ? o : p.price;
  };
  const soldOut = (p: Product) => p.trackStock && (p.inventory.find((i) => i.locationId === locationId)?.quantity ?? 0) <= 0;
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const total = lines.reduce((s, l) => s + lineUnitPrice(l, locationId) * l.quantity, 0);
  const guestCount = target?.kind === 'table' ? target.guestCount : 1;

  if (!target) {
    return (
      <Screen>
        <Header back title="Menu" />
        <Empty icon="restaurant-outline" title="Pick a table or start an order first" action={<Button title="Go back" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const title = target.kind === 'table' ? `Table ${target.tableName}` : target.kind === 'takeaway' ? label(target.orderType) : target.label;
  const subtitle = target.kind === 'table' ? `${target.guestCount} guests${target.orderId ? ' · adding to check' : ''}` : target.kind === 'takeaway' ? target.label || 'New order' : 'Adding items';

  const quickAdd = (p: Product) => {
    if (soldOut(p)) return toast.error(`${p.name} is sold out`);
    // Any item with options (required or optional extras) opens the options sheet.
    const hasOptions = p.modifierGroups.some((g) => g.isActive && g.modifiers.some((m) => m.isActive));
    if (p.isOpenPrice || hasOptions || (caps.seats && guestCount > 1) || caps.courses) return setOpen(p);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    add(p, { quantity: 1, modifiers: [], notes: '', seat: null, course: 1 });
    toast.ok(`${p.name} added`);
  };

  const leave = () => {
    if (!lines.length) { clear(); router.back(); return; }
    Alert.alert('Discard this order?', `${itemCount} item(s) haven't been added to a check.`, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { clear(); router.back(); } },
    ]);
  };

  const submit = (fire: boolean) => run(async () => {
    const items = lines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
      modifierIds: l.modifiers.map((m) => m.id),
      notes: l.notes || null,
      seat: l.seat,
      course: l.course,
      ...(l.priceOverride !== undefined ? { priceOverride: l.priceOverride } : {}),
    }));
    try {
      let orderId = target.orderId ?? null;
      // A table may already have a check (opened on the POS or another phone): add to it instead of opening a second one.
      if (!orderId && target.kind === 'table') {
        const { tableOrder } = await gql<{ tableOrder: Order | null }>(Q.TABLE_ORDER, { tableId: target.tableId });
        orderId = tableOrder?.id ?? null;
      }
      let order: Order;
      if (orderId) {
        order = (await gql<{ addOrderItems: Order }>(Q.ADD_ITEMS, { orderId, items, fire })).addOrderItems;
        if (notes.trim()) await gql(Q.UPDATE_ORDER, { orderId, input: { notes: [order.notes, notes.trim()].filter(Boolean).join('\n') } });
      } else {
        const input: any = {
          items,
          fire,
          idempotencyKey: idem.current,
          channel: 'HANDHELD',
          notes: [target.kind === 'takeaway' ? target.label : null, notes.trim()].filter(Boolean).join(' · ') || null,
        };
        if (target.kind === 'table') Object.assign(input, { orderType: 'DINE_IN', tableId: target.tableId, guestCount: target.guestCount });
        else if (target.kind === 'takeaway') input.orderType = target.orderType;
        order = (await gql<{ createOrder: Order }>(Q.CREATE_ORDER, { input })).createOrder;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.ok(fire ? 'Sent to the kitchen' : 'Added to check');
      clear();
      idem.current = newKey();
      setReview(false);
      router.replace(`/check/${order.id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  });

  const primaryFire = caps.fireOnSubmit;

  return (
    <Screen>
      <Header back={leave} title={title} subtitle={subtitle} />

      <View className="px-4 pb-2">
        <View className="h-12 flex-row items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search the menu" placeholderTextColor="#9CA3AF" className="flex-1 text-[16px] text-ink" returnKeyType="search" />
          {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="#9CA3AF" /></Pressable> : null}
        </View>
      </View>

      {!search && categories.length ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 py-2">
            <Chip label="All" active={!categoryId} onPress={() => setCategoryId(null)} />
            {categories.map((c) => <Chip key={c.id} label={c.name} color={c.color} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
          </ScrollView>
        </View>
      ) : null}

      {menu.error && !menu.data ? <ErrorBanner message={menu.error} onRetry={() => menu.reload('initial')} /> : null}

      {menu.loading && !menu.data ? (
        <Loading label="Loading menu…" />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperClassName="justify-between"
          contentContainerClassName="gap-3 px-4 pb-32 pt-2"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Empty icon="search-outline" title={search ? `No items match “${search}”` : 'No items in this category'} />}
          renderItem={({ item: p }) => {
            const qty = inCart.get(p.id) || 0;
            const out = soldOut(p);
            const cat = categories.find((c) => c.id === p.categoryId);
            const tint = p.color || cat?.color || brand[500];
            const hasOptions = p.modifierGroups.some((g) => g.isActive && g.modifiers.some((m) => m.isActive));
            // Fixed heights everywhere: RN `flex-1` inside an auto-height card starts at
            // zero height, which made text vanish on cards without a photo.
            return (
              <Pressable
                onPress={() => quickAdd(p)}
                onLongPress={() => !out && setOpen(p)}
                style={{ width: '48.5%' }}
                className={`overflow-hidden rounded-2xl border bg-surface active:opacity-80 ${qty ? 'border-brand-500' : 'border-line'} ${out ? 'opacity-50' : ''}`}
              >
                <View style={{ height: 96, backgroundColor: `${tint}1F` }} className="w-full items-center justify-center">
                  {caps.showImages && p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={{ width: '100%', height: 96 }} resizeMode="cover" />
                  ) : (
                    <View style={{ backgroundColor: tint }} className="h-12 w-12 items-center justify-center rounded-full">
                      <Text className="text-[17px] font-extrabold text-white">{initials(p.name)}</Text>
                    </View>
                  )}
                </View>
                <View style={{ height: 84 }} className="justify-between px-3 py-2.5">
                  <Text numberOfLines={2} className="text-[15px] font-semibold leading-5 text-ink">{p.name}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[15px] font-bold text-ink">{p.isOpenPrice ? 'Open price' : money(priceOf(p))}</Text>
                    {out ? (
                      <Text className="text-[11px] font-bold text-red-600">SOLD OUT</Text>
                    ) : hasOptions ? (
                      <View className="flex-row items-center gap-0.5 rounded-full bg-canvas px-2 py-0.5">
                        <Ionicons name="options-outline" size={12} color="#6B7280" />
                        <Text className="text-[11px] font-semibold text-ink-muted">Options</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {qty ? (
                  <View className="absolute right-2 top-2 h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-2">
                    <Text className="text-[13px] font-extrabold text-white">{qty}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}

      {itemCount ? (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2">
          <Pressable onPress={() => setReview(true)} className="h-16 flex-row items-center rounded-2xl bg-ink px-4 shadow-lg active:opacity-90">
            <View className="h-9 min-w-9 items-center justify-center rounded-full bg-brand-500 px-2">
              <Text className="text-[15px] font-extrabold text-white">{itemCount}</Text>
            </View>
            <Text className="ml-3 flex-1 text-[16px] font-semibold text-white">Review order</Text>
            <Text className="text-[17px] font-extrabold text-white">{money(total)}</Text>
            <Ionicons name="chevron-up" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      ) : null}

      {open ? (
        <ProductSheet
          key={open.id}
          product={open}
          unitPrice={priceOf(open)}
          caps={caps}
          guestCount={guestCount}
          onClose={() => setOpen(null)}
          onAdd={(c) => { add(open, c); setOpen(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}
        />
      ) : null}

      <Sheet
        visible={review}
        onClose={() => setReview(false)}
        title="Review order"
        subtitle={`${title} · ${itemCount} item${itemCount === 1 ? '' : 's'}`}
        footer={
          <View className="gap-2">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-[15px] text-ink-muted">Subtotal (before {config.taxLabel.toLowerCase()})</Text>
              <Text className="text-[17px] font-extrabold text-ink">{money(total)}</Text>
            </View>
            <Button
              title={primaryFire ? 'Send to kitchen' : 'Add to check'}
              icon={primaryFire ? 'flame' : 'add-circle-outline'}
              size="lg"
              loading={busy}
              disabled={!lines.length}
              onPress={() => submit(primaryFire)}
            />
            <Button title={primaryFire ? 'Hold (don’t send yet)' : 'Add & send to kitchen'} variant="secondary" disabled={busy || !lines.length} onPress={() => submit(!primaryFire)} />
          </View>
        }
      >
        {lines.map((l) => (
          <View key={l.key} className="flex-row items-start gap-3 border-b border-line py-3">
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">{l.product.name}</Text>
              {l.modifiers.length ? <Text className="text-[13px] text-ink-muted">{l.modifiers.map((m) => m.name).join(', ')}</Text> : null}
              {l.notes ? <Text className="text-[13px] italic text-amber-700">“{l.notes}”</Text> : null}
              <View className="mt-1 flex-row gap-3">
                {l.seat ? <Text className="text-[12px] font-semibold text-ink-soft">Seat {l.seat}</Text> : null}
                {caps.courses ? <Text className="text-[12px] font-semibold text-ink-soft">{['', 'Starter', 'Main', 'Dessert'][l.course] || `Course ${l.course}`}</Text> : null}
              </View>
              <Text className="mt-1 text-[14px] font-bold text-ink">{money(lineUnitPrice(l, locationId) * l.quantity)}</Text>
            </View>
            <Stepper value={l.quantity} onChange={(v) => (v <= 0 ? remove(l.key) : setQty(l.key, v))} />
          </View>
        ))}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Note for the whole order (optional)"
          placeholderTextColor="#9CA3AF"
          className="my-4 h-12 rounded-xl border border-line bg-canvas px-4 text-[15px] text-ink"
        />
      </Sheet>
    </Screen>
  );
}
