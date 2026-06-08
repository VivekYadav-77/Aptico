import crypto from 'node:crypto';
import { lt, sql } from 'drizzle-orm';
import {
  adminAuditLogs,
  analyticsDailyAggregates,
  analyticsEvents,
  visitorSessions
} from '../../db/schema.js';
import { env } from '../../config/env.js';

export const ANALYTICS_EVENT_TYPES = new Set([
  'page_view',
  'signup',
  'login',
  'logout',
  'analysis_created',
  'job_saved',
  'application_logged',
  'rejection_logged',
  'post_created',
  'comment_created',
  'squad_joined',
  'admin_action',
  'api_error'
]);

const SECURITY_EVENT_TYPES = new Set(['login', 'logout', 'signup', 'admin_action', 'api_error']);
const SENSITIVE_KEY_PATTERN = /(password|token|secret|resume|jdText|resumeText|contentText|credential|cookie|authorization)/i;
const MAX_METADATA_KEYS = 16;
const MAX_METADATA_STRING_LENGTH = 180;

export function isAllowedAnalyticsEvent(eventType) {
  return ANALYTICS_EVENT_TYPES.has(eventType);
}

function hashValue(value) {
  if (!value) {
    return null;
  }

  return crypto.createHash('sha256').update(`${env.jwtSecret}:${value}`).digest('hex');
}

function cleanString(value, maxLength = 240) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function sanitizeAnalyticsMetadata(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const metadata = {};

  for (const [key, value] of Object.entries(input).slice(0, MAX_METADATA_KEYS)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string') {
      metadata[key] = value.slice(0, MAX_METADATA_STRING_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      metadata[key] = value;
    } else if (Array.isArray(value)) {
      metadata[key] = value.slice(0, 8).map((item) => String(item).slice(0, 80));
    }
  }

  return metadata;
}

function parseUserAgent(userAgent = '') {
  const ua = String(userAgent || '');
  const lowered = ua.toLowerCase();
  const deviceCategory = /mobile|android|iphone|ipod/.test(lowered)
    ? 'mobile'
    : /ipad|tablet/.test(lowered)
      ? 'tablet'
      : 'desktop';

  let browserName = 'Unknown';
  if (/edg\//i.test(ua)) browserName = 'Edge';
  else if (/chrome|crios/i.test(ua)) browserName = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browserName = 'Firefox';
  else if (/safari/i.test(ua)) browserName = 'Safari';

  return { deviceCategory, browserName };
}

function decodeHeaderValue(value) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) {
    return null;
  }

  try {
    return decodeURIComponent(String(rawValue)).slice(0, 120);
  } catch {
    return String(rawValue).slice(0, 120);
  }
}

function deriveGeo(headers = {}) {
  return {
    country: decodeHeaderValue(headers['cf-ipcountry'] || headers['x-vercel-ip-country']) || 'Unknown',
    region: decodeHeaderValue(headers['x-vercel-ip-country-region'] || headers['cf-region']) || null,
    city: decodeHeaderValue(headers['x-vercel-ip-city'] || headers['cf-ipcity']) || null
  };
}

function deriveSource(referrer) {
  if (!referrer) {
    return 'Direct';
  }

  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, '');
    return hostname || 'Referral';
  } catch {
    return 'Referral';
  }
}

async function upsertVisitorSession(db, payload) {
  if (!payload.visitorId || !payload.sessionKey) {
    return;
  }

  await db
    .insert(visitorSessions)
    .values({
      visitorId: payload.visitorId,
      sessionKey: payload.sessionKey,
      userId: payload.userId || null,
      ipHash: payload.ipHash,
      userAgentHash: payload.userAgentHash,
      deviceCategory: payload.deviceCategory,
      browserName: payload.browserName,
      country: payload.country,
      region: payload.region,
      city: payload.city,
      analyticsOptOut: Boolean(payload.analyticsOptOut)
    })
    .onConflictDoUpdate({
      target: visitorSessions.sessionKey,
      set: {
        userId: payload.userId || null,
        lastSeenAt: new Date(),
        deviceCategory: payload.deviceCategory,
        browserName: payload.browserName,
        country: payload.country,
        region: payload.region,
        city: payload.city,
        analyticsOptOut: Boolean(payload.analyticsOptOut)
      }
    });
}

async function incrementDailyAggregate(db, event) {
  const dateValue = new Date().toISOString().slice(0, 10);
  const path = event.path || '';
  const country = event.country || 'Unknown';

  await db
    .insert(analyticsDailyAggregates)
    .values({
      date: dateValue,
      eventType: event.eventType,
      path,
      country,
      eventCount: 1,
      uniqueVisitors: event.visitorId ? 1 : 0,
      uniqueUsers: event.userId ? 1 : 0
    })
    .onConflictDoUpdate({
      target: [
        analyticsDailyAggregates.date,
        analyticsDailyAggregates.eventType,
        analyticsDailyAggregates.path,
        analyticsDailyAggregates.country
      ],
      set: {
        eventCount: sql`${analyticsDailyAggregates.eventCount} + 1`,
        updatedAt: new Date()
      }
    });
}

export async function recordAnalyticsEvent({
  db,
  request,
  eventType,
  userId = null,
  visitorId = null,
  sessionKey = null,
  path = null,
  referrer = null,
  metadata = {},
  analyticsOptOut = false,
  force = false
}) {
  if (!db || !isAllowedAnalyticsEvent(eventType)) {
    return { recorded: false };
  }

  if (analyticsOptOut && !force && !SECURITY_EVENT_TYPES.has(eventType)) {
    return { recorded: false, skipped: 'analytics_opt_out' };
  }

  const headers = request?.headers || {};
  const userAgent = headers['user-agent'] || '';
  const parsedAgent = parseUserAgent(userAgent);
  const geo = deriveGeo(headers);
  const safeReferrer = cleanString(referrer || headers.referer || headers.referrer, 500);
  const safePath = cleanString(path, 500);
  const event = {
    eventType,
    userId,
    visitorId: cleanString(visitorId, 80),
    sessionKey: cleanString(sessionKey, 80),
    path: safePath,
    referrer: safeReferrer,
    source: deriveSource(safeReferrer),
    deviceCategory: parsedAgent.deviceCategory,
    browserName: parsedAgent.browserName,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    metadata: sanitizeAnalyticsMetadata(metadata)
  };

  await upsertVisitorSession(db, {
    ...event,
    ipHash: hashValue(request?.ip),
    userAgentHash: hashValue(userAgent),
    analyticsOptOut
  });

  const [insertedEvent] = await db.insert(analyticsEvents).values(event).returning({ id: analyticsEvents.id });
  await incrementDailyAggregate(db, event);

  return { recorded: true, id: insertedEvent?.id || null };
}

export async function recordAdminAuditLog({
  db,
  adminUserId,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
  request = null
}) {
  if (!db) {
    return { recorded: false };
  }

  const safeMetadata = sanitizeAnalyticsMetadata(metadata);
  const [row] = await db
    .insert(adminAuditLogs)
    .values({
      adminUserId,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      metadata: safeMetadata
    })
    .returning({ id: adminAuditLogs.id });

  await recordAnalyticsEvent({
    db,
    request,
    eventType: 'admin_action',
    userId: adminUserId,
    metadata: {
      action,
      targetType,
      targetId
    },
    force: true
  });

  return { recorded: true, id: row?.id || null };
}

export async function cleanupOldAnalyticsEvents(db, retentionDays = 90) {
  if (!db) {
    return { deletedCount: 0 };
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const deletedRows = await db
    .delete(analyticsEvents)
    .where(lt(analyticsEvents.createdAt, cutoff))
    .returning({ id: analyticsEvents.id });

  return { deletedCount: deletedRows.length, cutoff: cutoff.toISOString() };
}
