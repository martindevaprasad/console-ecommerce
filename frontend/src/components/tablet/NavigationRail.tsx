import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconLayoutSidebarLeftExpand, IconLayoutSidebarLeftCollapse } from '@tabler/icons-react';
import { useAuth, useCan, useOrg } from '@/hooks';
import { shortLabel, visibleNav } from '@/lib/nav';
import { ROLE_LABELS } from '@/lib/constants';
import { MageMark, MageWordmark } from '../layout/AppSvgs';

const SECTIONS = ['Operate', 'Catalog', 'People', 'Insights', 'Admin'] as const;

export interface NavigationRailProps {
  expanded: boolean;
  onToggle: () => void;
  /** Portrait: the expanded rail floats over the content with a scrim instead of pushing it */
  overlay: boolean;
}

/**
 * Tablet navigation: an 84px rail (icon + short label) that expands to a full sidebar.
 * In landscape the expanded rail pushes the content; in portrait it floats over it.
 */
export const NavigationRail: React.FC<NavigationRailProps> = ({ expanded, onToggle, overlay }) => {
  const { user } = useAuth();
  const { org, settings } = useOrg();
  const can = useCan();
  const items = visibleNav(can, settings?.modules);
  const { pathname } = useLocation();
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // A floating (portrait) rail closes once you pick a page.
  useEffect(() => { if (overlay && expanded) onToggle(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  return (
    <>
      {overlay && expanded && <div className="rail-scrim" onClick={onToggle} aria-hidden />}
      <aside className={`rail${expanded ? ' expanded' : ''}${overlay ? ' overlay' : ''}`} aria-label="Main navigation">
        <div className="rail-head">
          {expanded ? (
            <div className="rail-brand">
              <MageWordmark height={28} className="brand-wordmark" />
              <div className="rail-org truncate">{org?.name || 'Enterprise POS'}</div>
            </div>
          ) : <MageMark size={34} />}
          <button type="button" className="rail-toggle" onClick={onToggle} aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded}>
            {expanded ? <IconLayoutSidebarLeftCollapse size={20} /> : <IconLayoutSidebarLeftExpand size={20} />}
          </button>
        </div>

        <nav className="rail-nav">
          {SECTIONS.map((section) => {
            const list = items.filter((i) => i.section === section);
            if (!list.length) return null;
            return (
              <div className="rail-section" key={section}>
                {expanded && <div className="rail-section-label">{section}</div>}
                {list.map((item) => (
                  <NavLink key={item.path} to={item.path} className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
                    aria-label={expanded ? undefined : item.label}>
                    <span className="rail-item-icon">{item.icon}</span>
                    <span className="rail-item-label">{expanded ? item.label : shortLabel(item)}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="rail-foot">
          <span className="m-avatar">{initials}</span>
          {expanded && (
            <div className="rail-user">
              <div className="rail-user-name truncate">{user?.name || 'User'}</div>
              <div className="rail-user-role truncate">{ROLE_LABELS[user?.role || 'STAFF'] || user?.role} · {org?.plan?.toLowerCase()}</div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default NavigationRail;
