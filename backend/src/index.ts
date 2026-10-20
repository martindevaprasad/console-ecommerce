import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { buildContext } from './lib/context';
import { buildOpenApi, swaggerHtml } from './lib/openapi';

const PORT = process.env.PORT || 5002;

async function main() {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req.headers.authorization),
    })
  );

  app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Swagger / OpenAPI docs generated from the GraphQL schema
  app.get('/openapi.json', (req, res) => {
    res.json(buildOpenApi([{ url: `${req.protocol}://${req.get('host')}`, description: 'This server' }]));
  });
  app.get('/docs', (_, res) => res.type('html').send(swaggerHtml('/openapi.json')));

  app.listen(PORT, () => {
    console.log(`🚀 NexusPOS Backend running at http://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
