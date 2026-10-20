import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AppearanceContext, useAppearanceState } from '@/hooks/useAppearance';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const appearanceCtx = useAppearanceState();
  const { pathname } = useLocation();

  // The POS needs the full width: collapse to the icon rail there, restore on the way out
  const onPos = pathname.startsWith('/pos');
  const beforePos = useRef<boolean | null>(null);
  useEffect(() => {
    if (onPos) { beforePos.current = collapsed; setCollapsed(true); }
    else if (beforePos.current !== null) { setCollapsed(beforePos.current); beforePos.current = null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPos]);

  // Keep a CSS var in sync so topbar (position: fixed) can use it
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-current-width',
      collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
    );
  }, [collapsed]);

  return (
    <AppearanceContext.Provider value={appearanceCtx}>
      <div className="app-layout">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className={`main-content${collapsed ? ' main-content-collapsed' : ''}`}>
          <TopBar />
          {children}
        </div>
      </div>
    </AppearanceContext.Provider>
  );
};

export default Layout;
