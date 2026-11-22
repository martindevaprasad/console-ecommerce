import React from 'react';
import type { IconTone } from '@/components/layout/FluentIconDefs';
// Solid icons in the sidebar (Windows 11 style); colour comes from the gradient tone.
import {
  IconLayoutDashboardFilled, IconDeviceDesktopFilled, IconClipboardListFilled, IconLayoutGridFilled, IconCalendarEventFilled,
  IconChefHatFilled, IconCashBanknoteFilled, IconToolsKitchen2Filled, IconRosetteDiscountFilled, IconArchiveFilled,
  IconMoodSmileFilled, IconUserFilled, IconChartPieFilled, IconMapPinFilled, IconSettingsFilled,
} from '@tabler/icons-react';

export interface NavItem {
  path: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  /** Gradient colour of the icon (Windows 11 style). */
  tone: IconTone;
  section: 'Operate' | 'Catalog' | 'People' | 'Insights' | 'Admin';
  perms?: string[];
  module?: string;
}

export const NAV: NavItem[] = [
  { path: '/dashboard', tone: 'blue', label: 'Dashboard', subtitle: 'Live operations & sales', icon: <IconLayoutDashboardFilled size={17} />, section: 'Operate', perms: ['reports.view', 'pos.access'] },
  { path: '/pos', tone: 'purple', label: 'POS Terminal', subtitle: 'Take orders & payments', icon: <IconDeviceDesktopFilled size={17} />, section: 'Operate', perms: ['pos.access'] },
  { path: '/orders', tone: 'orange', label: 'Orders', subtitle: 'Checks, refunds & history', icon: <IconClipboardListFilled size={17} />, section: 'Operate', perms: ['orders.view'] },
  { path: '/tables', tone: 'teal', label: 'Floor & Tables', subtitle: 'Live floor plan & seating', icon: <IconLayoutGridFilled size={17} />, section: 'Operate', perms: ['tables.manage'], module: 'tables' },
  { path: '/reservations', tone: 'pink', label: 'Reservations', subtitle: 'Bookings & waitlist', icon: <IconCalendarEventFilled size={17} />, section: 'Operate', perms: ['reservations.manage'], module: 'reservations' },
  { path: '/kds', tone: 'red', label: 'Kitchen Display', subtitle: 'Station tickets & bump', icon: <IconChefHatFilled size={17} />, section: 'Operate', perms: ['kds.access'], module: 'kds' },
  { path: '/cash', tone: 'green', label: 'Cash & Shifts', subtitle: 'Drawer, pay-ins/outs, Z report', icon: <IconCashBanknoteFilled size={17} />, section: 'Operate', perms: ['cash.manage'], module: 'cashManagement' },
  { path: '/menu', tone: 'gold', label: 'Menu', subtitle: 'Items, modifiers & taxes', icon: <IconToolsKitchen2Filled size={17} />, section: 'Catalog', perms: ['menu.view'] },
  { path: '/promotions', tone: 'pink', label: 'Promotions', subtitle: 'Discounts & happy hours', icon: <IconRosetteDiscountFilled size={17} />, section: 'Catalog', perms: ['promotions.manage'], module: 'promotions' },
  { path: '/inventory', tone: 'teal', label: 'Inventory', subtitle: 'Stock, recipes & purchasing', icon: <IconArchiveFilled size={17} />, section: 'Catalog', perms: ['inventory.view'], module: 'inventory' },
  { path: '/customers', tone: 'blue', label: 'Customers', subtitle: 'Guests & loyalty', icon: <IconMoodSmileFilled size={17} />, section: 'People', perms: ['customers.view'], module: 'customers' },
  { path: '/staff', tone: 'purple', label: 'Staff', subtitle: 'Team, roles & time clock', icon: <IconUserFilled size={17} />, section: 'People', perms: ['staff.view'] },
  { path: '/reports', tone: 'green', label: 'Reports', subtitle: 'Sales analytics', icon: <IconChartPieFilled size={17} />, section: 'Insights', perms: ['reports.view'] },
  { path: '/locations', tone: 'orange', label: 'Locations', subtitle: 'Outlets, stations & devices', icon: <IconMapPinFilled size={17} />, section: 'Admin', perms: ['locations.manage'] },
  { path: '/settings', tone: 'slate', label: 'Settings', subtitle: 'Business configuration', icon: <IconSettingsFilled size={17} />, section: 'Admin' },
];

export function visibleNav(can: (...p: string[]) => boolean, modules: Record<string, boolean> | undefined) {
  return NAV.filter((n) => (!n.perms || can(...n.perms)) && (!n.module || !!modules?.[n.module]));
}
