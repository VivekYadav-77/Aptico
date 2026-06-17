import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envFilePath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const migrationSql = `
CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,
  email_type varchar(60) NOT NULL,
  provider varchar(60) NOT NULL DEFAULT 'google_apps_script',
  status varchar(30) NOT NULL DEFAULT 'pending',
  subject text,
  country varchar(80),
  region varchar(120),
  city varchar(120),
  error_code varchar(80),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS email_delivery_logs_created_at_idx
  ON email_delivery_logs (created_at);

CREATE INDEX IF NOT EXISTS email_delivery_logs_email_created_at_idx
  ON email_delivery_logs (email, created_at);

CREATE INDEX IF NOT EXISTS email_delivery_logs_user_created_at_idx
  ON email_delivery_logs (user_id, created_at);

CREATE INDEX IF NOT EXISTS email_delivery_logs_type_created_at_idx
  ON email_delivery_logs (email_type, created_at);

CREATE INDEX IF NOT EXISTS email_delivery_logs_status_created_at_idx
  ON email_delivery_logs (status, created_at);
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply the email delivery logs migration.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(migrationSql);
    console.log('Email delivery logs migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Email delivery logs migration failed:', error);
  process.exit(1);
});
