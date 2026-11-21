import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Button, Loading, Screen } from '@/components/ui';
import { useLive } from '@/lib/hooks';
import { useSession } from '@/lib/store';

export default function MainTabs() {
  const config = useSession((s) => s.config);
  const refreshConfig = useSession((s) => s.refreshConfig);
  const lock = useSession((s) => s.lock);
  const ready = useLive((s) => s.readyItems);

  if (!config) {
    return (
      <Screen>
        <Loading label="Loading your setup…" />
        <View className="gap-2 px-6 pb-10">
          <Button title="Retry" variant="secondary" onPress={refreshConfig} />
          <Button title="Sign out" variant="ghost" onPress={() => lock()} />
        </View>
      </Screen>
    );
  }

  const caps = config.capabilities;
  const icon = (name: keyof typeof Ionicons.glyphMap, active: keyof typeof Ionicons.glyphMap) =>
    function TabIcon({ color, focused }: { color: unknown; focused: boolean }) {
      return <Ionicons name={focused ? active : name} size={24} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F95A10',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: '#ECE8E3', backgroundColor: '#FFFFFF' },
        sceneStyle: { backgroundColor: '#F6F4F1' },
      }}
    >
      <Tabs.Screen name="tables" options={{ title: 'Tables', href: caps.tables ? undefined : null, tabBarIcon: icon('grid-outline', 'grid') }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: icon('receipt-outline', 'receipt') }} />
      <Tabs.Screen
        name="ready"
        options={{
          title: 'Pickup',
          tabBarIcon: icon('notifications-outline', 'notifications'),
          tabBarBadge: ready ? ready : undefined,
          tabBarBadgeStyle: { backgroundColor: '#059669', fontSize: 11 },
        }}
      />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
