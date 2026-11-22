import '../../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading, ToastHost } from '@/components/ui';
import { touchActivity, useIdleLock, useSyncLoop } from '@/lib/hooks';
import { useSession } from '@/lib/store';
import { brandVars, useAccent } from '@/lib/theme';

export default function RootLayout() {
  const { ready, pairing, token, hydrate } = useSession();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const accent = useAccent();
  const themeVars = useMemo(() => brandVars(accent), [accent]);
  useSyncLoop();
  useIdleLock();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* brand-* classes everywhere read these variables, so the whole app follows the POS accent */}
      <View style={themeVars} className="flex-1 bg-canvas" onTouchStart={touchActivity}>
        {!ready ? (
          <Loading />
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F6F4F1' } }}>
            <Stack.Screen name="index" />
            <Stack.Protected guard={!pairing}>
              <Stack.Screen name="pair" />
            </Stack.Protected>
            <Stack.Protected guard={!!pairing && !token}>
              <Stack.Screen name="lock" options={{ animation: 'fade' }} />
            </Stack.Protected>
            <Stack.Protected guard={!!pairing && !!token}>
              <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
              <Stack.Screen name="check/[id]" />
              <Stack.Screen name="menu" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="pay/[id]" />
            </Stack.Protected>
          </Stack>
        )}
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}
