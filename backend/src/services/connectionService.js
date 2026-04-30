import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { connections, userProfiles, users } from '../db/schema.js';
import { createNotification } from '../utils/notificationHelper.js';

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getProfileByUsername(db, username) {
  const rows = await db
    .select({
      userId: userProfiles.userId,
      username: userProfiles.username,
      headline: userProfiles.headline,
      skills: userProfiles.skills,
      name: users.name,
      avatar_url: users.avatarUrl
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(userProfiles.username, username))
    .limit(1);

  return rows[0] || null;
}

async function getProfileByUserId(db, userId) {
  const rows = await db
    .select({
      userId: userProfiles.userId,
      username: userProfiles.username,
      headline: userProfiles.headline,
      skills: userProfiles.skills,
      name: users.name,
      avatar_url: users.avatarUrl
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return rows[0] || null;
}

export async function sendConnectionRequest(db, requesterId, targetUsername, note) {
  const target = await getProfileByUsername(db, targetUsername);

  if (!target) {
    throw serviceError('User not found', 404);
  }

  if (requesterId === target.userId) {
    throw serviceError('You cannot connect with yourself', 400);
  }

  const existingRows = await db
    .select()
    .from(connections)
    .where(
      or(
        and(eq(connections.requesterId, requesterId), eq(connections.recipientId, target.userId)),
        and(eq(connections.requesterId, target.userId), eq(connections.recipientId, requesterId))
      )
    )
    .limit(1);

  const existing = existingRows[0];
  if (existing?.status === 'accepted') {
    throw serviceError('You are already connected', 409);
  }

  if (existing?.status === 'pending') {
    throw serviceError('A connection request already exists', 409);
  }

  const requester = await getProfileByUserId(db, requesterId);
  const requesterNote = note ? String(note).trim().slice(0, 150) : null;
  const values = {
    requesterId,
    recipientId: target.userId,
    status: 'pending',
    requesterNote,
    requesterRole: requester?.headline || null,
    requesterLearning: requester?.skills?.[0] || null,
    updatedAt: new Date()
  };

  const rows = existing
    ? await db.update(connections).set(values).where(eq(connections.id, existing.id)).returning()
    : await db.insert(connections).values(values).returning();

  const connection = rows[0];
  createNotification(db, {
    userId: target.userId,
    type: 'new_connection_request',
    actorId: requesterId,
    entityId: connection.id,
    entityType: 'connection',
    message: `${requester?.name || 'Someone'} wants to connect with you`
  });

  return connection;
}

export async function respondToRequest(db, recipientId, connectionId, action) {
  if (!['accepted', 'declined'].includes(action)) {
    throw serviceError('Invalid response', 400);
  }

  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, connectionId), eq(connections.recipientId, recipientId), eq(connections.status, 'pending')))
    .limit(1);

  const connection = rows[0];
  if (!connection) {
    throw serviceError('Request not found', 404);
  }

  await db.update(connections).set({ status: action, updatedAt: new Date() }).where(eq(connections.id, connectionId));

  if (action === 'accepted') {
    const recipient = await getProfileByUserId(db, recipientId);
    createNotification(db, {
      userId: connection.requesterId,
      type: 'connection_accepted',
      actorId: recipientId,
      entityId: connectionId,
      entityType: 'connection',
      message: `${recipient?.name || 'Someone'} accepted your connection request`
    });
  }

  return { success: true, status: action };
}

export async function getConnections(db, userId) {
  const rows = await db
    .select()
    .from(connections)
    .where(and(or(eq(connections.requesterId, userId), eq(connections.recipientId, userId)), eq(connections.status, 'accepted')));

  const otherIds = rows.map((row) => (row.requesterId === userId ? row.recipientId : row.requesterId));
  if (!otherIds.length) {
    return [];
  }

  return db
    .select({
      user_id: users.id,
      name: users.name,
      avatar_url: users.avatarUrl,
      username: userProfiles.username,
      headline: userProfiles.headline,
      location: userProfiles.location
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(inArray(users.id, otherIds));
}

export async function getPendingRequests(db, userId) {
  return db
    .select({
      id: connections.id,
      requester_id: connections.requesterId,
      requester_note: connections.requesterNote,
      requester_role: connections.requesterRole,
      requester_learning: connections.requesterLearning,
      created_at: connections.createdAt,
      user: {
        name: users.name,
        avatar_url: users.avatarUrl,
        username: userProfiles.username,
        headline: userProfiles.headline
      }
    })
    .from(connections)
    .innerJoin(users, eq(connections.requesterId, users.id))
    .leftJoin(userProfiles, eq(connections.requesterId, userProfiles.userId))
    .where(and(eq(connections.recipientId, userId), eq(connections.status, 'pending')))
    .orderBy(desc(connections.createdAt));
}

export async function getConnectionStatus(db, userId, targetUserId) {
  if (userId === targetUserId) {
    return { status: 'self' };
  }

  const rows = await db
    .select()
    .from(connections)
    .where(
      or(
        and(eq(connections.requesterId, userId), eq(connections.recipientId, targetUserId)),
        and(eq(connections.requesterId, targetUserId), eq(connections.recipientId, userId))
      )
    )
    .limit(1);

  const connection = rows[0];
  if (!connection || connection.status === 'declined') {
    return { status: 'not_connected' };
  }

  if (connection.status === 'accepted') {
    return { status: 'connected', connectionId: connection.id };
  }

  return {
    status: connection.requesterId === userId ? 'pending_sent' : 'pending_received',
    connectionId: connection.id
  };
}
