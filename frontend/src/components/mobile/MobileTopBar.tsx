import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconChevronLeft, IconMapPin, IconClock, IconCash, IconSwitchHorizontal, IconKey, IconLogout,
} from '@tabler/icons-react';
import { NAV } from '@/lib/nav';
import { time } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/constants';
import { MageMark } from '../layout/AppSvgs';
import { useAccount } from '../layout/useAccount';
import { usePageMetaValue } from '../adaptive/pageMeta';
import { ActionSheet, SheetAction } from '../adaptive/BottomSheet';

/** Pages without their own large PageHeader title: their compact title is always visible. */
const NO_LARGE_TITLE = ['/pos', '/kds'];

/**
 * Phone top bar. The page's own PageHeader acts as the iOS-style large title; this bar
 * shows the compact title once that scrolls away. Right side: page actions + account.
 */
export const MobileTopBar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = usePageMetaValue();
  const acct = useAccount();
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const page = NAV.find((n) => pathname.startsWith(n.path));
  const title = meta.title || page?.label || 'GMOS';
  const largeTitle = meta.largeTitle ?? !NO_LARGE_TITLE.some((p) => pathname.startsWith(p));
  const showTitle = !largeTitle || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const groups: { label?: string; actions: SheetAction[] }[] = [];
  if (acct.locations.length > 1) {
    groups.push({
      label: 'Location',
      actions: acct.locations.map((l) => ({
        key: l.id, label: l.name, icon: <IconMapPin size={20} />, checked: l.id === acct.current?.id,
        onSelect: () => acct.selectLocation(l.id),
      })),
    });
  }
  const shiftActions: SheetAction[] = [];
  if (acct.timeclock) {
    shiftActions.push({
      key: 'clock', icon: <IconClock size={20} />,
      label: acct.clock?.myTimeEntry ? 'Clock out' : 'Clock in',
      hint: acct.clock?.myTimeEntry ? `On the clock since ${time(acct.clock.myTimeEntry.clockIn)}` : undefined,
      onSelect: acct.toggleClock,
    });
  }
  if (acct.cashMgmt) {
    shiftActions.push({
      key: 'cash', icon: <IconCash size={20} />, label: 'Cash drawer',
      hint: acct.shift?.currentShift ? 'Drawer open' : 'No drawer open',
      onSelect: acct.openCash,
    });
  }
  if (shiftActions.length) groups.push({ label: 'Shift', actions: shiftActions });
  groups.push({
    label: 'Account',
    actions: [
      ...(acct.canSwitchUser ? [{ key: 'switch', icon: <IconSwitchHorizontal size={20} />, label: 'Switch user (PIN)', onSelect: acct.openSwitchUser }] : []),
      { key: 'pin', icon: <IconKey size={20} />, label: 'Set my PIN', onSelect: acct.openSetPin },
      { key: 'out', icon: <IconLogout size={20} />, label: 'Sign out', destructive: true, onSelect: acct.signOut },
    ],
  });

  const goBack = () => (meta.back === -1 ? navigate(-1) : meta.back && navigate(meta.back));

  return (
    <header className={`m-topbar${scrolled ? ' scrolled' : ''}`}>
      <div className="m-topbar-row">
        <div className="m-topbar-lead">
          {meta.back !== undefined ? (
            <button type="button" className="m-icon-btn m-back" onClick={goBack} aria-label="Back"><IconChevronLeft size={26} /></button>
          ) : (
            <span className="m-topbar-mark" aria-hidden><MageMark size={28} /></span>
          )}
        </div>
        {/* Not an <h1>: the page's PageHeader is the heading; this is the compact echo of it */}
        <div className={`m-topbar-title${showTitle ? ' show' : ''}`} aria-hidden={largeTitle && !showTitle}>{title}</div>
        <div className="m-topbar-actions">
          {meta.actions}
          {acct.cashMgmt && (
            <span className={`m-status-dot ${acct.shift?.currentShift ? 'success' : 'warning'}`}
              title={acct.shift?.currentShift ? 'Drawer open' : 'No drawer'} aria-hidden />
          )}
          <button type="button" className="m-avatar-btn" onClick={() => setAccountOpen(true)} aria-label="Account and shift" aria-haspopup="dialog">
            <span className="m-avatar">{acct.initials}</span>
          </button>
        </div>
      </div>

      <ActionSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        header={
          <div className="as-account">
            <span className="m-avatar lg">{acct.initials}</span>
            <div>
              <div className="as-account-name">{acct.user?.name || 'User'}</div>
              <div className="as-account-sub">
                {ROLE_LABELS[acct.user?.role || 'STAFF'] || acct.user?.role}
                {acct.org?.name ? ` · ${acct.org.name}` : ''}
                {acct.current && acct.locations.length <= 1 ? ` · ${acct.current.name}` : ''}
              </div>
            </div>
          </div>
        }
        groups={groups}
      />
      {acct.pinModal}
    </header>
  );
};

export default MobileTopBar;
