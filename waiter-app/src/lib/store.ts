import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { configureApi, gql } from './api';
import { Q } from './queries';
import type { CartLine, HandheldConfig, Modifier, Product, StaffUser } from './types';

/** What survives an app restart. The staff token deliberately does not: reopening the app asks for a PIN. */
export interface Pairing {
  endpoint: string;
  deviceKey: string;
  deviceName: string;
  organizationName: string;
  locationId: string;
  locationName: string;
  /** Business accent colour, remembered so the PIN screen is branded before anyone signs in. */
  accentColor?: string;
}

const PAIRING_KEY = 'waiter.pairing.v1';

interface SessionState {
  ready: boolean;
  pairing: Pairing | null;
  token: string | null;
  user: StaffUser | null;
  config: HandheldConfig | null;
  /** Why we were sent back to the lock screen, shown once there. */
  lockReason: string | null;
  hydrate: () => Promise<void>;
  savePairing: (p: Pairing) => Promise<void>;
  forgetPairing: () => Promise<void>;
  signIn: (token: string, user: StaffUser) => Promise<void>;
  refreshConfig: () => Promise<HandheldConfig | null>;
  /** Persists a new accent colour on the pairing when the POS changes it. */
  rememberAccent: (accent?: string | null) => void;
  lock: (reason?: string | null) => void;
}

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  pairing: null,
  token: null,
  user: null,
  config: null,
  lockReason: null,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(PAIRING_KEY);
      set({ pairing: raw ? JSON.parse(raw) : null });
    } catch {
      set({ pairing: null });
    }
    set({ ready: true });
  },

  savePairing: async (p) => {
    await SecureStore.setItemAsync(PAIRING_KEY, JSON.stringify(p));
    set({ pairing: p, token: null, user: null, config: null });
  },

  forgetPairing: async () => {
    const { pairing } = get();
    if (pairing) {
      // Best effort: tell the POS this device is gone.
      gql(Q.UNPAIR, { deviceKey: pairing.deviceKey }, { auth: false }).catch(() => {});
    }
    await SecureStore.deleteItemAsync(PAIRING_KEY).catch(() => {});
    useCart.getState().clear();
    set({ pairing: null, token: null, user: null, config: null });
  },

  signIn: async (token, user) => {
    set({ token, user, lockReason: null });
    await get().refreshConfig();
  },

  rememberAccent: (accent) => {
    const { pairing } = get();
    if (!pairing || !accent || pairing.accentColor === accent) return;
    const next = { ...pairing, accentColor: accent };
    set({ pairing: next });
    SecureStore.setItemAsync(PAIRING_KEY, JSON.stringify(next)).catch(() => {});
  },

  refreshConfig: async () => {
    try {
      const data = await gql<{ handheldConfig: HandheldConfig }>(Q.CONFIG);
      set({ config: data.handheldConfig });
      get().rememberAccent(data.handheldConfig.accentColor);
      return data.handheldConfig;
    } catch {
      return get().config;
    }
  },

  lock: (reason = null) => {
    useCart.getState().clear();
    set({ token: null, user: null, config: null, lockReason: reason });
  },
}));

configureApi({
  getToken: () => useSession.getState().token,
  getEndpoint: () => useSession.getState().pairing?.endpoint ?? null,
  onUnauthenticated: (code) => {
    const s = useSession.getState();
    if (code === 'DEVICE_NOT_PAIRED') {
      s.forgetPairing();
      return;
    }
    s.lock(code === 'WAITER_APP_DISABLED' ? 'The waiter app was turned off from the POS.' : 'Your session ended. Sign in again.');
  },
});

export const useCaps = () => useSession((s) => s.config?.capabilities);

// ------------------------------------------------------------------ cart

/** Which check the cart will land on. */
export type CartTarget =
  | { kind: 'table'; tableId: string; tableName: string; guestCount: number; orderId?: string | null }
  | { kind: 'takeaway'; orderType: string; orderId?: string | null; label?: string }
  | { kind: 'order'; orderId: string; label: string };

interface CartState {
  target: CartTarget | null;
  lines: CartLine[];
  notes: string;
  start: (target: CartTarget) => void;
  add: (product: Product, opts: { quantity: number; modifiers: Modifier[]; notes: string; seat: number | null; course: number; priceOverride?: number }) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
}

let lineSeq = 0;

export const useCart = create<CartState>((set, get) => ({
  target: null,
  lines: [],
  notes: '',
  start: (target) => {
    const cur = get().target;
    const same = cur && JSON.stringify(cur) === JSON.stringify(target);
    set(same ? { target } : { target, lines: [], notes: '' });
  },
  add: (product, opts) => {
    // Identical lines (same product, options, note, seat, course) merge into one.
    const sig = (l: Omit<CartLine, 'key' | 'quantity'>) =>
      [l.product.id, l.modifiers.map((m) => m.id).sort().join(','), l.notes.trim(), l.seat ?? '', l.course, l.priceOverride ?? ''].join('|');
    const wanted = sig({ ...opts, product });
    const lines = get().lines;
    const existing = lines.find((l) => sig(l) === wanted);
    if (existing) {
      set({ lines: lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + opts.quantity } : l)) });
    } else {
      set({ lines: [...lines, { key: `l${++lineSeq}`, product, ...opts }] });
    }
  },
  setQty: (key, qty) => set({ lines: get().lines.flatMap((l) => (l.key === key ? (qty > 0 ? [{ ...l, quantity: qty }] : []) : [l])) }),
  remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ target: null, lines: [], notes: '' }),
}));

export const lineUnitPrice = (l: CartLine, locationId?: string | null) => {
  const override = locationId ? l.product.priceOverrides?.[locationId] : undefined;
  const base = l.priceOverride ?? (typeof override === 'number' ? override : l.product.price);
  return base + l.modifiers.reduce((s, m) => s + m.price, 0);
};
