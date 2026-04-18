import { and, eq } from 'drizzle-orm';
import { userProfiles, users } from '../db/schema.js';

const SVG_WIDTH = 260;
const SVG_HEIGHT = 44;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildBadgeSvg({ label, accent, textColor = '#e5e7eb', pillFill = '#0f172a' }) {
  const safeLabel = escapeXml(label);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${safeLabel}">
  <defs>
    <linearGradient id="apticoBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#1f2937" />
    </linearGradient>
  </defs>
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="12" fill="url(#apticoBadgeBg)" />
  <circle cx="24" cy="22" r="7" fill="${accent}" />
  <rect x="40" y="10" width="${SVG_WIDTH - 50}" height="24" rx="12" fill="${pillFill}" fill-opacity="0.52" />
  <text x="54" y="28" fill="${textColor}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14" font-weight="700">${safeLabel}</text>
</svg>`;
}

function computeLevel(resilienceXp) {
  const safeXp = Math.max(0, Number(resilienceXp) || 0);
  return Math.floor(safeXp / 1000) + 1;
}

export async function getBadgeSvgController(request, reply) {
  try {
    const username = String(request.params?.username || '').trim().toLowerCase();

    if (!username) {
      return reply.code(400).type('image/svg+xml').send(buildBadgeSvg({
        label: 'Aptico badge unavailable',
        accent: '#f59e0b'
      }));
    }

    const rows = await request.server.db
      .select({
        username: userProfiles.username,
        isPublic: userProfiles.isPublic,
        resilienceXp: users.resilienceXp
      })
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.userId, users.id))
      .where(eq(userProfiles.username, username))
      .limit(1);

    const profile = rows[0];

    if (!profile) {
      return reply
        .code(404)
        .header('Cache-Control', 'no-store')
        .type('image/svg+xml')
        .send(
          buildBadgeSvg({
            label: 'Aptico profile not found',
            accent: '#ef4444'
          })
        );
    }

    const level = computeLevel(profile.resilienceXp);
    const label = profile.isPublic ? `Open to Work (Lvl ${level})` : `Profile Private (Lvl ${level})`;
    const accent = profile.isPublic ? '#4ade80' : '#94a3b8';

    return reply
      .header('Cache-Control', 'public, max-age=300')
      .type('image/svg+xml')
      .send(
        buildBadgeSvg({
          label,
          accent,
          textColor: profile.isPublic ? '#dcfce7' : '#e2e8f0',
          pillFill: profile.isPublic ? '#0f3b2f' : '#334155'
        })
      );
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .header('Cache-Control', 'no-store')
      .type('image/svg+xml')
      .send(
        buildBadgeSvg({
          label: 'Aptico badge error',
          accent: '#ef4444'
        })
      );
  }
}
