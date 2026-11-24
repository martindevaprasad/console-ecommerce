import React, { useEffect, useRef, useState } from 'react';
import { IconRefresh, IconCloudOff } from '@tabler/icons-react';
import { useDevice } from './device';

/* ───────────────────────── Pull to refresh ───────────────────────── */

const THRESHOLD = 72; // px of (damped) pull that triggers a refresh
const MAX_PULL = 120;

/**
 * Phones: pull down at the top of the page to refresh. Calls `onRefresh` (usually the page's
 * existing `reload(true)`) and shows a spinner until its promise settles. Renders no wrapper,
 * so the page's own markup is untouched; tablets and desktop get the children only.
 */
export const PullToRefresh: React.FC<{ onRefresh: () => unknown; disabled?: boolean; children: React.ReactNode }> = ({ onRefresh, disabled, children }) => {
  const { isMobile } = useDevice();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!isMobile || disabled) return;
    let startY: number | null = null;
    let current = 0;
    const blocked = (t: EventTarget | null) =>
      document.body.style.overflow === 'hidden' // a sheet/modal is open
      || !!(t as HTMLElement | null)?.closest?.('.sheet, .fsm, .pos-cartbar, .table-container, .floor-canvas, [data-no-ptr]');

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0 || e.touches.length > 1 || blocked(e.target)) { startY = null; return; }
      startY = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 0) { current = 0; setPull(0); return; }
      current = Math.min(MAX_PULL, dy * 0.5); // resistance, like the native gesture
      setPull(current);
    };
    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (current >= THRESHOLD) {
        setRefreshing(true); refreshingRef.current = true;
        setPull(THRESHOLD * 0.75);
        try { await cb.current(); } finally { setRefreshing(false); refreshingRef.current = false; setPull(0); }
      } else setPull(0);
      current = 0;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [isMobile, disabled]);

  const shown = isMobile && (pull > 0 || refreshing);
  return (
    <>
      {shown && (
        <div className={`ptr${refreshing ? ' refreshing' : ''}${pull >= THRESHOLD ? ' armed' : ''}`} style={{ transform: `translate(-50%, ${pull}px)` }} role="status" aria-live="polite">
          <IconRefresh size={20} style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }} aria-hidden />
          <span className="sr-only">{refreshing ? 'Refreshing' : pull >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}
      {children}
    </>
  );
};

/* ───────────────────────── Skeletons ───────────────────────── */

/** One shimmering placeholder block. */
export const Skeleton: React.FC<{ w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties; className?: string }> = ({ w = '100%', h = 14, r = 6, style, className }) => (
  <span className={`skel${className ? ` ${className}` : ''}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />
);

const Loading: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <div className={className} role="status" aria-busy="true" aria-label={label}>{children}</div>
);

/** Placeholder for a card list (matches MobileCard / auto table cards). */
export const SkeletonCards: React.FC<{ count?: number; lines?: number; label?: string }> = ({ count = 5, lines = 3, label = 'Loading' }) => (
  <Loading label={label} className="m-card-list">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="m-card skel-card">
        <div className="m-card-head">
          <div className="m-card-titles"><Skeleton w="38%" h={16} /><Skeleton w="56%" h={12} style={{ marginTop: 8 }} /></div>
          <Skeleton w={64} h={16} />
        </div>
        <div className="m-card-body">
          {Array.from({ length: lines }, (_, j) => (
            <div key={j} className="m-kv"><Skeleton w={`${24 + ((i + j) % 3) * 8}%`} h={12} /><Skeleton w={`${18 + ((i * 2 + j) % 4) * 6}%`} h={12} /></div>
          ))}
        </div>
      </div>
    ))}
  </Loading>
);

/** Placeholder for a KPI tile grid. */
export const SkeletonKpis: React.FC<{ count?: number; label?: string }> = ({ count = 6, label = 'Loading' }) => (
  <Loading label={label} className="kpi-grid">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="kpi skel-kpi"><Skeleton w="55%" h={11} /><Skeleton w="70%" h={24} style={{ marginTop: 10 }} /><Skeleton w="45%" h={10} style={{ marginTop: 10 }} /></div>
    ))}
  </Loading>
);

/** Placeholder for a grid of product tiles (POS). */
export const SkeletonTiles: React.FC<{ count?: number; label?: string }> = ({ count = 8, label = 'Loading menu' }) => (
  <Loading label={label} className="skel-tiles">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="skel-tile"><Skeleton h={88} r={12} /><Skeleton w="70%" h={14} style={{ marginTop: 10 }} /><Skeleton w="40%" h={14} style={{ marginTop: 8 }} /></div>
    ))}
  </Loading>
);

/* ───────────────────────── Error state ───────────────────────── */

/** Friendly failure with a retry button (for when a page's data could not load). */
export const ErrorState: React.FC<{ title?: string; message?: string | null; onRetry?: () => void }> = ({ title = "Couldn't load this page", message, onRetry }) => (
  <div className="empty-state error-state" role="alert">
    <div className="empty-state-icon"><IconCloudOff size={28} /></div>
    <div className="empty-state-title">{title}</div>
    {message && <p className="small muted" style={{ marginBottom: onRetry ? 12 : 0 }}>{message}</p>}
    {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}><IconRefresh size={16} /> Try again</button>}
  </div>
);
