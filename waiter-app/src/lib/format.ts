import { useSession } from './store';

const fmtCache = new Map<string, Intl.NumberFormat>();

export function money(value: number, currency = 'USD', locale = 'en-US') {
  const key = `${locale}|${currency}`;
  let f = fmtCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency });
    } catch {
      f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    }
    fmtCache.set(key, f);
  }
  return f.format(Number.isFinite(value) ? value : 0);
}

/** Currency formatter bound to the business settings. */
export function useMoney() {
  const org = useSession((s) => s.config?.organization);
  return (v: number) => money(v, org?.currency || 'USD', org?.locale || 'en-US');
}

export function minutesSince(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function duration(iso: string | null | undefined) {
  const m = minutesSince(iso);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const label = (v?: string | null) =>
  (v || '').toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
