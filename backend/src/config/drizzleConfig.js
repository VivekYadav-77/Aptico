import { defineConfig } from 'drizzle-kit';
import { env } from './env.js';
export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.databaseUrl,
  },
});
