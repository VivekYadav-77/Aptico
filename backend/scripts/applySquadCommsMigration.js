import pg from 'pg';
import { env, hasDatabaseConfig } from '../src/config/env.js';

const { Client } = pg;

const migrationSql = `
ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS synergy_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS synergy_burst_at timestamptz;

ALTER TABLE squad_members
  ADD COLUMN IF NOT EXISTS archetype_role varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sparks_sent_this_week integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS squad_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  sender_member_id uuid REFERENCES squad_members(id) ON DELETE SET NULL,
  message_type varchar(30) NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  milestone_phase integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS squad_messages_squad_id_created_at_idx
  ON squad_messages (squad_id, created_at);

CREATE INDEX IF NOT EXISTS squad_messages_squad_id_phase_idx
  ON squad_messages (squad_id, milestone_phase);

ALTER TABLE squad_messages
  DROP CONSTRAINT IF EXISTS squad_messages_message_type_check;

ALTER TABLE squad_messages
  ADD CONSTRAINT squad_messages_message_type_check
  CHECK (message_type in ('text', 'quick_signal', 'sticker_drop', 'signal_drop', 'accolade', 'system'));

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type in ('new_follower', 'new_connection_request', 'connection_accepted', 'post_like', 'post_comment', 'job_match_alert', 'squad_ping', 'squad_goal_reached', 'squad_synergy_burst'));
`;

async function main() {
  if (!hasDatabaseConfig()) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const client = new Client({ connectionString: env.databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('Squad Comms migration applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Squad Comms migration failed:', error);
  process.exitCode = 1;
});
