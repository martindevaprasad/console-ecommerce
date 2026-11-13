import { createHash } from 'crypto';
import { gql } from 'graphql-tag';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { Ctx, requireAuth, resolveLocationId, servedBy } from '../../lib/context';

/**
 * Live sync for floor, orders and kitchen across web, KDS and the Android app.
 *
 * Clients poll `syncState` (a few hundred bytes) every 2–3s and refetch their
 * real queries only when `revision` changes. This works on serverless hosting
 * (Vercel), where long-lived WebSocket connections are not available.
 *
 * The revision is a hash over everything a floor/KDS screen shows for one
 * location: tables, open sessions, open orders, their items' statuses and
 * reservations. Counts are included so deletions change the hash too.
 */
export const typeDefs = gql`
  type SyncState {
    locationId: ID!
    revision: String!
    serverTime: DateTime!
    "Items READY at the pass on the caller's own checks. Handhelds buzz when this goes up."
    myReadyItems: Int!
    "Open table seatings the caller is serving."
    myOpenTables: Int!
    "Changes when the caller's role or permissions change. Refetch session and rebuild the UI when it does."
    permissionsHash: String!
  }

  type Query {
    "Cheap change detector for one location. Refetch floor/orders/KDS when revision changes."
    syncState(locationId: ID): SyncState!
  }
`;

const OPEN_STATES = Prisma.sql`('OPEN', 'PENDING', 'IN_PROGRESS', 'READY')`;

export const resolvers = {
  Query: {
    syncState: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const loc = await resolveLocationId(auth, locationId);
      const [myReadyItems, myOpenTables] = await Promise.all([
        prisma.orderItem.count({
          where: { status: 'READY', order: { locationId: loc, status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'] }, ...servedBy(auth.userId) } },
        }),
        prisma.tableSession.count({ where: { serverUserId: auth.userId, endTime: null, table: { zone: { locationId: loc } } } }),
      ]);
      const permissionsHash = createHash('md5').update(`${auth.role}|${[...auth.permissions].sort().join(',')}`).digest('hex');
      const rows = await prisma.$queryRaw<{ revision: string }[]>`
        SELECT md5(concat_ws('|',
          (SELECT coalesce(max(t."updatedAt")::text, '') || ':' || count(*)
             FROM "Table" t JOIN "FloorPlanZone" z ON z.id = t."zoneId"
            WHERE z."locationId" = ${loc}),
          (SELECT coalesce(max(s."updatedAt")::text, '') || ':' || count(*)
             FROM "TableSession" s
             JOIN "Table" t ON t.id = s."tableId"
             JOIN "FloorPlanZone" z ON z.id = t."zoneId"
            WHERE z."locationId" = ${loc} AND s."endTime" IS NULL),
          (SELECT coalesce(max(o."updatedAt")::text, '') || ':' || count(*)
             FROM "Order" o
            WHERE o."locationId" = ${loc} AND o.status::text IN ${OPEN_STATES}),
          (SELECT md5(coalesce(string_agg(i.id || ':' || i.status::text || ':' || i.quantity, ',' ORDER BY i.id), ''))
             FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
            WHERE o."locationId" = ${loc} AND o.status::text IN ${OPEN_STATES}),
          (SELECT coalesce(max(r."updatedAt")::text, '') || ':' || count(*)
             FROM "Reservation" r
            WHERE r."locationId" = ${loc} AND r."dateTime" >= now() - interval '1 day')
        )) AS revision`;
      return { locationId: loc, revision: rows[0]?.revision ?? '', serverTime: new Date(), myReadyItems, myOpenTables, permissionsHash };
    },
  },
};
