import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envFilePath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const migrationSql = `
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS posts_is_visible_scheduled_at_idx
  ON posts (is_visible, scheduled_at);

ALTER TABLE community_wins
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS community_wins_is_visible_scheduled_at_idx
  ON community_wins (is_visible, scheduled_at);
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply the social scheduling migration.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(migrationSql);
    console.log('Social scheduling migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Social scheduling migration failed:', error);
  process.exit(1);
});
