import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

/**
 * Device classes used across the adaptive UI.
 *   mobile  < 768px wide, or a phone in landscape (< 500px tall)
 *   tablet  768–1279px
 *   desktop ≥ 1280px (unchanged UI)
 * Device-specific CSS keys off html[data-device], which DeviceProvider sets
 * before first paint, so CSS and JS always agree.
 */
export type Device = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  device: Device;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Mobile or tablet: anything that gets the native-style shell. */
  isTouchLayout: boolean;
  isPortrait: boolean;
}

export const MQ = {
  // A phone turned sideways (e.g. 844×390) keeps the phone UI instead of jumping to the tablet rail.
  mobile: '(max-width: 767.98px), (max-height: 499.98px) and (max-width: 1279.98px)',
  tablet: '(max-width: 1279.98px)', // checked after mobile
  portrait: '(orientation: portrait)',
} as const;

const DESKTOP: DeviceInfo = { device: 'desktop', isMobile: false, isTablet: false, isDesktop: true, isTouchLayout: false, isPortrait: false };

function describe(device: Device, isPortrait: boolean): DeviceInfo {
  return {
    device,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isTouchLayout: device !== 'desktop',
    isPortrait,
  };
}

function read(): DeviceInfo {
  if (typeof window === 'undefined' || !window.matchMedia) return DESKTOP;
  const device: Device = window.matchMedia(MQ.mobile).matches ? 'mobile' : window.matchMedia(MQ.tablet).matches ? 'tablet' : 'desktop';
  return describe(device, window.matchMedia(MQ.portrait).matches);
}

/**
 * Current device class, driven by matchMedia listeners (no resize polling).
 *
 * This app is a client-rendered SPA (no SSR / hydration), so the first value is
 * read synchronously from matchMedia: phones get the mobile shell on the very
 * first paint instead of flashing the desktop layout. Without `window` (tests,
 * a future SSR build) it falls back to 'desktop'.
 */
export function useBreakpoint(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(read);

  useEffect(() => {
    if (!window.matchMedia) return;
    const lists = [MQ.mobile, MQ.tablet, MQ.portrait].map((q) => window.matchMedia(q));
    const update = () => setInfo((prev) => {
      const next = read();
      return prev.device === next.device && prev.isPortrait === next.isPortrait ? prev : next;
    });
    update();
    lists.forEach((l) => l.addEventListener('change', update));
    return () => lists.forEach((l) => l.removeEventListener('change', update));
  }, []);

  return info;
}

const DeviceContext = createContext<DeviceInfo>(DESKTOP);

/** Provides the current device class to the whole tree; read it with useDevice(). */
export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const info = useBreakpoint();
  // html[data-device] / [data-orientation] drive the device-specific CSS (adaptive.css).
  // Layout effect = set before the browser paints, so there is no flash of the wrong layout.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.device = info.device;
    root.dataset.orientation = info.isPortrait ? 'portrait' : 'landscape';
  }, [info.device, info.isPortrait]);
  return <DeviceContext.Provider value={info}>{children}</DeviceContext.Provider>;
};

/**
 * Reads the device class. Prefer CSS media queries for show/hide and layout;
 * use this only when the component tree itself has to differ (e.g. sheet vs popover).
 */
export const useDevice = () => useContext(DeviceContext);
