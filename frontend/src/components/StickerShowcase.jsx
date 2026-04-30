import { useState, useMemo } from 'react';
import { getStickerById, RARITY_CONFIG, STICKER_CATEGORIES } from '../utils/stickerRegistry.js';
import StickerVisual from './StickerVisual.jsx';

function StickerIcon({ sticker, size = 32 }) {
  return <StickerVisual id={sticker.id} visualId={sticker.visualId} subVariant={sticker.subVariant} color={sticker.color} size={size} rarity={sticker.rarity} tier={sticker.tier || 1} />;
}

/**
 * StickerShowcase — displays equipped stickers on a profile with custom hover tooltips.
 * The "See All" button fires onSeeAll so the parent can render the modal at the root level
 * (avoiding overflow-hidden traps in nested containers).
 * @param {{ equippedStickers: string[], unlockedStickers: string[], userName: string, onSeeAll: () => void }} props
 */
export default function StickerShowcase({ equippedStickers = [], unlockedStickers = [], userName = 'User', onSeeAll }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const stickers = useMemo(() => {
    if (!Array.isArray(equippedStickers)) return [];
    return equippedStickers.map(getStickerById).filter(Boolean);
  }, [equippedStickers]);

  const hasUnlocked = Array.isArray(unlockedStickers) && unlockedStickers.length > 0;

  // Don't render anything if there's nothing to show at all
  if (stickers.length === 0 && !hasUnlocked) return null;

  return (
    <>
      <style>{`
        .sticker-showcase-holo {
          background-image: linear-gradient(125deg, rgba(192,38,211,0.1) 0%, rgba(56,189,248,0.1) 30%, rgba(245,158,11,0.1) 60%, rgba(236,72,153,0.1) 100%);
          background-size: 300% 300%;
          animation: showcase-holo-shift 4s ease-in-out infinite;
        }
        @keyframes showcase-holo-shift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .sticker-showcase-item { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .sticker-showcase-item:hover { transform: translateY(-4px) scale(1.08); z-index: 40; }
        .sticker-tooltip-fade-in { animation: tooltip-fade-in 0.2s ease-out forwards; }
        @keyframes tooltip-fade-in {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      
      <div className="flex flex-wrap items-center gap-2.5 relative">
        {stickers.map((s) => {
          const rc = RARITY_CONFIG[s.rarity];
          const isHovered = activeTooltip === s.id;
          const category = STICKER_CATEGORIES?.find(c => c.id === s.category)?.name || 'Achievement';

          return (
            <div
              key={s.id}
              className="relative group"
              onMouseEnter={() => setActiveTooltip(s.id)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(isHovered ? null : s.id)}
            >
              <div
                className={`sticker-showcase-item flex items-center justify-center h-10 w-10 rounded-xl border ${rc.border} ${rc.bg} ${rc.glow} cursor-pointer ${s.rarity === 'legendary' ? 'sticker-showcase-holo' : ''} ${isHovered ? 'ring-2 ring-[var(--text)]/20' : ''}`}
              >
                <StickerIcon sticker={s} size={40} />
              </div>

              {/* Custom Tooltip */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 p-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-xl z-50 sticker-tooltip-fade-in pointer-events-none">
                  {/* Triangle pointer */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--panel)] border-l border-t border-[var(--border)] rotate-45" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${rc.badgeColor}`}>{rc.label}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-strong)]">{category}</span>
                    </div>
                    <p className={`text-sm font-black leading-tight ${rc.textColor}`}>{s.name}</p>
                    <p className="mt-1.5 text-xs text-[var(--text)] leading-relaxed opacity-90">{s.description}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* See All Button — calls parent handler instead of rendering modal here */}
        {hasUnlocked && (
          <button 
            onClick={onSeeAll}
            className="sticker-showcase-item flex items-center justify-center h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] hover:bg-[var(--panel)] transition-all hover:border-[var(--muted-strong)] group"
            title="View all stickers"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-strong)] group-hover:text-[var(--text)] mr-1.5">See All</span>
            <svg className="w-3.5 h-3.5 text-[var(--muted-strong)] group-hover:text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
