import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, useCan, useOrg } from '@/hooks';
import { IconMenu2 } from '@tabler/icons-react';
import { MageWordmark } from './AppSvgs';
import { visibleNav } from '@/lib/nav';
import { ROLE_LABELS } from '@/lib/constants';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SECTIONS = ['Operate', 'Catalog', 'People', 'Insights', 'Admin'] as const;

/** Business format shown under the workspace name. */
const ORG_TYPE_LABEL: Record<string, string> = {
  RESTAURANT: 'Restaurant', BAKERY: 'Bakery', CAFE: 'Cafe', QUICK_SERVICE: 'Quick service', FINE_DINING: 'Fine dining',
  CASUAL_DINING: 'Casual dining', BAR_PUB: 'Bar & pub', FOOD_TRUCK: 'Food truck', CLOUD_KITCHEN: 'Cloud kitchen',
  FOOD_COURT: 'Food court', CATERING: 'Catering', HOTEL_RESTAURANT: 'Hotel restaurant',
};

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const { org, settings } = useOrg();
  const can = useCan();
  const items = visibleNav(can, settings?.modules);

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const orgInitials = (org?.name || 'GMOS').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const orgSub = [org?.type ? (ORG_TYPE_LABEL[org.type] || org.type.toLowerCase().replace(/_/g, ' ')) : null, org?.plan ? `${org.plan.charAt(0)}${org.plan.slice(1).toLowerCase()} plan` : null].filter(Boolean).join(' · ');

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Windows 11 / Teams navigation pane header: hamburger + app name, then the workspace */}
      <div className="sidebar-head">
        <button className="sidebar-hamburger" onClick={onToggle} title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed}>
          <IconMenu2 size={18} stroke={1.75} />
        </button>
        {!collapsed && <MageWordmark height={17} className="brand-wordmark sidebar-brand" />}
      </div>
      <div className="sidebar-org" title={collapsed ? org?.name : undefined}>
        <div className="sidebar-org-tile" aria-hidden="true">{orgInitials}</div>
        {!collapsed && (
          <div className="sidebar-org-info">
            <div className="sidebar-org-name truncate">{org?.name || 'Enterprise POS'}</div>
            <div className="sidebar-org-sub truncate">{orgSub}</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((section) => {
          const list = items.filter((i) => i.section === section);
          if (!list.length) return null;
          return (
            <div className="sidebar-section" key={section}>
              {!collapsed && <div className="sidebar-section-label">{section}</div>}
              {list.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={`sidebar-item-icon fi fi-solid fi-${item.tone}`}>{item.icon}</span>
                  {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" title={user?.name}>
          <div className="sidebar-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[user?.role || 'STAFF'] || user?.role} · {org?.plan?.toLowerCase()}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
