import { and, eq } from 'drizzle-orm';
import { userProfiles, users } from '../db/schema.js';

const SVG_WIDTH = 460;
const SVG_HEIGHT = 180;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildBadgeSvg({ level, statusText, xp = 0, isPublic = true }) {
  const safeStatus = escapeXml(statusText);
  const progress = (xp % 1000) / 1000;
  const xpCurrent = xp % 1000;
  
  // Dynamic Tier visual themes based on user's level
  let theme = {
    primary: '#38bdf8',
    secondary: '#10b981',
    name: 'VANGUARD INITIATE',
    bg1: '#0c4a6e',
    bg2: '#064e3b',
    auraSpeed: '8s'
  };

  if (level >= 10) {
    theme = {
      primary: '#a855f7',
      secondary: '#f43f5e',
      name: 'APEX ARCHITECT',
      bg1: '#4c1d95',
      bg2: '#9f1239',
      auraSpeed: '4s'
    };
  } else if (level >= 5) {
    theme = {
      primary: '#eab308',
      secondary: '#f97316',
      name: 'ELITE ENGINEER',
      bg1: '#713f12',
      bg2: '#7c2d12',
      auraSpeed: '6s'
    };
  }

  if (!isPublic) {
    theme = {
      primary: '#94a3b8',
      secondary: '#475569',
      name: 'STEALTH MODE',
      bg1: '#1e293b',
      bg2: '#0f172a',
      auraSpeed: '15s'
    };
  }

  const progressBarWidth = 220;
  const progressFill = Math.max(8, progressBarWidth * progress);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Aptico Developer Stat Card">
  <defs>
    <linearGradient id="themeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.primary}" />
      <stop offset="100%" stop-color="${theme.secondary}" />
    </linearGradient>

    <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    
    <linearGradient id="borderPulse" x1="0%" y1="0%" x2="200%" y2="200%">
      <stop offset="0%" stop-color="${theme.primary}">
        <animate attributeName="stop-color" values="${theme.primary};${theme.secondary};${theme.primary}" dur="${theme.auraSpeed}" repeatCount="indefinite" />
      </stop>
      <stop offset="50%" stop-color="${theme.secondary}">
        <animate attributeName="stop-color" values="${theme.secondary};${theme.primary};${theme.secondary}" dur="${theme.auraSpeed}" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stop-color="${theme.primary}" />
    </linearGradient>

    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0" />
      <stop offset="50%" stop-color="#fff" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#fff" stop-opacity="0" />
    </linearGradient>

    <mask id="textMask">
      <text x="140" y="45" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" letter-spacing="2">APTICO</text>
    </mask>

    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur1" />
      <feGaussianBlur stdDeviation="6" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="dropShadow">
      <feDropShadow dx="3" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.9"/>
    </filter>

    <pattern id="hexGrid" width="20" height="34.64" patternUnits="userSpaceOnUse" patternTransform="scale(0.5)">
      <path d="M 20 0 L 10 17.32 L 0 0 Z M 0 34.64 L 10 17.32 L 20 34.64 Z" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.04" />
    </pattern>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect y="0" width="4" height="2" fill="#000" opacity="0.15" />
    </pattern>
  </defs>

  <g transform="translate(20, 20)">
    <g filter="url(#dropShadow)">
      <path d="M 0 15 L 15 0 L 405 0 L 420 15 L 420 125 L 405 140 L 15 140 L 0 125 Z" fill="url(#bgGlow)" stroke="url(#borderPulse)" stroke-width="2" />
      <path d="M 2 16 L 16 2 L 404 2 L 418 16 L 418 124 L 404 138 L 16 138 L 2 124 Z" fill="url(#hexGrid)" />
    </g>

    <!-- Animated Ambient Orbs -->
    <circle cx="50" cy="70" r="50" fill="${theme.bg1}" opacity="0.6" filter="url(#neonGlow)">
      <animate attributeName="r" values="40;60;40" dur="${theme.auraSpeed}" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="70" r="70" fill="${theme.bg2}" opacity="0.4" filter="url(#neonGlow)">
      <animate attributeName="cx" values="300;390;300" dur="${theme.auraSpeed}" repeatCount="indefinite" />
    </circle>

    <!-- Geometric Tech Decals -->
    <path d="M 400 15 L 400 30 M 400 110 L 400 125" stroke="#334155" stroke-width="3" stroke-linecap="round" />
    <path d="M 15 15 L 30 15 M 15 125 L 30 125" stroke="#334155" stroke-width="3" stroke-linecap="round" />
    <rect x="375" y="10" width="4" height="4" fill="${theme.primary}" opacity="0.8" />
    <rect x="385" y="10" width="4" height="4" fill="${theme.secondary}" opacity="0.8" />

    <!-- LEFT PANEL: LEVEL CREST -->
    <g transform="translate(70, 70)">
      <!-- Rotating Outer Hexagons -->
      <polygon points="43,-25 43,25 0,50 -43,25 -43,-25 0,-50" fill="#020617" fill-opacity="0.8" stroke="url(#themeGrad)" stroke-width="3" stroke-dasharray="15 35" filter="url(#neonGlow)">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${theme.auraSpeed}" repeatCount="indefinite" />
      </polygon>
      <polygon points="53,-30.5 53,30.5 0,61 -53,30.5 -53,-30.5 0,-61" fill="none" stroke="${theme.secondary}" stroke-width="1" stroke-dasharray="2 12" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="12s" repeatCount="indefinite" />
      </polygon>
      <!-- Solid Core Hexagon -->
      <polygon points="38,-22 38,22 0,44 -38,22 -38,-22 0,-44" fill="#0f172a" stroke="#1e293b" stroke-width="2" />
      
      <text x="0" y="-12" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="1">LEVEL</text>
      <!-- Level Number Output -->
      <text x="0" y="20" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" filter="url(#neonGlow)">
        ${level}
      </text>
    </g>

    <!-- RIGHT PANEL: INFO & STATS -->
    <g>
      <text x="140" y="45" fill="#1e293b" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" letter-spacing="2">APTICO</text>
      
      <!-- Shimmering Light Text Animation -->
      <rect x="0" y="0" width="200%" height="60" fill="url(#shine)" mask="url(#textMask)">
        <animate attributeName="x" from="-100%" to="100%" dur="3.5s" repeatCount="indefinite" />
      </rect>

      <!-- Rank Tag (Reacts strictly to Level Theme) -->
      <rect x="140" y="55" width="100" height="18" rx="4" fill="url(#themeGrad)" opacity="0.15" />
      <text x="145" y="68" fill="${theme.primary}" font-family="monospace, Courier New" font-size="10" font-weight="700" letter-spacing="1" filter="url(#neonGlow)">// ${theme.name}</text>

      <text x="140" y="95" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">XP PROGRESS</text>
      <text x="360" y="94" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="10">${xpCurrent} / 1000</text>
      
      <!-- Animated XP Bar -->
      <rect x="140" y="102" width="${progressBarWidth}" height="6" rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
      <rect x="140" y="102" width="0" height="6" rx="3" fill="url(#themeGrad)">
        <animate attributeName="width" from="0" to="${progressFill}" dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
      </rect>
      <circle cx="140" cy="105" r="2.5" fill="#ffffff" filter="url(#neonGlow)">
        <animate attributeName="cx" from="140" to="${140 + progressFill}" dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
      </circle>
    </g>

    <!-- Holographic Target / Status Tag -->
    <g transform="translate(290, 25)">
      <rect x="0" y="0" width="110" height="22" rx="11" fill="${isPublic ? '#064e3b' : '#1e293b'}" stroke="${isPublic ? '#10b981' : '#475569'}" stroke-opacity="0.5" />
      <circle cx="12" cy="11" r="4" fill="${isPublic ? '#10b981' : '#94a3b8'}" filter="url(#neonGlow)">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x="22" y="15" fill="${isPublic ? '#ecfdf5' : '#f8fafc'}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" letter-spacing="0.5">${safeStatus}</text>
    </g>

    <!-- Complete overlay of retro terminal scanlines -->
    <path d="M 0 15 L 15 0 L 405 0 L 420 15 L 420 125 L 405 140 L 15 140 L 0 125 Z" fill="url(#scanlines)" />
  </g>
</svg>`;
}

function computeLevel(resilienceXp) {
  const safeXp = Math.max(0, Number(resilienceXp) || 0);
  return Math.floor(safeXp / 1000) + 1;
}

function sendResponse(request, reply, svgCode) {
  const acceptHeader = request.headers.accept || '';
  const isDirectBrowserVisit = acceptHeader.includes('text/html');

  if (isDirectBrowserVisit) {
      // User typed URL directly into address bar - return a gorgeous HTML preview
      return reply.type('text/html').send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Aptico Developer Badge Preview</title>
              <style>
                  body {
                      margin: 0;
                      padding: 0;
                      background: radial-gradient(circle at center, #1e293b, #020617);
                      height: 100vh;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      font-family: system-ui, -apple-system, sans-serif;
                      color: #94a3b8;
                  }
                  .preview-container {
                      filter: drop-shadow(0 25px 25px rgba(0,0,0,0.6));
                      transition: transform 0.4s ease;
                      border-radius: 20px;
                  }
                  .preview-container:hover {
                      transform: translateY(-8px);
                  }
                  .notice {
                      margin-top: 3rem;
                      font-size: 0.85rem;
                      font-weight: 500;
                      background: rgba(15, 23, 42, 0.5);
                      padding: 10px 20px;
                      border-radius: 12px;
                      border: 1px solid rgba(255,255,255,0.1);
                      color: #cbd5e1;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                  }
                  .notice code {
                      background: rgba(0,0,0,0.3);
                      padding: 4px 8px;
                      border-radius: 6px;
                      margin-left: 10px;
                      color: #38bdf8;
                  }
              </style>
          </head>
          <body>
              <div class="preview-container">
                  ${svgCode}
              </div>
              <div class="notice">
                  ✓ Ready to use! Embed in GitHub via markdown: <code>![Aptico Badge](${request.url})</code>
              </div>
          </body>
          </html>
      `);
  }

  // They used an <img> tag (e.g. GitHub Readme). Return raw transparent SVG!
  return reply.header('Cache-Control', 'public, max-age=120').type('image/svg+xml').send(svgCode);
}

export async function getBadgeSvgController(request, reply) {
  try {
    const username = String(request.params?.username || '').trim().toLowerCase();

    if (!username) {
      return sendResponse(request, reply, buildBadgeSvg({
        level: 0,
        statusText: 'Setup Required',
        xp: 0,
        isPublic: false
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
      return sendResponse(request, reply, buildBadgeSvg({
            level: 0,
            statusText: 'Profile Not Found',
            xp: 0,
            isPublic: false
          }));
    }

    const xp = Math.max(0, Number(profile.resilienceXp) || 0);
    const level = computeLevel(xp);
    const statusText = profile.isPublic ? 'OPEN TO WORK' : 'PRIVATE MODE';

    return sendResponse(request, reply, buildBadgeSvg({
          level,
          statusText,
          xp,
          isPublic: profile.isPublic
      }));
  } catch (error) {
    request.log.error(error);
    return sendResponse(request, reply, buildBadgeSvg({
          level: 0,
          statusText: 'Tracker Error',
          xp: 0,
          isPublic: false
        }));
  }
}
