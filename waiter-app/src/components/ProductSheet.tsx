import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { useMoney } from '@/lib/format';
import type { Capabilities, Modifier, Product } from '@/lib/types';
import { Badge, Button, Chip, Sheet, Stepper, tap } from './ui';

const QUICK_NOTES = ['No onion', 'Less spicy', 'Extra spicy', 'No sugar', 'Less ice', 'No ice', 'Takeaway pack', 'Allergy'];
const COURSES = [{ n: 1, label: 'Starter' }, { n: 2, label: 'Main' }, { n: 3, label: 'Dessert' }];

export interface ProductChoice { quantity: number; modifiers: Modifier[]; notes: string; seat: number | null; course: number; priceOverride?: number }

export function ProductSheet({ product, unitPrice, caps, guestCount, onClose, onAdd }: {
  product: Product | null; unitPrice: number; caps: Capabilities; guestCount: number; onClose: () => void; onAdd: (c: ProductChoice) => void;
}) {
  const money = useMoney();
  // The parent remounts this sheet per product (key={product.id}), so state starts fresh.
  const groups = useMemo(() => (product?.modifierGroups || []).filter((g) => g.isActive && g.modifiers.some((m) => m.isActive)), [product]);
  const [qty, setQty] = useState(1);
  // Preselect defaults, like the POS.
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.modifiers.filter((m) => m.isActive && m.isDefault).slice(0, g.maxSelect).map((m) => m.id)])),
  );
  const [notes, setNotes] = useState('');
  const [seat, setSeat] = useState<number | null>(null);
  const [course, setCourse] = useState(1);
  const [openPrice, setOpenPrice] = useState('');

  if (!product) return null;

  const toggle = (groupId: string, modId: string, max: number) => {
    tap();
    setPicked((p) => {
      const cur = p[groupId] || [];
      if (cur.includes(modId)) return { ...p, [groupId]: cur.filter((x) => x !== modId) };
      if (max === 1) return { ...p, [groupId]: [modId] };
      if (cur.length >= max) return p;
      return { ...p, [groupId]: [...cur, modId] };
    });
  };

  const chosen = groups.flatMap((g) => g.modifiers.filter((m) => (picked[g.id] || []).includes(m.id)));
  const missing = groups.filter((g) => (picked[g.id] || []).length < g.minSelect);
  const base = product.isOpenPrice ? parseFloat(openPrice) || 0 : unitPrice;
  const total = (base + chosen.reduce((s, m) => s + m.price, 0)) * qty;
  const canAdd = !missing.length && (!product.isOpenPrice || parseFloat(openPrice) > 0);

  const addNote = (n: string) => {
    tap();
    setNotes((cur) => (cur.toLowerCase().includes(n.toLowerCase()) ? cur : cur ? `${cur}, ${n}` : n));
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={product.name}
      subtitle={product.description || undefined}
      footer={
        <View className="flex-row items-center gap-3">
          <Stepper value={qty} onChange={(v) => setQty(Math.max(1, v))} min={1} />
          <Button
            title={canAdd ? `Add · ${money(total)}` : missing.length ? `Choose ${missing[0]!.name}` : 'Enter a price'}
            className="flex-1"
            size="lg"
            disabled={!canAdd}
            onPress={() => onAdd({ quantity: qty, modifiers: chosen, notes: notes.trim(), seat, course, priceOverride: product.isOpenPrice ? base : undefined })}
          />
        </View>
      }
    >
      {product.imageUrl && caps.showImages ? <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: 176, borderRadius: 18, marginBottom: 16, backgroundColor: "#F6F4F1" }} resizeMode="cover" /> : null}
      {product.dietary.length || product.prepMinutes ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {product.dietary.map((d) => <Badge key={d} tone="green" label={d} />)}
          {product.prepMinutes ? <Badge icon="time-outline" label={`~${product.prepMinutes} min`} /> : null}
        </View>
      ) : null}

      {product.isOpenPrice ? (
        <View className="mb-4">
          <Text className="mb-1.5 text-[14px] font-bold text-ink">Price</Text>
          <TextInput
            value={openPrice}
            onChangeText={(v) => setOpenPrice(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            className="h-14 rounded-xl border border-line bg-canvas px-4 text-[22px] font-bold text-ink"
          />
        </View>
      ) : null}

      {groups.map((g) => {
        const sel = picked[g.id] || [];
        const req = g.minSelect > 0;
        return (
          <View key={g.id} className="mb-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[15px] font-bold text-ink">{g.name}</Text>
              <Text className={`text-[12px] font-semibold ${req && sel.length < g.minSelect ? 'text-brand-600' : 'text-ink-muted'}`}>
                {req ? 'Required' : 'Optional'}{g.maxSelect > 1 ? ` · up to ${g.maxSelect}` : ''}
              </Text>
            </View>
            {g.modifiers.filter((m) => m.isActive).map((m) => {
              const on = sel.includes(m.id);
              return (
                <Pressable key={m.id} onPress={() => toggle(g.id, m.id, g.maxSelect)} className={`mb-2 flex-row items-center gap-3 rounded-xl border px-4 py-3.5 ${on ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'}`}>
                  <Ionicons name={g.maxSelect === 1 ? (on ? 'radio-button-on' : 'radio-button-off') : on ? 'checkbox' : 'square-outline'} size={22} color={on ? '#F95A10' : '#9CA3AF'} />
                  <Text className="flex-1 text-[15px] font-medium text-ink">{m.name}</Text>
                  {m.price ? <Text className="text-[14px] font-semibold text-ink-soft">+{money(m.price)}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}

      {caps.seats && guestCount > 1 ? (
        <View className="mb-5">
          <Text className="mb-2 text-[15px] font-bold text-ink">Seat</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Shared" active={seat === null} onPress={() => setSeat(null)} />
            {Array.from({ length: Math.min(guestCount, 12) }, (_, i) => i + 1).map((n) => <Chip key={n} label={`${n}`} active={seat === n} onPress={() => setSeat(n)} />)}
          </View>
        </View>
      ) : null}

      {caps.courses ? (
        <View className="mb-5">
          <Text className="mb-2 text-[15px] font-bold text-ink">Course</Text>
          <View className="flex-row flex-wrap gap-2">
            {COURSES.map((c) => <Chip key={c.n} label={c.label} active={course === c.n} onPress={() => setCourse(c.n)} />)}
          </View>
        </View>
      ) : null}

      <Text className="mb-2 text-[15px] font-bold text-ink">Kitchen note</Text>
      <View className="mb-2 flex-row flex-wrap gap-2">
        {QUICK_NOTES.map((n) => (
          <Pressable key={n} onPress={() => addNote(n)} className="rounded-full bg-canvas px-3 py-1.5 active:bg-brand-50">
            <Text className="text-[13px] font-medium text-ink-soft">+ {n}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything the kitchen should know"
        placeholderTextColor="#9CA3AF"
        multiline
        className="mb-2 min-h-[64px] rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink"
      />
    </Sheet>
  );
}
