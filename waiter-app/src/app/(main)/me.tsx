import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Avatar, Button, Card, Header, Screen, SectionTitle, toast, type IconName } from '@/components/ui';
import { gql } from '@/lib/api';
import { clock, duration, label, useMoney } from '@/lib/format';
import { useAction, useQuery } from '@/lib/hooks';
import { Q } from '@/lib/queries';
import { useSession } from '@/lib/store';

interface Summary { from: string; openTables: number; openChecks: number; openBalance: number; closedChecks: number; covers: number; sales: number; tips: number; averageCheck: number }

export default function MeScreen() {
  const { config, pairing, lock, refreshConfig } = useSession();
  const money = useMoney();
  const summary = useQuery<{ myShiftSummary: Summary }>(Q.SUMMARY);
  const { busy, run } = useAction();
  if (!config) return null;
  const caps = config.capabilities;
  const s = summary.data?.myShiftSummary;

  const clockIn = () => run(async () => {
    try { await gql(Q.CLOCK_IN); await refreshConfig(); summary.reload('silent'); toast.ok('Clocked in. Have a great shift!'); } catch (e: any) { toast.error(e.message); }
  });

  const clockOut = () => {
    const doIt = (breakMinutes: number) => run(async () => {
      try {
        const { clockOut: entry } = await gql(Q.CLOCK_OUT, { breakMinutes });
        await refreshConfig();
        toast.ok(`Clocked out · ${entry.hours.toFixed(1)} h`);
      } catch (e: any) { toast.error(e.message); }
    });
    Alert.alert('Clock out?', s?.openChecks ? `You still have ${s.openChecks} open check(s). Hand your tables over first if you're leaving.` : 'Did you take a break?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'No break', onPress: () => doIt(0) },
      { text: '30 min break', onPress: () => doIt(30) },
    ]);
  };

  return (
    <Screen>
      <Header large title="My shift" />
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        refreshControl={<RefreshControl refreshing={summary.refreshing} onRefresh={() => { summary.reload('pull'); refreshConfig(); }} tintColor="#F95A10" />}
      >
        <Card className="flex-row items-center gap-4 p-4">
          <Avatar name={config.user.name} size={56} />
          <View className="flex-1">
            <Text className="text-[19px] font-bold text-ink">{config.user.name}</Text>
            <Text className="text-[13px] text-ink-muted">{label(config.user.role)} · {config.location?.name}</Text>
          </View>
        </Card>

        {caps.timeclock ? (
          <View className={`mt-3 rounded-2xl p-4 ${config.clockedInAt ? 'bg-emerald-600' : 'bg-ink'}`}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="time" size={26} color="#fff" />
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-white">{config.clockedInAt ? `On shift · ${duration(config.clockedInAt)}` : 'Not clocked in'}</Text>
                <Text className="text-[12px] text-white/70">{config.clockedInAt ? `Since ${clock(config.clockedInAt)}` : caps.requireClockIn ? 'Required before taking orders' : 'Clock in to track your hours'}</Text>
              </View>
              <Button
                title={config.clockedInAt ? 'Clock out' : 'Clock in'}
                size="sm"
                variant={config.clockedInAt ? 'dark' : 'primary'}
                loading={busy}
                onPress={config.clockedInAt ? clockOut : clockIn}
              />
            </View>
          </View>
        ) : null}

        <SectionTitle>{s ? `Since ${clock(s.from)}` : 'Today'}</SectionTitle>
        <View className="flex-row gap-3">
          <Stat big icon="cash-outline" label="Sales" value={s ? money(s.sales) : '—'} />
          <Stat big icon="heart-outline" label="Tips" value={s ? money(s.tips) : '—'} accent />
        </View>
        <View className="mt-3 flex-row gap-3">
          <Stat icon="receipt-outline" label="Checks closed" value={s ? String(s.closedChecks) : '—'} />
          <Stat icon="people-outline" label="Covers" value={s ? String(s.covers) : '—'} />
          <Stat icon="stats-chart-outline" label="Avg check" value={s ? money(s.averageCheck) : '—'} />
        </View>
        <View className="mt-3 flex-row gap-3">
          <Stat icon="grid-outline" label="Open tables" value={s ? String(s.openTables) : '—'} />
          <Stat icon="hourglass-outline" label="Still to collect" value={s ? money(s.openBalance) : '—'} />
        </View>

        <SectionTitle>This device</SectionTitle>
        <Card className="p-4">
          <Row icon="phone-portrait-outline" label="Device" value={pairing?.deviceName} />
          <Row icon="business-outline" label="Business" value={pairing?.organizationName} />
          <Row icon="location-outline" label="Location" value={config.location?.name} />
          <Row icon="lock-closed-outline" label="Auto-lock" value={caps.autoLockMinutes ? `${caps.autoLockMinutes} min idle` : 'Off'} last />
        </Card>

        <Button title="Lock & switch user" icon="lock-closed-outline" variant="dark" size="lg" className="mt-6" onPress={() => lock()} />
        <Text className="mt-3 text-center text-[12px] text-ink-faint">Your checks stay open. Sign back in with your PIN anytime.</Text>
      </ScrollView>
    </Screen>
  );
}

function Stat({ icon, label: l, value, big, accent }: { icon: IconName; label: string; value: string; big?: boolean; accent?: boolean }) {
  return (
    <View className={`flex-1 rounded-2xl border p-3.5 ${accent ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface'}`}>
      <Ionicons name={icon} size={18} color={accent ? '#C22E07' : '#6B7280'} />
      <Text numberOfLines={1} adjustsFontSizeToFit className={`mt-2 font-extrabold ${accent ? 'text-brand-700' : 'text-ink'} ${big ? 'text-[24px]' : 'text-[17px]'}`}>{value}</Text>
      <Text className="text-[12px] text-ink-muted">{l}</Text>
    </View>
  );
}

function Row({ icon, label: l, value, last }: { icon: IconName; label: string; value?: string | null; last?: boolean }) {
  return (
    <View className={`flex-row items-center gap-3 py-2.5 ${last ? '' : 'border-b border-line'}`}>
      <Ionicons name={icon} size={18} color="#6B7280" />
      <Text className="flex-1 text-[14px] text-ink-muted">{l}</Text>
      <Text className="text-[14px] font-semibold text-ink">{value || '—'}</Text>
    </View>
  );
}
