/**
 * Write the OpenAPI (Swagger) document to docs/openapi.json at the repo root.
 *
 *   npm run docs:openapi
 *
 * The live version is served at /api/docs (Vercel) and /docs (local dev).
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildOpenApi } from '../lib/openapi';

const doc = buildOpenApi([
  { url: 'https://console-beta-orpin.vercel.app/api', description: 'Production (Vercel)' },
  { url: 'http://localhost:5002', description: 'Local development' },
]);

const dir = join(__dirname, '..', '..', '..', 'docs');
mkdirSync(dir, { recursive: true });
const file = join(dir, 'openapi.json');
writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');

const ops = Object.keys(doc.paths).length;
console.log(`Wrote ${file} (${ops} operations, ${Object.keys(doc.components.schemas).length} schemas)`);
