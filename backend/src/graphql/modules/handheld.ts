import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import { Ctx, requireAuth, fail, audit, AuthInfo } from '../../lib/context';
import { generateToken } from '../../middleware/auth';
import { ALL_PERMISSIONS, permissionsFor } from '../../lib/permissions';
import { resolveSettings } from '../../lib/templates';

/**
 * Waiter handheld app (React Native, /waiter-app).
 *
 * Lifecycle:
 *   1. A manager pairs the phone once (`pairHandheld`, email + password). That
 *      registers a HANDHELD Device at a location and returns a device key that
 *      the phone keeps in secure storage. The key is stored hashed.
 *   2. Waiters pick their name and enter their PIN (`handheldStaff`,
 *      `handheldLogin`). The token carries the device id, so revoking the device
 *      in POS → Settings → Waiter app signs every waiter on it out at once.
 *   3. `handheldConfig` tells the app which screens and actions to show. The
 *      same switches are enforced server-side for handheld requests.
 */
export const typeDefs = gql`
  type HandheldStaff { id: ID! name: String! role: UserRole! avatarUrl: String }

  type HandheldPairing {
    deviceKey: String!
    device: Device!
    organizationName: String!
    location: Location!
    accentColor: String!
  }

  type Query {
    "Staff who can sign in on this handheld (active, have a PIN and waiter-app access). Public: needs only the device key."
    handheldStaff(deviceKey: String!): [HandheldStaff!]!
    "Business accent colour for the sign-in screen. Public: needs only the device key."
    handheldAccent(deviceKey: String!): String!
    "Everything the waiter app needs to shape itself: business, location, switches and the caller's capabilities."
    handheldConfig: JSON!
    "Paired handhelds, for POS settings."
    handheldDevices: [Device!]!
  }

  type Mutation {
    "Pair this phone/tablet as a waiter handheld. A manager signs in once; staff then use PINs."
    pairHandheld(email: String!, password: String!, deviceName: String!, locationId: ID): HandheldPairing!
    "PIN sign-in on a paired handheld. Pass userId (from handheldStaff) to check only that person's PIN."
    handheldLogin(deviceKey: String!, pin: String!, userId: ID): AuthPayload!
    "Remove this handheld's pairing (from the device itself)."
    unpairHandheld(deviceKey: String!): Boolean!
  }
`;

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

const permsOf = (u: { role: string; customRole?: { permissions: string[] } | null }) =>
  u.role === 'OWNER' ? ALL_PERMISSIONS : permissionsFor(u.role, u.customRole?.permissions);

async function deviceByKey(deviceKey: string) {
  if (!deviceKey) fail('This device is not paired', 'DEVICE_NOT_PAIRED');
  const device = await prisma.device.findFirst({
    where: { identifier: hashKey(deviceKey), type: 'HANDHELD' },
    include: { location: { include: { organization: true } } },
  });
  if (!device || !device.isActive || !device.location.isActive) fail('This device is no longer paired. Ask a manager to pair it again.', 'DEVICE_NOT_PAIRED');
  const settings = resolveSettings(device!.location.organization.settings);
  if (!device!.location.organization.isActive) fail('This business is inactive', 'FORBIDDEN');
  if (!settings.waiterApp.enabled) fail('The waiter app is turned off. Enable it in POS → Settings → Waiter app.', 'WAITER_APP_DISABLED');
  return { device: device!, org: device!.location.organization, settings };
}

/** People eligible to sign in at a location: active, PIN set, waiter-app access, home location matches (or none). */
async function eligibleStaff(orgId: string, locationId: string) {
  const users = await prisma.user.findMany({
    where: {
      organizationId: orgId, isActive: true, pinHash: { not: null }, role: { not: 'CUSTOMER' },
      OR: [{ locationId }, { locationId: null }],
    },
    include: { customRole: true },
    orderBy: { name: 'asc' },
  });
  return users.filter((u) => permsOf(u).includes('handheld.access'));
}

export const resolvers = {
  Query: {
    handheldStaff: async (_: any, { deviceKey }: any) => {
      const { device, org } = await deviceByKey(deviceKey);
      const staff = await eligibleStaff(org.id, device.locationId);
      return staff.map((u) => ({ id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl }));
    },

    handheldAccent: async (_: any, { deviceKey }: any) => (await deviceByKey(deviceKey)).settings.branding.accentColor,

    handheldConfig: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const [org, user, location, device, clock] = await Promise.all([
        prisma.organization.findUnique({ where: { id: auth.orgId } }),
        prisma.user.findUnique({ where: { id: auth.userId } }),
        auth.locationId ? prisma.location.findUnique({ where: { id: auth.locationId } }) : null,
        auth.deviceId ? prisma.device.findUnique({ where: { id: auth.deviceId } }) : null,
        prisma.timeEntry.findFirst({ where: { userId: auth.userId, clockOut: null }, orderBy: { clockIn: 'desc' } }),
      ]);
      const settings = resolveSettings(org!.settings);
      return {
        organization: {
          id: org!.id, name: org!.name, type: org!.type, logoUrl: org!.logoUrl, currency: org!.currency,
          locale: org!.locale, timezone: org!.timezone, taxInclusive: org!.taxInclusive,
        },
        location: location && { id: location.id, name: location.name, city: location.city },
        device: device && { id: device.id, name: device.name },
        user: { id: user!.id, name: user!.name, role: user!.role, avatarUrl: user!.avatarUrl },
        clockedInAt: clock?.clockIn ?? null,
        serviceModel: settings.serviceModel,
        orderTypes: settings.orderTypes,
        taxLabel: settings.taxLabel,
        pos: settings.pos,
        security: settings.security,
        waiterApp: settings.waiterApp,
        accentColor: settings.branding.accentColor,
        capabilities: capabilities(auth, settings),
        permissions: [...auth.permissions],
      };
    },

    handheldDevices: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      if (!auth.permissions.has('settings.manage') && !auth.permissions.has('locations.manage')) fail('Not allowed', 'FORBIDDEN');
      return prisma.device.findMany({
        where: { type: 'HANDHELD', location: { organizationId: auth.orgId } },
        orderBy: [{ isActive: 'desc' }, { lastSeenAt: 'desc' }],
      });
    },
  },

  Mutation: {
    pairHandheld: async (_: any, { email, password, deviceName, locationId }: any) => {
      const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() }, include: { customRole: true } })
        ?? await prisma.user.findUnique({ where: { email }, include: { customRole: true } });
      if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) fail('Invalid credentials', 'UNAUTHENTICATED');
      const perms = permsOf(user!);
      if (!perms.includes('settings.manage') && !perms.includes('locations.manage')) {
        fail('Only a manager or owner can pair a waiter device', 'FORBIDDEN');
      }
      const org = await prisma.organization.findUnique({ where: { id: user!.organizationId } });
      const settings = resolveSettings(org!.settings);
      if (!settings.waiterApp.enabled) fail('The waiter app is turned off. Enable it in POS → Settings → Waiter app.', 'WAITER_APP_DISABLED');

      const location = locationId
        ? await prisma.location.findFirst({ where: { id: locationId, organizationId: org!.id, isActive: true } })
        : (user!.locationId && await prisma.location.findFirst({ where: { id: user!.locationId, isActive: true } }))
          || await prisma.location.findFirst({ where: { organizationId: org!.id, isActive: true }, orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }] });
      if (!location) fail('Location not found', 'NOT_FOUND');

      const deviceKey = `hh_${randomBytes(24).toString('hex')}`;
      const device = await prisma.device.create({
        data: {
          name: String(deviceName || 'Waiter handheld').slice(0, 60),
          type: 'HANDHELD',
          identifier: hashKey(deviceKey),
          locationId: location!.id,
          lastSeenAt: new Date(),
        },
      });
      const actor: AuthInfo = { userId: user!.id, orgId: org!.id, name: user!.name, role: user!.role, permissions: new Set(perms) };
      await audit(actor, 'PAIR_HANDHELD', 'Device', device.id, { name: device.name, location: location!.name });
      return { deviceKey, device, organizationName: org!.name, location, accentColor: settings.branding.accentColor };
    },

    handheldLogin: async (_: any, { deviceKey, pin, userId }: any) => {
      const { device, org } = await deviceByKey(deviceKey);
      if (!/^\d{4,6}$/.test(pin || '')) fail('Enter your 4–6 digit PIN', 'UNAUTHENTICATED');
      const staff = await eligibleStaff(org.id, device.locationId);
      const candidates = userId ? staff.filter((u) => u.id === userId) : staff;
      let user: (typeof staff)[number] | null = null;
      for (const u of candidates) {
        if (u.pinHash && (await bcrypt.compare(pin, u.pinHash))) { user = u; break; }
      }
      if (!user) fail('Wrong PIN', 'UNAUTHENTICATED');
      await Promise.all([
        prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } }),
        prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } }),
      ]);
      const token = generateToken({
        userId: user!.id, organizationId: org.id, role: user!.role,
        locationId: device.locationId, deviceId: device.id,
      });
      await audit({ userId: user!.id, orgId: org.id, name: user!.name, role: user!.role, permissions: new Set() }, 'HANDHELD_LOGIN', 'Device', device.id, { device: device.name });
      return { token, user };
    },

    unpairHandheld: async (_: any, { deviceKey }: any) => {
      const device = await prisma.device.findFirst({ where: { identifier: hashKey(deviceKey || ''), type: 'HANDHELD' } });
      if (!device) return true;
      await prisma.device.update({ where: { id: device.id }, data: { isActive: false } });
      return true;
    },
  },
};

/** What this person may do on the handheld: business switches AND their own permissions. */
function capabilities(auth: AuthInfo, s: ReturnType<typeof resolveSettings>) {
  const w = s.waiterApp;
  const has = (p: string) => auth.permissions.has(p);
  const handheld = !!auth.deviceId;
  const on = (flag: boolean) => (handheld ? w.enabled && flag : true);
  const tables = s.modules.tables && on(w.allowTables) && has('tables.manage');
  const menu = on(w.allowMenu) && has('pos.access');
  return {
    tables,
    menu,
    takeaway: menu && on(w.allowTakeaway) && s.orderTypes.some((t) => t !== 'DINE_IN'),
    payments: on(w.allowPayments) && (handheld ? has('handheld.payments') : has('pos.access')),
    paymentMethods: w.paymentMethods,
    discounts: on(w.allowDiscounts),
    split: on(w.allowSplit),
    voids: on(w.allowVoids),
    voidNeedsManager: s.security.voidRequiresManager && !has('pos.void'),
    transfer: tables && on(w.allowTableTransfer),
    transferNeedsManager: !has('tables.assign'),
    reservations: s.modules.reservations && on(w.allowReservations) && has('reservations.manage'),
    timeclock: s.modules.timeclock,
    requireClockIn: handheld && w.requireClockIn,
    fireOnSubmit: w.fireOnSubmit,
    showImages: w.showImages,
    autoLockMinutes: w.autoLockMinutes,
    courses: s.pos.courses,
    seats: s.pos.seats,
    tipping: s.pos.tipping,
    tipPresets: s.pos.tipPresets,
    requireGuestCount: s.pos.requireGuestCount,
    allTables: has('orders.view_all'),
  };
}
