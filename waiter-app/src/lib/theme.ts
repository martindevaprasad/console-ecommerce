import { vars } from 'nativewind';
import { useMemo } from 'react';
import { useSession } from './store';

/** The POS default accent (GMOS blue). The business can change it in POS → Settings → Appearance. */
export const DEFAULT_ACCENT = '#5e84ff';

export type BrandScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

// How far each shade moves from the accent toward white (lighter) or black (darker).
const STEPS: [keyof BrandScale, string, number][] = [
  [50, '#ffffff', 0.92], [100, '#ffffff', 0.84], [200, '#ffffff', 0.66], [300, '#ffffff', 0.44], [400, '#ffffff', 0.22],
  [500, '#ffffff', 0], [600, '#000000', 0.12], [700, '#000000', 0.26], [800, '#000000', 0.4], [900, '#000000', 0.52],
];

const valid = (hex?: string | null) => (hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : DEFAULT_ACCENT);
const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;

/** Full 50–900 scale (hex) derived from one accent colour, Tailwind-style. */
export function brandScale(accent?: string | null): BrandScale {
  const base = toRgb(valid(accent));
  const out = {} as BrandScale;
  for (const [k, target, amt] of STEPS) {
    const t = toRgb(target);
    out[k] = toHex(base.map((c, i) => c + (t[i]! - c) * amt));
  }
  return out;
}

/** NativeWind CSS variables for the scale; `brand-*` classes in tailwind.config read these. */
export function brandVars(accent?: string | null) {
  const scale = brandScale(accent);
  return vars(Object.fromEntries(Object.entries(scale).map(([k, hex]) => [`--brand-${k}`, toRgb(hex).join(' ')])));
}

/** The active business accent: from the signed-in config, else what the device remembers from pairing. */
export const useAccent = () => useSession((s) => valid(s.config?.accentColor ?? s.pairing?.accentColor));

/** Hex shades for places that need a colour value rather than a class (icons, spinners, tab bar). */
export function useBrand(): BrandScale {
  const accent = useAccent();
  return useMemo(() => brandScale(accent), [accent]);
}
