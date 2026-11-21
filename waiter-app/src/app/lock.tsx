import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { PinPad } from '@/components/PinPad';
import { Avatar, Button, Loading, Screen, toast } from '@/components/ui';
import { gql } from '@/lib/api';
import { greeting, label } from '@/lib/format';
import { Q } from '@/lib/queries';
import { useSession } from '@/lib/store';
import type { StaffUser } from '@/lib/types';

const PIN_LEN_KEY = 'waiter.pinLengths.v1';

/** Shared-device sign-in: pick your name, enter your PIN. */
export default function LockScreen() {
  const { pairing, signIn, forgetPairing, lockReason } = useSession();
  const [staff, setStaff] = useState<StaffUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinLengths, setPinLengths] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!pairing) return;
    try {
      const { handheldStaff } = await gql<{ handheldStaff: StaffUser[] }>(Q.STAFF, { deviceKey: pairing.deviceKey }, { auth: false });
      setStaff(handheldStaff);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message);
      if (e.code === 'DEVICE_NOT_PAIRED') forgetPairing();
    } finally {
      setRefreshing(false);
    }
  }, [pairing, forgetPairing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch; state is set when it resolves
    load();
    SecureStore.getItemAsync(PIN_LEN_KEY).then((raw) => raw && setPinLengths(JSON.parse(raw))).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (lockReason) toast.ok(lockReason);
  }, [lockReason]);

  const submit = async (value: string) => {
    if (!pairing || !selected || value.length < 4 || busy) return;
    setBusy(true);
    try {
      const { handheldLogin } = await gql(Q.LOGIN, { deviceKey: pairing.deviceKey, pin: value, userId: selected.id }, { auth: false });
      const lengths = { ...pinLengths, [selected.id]: value.length };
      SecureStore.setItemAsync(PIN_LEN_KEY, JSON.stringify(lengths)).catch(() => {});
      await signIn(handheldLogin.token, handheldLogin.user);
    } catch (e: any) {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 700);
      if (e.code !== 'UNAUTHENTICATED') toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unpair = () =>
    Alert.alert('Unpair this device?', 'A manager will need to sign in again to use the waiter app on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpair', style: 'destructive', onPress: () => forgetPairing() },
    ]);

  const knownLen = selected ? pinLengths[selected.id] : undefined;

  return (
    <Screen className="bg-ink" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-3">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
            <Ionicons name="restaurant" size={20} color="#fff" />
          </View>
          <View>
            <Text className="text-[16px] font-bold text-white">{pairing?.organizationName}</Text>
            <Text className="text-[12px] text-white/50">{pairing?.locationName} · {pairing?.deviceName}</Text>
          </View>
        </View>
        <Pressable onPress={unpair} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <Ionicons name="settings-outline" size={19} color="#fff" />
        </Pressable>
      </View>

      {selected ? (
        <View className="flex-1 items-center justify-center pb-6">
          <Avatar name={selected.name} size={72} />
          <Text className="mt-4 text-[22px] font-bold text-white">Hi, {selected.name.split(' ')[0]}</Text>
          <Text className="mb-8 mt-1 text-[14px] text-white/50">Enter your PIN</Text>
          <PinPad dark value={pin} onChange={setPin} length={knownLen ?? 0} error={error} onComplete={submit} />
          <View className="mt-6 w-[288px] flex-row gap-3">
            <Button title="Back" variant="ghost" className="flex-1 bg-white/10" onPress={() => { setSelected(null); setPin(''); }} />
            {!knownLen ? <Button title="Sign in" className="flex-1" loading={busy} disabled={pin.length < 4} onPress={() => submit(pin)} /> : null}
          </View>
        </View>
      ) : (
        <View className="flex-1 px-5">
          <Text className="mt-10 text-[30px] font-extrabold text-white">{greeting()}</Text>
          <Text className="mb-6 mt-1 text-[15px] text-white/50">Tap your name to start your shift</Text>
          {!staff && !loadError ? (
            <Loading />
          ) : (
            <ScrollView
              contentContainerClassName="flex-row flex-wrap gap-3 pb-10"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#fff" />}
            >
              {loadError ? (
                <View className="w-full rounded-2xl bg-white/10 p-5">
                  <Text className="text-[15px] font-semibold text-white">Can’t load staff</Text>
                  <Text className="mt-1 text-[13px] text-white/60">{loadError}</Text>
                  <Button title="Try again" size="sm" className="mt-4 self-start" onPress={load} />
                </View>
              ) : staff!.length === 0 ? (
                <View className="w-full rounded-2xl bg-white/10 p-5">
                  <Text className="text-[15px] font-semibold text-white">No one can sign in yet</Text>
                  <Text className="mt-1 text-[13px] leading-5 text-white/60">
                    In the POS, give staff a PIN (Staff page) and a role with the “Sign in to the waiter app” permission.
                  </Text>
                </View>
              ) : (
                staff!.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => { setSelected(u); setPin(''); }}
                    className="w-[31%] items-center rounded-2xl bg-white/[0.07] px-2 py-4 active:bg-white/20"
                  >
                    <Avatar name={u.name} size={52} tone={u.role === 'WAITER' ? 'brand' : 'light'} />
                    <Text numberOfLines={1} className="mt-2.5 text-[14px] font-semibold text-white">{u.name}</Text>
                    <Text className="text-[11px] text-white/45">{label(u.role)}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
    </Screen>
  );
}
