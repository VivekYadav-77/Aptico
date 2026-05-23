import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { eq } from 'drizzle-orm';
import { profileSettings } from './src/db/schema.js';

const { Client } = pkg;

(async () => {
  const client = new Client({ connectionString: 'postgresql://postgres:shivamyadav@localhost:5432/aptico' });
  await client.connect();
  const db = drizzle(client);

  const legacyMap = {
    'xp_rookie_50': 'xp_50',
    'xp_scout_100': 'xp_100',
    'xp_warrior_250': 'xp_250',
    'xp_master_500': 'xp_500',
    'xp_legend_1000': 'xp_1000'
  };

  const allSettings = await db.select().from(profileSettings);
  let count = 0;

  for (const row of allSettings) {
    if (!row.settingsJson) continue;
    
    let modified = false;
    let unlocked = row.settingsJson.unlockedStickers || [];
    let equipped = row.settingsJson.equippedStickers || [];
    
    unlocked = unlocked.map(id => {
      if (legacyMap[id]) { modified = true; return legacyMap[id]; }
      return id;
    });
    equipped = equipped.map(id => {
      if (legacyMap[id]) { modified = true; return legacyMap[id]; }
      return id;
    });

    const uniqueUnlocked = [...new Set(unlocked)];
    const uniqueEquipped = [...new Set(equipped)];
    
    if (uniqueUnlocked.length !== unlocked.length || uniqueEquipped.length !== equipped.length) {
      modified = true;
    }

    if (modified) {
      row.settingsJson.unlockedStickers = uniqueUnlocked;
      row.settingsJson.equippedStickers = uniqueEquipped;
      await db.update(profileSettings)
        .set({ settingsJson: row.settingsJson })
        .where(eq(profileSettings.id, row.id));
      count++;
    }
  }

  console.log('Migrated DB successfully. Rows updated:', count);
  await client.end();
  process.exit(0);
})();
