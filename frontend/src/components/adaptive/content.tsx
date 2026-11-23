import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';
import { useDevice } from './device';

/* ───────────────────────── ListGroup / ListItem ───────────────────────── */

/** iOS-settings-style group: optional uppercase header, rounded body, optional footer note. */
export const ListGroup: React.FC<{ label?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ label, footer, children, className }) => (
  <section className={`list-group${className ? ` ${className}` : ''}`}>
    {label && <div className="list-group-label">{label}</div>}
    <div className="list-group-body">{children}</div>
    {footer && <div className="list-group-footer">{footer}</div>}
  </section>
);

export interface ListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Leading icon (tinted square) */
  icon?: React.ReactNode;
  /** Leading avatar/thumbnail, used instead of icon */
  avatar?: React.ReactNode;
  /** Right-aligned value, e.g. a price or a status badge */
  trailing?: React.ReactNode;
  /** Show a chevron (defaults to true when the row navigates) */
  chevron?: boolean;
  to?: string;
  onClick?: () => void;
  destructive?: boolean;
  active?: boolean;
  disabled?: boolean;
}

/** A tappable row: leading icon/avatar, title + subtitle, trailing value and chevron. */
export const ListItem: React.FC<ListItemProps> = ({ title, subtitle, icon, avatar, trailing, chevron, to, onClick, destructive, active, disabled }) => {
  const showChevron = chevron ?? (!!to || !!onClick);
  const inner = (
    <>
      {avatar ? <span className="list-row-avatar">{avatar}</span> : icon && <span className="list-row-icon">{icon}</span>}
      <span className="list-row-text"><b>{title}</b>{subtitle && <small>{subtitle}</small>}</span>
      {trailing !== undefined && <span className="list-row-trailing">{trailing}</span>}
      {showChevron && <IconChevronRight size={18} className="list-row-chevron" aria-hidden />}
    </>
  );
  const cls = `list-row${active ? ' active' : ''}${destructive ? ' danger' : ''}${disabled ? ' disabled' : ''}`;
  if (to && !disabled) return <Link to={to} className={cls} onClick={onClick}>{inner}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
};

/* ───────────────────────── Swipeable row ───────────────────────── */

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  tone?: 'danger' | 'primary' | 'neutral';
}

/**
 * Swipe left to reveal actions (edit, delete…). The actions are real buttons that also open
 * on keyboard focus, so they are never swipe-only.
 */
export const SwipeableListItem: React.FC<{ actions: SwipeAction[]; children: React.ReactNode }> = ({ actions, children }) => {
  const ACTION_W = 84;
  const width = actions.length * ACTION_W;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; locked?: 'x' | 'y' } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Tap anywhere else closes an open row.
  useEffect(() => {
    if (!offset) return;
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOffset(0); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [offset]);

  const onPointerDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY, base: offset }; };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (s.locked === 'x') { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); setDragging(true); }
    }
    if (s.locked === 'x') setOffset(Math.max(-width - 24, Math.min(0, s.base + dx)));
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || s.locked !== 'x') return;
    setDragging(false);
    setOffset((o) => (o < -width / 2 ? -width : 0));
  };

  return (
    <div ref={rootRef} className="swipe-row" onFocus={(e) => { if ((e.target as HTMLElement).closest('.swipe-actions')) setOffset(-width); }}>
      <div className="swipe-actions" style={{ width }}>
        {actions.map((a) => (
          <button key={a.label} type="button" className={`swipe-action ${a.tone || 'neutral'}`} style={{ width: ACTION_W }}
            onClick={() => { setOffset(0); a.onSelect(); }}>
            {a.icon}<span>{a.label}</span>
          </button>
        ))}
      </div>
      <div
        className={`swipe-content${dragging ? ' dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClickCapture={(e) => { if (offset) { e.stopPropagation(); e.preventDefault(); setOffset(0); } }}
      >
        {children}
      </div>
    </div>
  );
};

/* ───────────────────────── MobileCard ───────────────────────── */

export interface MobileCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Top-right value (status badge, total…) */
  trailing?: React.ReactNode;
  /** Leading thumbnail / avatar */
  media?: React.ReactNode;
  /** Label/value rows or any content under the header */
  children?: React.ReactNode;
  /** Buttons along the bottom edge */
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/** Rounded, padded card. Replaces a table row on phones. */
export const MobileCard: React.FC<MobileCardProps> = ({ title, subtitle, trailing, media, children, actions, onClick, className, style }) => (
  <div
    className={`m-card${onClick ? ' tappable' : ''}${className ? ` ${className}` : ''}`}
    style={style}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
  >
    <div className="m-card-head">
      {media && <div className="m-card-media">{media}</div>}
      <div className="m-card-titles">
        <div className="m-card-title">{title}</div>
        {subtitle && <div className="m-card-sub">{subtitle}</div>}
      </div>
      {trailing !== undefined && <div className="m-card-trailing">{trailing}</div>}
      {onClick && <IconChevronRight size={18} className="m-card-chevron" aria-hidden />}
    </div>
    {children && <div className="m-card-body">{children}</div>}
    {actions && <div className="m-card-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}
  </div>
);

/** One label/value line inside a MobileCard. */
export const KeyValue: React.FC<{ label: React.ReactNode; children: React.ReactNode; align?: 'left' | 'right' }> = ({ label, children, align = 'right' }) => (
  <div className={`m-kv${align === 'left' ? ' left' : ''}`}><span className="m-kv-label">{label}</span><span className="m-kv-value">{children}</span></div>
);

/* ───────────────────────── Infinite list ───────────────────────── */

/**
 * Keeps every page fetched so far, merged by id, for infinite scrolling over an offset-paged
 * API. Page 0 starts fresh (filters changed or refreshed); later pages append; refetched rows
 * replace their old copy in place.
 */
export function useAccumulatedPages<T extends { id: string }>(items: T[] | undefined, page: number): T[] {
  const [acc, setAcc] = useState<T[]>([]);
  useEffect(() => {
    if (!items) return;
    setAcc((prev) => {
      const merged = new Map((page === 0 ? [] : prev).map((x) => [x.id, x] as const));
      items.forEach((x) => merged.set(x.id, x));
      return Array.from(merged.values());
    });
  }, [items, page]);
  return acc;
}

/** Loads the next page as it scrolls into view; a "Load more" button is the fallback. */
export const LoadMore: React.FC<{ hasMore: boolean; loading?: boolean; onLoadMore: () => void }> = ({ hasMore, loading, onLoadMore }) => {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onLoadMore);
  cb.current = onLoadMore;
  useEffect(() => {
    const node = ref.current;
    if (!hasMore || loading || !node || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) cb.current(); }, { rootMargin: '400px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loading]);
  if (!hasMore) return null;
  return (
    <div ref={ref} className="load-more">
      {loading ? <span className="spinner" aria-label="Loading more" /> : <button type="button" className="btn btn-secondary" onClick={onLoadMore}>Load more</button>}
    </div>
  );
};

/* ───────────────────────── FAB ───────────────────────── */

/**
 * The primary "create" action on phones, floating above the tab bar.
 * Renders nothing on tablet/desktop, where the page header keeps its button.
 */
export const FloatingActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; extended?: boolean }> = ({ icon, label, onClick, extended }) => {
  const { isMobile } = useDevice();
  if (!isMobile) return null;
  return (
    <button type="button" className={`fab${extended ? ' extended' : ''}`} onClick={onClick} aria-label={extended ? undefined : label}>
      {icon}{extended && <span>{label}</span>}
    </button>
  );
};

/* ───────────────────────── StickyActionBar ───────────────────────── */

/**
 * Primary/secondary buttons for forms and detail pages. Phones: fixed to the bottom (above the
 * tab bar), with a spacer so it never covers content. Tablet/desktop: an ordinary right-aligned row.
 */
export const StickyActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMobile } = useDevice();
  if (!isMobile) return <div className="row sticky-actions-inline">{children}</div>;
  return (
    <>
      <div className="sticky-actions-spacer" aria-hidden />
      <div className="sticky-actions">{children}</div>
    </>
  );
};
