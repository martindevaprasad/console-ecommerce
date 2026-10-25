import { createContext, useContext, useEffect, useState } from 'react';
import { MARK_PATHS } from '@/components/layout/AppSvgs';

export type Theme = 'dark' | 'light' | 'system';
/** Brand color palette, independent of light/dark. 'default' is the original GMOS look. */
export type Palette = 'default' | 'bistro' | 'fintech' | 'hospitality' | 'minimal' | 'oceanic';
export type SidebarVariant = 'aurora' | 'onyx' | 'frost';
export type Density = 'compact' | 'comfortable';

export interface AppearanceSettings {
  theme: Theme;
  palette: Palette;
  sidebarVariant: SidebarVariant;
  density: Density;
  animations: boolean;
}

const STORAGE_KEY = 'nexuspos-appearance';

const defaults: AppearanceSettings = {
  theme: 'dark',
  palette: 'default',
  sidebarVariant: 'aurora',
  density: 'compact',
  animations: true,
};

function load(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

function save(s: AppearanceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function applyToDOM(s: AppearanceSettings) {
  const root = document.documentElement;

  // Theme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = s.theme === 'dark' || (s.theme === 'system' && prefersDark);
  root.setAttribute('data-theme', useDark ? 'dark' : 'light');

  // Color palette ('default' = no attribute, so :root tokens apply untouched)
  if (s.palette === 'default') root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', s.palette);

  // Sidebar variant
  root.setAttribute('data-sidebar', s.sidebarVariant);

  // Density
  root.setAttribute('data-density', s.density);

  // Animations
  root.setAttribute('data-animations', s.animations ? 'on' : 'off');

  applyFavicon();
}

/** Redraws the tab icon in the palette's logo colours (--logo-tile / --logo-fold). */
function applyFavicon() {
  const cs = getComputedStyle(document.documentElement);
  const tile = cs.getPropertyValue('--logo-tile').trim() || '#5E84FF';
  const fold = cs.getPropertyValue('--logo-fold').trim() || '#000000';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 8 36 36"><rect y="8" width="36" height="36" rx="11" fill="${tile}"/><path d="${MARK_PATHS.fold}" fill="${fold}"/></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((l) => { l.href = href; });
}

// --- Context ---
interface AppearanceContextValue {
  settings: AppearanceSettings;
  update: (patch: Partial<AppearanceSettings>) => void;
}

export const AppearanceContext = createContext<AppearanceContextValue>({
  settings: defaults,
  update: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function useAppearanceState(): AppearanceContextValue {
  const [settings, setSettings] = useState<AppearanceSettings>(load);

  useEffect(() => {
    applyToDOM(settings);
  }, [settings]);

  // Also watch system preference changes when theme === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (settings.theme === 'system') applyToDOM(settings); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);

  const update = (patch: Partial<AppearanceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  };

  return { settings, update };
}
