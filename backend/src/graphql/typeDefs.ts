import { mergeTypeDefs } from '@graphql-tools/merge';
import * as base from './modules/base';
import * as org from './modules/org';
import * as catalog from './modules/catalog';
import * as orders from './modules/orders';
import * as operations from './modules/operations';
import * as inventory from './modules/inventory';
import * as crm from './modules/crm';
import * as reports from './modules/reports';
import * as sync from './modules/sync';
import * as service from './modules/service';

export const modules = [base, org, catalog, orders, operations, inventory, crm, reports, sync, service];

export const typeDefs = mergeTypeDefs(modules.map((m) => m.typeDefs));
