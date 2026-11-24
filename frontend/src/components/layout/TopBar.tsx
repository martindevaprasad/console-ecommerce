import React, { useEffect, useRef, useState } from 'react';
import { useLocation as useRouterLocation } from 'react-router-dom';
import {
  IconMapPin, IconClock, IconUserCircle, IconLogout, IconSwitchHorizontal, IconKey, IconCash, IconChevronDown,
} from '@tabler/icons-react';
import { NAV } from '@/lib/nav';
import { time } from '@/lib/format';
import { useAccount } from './useAccount';
import { useDevice } from '../adaptive/device';

/** Desktop and tablet top bar. Account/session logic lives in useAccount (shared with the mobile shell). */
export const TopBar: React.FC = () => {
  const routerLocation = useRouterLocation();
  const acct = useAccount();
  const { user, locations, current, timeclock, clock, cashMgmt, shift } = acct;

  const page = NAV.find((n) => routerLocation.pathname.startsWith(n.path));
  // Tablets hide button labels in portrait (adaptive.css), which needs a wrapper; desktop keeps the
  // original bare text so its rendering stays byte-for-byte the same.
  const { isTablet } = useDevice();
  const btnText = (text: string) => (isTablet ? <span className="topbar-btn-text">{text}</span> : text);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <div className="topbar-title">{page?.label || 'GMOS'}</div>
          {page?.subtitle && <div className="topbar-sub">{page.subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">
        {locations.length > 1 ? (
          <div className="row" style={{ gap: 4 }}>
            <IconMapPin size={14} className="muted" />
            <select
              className="form-select topbar-select"
              value={current?.id || ''}
              onChange={(e) => acct.selectLocation(e.target.value)}
            >
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        ) : current && (
          <div className="topbar-location"><IconMapPin size={13} /> {current.name}</div>
        )}

        {cashMgmt && (
          <button className="topbar-location" style={{ cursor: 'pointer' }} onClick={acct.openCash} title="Cash drawer">
            <span className={`dot ${shift?.currentShift ? 'success' : 'warning'}`} />
            <IconCash size={13} /> {btnText(shift?.currentShift ? 'Drawer open' : 'No drawer')}
          </button>
        )}

        {timeclock && (
          <button className={`btn btn-sm ${clock?.myTimeEntry ? 'btn-success' : 'btn-secondary'}`} onClick={acct.toggleClock}>
            <IconClock size={13} />
            {btnText(clock?.myTimeEntry ? `On clock · ${time(clock.myTimeEntry.clockIn)}` : 'Clock in')}
          </button>
        )}

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button className="topbar-location" style={{ cursor: 'pointer' }} onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
            <IconUserCircle size={14} /> {user?.name?.split(' ')[0]} <IconChevronDown size={12} />
          </button>
          {menuOpen && (
            <div className="user-menu" role="menu">
              {acct.canSwitchUser && (
                <button role="menuitem" onClick={() => { setMenuOpen(false); acct.openSwitchUser(); }}><IconSwitchHorizontal size={14} /> Switch user (PIN)</button>
              )}
              <button role="menuitem" onClick={() => { setMenuOpen(false); acct.openSetPin(); }}><IconKey size={14} /> Set my PIN</button>
              <div className="divider" style={{ margin: '4px 0' }} />
              <button role="menuitem" onClick={acct.signOut}><IconLogout size={14} /> Sign out</button>
            </div>
          )}
        </div>
      </div>

      {acct.pinModal}
    </header>
  );
};

export default TopBar;
