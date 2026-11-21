import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useSession } from '@/lib/store';

export function ClockInBanner() {
  const config = useSession((s) => s.config);
  if (!config?.capabilities.requireClockIn || config.clockedInAt) return null;
  return (
    <View className="mx-4 mb-3 flex-row items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <Ionicons name="time-outline" size={20} color="#B45309" />
      <Text className="flex-1 text-[13px] text-amber-800">Clock in from the Me tab before taking orders.</Text>
    </View>
  );
}
