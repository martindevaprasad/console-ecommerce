/**
 * OpenAPI 3 (Swagger) document generated from the GraphQL schema.
 *
 * The API is a single GraphQL endpoint, so every Query/Mutation field is listed
 * as its own operation at `POST /graphql#<name>`. The `#fragment` is never sent
 * over HTTP, so Swagger UI's "Try it out" posts to the real `/graphql` endpoint.
 * Each operation carries a ready-to-run example query and typed variables.
 *
 * Generated on request, so the docs always match the deployed schema.
 */
import {
  buildASTSchema, DocumentNode, GraphQLArgument, GraphQLField, GraphQLNamedType, GraphQLObjectType, GraphQLOutputType,
  GraphQLScalarType, GraphQLInputType, GraphQLSchema, getNamedType, isEnumType, isInputObjectType, isListType,
  isNonNullType, isObjectType, isScalarType, Kind,
} from 'graphql';
import { typeDefs, modules } from '../graphql/typeDefs';

/** Operations that work without a bearer token. */
const PUBLIC_OPS = new Set(['login', 'register', '_health']);
/** Module file name → Swagger tag. */
const TAGS: Record<string, string> = {
  base: 'System', org: 'Auth & Organization', catalog: 'Catalog', orders: 'Orders', operations: 'Operations',
  inventory: 'Inventory', crm: 'Customers & Loyalty', reports: 'Reports', sync: 'Live Sync',
};
const MODULE_NAMES = ['base', 'org', 'catalog', 'orders', 'operations', 'inventory', 'crm', 'reports', 'sync'];

type Schema = Record<string, any>;

const SCALARS: Record<string, Schema> = {
  ID: { type: 'string' },
  String: { type: 'string' },
  Int: { type: 'integer', format: 'int32' },
  Float: { type: 'number' },
  Boolean: { type: 'boolean' },
  DateTime: { type: 'string', format: 'date-time' },
  JSON: { description: 'Arbitrary JSON value' },
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** OpenAPI schema for a GraphQL type reference (nullable unless wrapped in NonNull). */
function typeSchema(t: GraphQLOutputType | GraphQLInputType, nullable = true): Schema {
  if (isNonNullType(t)) return typeSchema(t.ofType as any, false);
  let s: Schema;
  if (isListType(t)) s = { type: 'array', items: typeSchema(t.ofType as any) };
  else if (isScalarType(t)) s = { ...(SCALARS[t.name] || { type: 'string' }) };
  else s = ref((t as GraphQLNamedType).name);
  if (nullable) s = s.$ref ? { allOf: [s], nullable: true } : { ...s, nullable: true };
  return s;
}

function namedTypeSchema(t: GraphQLNamedType): Schema | null {
  if (t.name.startsWith('__') || isScalarType(t)) return null;
  if (isEnumType(t)) return { type: 'string', enum: t.getValues().map((v) => v.name), description: t.description || undefined };
  if (isObjectType(t) || isInputObjectType(t)) {
    const fields = t.getFields() as Record<string, any>;
    const required = Object.values(fields).filter((f: any) => isNonNullType(f.type)).map((f: any) => f.name);
    return {
      type: 'object',
      description: t.description || undefined,
      ...(required.length ? { required } : {}),
      properties: Object.fromEntries(Object.values(fields).map((f: any) => [f.name, {
        ...typeSchema(f.type),
        ...(f.description ? { description: f.description } : {}),
        ...(f.args?.length ? { description: [f.description, `Arguments: ${f.args.map((a: any) => `${a.name}: ${a.type}`).join(', ')}`].filter(Boolean).join('. ') } : {}),
      }])),
    };
  }
  return { type: 'object' }; // unions/interfaces (none today)
}

// ------------------------------------------------------------------ examples

/** Selection set for an example query: scalars plus one level of nested objects. */
function selection(t: GraphQLOutputType, depth = 0): string {
  const named = getNamedType(t);
  if (!isObjectType(named)) return '';
  const parts: string[] = [];
  for (const f of Object.values(named.getFields())) {
    const ft = getNamedType(f.type);
    const requiredArgs = f.args.some((a) => isNonNullType(a.type));
    if (isScalarType(ft) || isEnumType(ft)) parts.push(f.name);
    else if (depth < 1 && !requiredArgs && isObjectType(ft)) {
      const inner = Object.values(ft.getFields()).filter((x) => { const n = getNamedType(x.type); return isScalarType(n) || isEnumType(n); }).map((x) => x.name);
      if (inner.length) parts.push(`${f.name} { ${inner.slice(0, 8).join(' ')} }`);
    }
  }
  return parts.length ? ` { ${parts.join(' ')} }` : '';
}

function exampleValue(t: GraphQLInputType, seen = new Set<string>()): any {
  if (isNonNullType(t)) return exampleValue(t.ofType, seen);
  if (isListType(t)) return [exampleValue(t.ofType as GraphQLInputType, seen)];
  if (isEnumType(t)) return t.getValues()[0]?.name;
  if (isInputObjectType(t)) {
    if (seen.has(t.name)) return {};
    const next = new Set(seen).add(t.name);
    // Required fields only, to keep examples short
    return Object.fromEntries(Object.values(t.getFields()).filter((f) => isNonNullType(f.type)).map((f) => [f.name, exampleValue(f.type, next)]));
  }
  switch ((t as GraphQLScalarType).name) {
    case 'Int': return 1;
    case 'Float': return 1.5;
    case 'Boolean': return true;
    case 'DateTime': return '2026-01-01T09:00:00.000Z';
    case 'JSON': return {};
    case 'ID': return '<id>';
    default: return 'string';
  }
}

const ARG_EXAMPLES: Record<string, any> = { email: 'owner@nexuscafe.com', password: 'admin123' };

function operation(kind: 'query' | 'mutation', f: GraphQLField<any, any>, tag: string): Schema {
  const args = f.args as readonly GraphQLArgument[];
  const varDecl = args.length ? `(${args.map((a) => `$${a.name}: ${a.type}`).join(', ')})` : '';
  const argPass = args.length ? `(${args.map((a) => `${a.name}: $${a.name}`).join(', ')})` : '';
  const opName = f.name.replace(/^_/, '').replace(/^./, (c) => c.toUpperCase());
  const query = `${kind} ${opName}${varDecl} { ${f.name}${argPass}${selection(f.type)} }`;
  const variables = Object.fromEntries(args.filter((a) => isNonNullType(a.type) || ARG_EXAMPLES[a.name]).map((a) => [a.name, ARG_EXAMPLES[a.name] ?? exampleValue(a.type)]));
  const required = args.filter((a) => isNonNullType(a.type)).map((a) => a.name);

  return {
    post: {
      tags: [tag],
      operationId: `${kind}_${f.name}`,
      summary: `${kind === 'query' ? 'Query' : 'Mutation'}: ${f.name}`,
      description: [
        f.description,
        `**GraphQL signature**\n\n\`\`\`graphql\n${f.name}${args.length ? `(${args.map((a) => `${a.name}: ${a.type}`).join(', ')})` : ''}: ${f.type}\n\`\`\``,
        'The example selects scalar fields and one level of nested objects — edit the `query` to pick exactly the fields you need.',
      ].filter(Boolean).join('\n\n'),
      ...(PUBLIC_OPS.has(f.name) ? { security: [] } : {}),
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['query'],
              properties: {
                query: { type: 'string', description: 'GraphQL document' },
                operationName: { type: 'string' },
                variables: {
                  type: 'object',
                  ...(required.length ? { required } : {}),
                  properties: Object.fromEntries(args.map((a) => [a.name, typeSchema(a.type)])),
                },
              },
            },
            example: { query, variables },
          },
        },
      },
      responses: {
        200: {
          description: 'GraphQL response. Business errors (validation, permissions, not found) come back with HTTP 200 in `errors`.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', nullable: true, properties: { [f.name]: typeSchema(f.type) } },
                  errors: { type: 'array', items: ref('GraphQLError') },
                },
              },
            },
          },
        },
        400: { description: 'Malformed GraphQL document or variables', content: { 'application/json': { schema: ref('GraphQLErrorResponse') } } },
      },
    },
  };
}

// ------------------------------------------------------------------ document

let cached: Schema | null = null;

/** @param servers base URLs the paths hang off; on Vercel the API lives under "/api". */
export function buildOpenApi(servers: { url: string; description: string }[]): Schema {
  if (cached) return { ...cached, servers };
  const schema: GraphQLSchema = buildASTSchema(typeDefs as DocumentNode);

  // Which module defines each root field → tag
  const tagOf: Record<string, string> = {};
  modules.forEach((m: any, i: number) => {
    for (const def of (m.typeDefs as DocumentNode).definitions as any[]) {
      if ((def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.OBJECT_TYPE_EXTENSION) && ['Query', 'Mutation'].includes(def.name.value)) {
        for (const fd of def.fields || []) tagOf[`${def.name.value}.${fd.name.value}`] = TAGS[MODULE_NAMES[i]] || MODULE_NAMES[i];
      }
    }
  });

  const paths: Schema = {
    '/health': {
      get: {
        tags: ['System'], operationId: 'health', summary: 'Health check', security: [],
        description: 'Liveness probe. On Vercel it also reports database connectivity and missing configuration.',
        responses: { 200: { description: 'Healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, timestamp: { type: 'string', format: 'date-time' } } } } } } },
      },
    },
  };
  for (const [kind, root] of [['query', schema.getQueryType()], ['mutation', schema.getMutationType()]] as const) {
    if (!root) continue;
    const typeName = kind === 'query' ? 'Query' : 'Mutation';
    for (const f of Object.values((root as GraphQLObjectType).getFields()).sort((a, b) => a.name.localeCompare(b.name))) {
      if (f.name === '_noop') continue;
      paths[`/graphql#${kind}.${f.name}`] = operation(kind, f, tagOf[`${typeName}.${f.name}`] || 'Other');
    }
  }

  const componentSchemas: Schema = {
    GraphQLError: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Not authenticated' },
        path: { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'integer' }] } },
        extensions: { type: 'object', properties: { code: { type: 'string', example: 'UNAUTHENTICATED' } } },
      },
    },
    GraphQLErrorResponse: { type: 'object', properties: { errors: { type: 'array', items: ref('GraphQLError') } } },
  };
  for (const t of Object.values(schema.getTypeMap()).sort((a, b) => a.name.localeCompare(b.name))) {
    if (t.name === 'Query' || t.name === 'Mutation') continue;
    const s = namedTypeSchema(t);
    if (s) componentSchemas[t.name] = JSON.parse(JSON.stringify(s)); // drop undefined
  }

  cached = {
    openapi: '3.0.3',
    info: {
      title: 'MageOS / NexusPOS API',
      version: '1.0.0',
      description: [
        'Restaurant POS platform API: catalog, orders & payments, tables & reservations, kitchen display, inventory, customers & loyalty, staff, and reports.',
        '### How this API works',
        'It is a **GraphQL** API served from a single endpoint, `POST /graphql` (`/api/graphql` on Vercel). Each GraphQL query and mutation is listed here as its own operation so it can be browsed and tried out; all of them post to the same endpoint.',
        '### Authentication',
        '1. Run **Mutation: login** (under *Auth & Organization*) with your email and password.\n2. Copy `data.login.token` from the response.\n3. Click **Authorize** and paste the token. Every other operation sends it as `Authorization: Bearer <token>`.',
        'Data is scoped to the organization of the signed-in user. Operations that take an optional `locationId` default to the user\'s current location.',
        '### Errors',
        'GraphQL returns HTTP 200 for most errors and lists them in `errors[]` with `extensions.code` (e.g. `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `APPROVAL_REQUIRED`). Check `errors` before reading `data`.',
        '### Schema introspection',
        'GraphQL introspection is enabled, so tools such as Apollo Sandbox, Postman or Insomnia can also load the full schema from the same endpoint.',
      ].join('\n\n'),
    },
    servers,
    tags: [...new Set(Object.values(TAGS))].map((name) => ({ name })),
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token from the `login` or `register` mutation' } },
      schemas: componentSchemas,
    },
  };
  return cached;
}

/** Swagger UI page (assets from a CDN, so no extra npm dependency). */
export function swaggerHtml(specUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MageOS API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; } .swagger-ui .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: '#swagger',
      deepLinking: true,
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
    });
  </script>
</body>
</html>`;
}
