import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { initials } from '@/lib/format';
import type { ItemStatus, TableStatus } from '@/lib/types';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const tap = () => Haptics.selectionAsync().catch(() => {});

// ------------------------------------------------------------------ layout

export function Screen({ children, className, edges = ['top'] }: { children: React.ReactNode; className?: string; edges?: ('top' | 'bottom')[] }) {
  return (
    <SafeAreaView edges={edges} className={cx('flex-1 bg-canvas', className)}>
      {children}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, back, right, large }: { title: string; subtitle?: string | null; back?: boolean | (() => void); right?: React.ReactNode; large?: boolean }) {
  return (
    <View className="flex-row items-center gap-2 px-4 pb-3 pt-2">
      {back ? (
        <IconButton icon="chevron-back" onPress={typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'))} />
      ) : null}
      <View className="flex-1">
        <Text numberOfLines={1} className={cx('font-bold text-ink', large ? 'text-[28px]' : 'text-xl')}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} className="text-[13px] text-ink-muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, className, onPress }: { children: React.ReactNode; className?: string; onPress?: () => void }) {
  const base = cx('rounded-2xl border border-line bg-surface', className);
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} className={cx(base, 'active:opacity-80')}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="mb-2 mt-5 flex-row items-center justify-between px-1">
      <Text className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{children}</Text>
      {right}
    </View>
  );
}

export function Divider({ className }: { className?: string }) {
  return <View className={cx('h-px bg-line', className)} />;
}

// ------------------------------------------------------------------ controls

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';

const VARIANT: Record<Variant, { box: string; text: string; fg: string }> = {
  primary: { box: 'bg-brand-500 active:bg-brand-600', text: 'text-white', fg: '#fff' },
  dark: { box: 'bg-ink active:bg-ink-soft', text: 'text-white', fg: '#fff' },
  secondary: { box: 'bg-surface border border-line active:bg-canvas', text: 'text-ink', fg: '#14161C' },
  ghost: { box: 'bg-transparent active:bg-black/5', text: 'text-ink', fg: '#14161C' },
  danger: { box: 'bg-red-50 border border-red-100 active:bg-red-100', text: 'text-red-600', fg: '#DC2626' },
  success: { box: 'bg-emerald-600 active:bg-emerald-700', text: 'text-white', fg: '#fff' },
};

export function Button({
  title, onPress, variant = 'primary', icon, loading, disabled, size = 'md', className, haptic = true,
}: {
  title: string; onPress?: () => void; variant?: Variant; icon?: IconName; loading?: boolean; disabled?: boolean;
  size?: 'sm' | 'md' | 'lg'; className?: string; haptic?: boolean;
}) {
  const v = VARIANT[variant];
  const h = size === 'lg' ? 'h-14 px-6' : size === 'sm' ? 'h-9 px-3' : 'h-12 px-5';
  const t = size === 'lg' ? 'text-[17px]' : size === 'sm' ? 'text-[13px]' : 'text-[15px]';
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      onPress={() => { if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress?.(); }}
      className={cx('flex-row items-center justify-center gap-2 rounded-xl', h, v.box, off && 'opacity-50', className)}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={v.fg} /> : null}
      <Text className={cx('font-semibold', t, v.text)}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, badge, className, color = '#14161C', size = 22 }: { icon: IconName; onPress: () => void; badge?: number; className?: string; color?: string; size?: number }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={8} className={cx('h-11 w-11 items-center justify-center rounded-full bg-surface border border-line active:bg-canvas', className)}>
      <Ionicons name={icon} size={size} color={color} />
      {badge ? (
        <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1">
          <Text className="text-[11px] font-bold text-white">{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color, icon, count }: { label: string; active?: boolean; onPress?: () => void; color?: string | null; icon?: IconName; count?: number }) {
  return (
    <Pressable
      onPress={() => { tap(); onPress?.(); }}
      className={cx('h-10 flex-row items-center gap-1.5 rounded-full border px-4', active ? 'border-ink bg-ink' : 'border-line bg-surface active:bg-canvas')}
    >
      {color ? <View style={{ backgroundColor: color }} className="h-2.5 w-2.5 rounded-full" /> : null}
      {icon ? <Ionicons name={icon} size={15} color={active ? '#fff' : '#3A3F4B'} /> : null}
      <Text className={cx('text-[14px] font-semibold', active ? 'text-white' : 'text-ink-soft')}>{label}</Text>
      {count !== undefined ? (
        <View className={cx('ml-0.5 rounded-full px-1.5', active ? 'bg-white/20' : 'bg-canvas')}>
          <Text className={cx('text-[11px] font-bold', active ? 'text-white' : 'text-ink-muted')}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View className="flex-row items-center rounded-full border border-line bg-surface">
      <Pressable hitSlop={6} onPress={() => { tap(); onChange(Math.max(min, value - 1)); }} className="h-10 w-10 items-center justify-center rounded-full active:bg-canvas">
        <Ionicons name={value - 1 < 1 && min === 0 ? 'trash-outline' : 'remove'} size={18} color="#14161C" />
      </Pressable>
      <Text className="min-w-8 text-center text-[16px] font-bold text-ink">{value}</Text>
      <Pressable hitSlop={6} onPress={() => { tap(); onChange(Math.min(max, value + 1)); }} className="h-10 w-10 items-center justify-center rounded-full active:bg-canvas">
        <Ionicons name="add" size={18} color="#14161C" />
      </Pressable>
    </View>
  );
}

export function Input({ label, hint, className, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View className={cx('mb-4', className)}>
      {label ? <Text className="mb-1.5 text-[13px] font-semibold text-ink-soft">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9CA3AF"
        className="h-12 rounded-xl border border-line bg-surface px-4 text-[16px] text-ink focus:border-brand-400"
        {...props}
      />
      {hint ? <Text className="mt-1 text-[12px] text-ink-muted">{hint}</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = 44, tone = 'brand' }: { name: string; size?: number; tone?: 'brand' | 'dark' | 'light' }) {
  const bg = tone === 'dark' ? 'bg-ink' : tone === 'light' ? 'bg-brand-100' : 'bg-brand-500';
  const fg = tone === 'light' ? 'text-brand-700' : 'text-white';
  return (
    <View style={{ width: size, height: size }} className={cx('items-center justify-center rounded-full', bg)}>
      <Text style={{ fontSize: size * 0.38 }} className={cx('font-bold', fg)}>{initials(name)}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ feedback

export function Loading({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <ActivityIndicator size="large" color="#F95A10" />
      {label ? <Text className="text-ink-muted">{label}</Text> : null}
    </View>
  );
}

export function Empty({ icon = 'restaurant-outline', title, hint, action }: { icon?: IconName; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <View className="items-center justify-center px-8 py-14">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-brand-50">
        <Ionicons name={icon} size={30} color="#F95A10" />
      </View>
      <Text className="text-center text-[17px] font-bold text-ink">{title}</Text>
      {hint ? <Text className="mt-1 text-center text-[14px] leading-5 text-ink-muted">{hint}</Text> : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="mx-4 mb-3 flex-row items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
      <Ionicons name="alert-circle" size={20} color="#DC2626" />
      <Text className="flex-1 text-[13px] text-red-700">{message}</Text>
      {onRetry ? <Pressable onPress={onRetry}><Text className="font-semibold text-red-700">Retry</Text></Pressable> : null}
    </View>
  );
}

const TONES = {
  neutral: ['bg-canvas text-ink-soft', '#3A3F4B'],
  brand: ['bg-brand-50 text-brand-700', '#C22E07'],
  green: ['bg-emerald-50 text-emerald-700', '#047857'],
  blue: ['bg-sky-50 text-sky-700', '#0369A1'],
  amber: ['bg-amber-50 text-amber-700', '#B45309'],
  violet: ['bg-violet-50 text-violet-700', '#6D28D9'],
  red: ['bg-red-50 text-red-700', '#B91C1C'],
  dark: ['bg-ink text-white', '#fff'],
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const [cls, iconColor] = TONES[tone];
  const [bg, fg] = cls.split(' ');
  return (
    <View className={cx('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', bg)}>
      {icon ? <Ionicons name={icon} size={12} color={iconColor} /> : null}
      <Text className={cx('text-[11px] font-bold', fg)}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ toast

interface ToastState { msg: string | null; tone: 'ok' | 'error'; show: (msg: string, tone?: 'ok' | 'error') => void; hide: () => void }
export const useToast = create<ToastState>((set) => ({
  msg: null,
  tone: 'ok',
  show: (msg, tone = 'ok') => set({ msg, tone }),
  hide: () => set({ msg: null }),
}));
export const toast = {
  ok: (m: string) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); useToast.getState().show(m, 'ok'); },
  error: (m: string) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); useToast.getState().show(m, 'error'); },
};

export function ToastHost() {
  const { msg, tone, hide } = useToast();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(hide, tone === 'error' ? 4000 : 2200);
    return () => clearTimeout(id);
  }, [msg, tone, hide]);
  if (!msg) return null;
  return (
    <Pressable onPress={hide} style={{ top: insets.top + 8 }} className="absolute left-4 right-4 z-50">
      <View className={cx('flex-row items-center gap-3 rounded-2xl px-4 py-3.5 shadow-lg', tone === 'error' ? 'bg-red-600' : 'bg-ink')}>
        <Ionicons name={tone === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color={tone === 'error' ? '#fff' : '#34D399'} />
        <Text className="flex-1 text-[14px] font-medium text-white">{msg}</Text>
      </View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ sheet

export function Sheet({ visible, onClose, title, subtitle, children, footer, scroll = true }: {
  visible: boolean; onClose: () => void; title?: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1 }} className="bg-black/40" onPress={onClose} />
        {/* Pixel cap (not %) so it resolves reliably inside a Modal on Android. */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 12), maxHeight: Math.round(height * 0.88) }} className="rounded-t-3xl bg-surface">
          <View className="items-center pt-2.5"><View className="h-1.5 w-10 rounded-full bg-line" /></View>
          {title ? (
            <View className="flex-row items-start px-5 pb-2 pt-3">
              <View className="flex-1">
                <Text className="text-[20px] font-bold text-ink">{title}</Text>
                {subtitle ? <Text className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</Text> : null}
              </View>
              <Pressable hitSlop={10} onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-canvas">
                <Ionicons name="close" size={20} color="#3A3F4B" />
              </Pressable>
            </View>
          ) : null}
          {scroll ? (
            // flexGrow 0: size to content and only shrink (and scroll) when the sheet hits its cap.
            // The default flexGrow 1 can leave the body at zero height inside an auto-height sheet.
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {children}
            </ScrollView>
          ) : (
            <View className="px-5">{children}</View>
          )}
          {footer ? <View className="border-t border-line px-5 pt-3">{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ------------------------------------------------------------------ status meta

export const TABLE_STATUS: Record<TableStatus, { label: string; tone: Tone; color: string; soft: string; icon: IconName }> = {
  AVAILABLE: { label: 'Free', tone: 'green', color: '#059669', soft: '#ECFDF5', icon: 'checkmark-circle-outline' },
  SEATED: { label: 'Seated', tone: 'blue', color: '#0284C7', soft: '#F0F9FF', icon: 'people-outline' },
  ORDERING: { label: 'Ordering', tone: 'amber', color: '#D97706', soft: '#FFFBEB', icon: 'create-outline' },
  WAITING_FOR_FOOD: { label: 'In kitchen', tone: 'violet', color: '#7C3AED', soft: '#F5F3FF', icon: 'flame-outline' },
  READY_FOR_PAYMENT: { label: 'Bill', tone: 'red', color: '#E11D48', soft: '#FFF1F2', icon: 'receipt-outline' },
  NEEDS_CLEANING: { label: 'Cleaning', tone: 'neutral', color: '#64748B', soft: '#F1F5F9', icon: 'sparkles-outline' },
};

export const ITEM_STATUS: Record<ItemStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Not sent', tone: 'amber' },
  FIRED: { label: 'Sent', tone: 'blue' },
  PREPARING: { label: 'Cooking', tone: 'violet' },
  READY: { label: 'Ready', tone: 'green' },
  SERVED: { label: 'Served', tone: 'neutral' },
  VOIDED: { label: 'Void', tone: 'red' },
};
