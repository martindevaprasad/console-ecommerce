// Windows-style single accent colour. The business picks one colour; every brand
// token (buttons, selections, highlights, logo, favicon) is derived from it.

/** The original GMOS brand blue. Keeping it leaves the stock look (incl. mint highlights) untouched. */
export const DEFAULT_ACCENT = '#5e84ff';

/** Swatches in the spirit of the Windows accent picker. All are dark enough for white text. */
export const ACCENT_SWATCHES: { name: string; hex: string }[] = [
  { name: 'GMOS Blue', hex: '#5e84ff' },
  { name: 'Windows Blue', hex: '#0078d4' },
  { name: 'Navy', hex: '#0063b1' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Teal', hex: '#038387' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Green', hex: '#10893e' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#744da9' },
  { name: 'Purple', hex: '#8764b8' },
  { name: 'Magenta', hex: '#c239b3' },
  { name: 'Pink', hex: '#e3008c' },
  { name: 'Red', hex: '#e81123' },
  { name: 'Brick', hex: '#c50f1f' },
  { name: 'Orange', hex: '#f7630c' },
  { name: 'Rust', hex: '#ca5010' },
  { name: 'Brown', hex: '#8e562e' },
  { name: 'Graphite', hex: '#4c4a48' },
];

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

const toRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;
/** Mix `hex` toward `target` by `amount` (0–1). */
const mix = (hex: string, target: string, amount: number) => {
  const a = toRgb(hex);
  const b = toRgb(target);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
};

/** Relative luminance (WCAG), 0 = black, 1 = white. */
export const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** White text contrast against the accent. Below ~3 the buttons get hard to read. */
export const whiteContrast = (hex: string) => 1.05 / (luminance(hex) + 0.05);

const TOKENS = [
  '--color-primary', '--color-primary-rgb', '--color-primary-light', '--color-primary-dark', '--color-primary-glow',
  '--color-accent', '--color-accent-light', '--color-accent-glow', '--color-border-hover',
];

/**
 * Applies the accent as inline custom properties on <html>, which win over the
 * theme/palette stylesheets. The default blue clears them so the stock look stays.
 */
export function applyAccent(accent: string | null | undefined) {
  const root = document.documentElement;
  const hex = accent && isHex(accent) ? accent.toLowerCase() : DEFAULT_ACCENT;
  if (hex === DEFAULT_ACCENT) {
    TOKENS.forEach((t) => root.style.removeProperty(t));
    return;
  }
  const dark = root.getAttribute('data-theme') !== 'light';
  const rgb = toRgb(hex).join(', ');
  // Text/icons in the accent need a lighter shade on dark surfaces and a deeper one on white.
  const textShade = dark ? mix(hex, '#ffffff', 0.3) : mix(hex, '#000000', 0.22);
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set('--color-primary', hex);
  set('--color-primary-rgb', rgb);
  set('--color-primary-light', textShade);
  set('--color-primary-dark', mix(hex, '#000000', 0.25));
  set('--color-primary-glow', `rgba(${rgb}, 0.25)`);
  // Single colour: highlights follow the accent instead of the stock mint.
  set('--color-accent', hex);
  set('--color-accent-light', textShade);
  set('--color-accent-glow', `rgba(${rgb}, 0.2)`);
  set('--color-border-hover', `rgba(${rgb}, 0.4)`);
}
