import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconDots, IconChevronRight } from '@tabler/icons-react';
import { useCan, useOrg } from '@/hooks';
import { NavItem, TAB_PRIORITY, shortLabel, visibleNav } from '@/lib/nav';
import { BottomSheet } from '../adaptive/BottomSheet';

const SECTIONS = ['Operate', 'Catalog', 'People', 'Insights', 'Admin'] as const;
const MAX_TABS = 5; // including "More" when it is needed

/** Splits the pages this user can see into bottom tabs and the "More" sheet. */
export function useTabSplit() {
  const can = useCan();
  const { settings } = useOrg();
  const items = visibleNav(can, settings?.modules);
  if (items.length <= MAX_TABS) return { tabs: items, more: [] as NavItem[] };
  const ranked = [...items].sort((a, b) => rank(a) - rank(b));
  const tabs = ranked.slice(0, MAX_TABS - 1);
  return { tabs, more: items.filter((i) => !tabs.includes(i)) };
}
const rank = (n: NavItem) => { const i = TAB_PRIORITY.indexOf(n.path); return i === -1 ? 99 : i; };

export interface BottomTabBarProps {
  /** Optional badges keyed by path, e.g. { '/orders': 3 } */
  badges?: Record<string, number | undefined>;
}

/** Native-style bottom tab bar: up to 4 pages + "More". Uses nav + aria-current. */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ badges }) => {
  const { pathname } = useLocation();
  const { tabs, more } = useTabSplit();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some((m) => pathname.startsWith(m.path));

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  return (
    <>
      <nav className="m-tabbar" aria-label="Main">
        {tabs.map((t) => (
          <NavLink key={t.path} to={t.path} className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}>
            <span className="m-tab-icon">{t.icon}{!!badges?.[t.path] && <span className="m-badge">{badges[t.path]}</span>}</span>
            <span className="m-tab-label">{shortLabel(t)}</span>
          </NavLink>
        ))}
        {more.length > 0 && (
          <button type="button" className={`m-tab${moreActive ? ' active' : ''}`} onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog" aria-expanded={moreOpen} aria-current={moreActive ? 'page' : undefined}>
            <span className="m-tab-icon"><IconDots size={24} /></span>
            <span className="m-tab-label">More</span>
          </button>
        )}
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={more} />
    </>
  );
};

/** Sheet listing the pages that don't fit in the tab bar, grouped like the desktop sidebar. */
export const MoreSheet: React.FC<{ open: boolean; onClose: () => void; items: NavItem[] }> = ({ open, onClose, items }) => (
  <BottomSheet open={open} onClose={onClose} title="More" snapPoints={[0.6, 0.92]}>
    {SECTIONS.map((section) => {
      const list = items.filter((i) => i.section === section);
      if (!list.length) return null;
      return (
        <div className="list-group" key={section}>
          <div className="list-group-label">{section}</div>
          <div className="list-group-body">
            {list.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `list-row${isActive ? ' active' : ''}`} onClick={onClose}>
                <span className="list-row-icon">{item.icon}</span>
                <span className="list-row-text"><b>{item.label}</b><small>{item.subtitle}</small></span>
                <IconChevronRight size={18} className="list-row-chevron" />
              </NavLink>
            ))}
          </div>
        </div>
      );
    })}
  </BottomSheet>
);

export default BottomTabBar;
