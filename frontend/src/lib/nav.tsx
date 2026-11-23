import React from 'react';
import {
  IconDashboard, IconDeviceDesktop, IconClipboardList, IconLayoutGrid, IconCalendarEvent, IconChefHat,
  IconCash, IconToolsKitchen2, IconDiscount2, IconArchive, IconUsersGroup, IconUsers, IconChartBar,
  IconBuildingStore, IconSettings,
} from '@tabler/icons-react';

export interface NavItem {
  path: string;
  label: string;
  /** Short label for the mobile tab bar / tablet rail */
  short?: string;
  subtitle: string;
  icon: React.ReactNode;
  section: 'Operate' | 'Catalog' | 'People' | 'Insights' | 'Admin';
  perms?: string[];
  module?: string;
}

export const NAV: NavItem[] = [
  { path: '/dashboard', short: 'Home', label: 'Dashboard', subtitle: 'Live operations & sales', icon: <IconDashboard size={16} />, section: 'Operate', perms: ['reports.view', 'pos.access'] },
  { path: '/pos', short: 'POS', label: 'POS Terminal', subtitle: 'Take orders & payments', icon: <IconDeviceDesktop size={16} />, section: 'Operate', perms: ['pos.access'] },
  { path: '/orders', label: 'Orders', subtitle: 'Checks, refunds & history', icon: <IconClipboardList size={16} />, section: 'Operate', perms: ['orders.view'] },
  { path: '/tables', short: 'Tables', label: 'Floor & Tables', subtitle: 'Live floor plan & seating', icon: <IconLayoutGrid size={16} />, section: 'Operate', perms: ['tables.manage'], module: 'tables' },
  { path: '/reservations', short: 'Bookings', label: 'Reservations', subtitle: 'Bookings & waitlist', icon: <IconCalendarEvent size={16} />, section: 'Operate', perms: ['reservations.manage'], module: 'reservations' },
  { path: '/kds', short: 'Kitchen', label: 'Kitchen Display', subtitle: 'Station tickets & bump', icon: <IconChefHat size={16} />, section: 'Operate', perms: ['kds.access'], module: 'kds' },
  { path: '/cash', short: 'Cash', label: 'Cash & Shifts', subtitle: 'Drawer, pay-ins/outs, Z report', icon: <IconCash size={16} />, section: 'Operate', perms: ['cash.manage'], module: 'cashManagement' },
  { path: '/menu', label: 'Menu', subtitle: 'Items, modifiers & taxes', icon: <IconToolsKitchen2 size={16} />, section: 'Catalog', perms: ['menu.view'] },
  { path: '/promotions', label: 'Promotions', subtitle: 'Discounts & happy hours', icon: <IconDiscount2 size={16} />, section: 'Catalog', perms: ['promotions.manage'], module: 'promotions' },
  { path: '/inventory', label: 'Inventory', subtitle: 'Stock, recipes & purchasing', icon: <IconArchive size={16} />, section: 'Catalog', perms: ['inventory.view'], module: 'inventory' },
  { path: '/customers', short: 'Guests', label: 'Customers', subtitle: 'Guests & loyalty', icon: <IconUsersGroup size={16} />, section: 'People', perms: ['customers.view'], module: 'customers' },
  { path: '/staff', label: 'Staff', subtitle: 'Team, roles & time clock', icon: <IconUsers size={16} />, section: 'People', perms: ['staff.view'] },
  { path: '/reports', label: 'Reports', subtitle: 'Sales analytics', icon: <IconChartBar size={16} />, section: 'Insights', perms: ['reports.view'] },
  { path: '/locations', label: 'Locations', subtitle: 'Outlets, stations & devices', icon: <IconBuildingStore size={16} />, section: 'Admin', perms: ['locations.manage'] },
  { path: '/settings', label: 'Settings', subtitle: 'Business configuration', icon: <IconSettings size={16} />, section: 'Admin' },
];

export function visibleNav(can: (...p: string[]) => boolean, modules: Record<string, boolean> | undefined) {
  return NAV.filter((n) => (!n.perms || can(...n.perms)) && (!n.module || !!modules?.[n.module]));
}

/**
 * Order in which pages claim the four bottom-tab slots on phones (after permission/module
 * filtering). Everything else lives under "More".
 */
export const TAB_PRIORITY = ['/dashboard', '/pos', '/orders', '/tables', '/kds', '/reservations', '/menu', '/cash'];

export const shortLabel = (n: NavItem) => n.short || n.label;
