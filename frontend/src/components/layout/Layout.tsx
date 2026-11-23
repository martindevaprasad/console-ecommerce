import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AppearanceContext, useAppearanceState } from '@/hooks/useAppearance';
import { useDevice } from '../adaptive/device';
import { PageMetaProvider, usePageMetaValue } from '../adaptive/pageMeta';

// Device-specific chrome is code-split: desktop never downloads it.
const MobileTopBar = lazy(() => import('../mobile/MobileTopBar'));
const BottomTabBar = lazy(() => import('../mobile/BottomTabBar'));
const NavigationRail = lazy(() => import('../tablet/NavigationRail'));

const RAIL_KEY = 'gmos.rail.expanded';
const readRail = () => { try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const appearanceCtx = useAppearanceState();
  return (
    <AppearanceContext.Provider value={appearanceCtx}>
      <PageMetaProvider>
        <AppShell>{children}</AppShell>
      </PageMetaProvider>
    </AppearanceContext.Provider>
  );
};

/**
 * One shell for every device. Only the chrome around the page changes:
 *   desktop – Sidebar + TopBar (exactly as before)
 *   tablet  – NavigationRail + TopBar
 *   mobile  – MobileTopBar + BottomTabBar
 * The page element always sits in the same slot, so rotating or resizing across a
 * breakpoint never remounts it (no lost form or cart state).
 */
const AppShell: React.FC<LayoutProps> = ({ children }) => {
  const { device, isPortrait } = useDevice();
  const meta = usePageMetaValue();
  const [collapsed, setCollapsed] = useState(false);
  const [railExpanded, setRailExpanded] = useState(readRail);
  const { pathname } = useLocation();

  // The POS needs the full width: collapse to the icon rail there, restore on the way out
  const onPos = pathname.startsWith('/pos');
  const beforePos = useRef<boolean | null>(null);
  useEffect(() => {
    if (onPos) { beforePos.current = collapsed; setCollapsed(true); }
    else if (beforePos.current !== null) { setCollapsed(beforePos.current); beforePos.current = null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPos]);

  // Tablet portrait floats the expanded rail over the page; landscape pushes the page.
  const railOverlay = device === 'tablet' && isPortrait;
  const railPushes = device === 'tablet' && railExpanded && !railOverlay && !onPos;

  const toggleRail = () => setRailExpanded((v) => {
    const next = !v;
    if (!railOverlay) { try { localStorage.setItem(RAIL_KEY, next ? '1' : '0'); } catch { /* private mode */ } }
    return next;
  });

  // Keep a CSS var in sync so topbar (position: fixed) can use it
  useEffect(() => {
    const width = device === 'mobile' ? '0px'
      : device === 'tablet' ? (railPushes ? 'var(--rail-expanded-w)' : 'var(--rail-w)')
      : collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';
    document.documentElement.style.setProperty('--sidebar-current-width', width);
  }, [collapsed, device, railPushes]);

  useScrollRestoration(device !== 'desktop');

  const shellClass = device === 'desktop' ? '' : ` is-${device}${meta.hideTabBar ? ' no-tabbar' : ''}`;

  return (
    <div className={`app-layout${shellClass}`}>
      {device === 'desktop' && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />}
      {device === 'tablet' && (
        <Suspense fallback={<div className="rail rail-placeholder" />}>
          <NavigationRail expanded={railExpanded && !onPos} onToggle={toggleRail} overlay={railOverlay} />
        </Suspense>
      )}
      {device === 'mobile' && (
        <Suspense fallback={<div className="m-topbar" />}><MobileTopBar /></Suspense>
      )}
      <div className={`main-content${device === 'desktop' && collapsed ? ' main-content-collapsed' : ''}`}>
        {device !== 'mobile' && <TopBar />}
        {children}
      </div>
      {device === 'mobile' && !meta.hideTabBar && (
        <Suspense fallback={<div className="m-tabbar" />}><BottomTabBar /></Suspense>
      )}
    </div>
  );
};

/**
 * Touch layouts behave like an app: a new page starts at the top, and going back
 * restores where you were on the previous page.
 */
function useScrollRestoration(enabled: boolean) {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const last = useRef(pathname);

  useEffect(() => {
    if (!enabled) return;
    const prev = 'scrollRestoration' in history ? history.scrollRestoration : null;
    if (prev) history.scrollRestoration = 'manual';
    return () => { if (prev) history.scrollRestoration = prev; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || last.current === pathname) return;
    positions.current.set(last.current, window.scrollY);
    last.current = pathname;
    const target = navType === 'POP' ? positions.current.get(pathname) ?? 0 : 0;
    const id = requestAnimationFrame(() => window.scrollTo(0, target));
    return () => cancelAnimationFrame(id);
  }, [enabled, pathname, navType]);
}

export default Layout;
