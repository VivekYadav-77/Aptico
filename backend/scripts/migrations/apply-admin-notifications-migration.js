import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envFilePath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const migrationSql = `
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type in (
      'new_follower',
      'new_connection_request',
      'connection_accepted',
      'post_like',
      'post_comment',
      'job_match_alert',
      'squad_ping',
      'squad_goal_reached',
      'squad_synergy_burst',
      'admin_restriction_update',
      'admin_account_status'
    )
  );
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply the admin notifications migration.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(migrationSql);
    console.log('Admin notifications migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Admin notifications migration failed:', error);
  process.exit(1);
});
