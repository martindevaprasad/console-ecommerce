import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Card, Input, Screen, toast } from '@/components/ui';
import { gql, resolveEndpoint } from '@/lib/api';
import { Q } from '@/lib/queries';
import { useSession } from '@/lib/store';
import { useBrand } from '@/lib/theme';

/** One-time device setup, done by a manager. */
export default function PairScreen() {
  const brand = useBrand();
  const savePairing = useSession((s) => s.savePairing);
  const [server, setServer] = useState(process.env.EXPO_PUBLIC_API_URL || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState(Constants.deviceName || 'Waiter phone');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'intro' | 'form'>('intro');

  const pair = async () => {
    if (!server || !email || !password) return toast.error('Fill in the server, email and password');
    setBusy(true);
    try {
      const endpoint = await resolveEndpoint(server);
      const { pairHandheld: p } = await gql(Q.PAIR, { email: email.trim(), password, deviceName: deviceName.trim() || 'Waiter phone' }, { endpoint, auth: false });
      await savePairing({
        endpoint,
        deviceKey: p.deviceKey,
        deviceName: p.device.name,
        organizationName: p.organizationName,
        locationId: p.location.id,
        locationName: p.location.name,
        accentColor: p.accentColor,
      });
      toast.ok(`Paired with ${p.organizationName}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'intro') {
    return (
      <Screen className="bg-ink" edges={['top', 'bottom']}>
        <View className="flex-1 justify-between px-6 pb-6 pt-10">
          <View>
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-500">
              <Ionicons name="restaurant" size={32} color="#fff" />
            </View>
            <Text className="mt-8 text-[36px] font-extrabold leading-[42px] text-white">Take orders{'\n'}at the table.</Text>
            <Text className="mt-4 text-[16px] leading-6 text-white/60">
              The waiter app for your POS. Seat guests, send orders straight to the kitchen, get a buzz when food is ready and settle the bill without walking to the counter.
            </Text>
            <View className="mt-10 gap-4">
              {[
                ['grid-outline', 'Live floor plan', 'Same tables and checks as the POS'],
                ['flame-outline', 'Straight to the kitchen', 'Orders appear on the KDS instantly'],
                ['notifications-outline', 'Pickup alerts', 'Your phone buzzes when food is ready'],
              ].map(([icon, title, sub]) => (
                <View key={title} className="flex-row items-center gap-4">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <Ionicons name={icon as any} size={22} color={brand[400]} />
                  </View>
                  <View>
                    <Text className="text-[15px] font-semibold text-white">{title}</Text>
                    <Text className="text-[13px] text-white/50">{sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View>
            <Button title="Set up this device" size="lg" icon="phone-portrait-outline" onPress={() => setStep('form')} />
            <Text className="mt-3 text-center text-[12px] text-white/40">A manager signs in once. After that staff use their PIN.</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          <Text className="text-[28px] font-bold text-ink">Pair device</Text>
          <Text className="mb-6 mt-1 text-[15px] leading-5 text-ink-muted">
            Sign in with a manager or owner account from your POS. This phone will be added under Settings → Waiter app, where it can be revoked at any time.
          </Text>

          <Card className="p-4">
            <Input label="POS server" value={server} onChangeText={setServer} placeholder="192.168.1.20:5002 or https://yourpos.vercel.app" autoCapitalize="none" autoCorrect={false} keyboardType="url" hint="The address of your NexusPOS backend" />
            <Input label="Manager email" value={email} onChangeText={setEmail} placeholder="manager@restaurant.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry textContentType="password" />
            <Input label="Device name" value={deviceName} onChangeText={setDeviceName} placeholder="e.g. Ravi's phone, Patio tablet" className="mb-0" />
          </Card>

          <Button title="Pair this device" size="lg" className="mt-6" loading={busy} onPress={pair} icon="link-outline" />
          <Button title="Back" variant="ghost" className="mt-2" onPress={() => setStep('intro')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
