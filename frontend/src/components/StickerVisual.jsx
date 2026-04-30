import React from 'react';

/**
 * StickerVisual renders a high-fidelity SVG design based on a visualId.
 * Each design is crafted to be unique and indicative of its meaning in Aptico.
 */
export default function StickerVisual({ visualId, color = 'var(--accent)', size = 48, rarity = 'common', tier = 1, subVariant = 'default', id = 'anon' }) {
  const strokeWidth = 1.8 + (tier * 0.1); 
  
  // Deterministic seed based on sticker ID for unique procedural "greebles"
  const getSeed = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };
  const seed = getSeed(id);

  // Procedural Decorator: adds unique flair elements
  const renderDecorations = () => {
    const elements = [];
    const count = (seed % 3) + 1;
    for (let i = 0; i < count; i++) {
      const angle = ((seed + i * 137) % 360);
      const radius = 10 + (seed % 3);
      const x = 12 + radius * Math.cos(angle * Math.PI / 180);
      const y = 12 + radius * Math.sin(angle * Math.PI / 180);
      
      if (tier >= 2) {
        elements.push(
          <circle 
            key={`dec-${i}`} 
            cx={x} cy={y} 
            r={0.8 + (tier * 0.1)} 
            fill={color} 
            opacity="0.6" 
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        );
      }
    }
    return elements;
  };

  // Base shapes / chassis templates
  const renderCore = () => {
    switch (visualId) {
      /* ── XP MILESTONES ── */
      case 'sprout':
        if (subVariant === 'minimal') {
          return (
            <g>
              <path d="M12 22V15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <circle cx="12" cy="14" r="2" fill={color} />
            </g>
          );
        }
        if (subVariant === 'dual') {
          return (
            <g>
              <path d="M12 22V12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <path d="M12 12C12 12 15 9 18 9C21 9 22 12 22 12C22 12 19 15 16 15C13 15 12 12 12 12Z" fill={`${color}20`} stroke={color} />
              <path d="M12 12C12 12 9 9 6 9C3 9 2 12 2 12C2 12 5 15 8 15C11 15 12 12 12 12Z" fill={`${color}20`} stroke={color} />
            </g>
          );
        }
        return (
          <>
            <path d="M12 22V12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            {tier >= 1 && <path d="M12 12C12 12 15 9 18 9C21 9 22 12 22 12C22 12 19 15 16 15C13 15 12 12 12 12Z" fill={`${color}20`} stroke={color} />}
            {tier >= 2 && <path d="M12 12C12 12 9 9 6 9C3 9 2 12 2 12C2 12 5 15 8 15C11 15 12 12 12 12Z" fill={`${color}20`} stroke={color} />}
            {tier >= 3 && <path d="M12 8C12 8 15 5 18 5C21 5 22 8 22 8C22 8 19 11 16 11C13 11 12 8 12 8Z" fill={`${color}30`} stroke={color} />}
            <circle cx="12" cy="12" r={1.5 + (tier * 0.5)} fill={color} className="animate-pulse" />
          </>
        );
      case 'scout':
        if (subVariant === 'cross') {
          return (
            <g>
              <path d="M4 12H20M12 4V20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <circle cx="12" cy="12" r="4" stroke={color} fill="none" />
              <rect x="10" y="10" width="4" height="4" fill={color} />
            </g>
          );
        }
        if (subVariant === 'radar') {
          return (
            <g>
              <circle cx="12" cy="12" r="8" stroke={color} fill="none" strokeDasharray="2 4" className="animate-spin-slow" />
              <path d="M12 12L12 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2" fill={color} />
            </g>
          );
        }
        return (
          <>
            <circle cx="12" cy="12" r={8 + (tier * 0.2)} stroke={color} strokeWidth="1" strokeDasharray={`${tier} ${tier + 2}`} />
            <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke={color} />
            {tier >= 2 && <path d="M5 5L7 7M17 17L19 19M19 5L17 7M5 19L7 17" stroke={color} opacity="0.5" />}
            <path d="M12 7L10 12L12 17L14 12L12 7Z" fill={color} className="animate-spin-slow" style={{ transformOrigin: 'center', animationDuration: `${10 - (tier * 0.5)}s` }} />
          </>
        );
      case 'momentum':
        return (
          <>
            <circle cx="12" cy="12" r={3 + (tier * 0.5)} fill={`${color}30`} stroke={color} />
            {[0, 120, 240, 60, 180, 300].slice(0, Math.min(6, tier + 2)).map((deg) => (
              <path key={deg} d="M12 12L12 4C12 4 16 5 16 8C16 11 12 12 12 12Z" 
                fill={color} transform={`rotate(${deg} 12 12)`} className="animate-spin-linear" 
                style={{ animationDuration: `${4 - (tier * 0.1)}s` }} />
            ))}
          </>
        );
      case 'elite_hunter':
        return (
          <>
            <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke={color} fill={`${color}10`} />
            <circle cx="12" cy="12" r="5" stroke={color} />
            <circle cx="12" cy="12" r="2" fill={color} />
            <path d="M12 8V6M12 18V16M8 12H6M18 12H16" stroke={color} strokeLinecap="round" />
          </>
        );
      case 'apex':
        return (
          <>
            <path d="M5 18L3 10L8 13L12 5L16 13L21 10L19 18H5Z" fill={`${color}${10 + tier * 5}`} stroke={color} strokeWidth={strokeWidth} />
            <circle cx="12" cy="13" r={1 + (tier * 0.5)} fill={color} />
            {tier >= 2 && <circle cx="3" cy="10" r="1.5" fill={color} />}
            {tier >= 3 && <circle cx="21" cy="10" r="1.5" fill={color} />}
            {tier >= 4 && <path d="M8 13L12 8L16 13" stroke={color} fill="none" />}
          </>
        );
      case 'nebula':
        return (
          <>
            <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 17L5.5 21L8 13.5L2 9H9.5L12 2Z" fill={`${color}10`} stroke={color} />
            <circle cx="12" cy="12" r="8" stroke={color} strokeDasharray="1 3" className="animate-spin-slow" style={{ transformOrigin: 'center' }} />
            <circle cx="8" cy="8" r="1" fill={color} className="animate-pulse" />
            <circle cx="16" cy="15" r="1.5" fill={color} className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          </>
        );
      case 'deity':
        return (
          <g className="animate-spin-slow" style={{ transformOrigin: 'center' }}>
            <rect x="5" y="5" width="14" height="14" stroke={color} fill="none" transform="rotate(45 12 12)" />
            <rect x="5" y="5" width="14" height="14" stroke={color} fill="none" />
            <circle cx="12" cy="12" r="3" fill={color} />
            <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke={color} />
          </g>
        );

      /* ── RESILIENCE: STREAKS ── */
      case 'fire_low':
        return (
          <path d="M12 2C12 2 15 6 15 10C15 14 12 17 12 17C12 17 9 14 9 10C9 6 12 2 12 2Z" 
            fill={color} className="animate-float" />
        );
      case 'pulse':
        return (
          <>
            <path d="M2 12H6L9 5L15 19L18 12H22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" 
              className="animate-draw-loop" />
            <circle cx="12" cy="12" r="10" stroke={`${color}20`} strokeWidth="1" />
          </>
        );
      case 'flow':
        return (
          <g>
            <path d="M2 10C5 10 7 14 12 14C17 14 19 10 22 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
            <path d="M2 14C5 14 7 10 12 10C17 10 19 14 22 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" opacity="0.4" />
            <circle cx="12" cy="12" r="2" fill={color} className="animate-ping" />
          </g>
        );
      case 'century':
        return (
          <>
            <path d="M8 20V4H16V20" stroke={color} strokeWidth={strokeWidth} fill={`${color}10`} />
            <path d="M8 8H16M8 12H16M8 16H16" stroke={color} opacity="0.5" />
            <path d="M12 4L14 2H10L12 4Z" fill={color} />
            <path d="M6 20H18" stroke={color} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'solar':
        return (
          <>
            <circle cx="12" cy="12" r={5 + (tier * 0.5)} fill={color} />
            {[0, 45, 90, 135, 180, 225, 270, 315, 22, 67, 112, 157].slice(0, tier + 8).map((deg) => (
              <line key={deg} x1="12" y1={2 - (tier * 0.1)} x2="12" y2={5} stroke={color} strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r={9 + (tier * 0.2)} stroke={`${color}40`} strokeWidth="1" strokeDasharray="3 3" className="animate-spin-slow" style={{ transformOrigin: 'center' }} />
          </>
        );

      /* ── APPLICATIONS ── */
      case 'plane':
        return (
          <path d="M2 12L22 2L15 22L12 12L2 12Z" fill={`${color}20`} stroke={color} strokeLinejoin="round" className="animate-float" />
        );
      case 'rain':
        return (
          <>
            <path d="M12 3C15 3 18 5 18 8C18 11 12 15 12 15C12 15 6 11 6 8C6 5 9 3 12 3Z" fill={`${color}${10 + tier * 5}`} stroke={color} />
            {Array.from({ length: Math.min(6, tier + 2) }).map((_, i) => (
              <path key={i} d={`M${8 + i * 2} 18L${10 + i * 2} 21`} stroke={color} strokeLinecap="round" className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </>
        );
      case 'hub':
        return (
          <>
            <circle cx="12" cy="12" r={2 + (tier * 0.2)} fill={color} />
            {[0, 60, 120, 180, 240, 300, 30, 90, 150, 210, 270, 330].slice(0, Math.min(12, tier + 4)).map((deg) => (
              <g key={deg} transform={`rotate(${deg} 12 12)`}>
                <line x1="12" y1="12" x2="12" y2={4 - (tier * 0.1)} stroke={color} />
                <circle cx="12" cy={4 - (tier * 0.1)} r={1 + (tier * 0.1)} fill={`${color}40`} stroke={color} />
              </g>
            ))}
          </>
        );
      case 'broadcast':
        return (
          <>
            <path d="M12 22V10" stroke={color} strokeWidth="2" />
            <circle cx="12" cy="8" r="2" fill={color} />
            <path d="M8 6C7 7 7 9 8 10M5 4C3 6 3 10 5 12" stroke={color} fill="none" strokeLinecap="round" className="animate-ping-slow" />
            <path d="M16 6C17 7 17 9 16 10M19 4C21 6 21 10 19 12" stroke={color} fill="none" strokeLinecap="round" className="animate-ping-slow" style={{ animationDelay: '0.5s' }} />
          </>
        );

      /* ── REJECTIONS ── */
      case 'shield_base':
        return (
          <g>
            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill={`${color}10`} stroke={color} />
            {tier >= 2 && <path d="M12 5V19M4 10H20" stroke={color} opacity="0.3" />}
            {tier >= 4 && <circle cx="12" cy="12" r="4" stroke={color} opacity="0.5" />}
          </g>
        );
      case 'shield_iron':
        return (
          <>
            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill={`${color}20`} stroke={color} />
            <path d="M8 7L12 11L16 7" stroke={color} fill="none" />
          </>
        );
      case 'shield_titanium':
        return (
          <>
            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill={`${color}30`} stroke={color} strokeWidth="2" />
            <path d="M12 5V19M4 10H20" stroke={color} opacity="0.3" />
            <circle cx="12" cy="12" r="3" fill={color} />
          </>
        );
      case 'phoenix':
        return (
          <g className="animate-float">
            <path d="M12 19L10 14L2 10L10 8L12 2L14 8L22 10L14 14L12 19Z" fill={`${color}20`} stroke={color} />
            <path d="M12 15C10 12 8 12 6 14M18 14C16 12 14 12 12 15" stroke={color} fill="none" />
            <circle cx="12" cy="10" r="1" fill={color} />
          </g>
        );

      /* ── SOCIAL ── */
      case 'signal':
        return (
          <>
            <path d="M12 20V12" stroke={color} strokeWidth="2" />
            <path d="M9 10C9 10 10 8 12 8C14 8 15 10 15 10" stroke={color} fill="none" />
            <path d="M7 7C7 7 9 4 12 4C15 4 17 7 17 7" stroke={color} fill="none" />
          </>
        );
      case 'beacon':
        return (
          <>
            <path d="M10 22L11 8H13L14 22H10Z" fill={`${color}20`} stroke={color} />
            <rect x="10" y="4" width="4" height="4" fill={color} />
            <path d="M12 6L4 2M12 6L20 2" stroke={color} opacity="0.5" className="animate-pulse" />
          </>
        );
      case 'weaver':
        return (
          <g>
            <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="none" stroke={color} opacity="0.3" />
            <path d="M12 2V22M4 7L20 17M20 7L4 17" stroke={color} strokeWidth={1 + (tier * 0.2)} opacity="0.5" />
            {tier >= 2 && <circle cx="12" cy="12" r={2 + tier} stroke={color} fill="none" strokeDasharray="2 2" />}
            <circle cx="12" cy="12" r="2" fill={color} />
          </g>
        );
      case 'synergy':
        return (
          <>
            <circle cx={9 - (tier * 0.2)} cy="12" r={5 + (tier * 0.3)} stroke={color} fill={`${color}10`} />
            <circle cx={15 + (tier * 0.2)} cy="12" r={5 + (tier * 0.3)} stroke={color} fill={`${color}10`} />
            <path d="M12 7.5C13 8.5 13.5 10 13.5 12C13.5 14 13 15.5 12 16.5C11 15.5 10.5 14 10.5 12C10.5 10 11 8.5 12 7.5Z" fill={color} />
            {tier >= 3 && <circle cx="12" cy="12" r={tier} stroke={color} opacity="0.3" strokeDasharray="1 2" />}
          </>
        );
      case 'nexus':
        return (
          <>
            <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill={color} />
            <circle cx="12" cy="12" r="10" stroke={color} strokeDasharray="2 4" className="animate-spin-slow" style={{ transformOrigin: 'center' }} />
          </>
        );

      /* ── SECRET ── */
      case 'owl':
        return (
          <g>
            <path d="M12 22C17 22 21 18 21 13C21 8 17 4 12 4C7 4 3 8 3 13C3 18 7 22 12 22Z" fill={`${color}10`} stroke={color} />
            <circle cx="8" cy="12" r="3" stroke={color} fill="none" />
            <circle cx="16" cy="12" r="3" stroke={color} fill="none" />
            <circle cx="8" cy="12" r="1" fill={color} className="animate-pulse" />
            <circle cx="16" cy="12" r="1" fill={color} className="animate-pulse" />
          </g>
        );
      case 'bird':
        return (
          <>
            <circle cx="12" cy="12" r={7 + (tier * 0.2)} fill={`${color}10`} stroke={color} />
            <path d="M8 12C10 10 14 10 16 12L12 15L8 12Z" fill={color} />
            <path d="M4 10L6 8M18 10L20 8" stroke={color} strokeWidth={tier >= 2 ? 2 : 1} />
            {tier >= 3 && <path d="M10 6L12 4L14 6" stroke={color} fill="none" />}
          </>
        );
      case 'bolt':
        return (
          <path d="M13 2L3 14H11V22L21 10H13V2Z" fill={color} className="animate-pulse" />
        );
      case 'coffee':
        return (
          <>
            <path d="M18 8H6V18C6 20 8 22 11 22H13C16 22 18 20 18 18V8Z" fill={`${color}10`} stroke={color} />
            <path d="M18 10H20C21 10 22 11 22 12V14C22 15 21 16 20 16H18" stroke={color} />
            <path d="M9 2V5M12 2V5M15 2V5" stroke={color} strokeLinecap="round" className="animate-float" />
          </>
        );

      /* ── EVENTS ── */
      case 'pioneer':
        return (
          <>
            <path d="M12 22V2" stroke={color} strokeWidth="2" />
            <path d="M12 4L20 8L12 12" fill={color} />
            <circle cx="12" cy="2" r="1.5" fill={color} />
            <path d="M6 22H18" stroke={color} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case 'squad':
        return (
          <g>
            <path d="M12 12L7 17M12 12L17 17M12 12L12 5" stroke={color} strokeWidth={2 + (tier * 0.2)} />
            <circle cx="7" cy="17" r={2 + (tier * 0.5)} fill={`${color}20`} stroke={color} />
            <circle cx="17" cy="17" r={2 + (tier * 0.5)} fill={`${color}20`} stroke={color} />
            <circle cx="12" cy="5" r={2 + (tier * 0.5)} fill={`${color}20`} stroke={color} />
            {tier >= 2 && <circle cx="12" cy="12" r={2} fill={color} />}
          </g>
        );
      case 'circuit':
        if (subVariant === 'gate') {
          return (
            <g>
              <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} fill="none" />
              <path d="M4 8H20M4 16H20" stroke={color} opacity="0.4" />
              <circle cx="8" cy="8" r="1.5" fill={color} />
              <circle cx="16" cy="16" r="1.5" fill={color} />
            </g>
          );
        }
        if (subVariant === 'path') {
          return (
            <g>
              <path d="M2 12H10L12 8L14 16L16 12H22" stroke={color} strokeWidth="2" fill="none" />
              <circle cx="2" cy="12" r="1" fill={color} />
              <circle cx="22" cy="12" r="1" fill={color} />
            </g>
          );
        }
        return (
          <g>
            <rect x="6" y="6" width="12" height="12" rx="2" stroke={color} fill={`${color}10`} />
            <path d="M12 6V2M12 18V22M6 12H2M18 12H22" stroke={color} strokeLinecap="round" />
            {tier >= 1 && <circle cx="12" cy="2" r="1" fill={color} />}
            {tier >= 2 && <circle cx="12" cy="22" r="1" fill={color} />}
            {tier >= 3 && <circle cx="2" cy="12" r="1" fill={color} />}
            {tier >= 4 && <circle cx="22" cy="12" r="1" fill={color} />}
            <circle cx="12" cy="12" r="2" fill={color} className="animate-pulse" />
          </g>
        );
      case 'heart':
        return (
          <g className="animate-float">
            <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" 
              fill={`${color}${10 + tier * 5}`} stroke={color} strokeWidth={strokeWidth} />
            {tier >= 2 && <circle cx="12" cy="10" r={tier} fill="none" stroke={color} opacity="0.3" />}
          </g>
        );
      case 'trophy':
        return (
          <g>
            <path d="M6 4H18V10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10V4Z" fill={`${color}${10 + tier * 5}`} stroke={color} strokeWidth={strokeWidth} />
            <path d="M6 7H4C2.9 7 2 7.9 2 9V10C2 12.21 3.79 14 6 14V7ZM18 7H20C21.1 7 22 7.9 22 9V10C22 12.21 20.21 14 18 14V7Z" fill={`${color}20`} stroke={color} />
            <path d="M8 20H16M12 16V20" stroke={color} strokeWidth="2" strokeLinecap="round" />
            {tier >= 2 && <circle cx="12" cy="10" r="2" fill={color} className="animate-pulse" />}
            {tier >= 3 && <path d="M12 6V8" stroke={color} strokeWidth="2" />}
          </g>
        );

      case 'shield_ornate':
        return (
          <g>
            <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill={`${color}20`} stroke={color} strokeWidth={strokeWidth} />
            <path d="M12 4V20M4 12H20" stroke={color} opacity="0.4" strokeDasharray="2 2" />
            <path d="M7 8L12 3L17 8M17 16L12 21L7 16" stroke={color} fill="none" />
            <circle cx="12" cy="12" r="3" stroke={color} fill={`${color}40`} className="animate-pulse" />
          </g>
        );
      case 'energy_orb':
        return (
          <g>
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1" strokeDasharray="4 2" className="animate-spin-slow" />
            <circle cx="12" cy="12" r={4 + tier} fill={`${color}20`} stroke={color} strokeWidth={strokeWidth} />
            <path d="M12 8V16M8 12H16" stroke={color} strokeLinecap="round" opacity="0.6" />
            <circle cx="12" cy="12" r="1.5" fill={color} className="animate-ping" />
          </g>
        );
      case 'blade':
        return (
          <g transform="rotate(-45 12 12)">
            <path d="M12 2L14 8H10L12 2Z" fill={color} />
            <rect x="11" y="8" width="2" height="12" fill={color} opacity="0.8" />
            <rect x="8" y="16" width="8" height="2" rx="1" fill={color} />
            {tier >= 2 && <path d="M12 2L18 12L12 22L6 12L12 2Z" fill="none" stroke={color} opacity="0.3" />}
          </g>
        );
      case 'book':
        return (
          <g>
            <path d="M4 19.5C4 18.8366 4.53726 18.3 5.2 18.3H19.4V3.9H5.2C4.53726 3.9 4 4.43726 4 5.1V19.5Z" fill={`${color}10`} stroke={color} strokeWidth={strokeWidth} />
            <path d="M4 19.5C4 20.1634 4.53726 20.7 5.2 20.7H19.4V18.3H5.2C4.53726 18.3 4 18.8366 4 19.5Z" fill={`${color}20`} stroke={color} />
            <path d="M8 7H15M8 11H15M8 15H12" stroke={color} strokeLinecap="round" opacity="0.6" />
          </g>
        );

      default:
        return <circle cx="12" cy="12" r="10" stroke={color} strokeDasharray="4 4" />;
    }
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-all duration-500 ${rarity === 'legendary' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`}
      >
        {renderCore()}
        {renderDecorations()}
      </svg>
      
      {/* Advanced CSS Animations */}
      <style>{`
        @keyframes spin-linear { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes draw-loop { 0% { stroke-dasharray: 0 100; } 100% { stroke-dasharray: 100 0; } }
        @keyframes ping-slow { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
        
        .animate-spin-linear { animation: spin-linear 3s linear infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-draw-loop { animation: draw-loop 2s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}
