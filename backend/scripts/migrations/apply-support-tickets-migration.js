import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const envFilePath of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')]) {
  if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFilePath);
  }
}

const migrationSql = `
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category varchar(80) NOT NULL,
  subject varchar(160) NOT NULL,
  message text NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'open',
  priority varchar(30) NOT NULL DEFAULT 'normal',
  related_feature varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_admin_reply_at timestamptz,
  last_user_reply_at timestamptz,
  CONSTRAINT support_tickets_status_check CHECK (status in ('open', 'pending_admin', 'waiting_user', 'resolved', 'closed')),
  CONSTRAINT support_tickets_priority_check CHECK (priority in ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS support_tickets_user_status_updated_idx
  ON support_tickets (user_id, status, updated_at);

CREATE INDEX IF NOT EXISTS support_tickets_status_priority_updated_idx
  ON support_tickets (status, priority, updated_at);

CREATE INDEX IF NOT EXISTS support_tickets_category_updated_idx
  ON support_tickets (category, updated_at);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_role varchar(20) NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_ticket_messages_sender_role_check CHECK (sender_role in ('user', 'admin'))
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_created_idx
  ON support_ticket_messages (ticket_id, created_at);

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
      'admin_account_status',
      'support_ticket_reply',
      'support_ticket_status'
    )
  );
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to apply the support tickets migration.');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(migrationSql);
    console.log('Support tickets migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Support tickets migration failed:', error);
  process.exit(1);
});
