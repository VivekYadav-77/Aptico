import { and, eq, sql } from 'drizzle-orm';
import { notifications } from '../db/schema.js';

export function createNotification(db, { userId, type, actorId = null, entityId = null, entityType = null, message }) {
  void (async () => {
    try {
      if (!db || !userId || !type || !message) {
        return;
      }

      await db.insert(notifications).values({
        userId,
        type,
        actorId,
        entityId,
        entityType,
        message
      });
    } catch (error) {
      console.error('Notification creation failed:', error);
    }
  })();
}

export async function getUnreadCount(db, userId) {
  const rows = await db
    .select({ total: sql`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return Number(rows[0]?.total || 0);
}
