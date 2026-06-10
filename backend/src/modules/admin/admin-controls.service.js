import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  adminModerationActions,
  adminRestrictions,
  analyses,
  applicationLogs,
  communityWins,
  generatedContent,
  postComments,
  posts,
  refreshTokens,
  rejectionLogs,
  savedJobs,
  userProfiles,
  users
} from '../../db/schema.js';
import { requestPasswordReset } from '../auth/auth.service.js';
import { recordAdminAuditLog } from '../analytics/analytics.service.js';
import { createNotification } from '../../shared/utils/notification-helper.js';

export const ADMIN_USER_STATUSES = ['active', 'restricted', 'blocked', 'deactivated'];
export const ADMIN_ROLES = ['user', 'admin'];
export const ADMIN_RESTRICTION_FEATURES = [
  'login',
  'posting',
  'commenting',
  'squad_actions',
  'analysis',
  'job_search',
  'job_saving',
  'profile_visibility',
  'activity_logging'
];

export const ADMIN_CONTENT_TYPES = ['post', 'comment', 'community_win', 'profile', 'analysis', 'saved_job', 'application_log', 'rejection_log', 'generated_content'];

export function createAdminControlError(message, statusCode = 400, code = 'ADMIN_CONTROL_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function requireReason(reason) {
  const normalized = String(reason || '').trim();
  if (normalized.length < 6) {
    throw createAdminControlError('A clear admin reason is required.', 400, 'REASON_REQUIRED');
  }
  return normalized.slice(0, 1000);
}

export function assertConfirmationMatches(expected, provided) {
  if (String(expected || '').trim() !== String(provided || '').trim()) {
    throw createAdminControlError('Typed confirmation did not match the target.', 400, 'CONFIRMATION_REQUIRED');
  }
}

export function assertNotSelfTarget({ adminUserId, targetUserId, action }) {
  if (adminUserId && targetUserId && adminUserId === targetUserId) {
    throw createAdminControlError(`Admins cannot ${action} themselves.`, 403, 'SELF_PROTECTION');
  }
}

export function normalizeRestrictionFeature(feature) {
  const normalized = String(feature || '').trim();
  if (!ADMIN_RESTRICTION_FEATURES.includes(normalized)) {
    throw createAdminControlError('Restriction feature is not supported.', 400, 'INVALID_RESTRICTION_FEATURE');
  }
  return normalized;
}

function serializeDate(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function formatFeatureLabel(feature) {
  return String(feature || '').replaceAll('_', ' ');
}

function notifyAdminAccountChange({ db, targetUserId, adminUserId, type, message }) {
  createNotification(db, {
    userId: targetUserId,
    type,
    actorId: adminUserId,
    entityId: targetUserId,
    entityType: 'admin_action',
    message
  });
}

async function findAdminTargetUser(db, userId) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) {
    throw createAdminControlError('Target user was not found.', 404, 'USER_NOT_FOUND');
  }
  return user;
}

async function writeAdminAudit({ db, request, adminUserId, action, targetType, targetId, reason, metadata = {} }) {
  await recordAdminAuditLog({
    db,
    request,
    adminUserId,
    action,
    targetType,
    targetId,
    metadata: {
      ...metadata,
      reason
    }
  });
}

async function writeModerationAction({ db, adminUserId, action, targetType, targetId, reason, metadata = {} }) {
  await db.insert(adminModerationActions).values({
    adminUserId,
    action,
    targetType,
    targetId: String(targetId),
    reason,
    metadata
  });
}

export async function inviteUser({ db, request, adminUserId, payload }) {
  const email = String(payload.email || '').trim().toLowerCase();
  const reason = requireReason(payload.reason);
  assertConfirmationMatches(email, payload.confirmTarget || payload.confirmEmail);

  if (!email || !email.includes('@')) {
    throw createAdminControlError('A valid email is required.', 400, 'INVALID_EMAIL');
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    throw createAdminControlError('A user with this email already exists.', 409, 'USER_EXISTS');
  }

  const role = ADMIN_ROLES.includes(payload.role) ? payload.role : 'user';
  const created = await db
    .insert(users)
    .values({
      email,
      name: String(payload.name || '').trim() || null,
      authProvider: 'admin_invite',
      role,
      status: 'active'
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status
    });

  await requestPasswordReset({ db, email });
  await writeAdminAudit({
    db,
    request,
    adminUserId,
    action: 'invite_user',
    targetType: 'user',
    targetId: created[0].id,
    reason,
    metadata: { email, role }
  });

  return created[0];
}

export async function editUser({ db, request, adminUserId, userId, payload }) {
  const target = await findAdminTargetUser(db, userId);
  const reason = requireReason(payload.reason);
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) updates.name = String(payload.name || '').trim() || null;
  if (payload.email) {
    const email = String(payload.email).trim().toLowerCase();
    if (email !== target.email) {
      assertConfirmationMatches(target.email, payload.confirmTarget);
      const existing = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), sql`${users.id} <> ${userId}`)).limit(1);
      if (existing[0]) throw createAdminControlError('That email is already used by another account.', 409, 'EMAIL_EXISTS');
      updates.email = email;
    }
  }

  if (!Object.keys(updates).length) {
    throw createAdminControlError('No editable account fields were provided.', 400, 'NO_UPDATES');
  }

  const updated = await db.update(users).set(updates).where(eq(users.id, userId)).returning({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    status: users.status
  });

  await writeAdminAudit({
    db,
    request,
    adminUserId,
    action: 'edit_user',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: { changedFields: Object.keys(updates), previousEmail: target.email }
  });

  return updated[0];
}

export async function changeUserRole({ db, request, adminUserId, userId, payload }) {
  const target = await findAdminTargetUser(db, userId);
  const role = String(payload.role || '').trim();
  const reason = requireReason(payload.reason);

  if (!ADMIN_ROLES.includes(role)) {
    throw createAdminControlError('Role is not supported.', 400, 'INVALID_ROLE');
  }
  if (target.role === 'admin' && role !== 'admin') {
    assertNotSelfTarget({ adminUserId, targetUserId: userId, action: 'demote' });
  }
  assertConfirmationMatches(target.email, payload.confirmTarget);

  const updated = await db.update(users).set({ role }).where(eq(users.id, userId)).returning({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    status: users.status
  });

  await writeAdminAudit({
    db,
    request,
    adminUserId,
    action: 'change_user_role',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: { previousRole: target.role, role }
  });

  return updated[0];
}

export async function changeUserStatus({ db, request, adminUserId, userId, payload }) {
  const target = await findAdminTargetUser(db, userId);
  const status = String(payload.status || '').trim();
  const reason = requireReason(payload.reason);

  if (!ADMIN_USER_STATUSES.includes(status)) {
    throw createAdminControlError('Status is not supported.', 400, 'INVALID_STATUS');
  }
  if (['blocked', 'deactivated'].includes(status)) {
    assertNotSelfTarget({ adminUserId, targetUserId: userId, action: status === 'blocked' ? 'block' : 'deactivate' });
    assertConfirmationMatches(target.email, payload.confirmTarget);
  }

  const updated = await db.update(users).set({ status }).where(eq(users.id, userId)).returning({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    status: users.status
  });

  if (['blocked', 'deactivated'].includes(status)) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  await writeAdminAudit({
    db,
    request,
    adminUserId,
    action: 'change_user_status',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: { previousStatus: target.status, status }
  });

  notifyAdminAccountChange({
    db,
    targetUserId: userId,
    adminUserId,
    type: 'admin_account_status',
    message: `Your account status was changed from ${target.status || 'active'} to ${status}. Reason: ${reason}`
  });

  return updated[0];
}

export async function setUserRestrictions({ db, request, adminUserId, userId, payload }) {
  const target = await findAdminTargetUser(db, userId);
  const reason = requireReason(payload.reason);
  const restrictions = Array.isArray(payload.restrictions) ? payload.restrictions : [];

  if (!restrictions.length) {
    throw createAdminControlError('At least one restriction update is required.', 400, 'NO_RESTRICTIONS');
  }
  if (restrictions.some((item) => item.feature === 'login' && item.isRestricted)) {
    assertNotSelfTarget({ adminUserId, targetUserId: userId, action: 'restrict login for' });
    assertConfirmationMatches(target.email, payload.confirmTarget);
  }

  const changed = [];
  const previousRows = await db
    .select({
      feature: adminRestrictions.feature,
      isRestricted: adminRestrictions.isRestricted
    })
    .from(adminRestrictions)
    .where(eq(adminRestrictions.userId, userId));
  const previousState = new Map(previousRows.map((row) => [row.feature, Boolean(row.isRestricted)]));

  for (const item of restrictions) {
    const feature = normalizeRestrictionFeature(item.feature);
    const isRestricted = Boolean(item.isRestricted);
    const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
    await db
      .insert(adminRestrictions)
      .values({
        userId,
        feature,
        isRestricted,
        reason,
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
        createdBy: adminUserId,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [adminRestrictions.userId, adminRestrictions.feature],
        set: {
          isRestricted,
          reason,
          expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
          createdBy: adminUserId,
          updatedAt: new Date()
        }
      });
    changed.push({ feature, isRestricted });
  }

  const status = changed.some((item) => item.isRestricted) && target.status === 'active' ? 'restricted' : target.status;
  if (status !== target.status) {
    await db.update(users).set({ status }).where(eq(users.id, userId));
  }

  await writeAdminAudit({
    db,
    request,
    adminUserId,
    action: 'set_user_restrictions',
    targetType: 'user',
    targetId: userId,
    reason,
    metadata: { restrictions: changed }
  });

  const materialChanges = changed.filter((item) => previousState.get(item.feature) !== item.isRestricted);
  if (materialChanges.length) {
    const restrictedFeatures = materialChanges.filter((item) => item.isRestricted).map((item) => formatFeatureLabel(item.feature));
    const restoredFeatures = materialChanges.filter((item) => !item.isRestricted).map((item) => formatFeatureLabel(item.feature));
    const segments = [];
    if (restrictedFeatures.length) segments.push(`restricted: ${restrictedFeatures.join(', ')}`);
    if (restoredFeatures.length) segments.push(`restored: ${restoredFeatures.join(', ')}`);

    notifyAdminAccountChange({
      db,
      targetUserId: userId,
      adminUserId,
      type: 'admin_restriction_update',
      message: `Admin updated your account restrictions (${segments.join('; ')}). Reason: ${reason}`
    });
  }

  return listRestrictionsForUser(db, userId);
}

export async function listRestrictionsForUser(db, userId) {
  const rows = await db
    .select()
    .from(adminRestrictions)
    .where(eq(adminRestrictions.userId, userId))
    .orderBy(adminRestrictions.feature);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    feature: row.feature,
    isRestricted: row.isRestricted,
    reason: row.reason,
    expiresAt: serializeDate(row.expiresAt),
    createdBy: row.createdBy,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt)
  }));
}

export async function applyContentAction({ db, request, adminUserId, contentType, contentId, payload }) {
  if (!ADMIN_CONTENT_TYPES.includes(contentType)) {
    throw createAdminControlError('Content type is not supported.', 400, 'INVALID_CONTENT_TYPE');
  }

  const action = String(payload.action || '').trim();
  const reason = requireReason(payload.reason);
  assertConfirmationMatches(contentId, payload.confirmTarget);

  const metadata = {};
  let updatedCount = 0;

  if (contentType === 'post') {
    if (!['hide', 'unhide', 'delete'].includes(action)) throw createAdminControlError('Post action is not supported.', 400, 'INVALID_ACTION');
    const visible = action === 'unhide';
    const result = await db.update(posts).set({ isVisible: action === 'delete' ? false : visible, updatedAt: new Date() }).where(eq(posts.id, contentId)).returning({ userId: posts.userId });
    updatedCount = result.length;
    metadata.ownerUserId = result[0]?.userId || null;
  } else if (contentType === 'community_win') {
    if (!['hide', 'unhide', 'delete'].includes(action)) throw createAdminControlError('Win action is not supported.', 400, 'INVALID_ACTION');
    const result = await db.update(communityWins).set({ isVisible: action === 'delete' ? false : action === 'unhide' }).where(eq(communityWins.id, contentId)).returning({ userId: communityWins.userId });
    updatedCount = result.length;
    metadata.ownerUserId = result[0]?.userId || null;
  } else if (contentType === 'profile') {
    if (!['hide', 'unhide'].includes(action)) throw createAdminControlError('Profile action is not supported.', 400, 'INVALID_ACTION');
    const result = await db.update(userProfiles).set({ isPublic: action === 'unhide', updatedAt: new Date() }).where(eq(userProfiles.userId, contentId)).returning({ userId: userProfiles.userId });
    updatedCount = result.length;
    metadata.ownerUserId = result[0]?.userId || null;
  } else {
    if (action !== 'delete') throw createAdminControlError('This content type only supports delete in v1.', 400, 'INVALID_ACTION');
    const tableByType = {
      comment: postComments,
      analysis: analyses,
      saved_job: savedJobs,
      application_log: applicationLogs,
      rejection_log: rejectionLogs,
      generated_content: generatedContent
    };
    const table = tableByType[contentType];
    const result = await db.delete(table).where(eq(table.id, contentId)).returning({ id: table.id });
    updatedCount = result.length;
  }

  if (!updatedCount) {
    throw createAdminControlError('Target content was not found.', 404, 'CONTENT_NOT_FOUND');
  }

  await writeModerationAction({ db, adminUserId, action, targetType: contentType, targetId: contentId, reason, metadata });
  await writeAdminAudit({ db, request, adminUserId, action: `content_${action}`, targetType: contentType, targetId: contentId, reason, metadata });

  return { contentType, contentId, action, updatedCount };
}

export async function listModerationQueue(db, { contentType = 'post', limit = 40, search = '' } = {}) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const trimmedSearch = String(search || '').trim();

  if (contentType === 'community_win') {
    const conditions = trimmedSearch ? [or(ilike(communityWins.roleTitle, `%${trimmedSearch}%`), ilike(communityWins.message, `%${trimmedSearch}%`), ilike(users.email, `%${trimmedSearch}%`))] : [];
    const rows = await db
      .select({
        id: communityWins.id,
        ownerId: communityWins.userId,
        ownerEmail: users.email,
        type: sql`'community_win'`,
        title: communityWins.roleTitle,
        body: communityWins.message,
        status: sql`case when ${communityWins.isVisible} then 'visible' else 'hidden' end`,
        createdAt: communityWins.createdAt
      })
      .from(communityWins)
      .leftJoin(users, eq(communityWins.userId, users.id))
      .where(conditions.length ? and(...conditions) : sql`true`)
      .orderBy(desc(communityWins.createdAt))
      .limit(normalizedLimit);
    return rows.map((row) => ({ ...row, createdAt: serializeDate(row.createdAt) }));
  }

  if (contentType === 'comment') {
    const conditions = trimmedSearch ? [or(ilike(postComments.content, `%${trimmedSearch}%`), ilike(users.email, `%${trimmedSearch}%`))] : [];
    const rows = await db
      .select({
        id: postComments.id,
        ownerId: postComments.userId,
        ownerEmail: users.email,
        type: sql`'comment'`,
        title: sql`'Comment'`,
        body: postComments.content,
        status: sql`'visible'`,
        createdAt: postComments.createdAt
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.userId, users.id))
      .where(conditions.length ? and(...conditions) : sql`true`)
      .orderBy(desc(postComments.createdAt))
      .limit(normalizedLimit);
    return rows.map((row) => ({ ...row, createdAt: serializeDate(row.createdAt) }));
  }

  const conditions = [inArray(posts.postType, ['career_update', 'job_tip', 'job_share', 'analysis_share', 'question'])];
  if (trimmedSearch) conditions.push(or(ilike(posts.content, `%${trimmedSearch}%`), ilike(users.email, `%${trimmedSearch}%`)));
  const rows = await db
    .select({
      id: posts.id,
      ownerId: posts.userId,
      ownerEmail: users.email,
      type: posts.postType,
      title: posts.postType,
      body: posts.content,
      status: sql`case when ${posts.isVisible} then 'visible' else 'hidden' end`,
      createdAt: posts.createdAt
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(normalizedLimit);

  return rows.map((row) => ({ ...row, createdAt: serializeDate(row.createdAt) }));
}

export async function listModerationActions(db, { limit = 40 } = {}) {
  const rows = await db
    .select({
      id: adminModerationActions.id,
      adminUserId: adminModerationActions.adminUserId,
      adminEmail: users.email,
      action: adminModerationActions.action,
      targetType: adminModerationActions.targetType,
      targetId: adminModerationActions.targetId,
      reason: adminModerationActions.reason,
      metadata: adminModerationActions.metadata,
      createdAt: adminModerationActions.createdAt
    })
    .from(adminModerationActions)
    .leftJoin(users, eq(adminModerationActions.adminUserId, users.id))
    .orderBy(desc(adminModerationActions.createdAt))
    .limit(Math.min(Math.max(Number(limit) || 40, 1), 100));

  return rows.map((row) => ({
    ...row,
    metadata: JSON.stringify(row.metadata || {}),
    createdAt: serializeDate(row.createdAt)
  }));
}
