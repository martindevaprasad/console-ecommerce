import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import {
  Ctx, requireAuth, requirePerm, requirePermOrApproval, fail, audit, resolveLocationId,
  servedBy, assertOrderAccess, ownChecksOnly,
} from '../../lib/context';
import { round2 } from '../../lib/pricing';

/**
 * Floor service: the API a server (WAITER role) needs, shaped for the handheld app.
 *
 * Typical handheld loop:
 *   1. `session` → user, permissions, org settings (once, and again when
 *      `syncState.permissionsHash` changes).
 *   2. Poll `syncState` every 2–3s. When `revision` changes refetch `myTables`;
 *      when `myReadyItems` goes up, buzz ("food ready at the pass").
 *   3. Seat (`seatTable`), order (`createOrder` / `addOrderItems` with fire),
 *      deliver (`markItemsServed`), close (`requestBill` → `addPayment`).
 *   4. `myShiftSummary` for the end-of-shift tips/sales screen.
 */
export const typeDefs = gql`
  type TableSession {
    table: Table
    "Open checks on this seating. Empty for tables the caller may not access."
    orders: [Order!]!
    "Items waiting at the pass for this seating."
    readyItemCount: Int!
  }

  type ServerSummary {
    userId: ID!
    "Start of the window: the explicit 'from', else the open clock-in, else midnight (server time)."
    from: DateTime!
    openTables: Int!
    openChecks: Int!
    "Balance still due on open checks."
    openBalance: Float!
    closedChecks: Int!
    covers: Int!
    "Completed sales excluding tips."
    sales: Float!
    tips: Float!
    averageCheck: Float!
  }

  type ServerOnDuty {
    user: User!
    clockedInAt: DateTime
    openTables: Int!
  }

  type Query {
    "Open table seatings the caller is serving at a location."
    myTables(locationId: ID): [TableSession!]!
    "Sales, tips and covers for the caller's checks."
    myShiftSummary(locationId: ID, from: DateTime): ServerSummary!
    "Staff a table can be handed to. Clocked-in staff first; set onDutyOnly: false to include everyone at the location."
    servers(locationId: ID, onDutyOnly: Boolean): [ServerOnDuty!]!
  }

  type Mutation {
    "Hand a seated table (and its open checks) to another server. Needs tables.assign or a manager PIN."
    assignTable(tableId: ID!, serverUserId: ID!, approverPin: String): TableSession!
    "Mark food/drinks as delivered to the guest."
    markItemsServed(itemIds: [ID!]!): [OrderItem!]!
  }
`;

const OPEN_STATES = ['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'] as const;
const DELIVERABLE = ['FIRED', 'PREPARING', 'READY'];

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const resolvers = {
  Query: {
    myTables: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const loc = await resolveLocationId(auth, locationId);
      return prisma.tableSession.findMany({
        where: { serverUserId: auth.userId, endTime: null, table: { zone: { locationId: loc } } },
        orderBy: { startTime: 'asc' },
      });
    },

    myShiftSummary: async (_: any, { locationId, from }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const loc = await resolveLocationId(auth, locationId);
      let since: Date = from ? new Date(from) : startOfToday();
      if (!from) {
        const clock = await prisma.timeEntry.findFirst({ where: { userId: auth.userId, clockOut: null }, orderBy: { clockIn: 'desc' } });
        if (clock) since = clock.clockIn;
      }
      const mine = { organizationId: auth.orgId, locationId: loc, ...servedBy(auth.userId) };
      const [open, closed, openTables] = await Promise.all([
        prisma.order.findMany({ where: { ...mine, status: { in: OPEN_STATES as any } }, select: { total: true, tipAmount: true, paidAmount: true } }),
        prisma.order.findMany({ where: { ...mine, status: 'COMPLETED', completedAt: { gte: since } }, select: { total: true, tipAmount: true, guestCount: true } }),
        prisma.tableSession.count({ where: { serverUserId: auth.userId, endTime: null, table: { zone: { locationId: loc } } } }),
      ]);
      const sales = round2(closed.reduce((s, o) => s + o.total - o.tipAmount, 0));
      return {
        userId: auth.userId,
        from: since,
        openTables,
        openChecks: open.length,
        openBalance: round2(open.reduce((s, o) => s + Math.max(0, o.total - o.tipAmount - o.paidAmount), 0)),
        closedChecks: closed.length,
        covers: closed.reduce((s, o) => s + (o.guestCount || 0), 0),
        sales,
        tips: round2(closed.reduce((s, o) => s + o.tipAmount, 0)),
        averageCheck: closed.length ? round2(sales / closed.length) : 0,
      };
    },

    servers: async (_: any, { locationId, onDutyOnly }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const loc = await resolveLocationId(auth, locationId);
      const [clocked, tableCounts] = await Promise.all([
        prisma.timeEntry.findMany({ where: { locationId: loc, clockOut: null, user: { organizationId: auth.orgId, isActive: true } }, include: { user: true } }),
        prisma.tableSession.groupBy({ by: ['serverUserId'], where: { endTime: null, table: { zone: { locationId: loc } } }, _count: true }),
      ]);
      const tables = new Map(tableCounts.map((t) => [t.serverUserId, t._count]));
      const rows = clocked.map((e) => ({ user: e.user, clockedInAt: e.clockIn, openTables: tables.get(e.userId) || 0 }));
      if (onDutyOnly === false) {
        const seen = new Set(rows.map((r) => r.user.id));
        const others = await prisma.user.findMany({
          where: { organizationId: auth.orgId, isActive: true, role: { not: 'CUSTOMER' }, OR: [{ locationId: loc }, { locationId: null }], id: { notIn: [...seen] } },
          orderBy: { name: 'asc' },
        });
        rows.push(...others.map((u) => ({ user: u, clockedInAt: null as any, openTables: tables.get(u.id) || 0 })));
      }
      return rows;
    },
  },

  Mutation: {
    assignTable: async (_: any, { tableId, serverUserId, approverPin }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.manage', 'tables.assign');
      const { approvedBy } = await requirePermOrApproval(ctx, 'tables.assign', approverPin);
      const table = await prisma.table.findFirst({ where: { id: tableId, zone: { location: { organizationId: auth.orgId } } } });
      if (!table) fail('Table not found', 'NOT_FOUND');
      const target = await prisma.user.findFirst({ where: { id: serverUserId, organizationId: auth.orgId, isActive: true } });
      if (!target) fail('Server not found', 'NOT_FOUND');
      const session = await prisma.tableSession.findFirst({ where: { tableId, endTime: null }, orderBy: { startTime: 'desc' } });
      if (!session) fail(`${table!.name} is not seated`);
      if (session!.serverUserId === serverUserId) return session;
      const updated = await prisma.tableSession.update({ where: { id: session!.id }, data: { serverUserId } });
      await audit(auth, 'ASSIGN_TABLE', 'Table', tableId, { table: table!.name, from: session!.serverUserId, to: serverUserId, toName: target!.name, approvedBy });
      return updated;
    },

    markItemsServed: async (_: any, { itemIds }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const ids = [...new Set<string>(itemIds)];
      if (!ids.length) return [];
      const items = await prisma.orderItem.findMany({
        where: { id: { in: ids }, order: { organizationId: auth.orgId } },
        include: { order: { include: { tableSession: { select: { serverUserId: true } } } } },
      });
      if (items.length !== ids.length) fail('Item not found', 'NOT_FOUND');
      for (const i of items) {
        assertOrderAccess(auth, i.order);
        if (!DELIVERABLE.includes(i.status)) fail(`${i.name || 'Item'} is ${i.status.toLowerCase()} and cannot be marked served`);
      }
      await prisma.orderItem.updateMany({ where: { id: { in: ids } }, data: { status: 'SERVED' } });
      return prisma.orderItem.findMany({ where: { id: { in: ids } } });
    },
  },

  TableSession: {
    table: (s: any) => prisma.table.findUnique({ where: { id: s.tableId } }),
    orders: async (s: any, _: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      if (ownChecksOnly(auth) && s.serverUserId !== auth.userId) return [];
      return prisma.order.findMany({ where: { tableSessionId: s.id, status: { in: OPEN_STATES as any } }, orderBy: { createdAt: 'asc' } });
    },
    readyItemCount: (s: any) =>
      prisma.orderItem.count({ where: { status: 'READY', order: { tableSessionId: s.id, status: { in: OPEN_STATES as any } } } }),
  },
};
