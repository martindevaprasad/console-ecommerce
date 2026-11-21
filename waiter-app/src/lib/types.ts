export type TableStatus = 'AVAILABLE' | 'SEATED' | 'ORDERING' | 'WAITING_FOR_FOOD' | 'READY_FOR_PAYMENT' | 'NEEDS_CLEANING';
export type ItemStatus = 'PENDING' | 'FIRED' | 'PREPARING' | 'READY' | 'SERVED' | 'VOIDED';

export interface StaffUser { id: string; name: string; role: string; avatarUrl?: string | null }

export interface Capabilities {
  tables: boolean;
  menu: boolean;
  takeaway: boolean;
  payments: boolean;
  paymentMethods: string[];
  discounts: boolean;
  split: boolean;
  voids: boolean;
  voidNeedsManager: boolean;
  transfer: boolean;
  transferNeedsManager: boolean;
  reservations: boolean;
  timeclock: boolean;
  requireClockIn: boolean;
  fireOnSubmit: boolean;
  showImages: boolean;
  autoLockMinutes: number;
  courses: boolean;
  seats: boolean;
  tipping: boolean;
  tipPresets: number[];
  requireGuestCount: boolean;
  allTables: boolean;
}

export interface HandheldConfig {
  organization: { id: string; name: string; type: string; logoUrl?: string | null; currency: string; locale: string; timezone: string; taxInclusive: boolean };
  location: { id: string; name: string; city?: string | null } | null;
  device: { id: string; name: string } | null;
  user: StaffUser;
  clockedInAt: string | null;
  serviceModel: string;
  orderTypes: string[];
  taxLabel: string;
  capabilities: Capabilities;
  permissions: string[];
}

export interface Modifier { id: string; name: string; price: number; isDefault: boolean; isActive: boolean }
export interface ModifierGroup { id: string; name: string; minSelect: number; maxSelect: number; isActive: boolean; modifiers: Modifier[] }

export interface Category { id: string; name: string; color?: string | null; icon?: string | null; sortOrder: number }

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  color?: string | null;
  isOpenPrice: boolean;
  trackStock: boolean;
  dietary: string[];
  categoryId?: string | null;
  prepMinutes?: number | null;
  priceOverrides: Record<string, number>;
  inventory: { quantity: number; locationId: string }[];
  modifierGroups: ModifierGroup[];
}

export interface OrderItem {
  id: string;
  name: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  modifiers: { id: string; name: string; price: number; group?: string }[] | null;
  notes: string | null;
  seat: number | null;
  course: number;
  status: ItemStatus;
  voidReason: string | null;
  productId: string;
  createdAt: string;
}

export interface Payment { id: string; type: 'SALE' | 'REFUND'; method: string; amount: number; tip: number; change: number | null; createdAt: string }

export interface Order {
  id: string;
  orderNumber: string;
  ticketNumber: number | null;
  status: string;
  paymentStatus: string;
  orderType: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountReason: string | null;
  serviceCharge: number;
  tipAmount: number;
  roundingAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  guestCount: number | null;
  notes: string | null;
  tableId: string | null;
  tableSessionId: string | null;
  createdAt: string;
  table: { id: string; name: string } | null;
  items: OrderItem[];
  payments: Payment[];
}

export interface FloorTable {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  status: TableStatus;
  activeSession: {
    id: string;
    guestCount: number;
    startTime: string;
    serverUserId: string | null;
    server: { id: string; name: string } | null;
    readyItemCount: number;
  } | null;
}

export interface Zone { id: string; name: string; tables: FloorTable[] }

/** A line in the waiter's not-yet-submitted cart. */
export interface CartLine {
  key: string;
  product: Product;
  quantity: number;
  modifiers: Modifier[];
  notes: string;
  seat: number | null;
  course: number;
  priceOverride?: number;
}
