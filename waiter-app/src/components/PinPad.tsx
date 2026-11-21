import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

/**
 * Numeric PIN entry. Calls onComplete once `length` digits are entered
 * (POS PINs are 4–6 digits; `length` 0 means "submit with the button").
 */
export function PinPad({
  value, onChange, onComplete, length = 4, error, dark,
}: {
  value: string; onChange: (v: string) => void; onComplete?: (pin: string) => void; length?: number; error?: boolean; dark?: boolean;
}) {
  const [shake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!error) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 50, useNativeDriver: true })),
    ).start();
  }, [error, shake]);

  const press = (k: (typeof KEYS)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (k === 'clear') return onChange('');
    if (k === 'back') return onChange(value.slice(0, -1));
    if (value.length >= 6) return;
    const next = value + k;
    onChange(next);
    if (length && next.length === length) onComplete?.(next);
  };

  const dots = Math.max(length || 4, value.length);
  const fg = dark ? '#fff' : '#14161C';

  return (
    <View className="items-center">
      <Animated.View style={{ transform: [{ translateX: shake }] }} className="mb-8 h-6 flex-row gap-4">
        {Array.from({ length: dots }).map((_, i) => (
          <View
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${error ? 'border-red-500' : dark ? 'border-white/60' : 'border-ink/40'} ${i < value.length ? (error ? 'bg-red-500' : dark ? 'bg-white' : 'bg-ink') : ''}`}
          />
        ))}
      </Animated.View>
      <View className="w-[288px] flex-row flex-wrap justify-between gap-y-4">
        {KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => press(k)}
            className={`h-[76px] w-[76px] items-center justify-center rounded-full ${k === 'clear' || k === 'back' ? '' : dark ? 'bg-white/10 active:bg-white/25' : 'bg-surface border border-line active:bg-brand-50'}`}
          >
            {k === 'back' ? (
              <Ionicons name="backspace-outline" size={26} color={fg} />
            ) : k === 'clear' ? (
              <Text style={{ color: fg }} className="text-[14px] font-semibold opacity-70">Clear</Text>
            ) : (
              <Text style={{ color: fg }} className="text-[30px] font-medium">{k}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
