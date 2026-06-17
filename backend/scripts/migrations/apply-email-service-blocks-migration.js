import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envFilePath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const migrationSql = `
CREATE TABLE IF NOT EXISTS email_service_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  reason text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_service_blocks_email_idx
  ON email_service_blocks (email);

CREATE INDEX IF NOT EXISTS email_service_blocks_active_idx
  ON email_service_blocks (is_blocked);

CREATE INDEX IF NOT EXISTS email_service_blocks_updated_at_idx
  ON email_service_blocks (updated_at);
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply the email service blocks migration.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(migrationSql);
    console.log('Email service blocks migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Email service blocks migration failed:', error);
  process.exit(1);
});
