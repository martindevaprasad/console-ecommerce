import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth, useAppDispatch, useLocation, useModule, useOrg, useApi, useMutate } from '@/hooks';
import { setCurrentLocation } from '@/store/locationSlice';
import { logout } from '@/store/authSlice';
import { clearOrganization } from '@/store/organizationSlice';
import { AUTH, CASH, STAFF } from '@/services/api';
import { useSessionLoader } from '@/hooks/useSession';
import Modal from '../shared/Modal';
import { PinPad } from '../shared/ui';

/**
 * Account / session actions shared by the desktop TopBar and the mobile account sheet:
 * location switch, time clock, cash drawer status, PIN switch-user / set-PIN, sign out.
 * Behaviour (API calls, toasts, navigation) is exactly what TopBar did before it was extracted.
 */
export function useAccount() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { org, settings } = useOrg();
  const { list: locations, current } = useLocation();
  const mutate = useMutate();
  const loadSession = useSessionLoader();
  const timeclock = useModule('timeclock');
  const cashMgmt = useModule('cashManagement');

  const [pinMode, setPinMode] = useState<null | 'switch' | 'set'>(null);
  const [pin, setPin] = useState('');

  const { data: clock, reload: reloadClock } = useApi(STAFF.MY_TIME, {}, { skip: !timeclock });
  const { data: shift } = useApi(CASH.CURRENT, { locationId: current?.id }, { skip: !cashMgmt || !current, pollMs: 60000 });

  const selectLocation = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    if (loc) dispatch(setCurrentLocation(loc));
  };

  const toggleClock = async () => {
    try {
      if (clock?.myTimeEntry) {
        await mutate(STAFF.CLOCK_OUT, {});
        toast.success('Clocked out');
      } else {
        await mutate(STAFF.CLOCK_IN, { locationId: current?.id });
        toast.success('Clocked in');
      }
      reloadClock(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const closePin = () => { setPinMode(null); setPin(''); };

  const submitPin = async () => {
    if (pin.length < 4) return;
    try {
      if (pinMode === 'switch') {
        const res = await mutate(AUTH.SWITCH_USER, { pin });
        await loadSession(res.switchUser.token);
        toast.success(`Switched to ${res.switchUser.user.name}`);
      } else {
        await mutate(AUTH.SET_PIN, { pin });
        toast.success('PIN updated');
      }
      setPinMode(null);
      setPin('');
    } catch (e: any) { toast.error(e.message); setPin(''); }
  };

  const signOut = () => {
    dispatch(logout());
    dispatch(clearOrganization());
    navigate('/login');
  };

  const pinModal = (
    <Modal isOpen={!!pinMode} onClose={closePin} title={pinMode === 'switch' ? 'Switch user' : 'Set your POS PIN'}
      footer={<>
        <button className="btn btn-secondary" onClick={closePin}>Cancel</button>
        <button className="btn btn-primary" disabled={pin.length < 4} onClick={submitPin}>{pinMode === 'switch' ? 'Switch' : 'Save PIN'}</button>
      </>}
    >
      <p className="small muted" style={{ textAlign: 'center' }}>{pinMode === 'switch' ? 'Enter your 4–6 digit PIN' : 'Choose a 4–6 digit PIN for fast sign-in and approvals'}</p>
      <PinPad value={pin} onChange={setPin} onSubmit={submitPin} />
    </Modal>
  );

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return {
    user, org, settings, initials,
    locations, current, selectLocation,
    timeclock, clock, toggleClock,
    cashMgmt, shift, openCash: () => navigate('/cash'),
    canSwitchUser: !!settings?.security?.pinSwitchUser,
    openSwitchUser: () => setPinMode('switch'),
    openSetPin: () => setPinMode('set'),
    signOut,
    /** Render once wherever the account actions are used */
    pinModal: pinModal as React.ReactElement,
  };
}
