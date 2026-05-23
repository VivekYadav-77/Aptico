import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { eq } from 'drizzle-orm';
import { profileSettings } from './src/db/schema.js';

const { Client } = pkg;

const VALID_STICKER_IDS = new Set([
  'xp_50','xp_100','xp_250','xp_500','xp_1000','xp_2500','xp_5000','xp_7500','xp_10000','xp_20000','xp_50000','streak_3','streak_7','streak_14','streak_30','streak_60','streak_100','streak_365','apps_25','apps_100','apps_250','apps_500','apps_1000','rejections_10','rejections_50','rejections_100','rejections_250','rejections_500','social_followers_1','social_followers_10','social_followers_50','social_followers_100','social_followers_500','social_followers_1000','social_connections_10','social_connections_50','social_connections_100','social_connections_250','social_connections_500','secret_night_owl','secret_early_bird','secret_weekend_warrior','secret_speed_demon','event_pioneer','event_squad_champion','event_beta_tester'
]);

(async () => {
  const client = new Client({ connectionString: 'postgresql://postgres:shivamyadav@localhost:5432/aptico' });
  await client.connect();
  const db = drizzle(client);

  const allSettings = await db.select().from(profileSettings);
  let count = 0;

  for (const row of allSettings) {
    if (!row.settingsJson) continue;
    
    let unlocked = row.settingsJson.unlockedStickers || [];
    let equipped = row.settingsJson.equippedStickers || [];
    
    const validUnlocked = unlocked.filter(id => VALID_STICKER_IDS.has(id));
    const validEquipped = equipped.filter(id => VALID_STICKER_IDS.has(id));

    if (validUnlocked.length !== unlocked.length || validEquipped.length !== equipped.length) {
      row.settingsJson.unlockedStickers = validUnlocked;
      row.settingsJson.equippedStickers = validEquipped;
      await db.update(profileSettings)
        .set({ settingsJson: row.settingsJson })
        .where(eq(profileSettings.id, row.id));
      count++;
    }
  }

  console.log('Cleaned DB successfully. Rows updated:', count);
  await client.end();
  process.exit(0);
})();
