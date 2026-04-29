import pg from 'pg';
import { env, hasDatabaseConfig } from '../src/config/env.js';

const { Client } = pg;

const expectedColumns = [
  ['squad_members', 'archetype_role'],
  ['squad_members', 'sparks_sent_this_week'],
  ['squads', 'synergy_score'],
  ['squads', 'synergy_burst_at'],
  ['squad_messages', 'id'],
  ['squad_messages', 'message_type'],
  ['squad_messages', 'milestone_phase']
];

async function main() {
  if (!hasDatabaseConfig()) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const client = new Client({ connectionString: env.databaseUrl });
  await client.connect();

  try {
    const { rows } = await client.query(
      `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (table_name, column_name) IN (${expectedColumns.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ')})
      `,
      expectedColumns.flat()
    );

    const found = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
    const missing = expectedColumns
      .map(([tableName, columnName]) => `${tableName}.${columnName}`)
      .filter((key) => !found.has(key));

    if (missing.length) {
      throw new Error(`Missing Squad Comms schema items: ${missing.join(', ')}`);
    }

    console.log('Squad Comms schema verified.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Squad Comms schema verification failed:', error);
  process.exitCode = 1;
});
