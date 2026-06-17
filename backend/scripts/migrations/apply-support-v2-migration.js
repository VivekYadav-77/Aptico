import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envFilePath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const migrationSql = `
ALTER TABLE support_tickets
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_service_blocked_at_submit timestamptz;

CREATE INDEX IF NOT EXISTS support_tickets_contact_email_idx
  ON support_tickets (contact_email);

CREATE INDEX IF NOT EXISTS support_tickets_assigned_status_idx
  ON support_tickets (assigned_admin_id, status);

CREATE TABLE IF NOT EXISTS support_ticket_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_internal_notes_ticket_created_idx
  ON support_ticket_internal_notes (ticket_id, created_at);
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply the support V2 migration.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(migrationSql);
    console.log('Support V2 migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Support V2 migration failed:', error);
  process.exit(1);
});
