import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Chip, Empty, Header, Loading, Screen, SectionTitle, tap, toast, type IconName } from '@/components/ui';
import { gql } from '@/lib/api';
import { label, useMoney } from '@/lib/format';
import { useAction, useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import { useSession } from '@/lib/store';
import type { Order } from '@/lib/types';
import { useBrand } from '@/lib/theme';

const METHOD_ICON: Record<string, IconName> = {
  CASH: 'cash-outline', CARD: 'card-outline', DIGITAL: 'qr-code-outline', GIFT_CARD: 'gift-outline',
  LOYALTY: 'star-outline', HOUSE_ACCOUNT: 'book-outline', OTHER: 'ellipsis-horizontal-circle-outline',
};
const METHOD_LABEL: Record<string, string> = { DIGITAL: 'UPI / Wallet' };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Suggests the notes a guest is likely to hand over. */
function quickCash(amount: number) {
  const steps = [5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  const out = new Set<number>([r2(amount)]);
  for (const s of steps) {
    const v = Math.ceil(amount / s) * s;
    if (v > amount) out.add(v);
    if (out.size >= 4) break;
  }
  return [...out];
}

export default function PayScreen() {
  const brand = useBrand();
  const { id } = useLocalSearchParams<{ id: string }>();
  const config = useSession((s) => s.config)!;
  const caps = config.capabilities;
  const money = useMoney();
  const q = useQuery<{ order: Order | null }>(Q.ORDER, { id }, { live: false });
  const order = q.data?.order;
  const methods = caps.paymentMethods.length ? caps.paymentMethods : ['CASH'];
  const [method, setMethod] = useState(methods[0]!);
  const [split, setSplit] = useState(1);
  const [customAmount, setCustomAmount] = useState('');
  const [tipMode, setTipMode] = useState<number | 'custom' | 0>(0);
  const [customTip, setCustomTip] = useState('');
  const [tendered, setTendered] = useState('');
  const [reference, setReference] = useState('');
  const [done, setDone] = useState<{ change: number | null; paid: number; complete: boolean } | null>(null);
  const { busy, run } = useAction();

  const balance = order?.balanceDue ?? 0;
  const amount = useMemo(() => {
    if (customAmount) return Math.min(balance, parseFloat(customAmount) || 0);
    return r2(split > 1 ? balance / split : balance);
  }, [customAmount, split, balance]);
  const tip = !caps.tipping ? 0 : tipMode === 'custom' ? parseFloat(customTip) || 0 : tipMode ? r2((amount * tipMode) / 100) : 0;
  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === 'CASH' && tenderedNum ? r2(tenderedNum - amount - tip) : null;

  if (!caps.payments) {
    return <Screen><Header back title="Payment" /><Empty icon="lock-closed-outline" title="Payments are taken at the POS" hint="Your manager has turned off payments on the waiter app." /></Screen>;
  }
  if (q.loading && !order) return <Screen><Header back title="Payment" /><Loading /></Screen>;
  if (!order) return <Screen><Header back title="Payment" /><Empty title="Check not found" /></Screen>;

  if (done) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <Ionicons name="checkmark" size={56} color="#059669" />
          </View>
          <Text className="mt-6 text-[28px] font-extrabold text-ink">{done.complete ? 'Paid in full' : 'Payment taken'}</Text>
          <Text className="mt-1 text-[16px] text-ink-muted">{money(done.paid)} received</Text>
          {done.change ? (
            <View className="mt-8 w-full items-center rounded-3xl bg-ink py-6">
              <Text className="text-[14px] font-semibold uppercase tracking-widest text-white/60">Give change</Text>
              <Text className="mt-1 text-[44px] font-extrabold text-white">{money(done.change)}</Text>
            </View>
          ) : null}
        </View>
        <View className="gap-2 px-5 pb-4">
          {done.complete ? (
            <Button title={order.table ? 'Back to tables' : 'Back to orders'} size="lg" onPress={() => router.dismissTo(order.table && caps.tables ? '/tables' : '/orders')} />
          ) : (
            <Button title={`Take next payment · ${money(balance)} left`} size="lg" onPress={() => { setDone(null); setCustomAmount(''); setTipMode(0); setCustomTip(''); }} />
          )}
          <Button title="View check" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const pay = () => run(async () => {
    if (amount <= 0) return toast.error('Nothing to pay');
    if (method === 'CASH' && tenderedNum && tenderedNum < amount + tip - 0.001) return toast.error('Cash given is less than the amount due');
    try {
      const { addPayment } = await gql<{ addPayment: Order }>(Q.PAY, {
        orderId: order.id,
        payment: {
          method,
          amount,
          tip: tip || undefined,
          tendered: method === 'CASH' && tenderedNum ? r2(tenderedNum - tip) : undefined,
          reference: reference.trim() || undefined,
        },
      });
      const last = addPayment.payments[addPayment.payments.length - 1];
      q.setData({ order: addPayment });
      setDone({ change: last?.change ?? (change && change > 0 ? change : null), paid: (last?.amount ?? amount) + (last?.tip ?? tip), complete: addPayment.balanceDue <= 0.001 });
    } catch (e: any) {
      toast.error(e.message);
    }
  });

  return (
    <Screen>
      <Header back title="Take payment" subtitle={`${order.table ? `Table ${order.table.name}` : label(order.orderType)} · #${order.ticketNumber ?? '—'}`} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-4 pb-40" keyboardShouldPersistTaps="handled">
          <View className="items-center rounded-3xl bg-ink px-5 py-6">
            <Text className="text-[13px] font-semibold uppercase tracking-widest text-white/50">{split > 1 || customAmount ? 'This payment' : 'Amount due'}</Text>
            <Text className="mt-1 text-[44px] font-extrabold text-white">{money(amount + tip)}</Text>
            {tip ? <Text className="text-[13px] text-white/60">{money(amount)} + {money(tip)} tip</Text> : null}
            {amount < balance ? <Text className="mt-1 text-[13px] text-brand-300">{money(balance - amount)} will remain on the check</Text> : null}
          </View>

          <SectionTitle>Split between guests</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} label={n === 1 ? 'Full' : `÷ ${n}`} active={!customAmount && split === n} onPress={() => { setCustomAmount(''); setSplit(n); setTendered(''); }} />
            ))}
          </View>
          <TextInput
            value={customAmount}
            onChangeText={(v) => { setCustomAmount(v.replace(/[^0-9.]/g, '')); setTendered(''); }}
            placeholder={`Custom amount (max ${money(balance)})`}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            className="mt-3 h-12 rounded-xl border border-line bg-surface px-4 text-[16px] text-ink"
          />

          <SectionTitle>Payment method</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {methods.map((m) => (
              <Pressable
                key={m}
                onPress={() => { tap(); setMethod(m); setTendered(''); }}
                className={`w-[31.5%] items-center rounded-2xl border py-4 ${method === m ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'}`}
              >
                <Ionicons name={METHOD_ICON[m] || 'card-outline'} size={26} color={method === m ? brand[600] : '#3A3F4B'} />
                <Text className={`mt-1.5 text-[13px] font-semibold ${method === m ? 'text-brand-700' : 'text-ink-soft'}`}>{METHOD_LABEL[m] || label(m)}</Text>
              </Pressable>
            ))}
          </View>

          {caps.tipping ? (
            <>
              <SectionTitle>Tip</SectionTitle>
              <View className="flex-row flex-wrap gap-2">
                <Chip label="No tip" active={tipMode === 0} onPress={() => setTipMode(0)} />
                {caps.tipPresets.map((p) => <Chip key={p} label={`${p}% · ${money(r2((amount * p) / 100))}`} active={tipMode === p} onPress={() => setTipMode(p)} />)}
                <Chip label="Custom" active={tipMode === 'custom'} onPress={() => setTipMode('custom')} />
              </View>
              {tipMode === 'custom' ? (
                <TextInput value={customTip} onChangeText={(v) => setCustomTip(v.replace(/[^0-9.]/g, ''))} placeholder="Tip amount" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" className="mt-3 h-12 rounded-xl border border-line bg-surface px-4 text-[16px] text-ink" />
              ) : null}
            </>
          ) : null}

          {method === 'CASH' ? (
            <>
              <SectionTitle>Cash received</SectionTitle>
              <View className="flex-row flex-wrap gap-2">
                {quickCash(amount + tip).map((v) => <Chip key={v} label={money(v)} active={tenderedNum === v} onPress={() => setTendered(String(v))} />)}
              </View>
              <TextInput value={tendered} onChangeText={(v) => setTendered(v.replace(/[^0-9.]/g, ''))} placeholder="Amount given by guest" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" className="mt-3 h-14 rounded-xl border border-line bg-surface px-4 text-[20px] font-bold text-ink" />
              {change !== null ? (
                <View className={`mt-3 flex-row items-center justify-between rounded-2xl p-4 ${change >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <Text className={`text-[15px] font-semibold ${change >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>{change >= 0 ? 'Change to give' : 'Still short'}</Text>
                  <Text className={`text-[22px] font-extrabold ${change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(Math.abs(change))}</Text>
                </View>
              ) : null}
            </>
          ) : method === 'CARD' || method === 'DIGITAL' || method === 'GIFT_CARD' ? (
            <>
              <SectionTitle>{method === 'GIFT_CARD' ? 'Gift card number' : 'Reference (optional)'}</SectionTitle>
              <TextInput value={reference} onChangeText={setReference} placeholder={method === 'CARD' ? 'Last 4 digits or approval code' : method === 'DIGITAL' ? 'UPI / transaction ID' : 'Card number'} placeholderTextColor="#9CA3AF" className="h-12 rounded-xl border border-line bg-surface px-4 text-[16px] text-ink" />
              {method !== 'GIFT_CARD' ? <Text className="mt-2 text-[12px] text-ink-muted">Run the {method === 'CARD' ? 'card on the terminal' : 'QR payment'} first, then confirm here once it’s approved.</Text> : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-4 pb-7 pt-3">
        <Button
          title={`Confirm ${money(amount + tip)} · ${METHOD_LABEL[method] || label(method)}`}
          icon="checkmark-circle"
          variant="success"
          size="lg"
          loading={busy}
          disabled={amount <= 0 || (method === 'CASH' && change !== null && change < 0) || (method === 'GIFT_CARD' && !reference.trim())}
          onPress={pay}
        />
      </View>
    </Screen>
  );
}
