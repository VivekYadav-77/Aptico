import { useState, useMemo } from 'react';
import { STICKER_REGISTRY, STICKER_CATEGORIES, RARITY_CONFIG } from '../utils/stickerRegistry.js';
import { formatStickerRequirement, getRecruiterStickerSignal, getStickerMeaning } from '../utils/stickerCopy.js';
import StickerVisual from './StickerVisual.jsx';

/**
 * StickerInventoryModal - Displays all unlocked stickers for a user in a premium gallery view.
 */
export default function StickerInventoryModal({ isOpen, onClose, unlockedStickers = [], squadRewardHistory = [], userName = 'User' }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [hoveredSticker, setHoveredSticker] = useState(null);

  const filteredStickers = useMemo(() => {
    // Only show stickers that are in the unlockedStickers list
    const unlocked = STICKER_REGISTRY.filter(s => unlockedStickers.includes(s.id));
    
    if (activeCategory === 'all') return unlocked;
    return unlocked.filter(s => s.category === activeCategory);
  }, [unlockedStickers, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-3 backdrop-blur-xl animate-fade-in sm:p-4" onClick={onClose}>
      <div 
        className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b0e] shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-scale-in sm:rounded-[2rem] xl:rounded-[3rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent)] via-[#ec4899] to-[var(--accent-strong)]" />
        
        {/* Main Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          
          {/* LEFT: Gallery Section */}
          <div className="flex min-h-0 flex-[0.95] flex-col border-b border-white/5 bg-[#0d0f14] lg:flex-[1.15] lg:border-b-0 lg:border-r">
            {/* Header Area */}
            <div className="p-5 pb-4 sm:p-6 lg:p-8 xl:p-10 xl:pb-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-8 xl:mb-10">
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl xl:text-4xl">Sticker Vault</h2>
                  <p className="mt-1 max-w-full truncate text-[10px] font-black uppercase tracking-[0.24em] text-[var(--muted-strong)] opacity-60 sm:tracking-[0.32em]">
                    {userName}'s Digital Collection
                  </p>
                </div>
                <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2 shadow-inner">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                   <span className="text-xs font-black text-white/80">{unlockedStickers.length} Unlocked</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all sm:px-5 sm:py-2.5 ${
                    activeCategory === 'all' 
                    ? 'bg-white text-black border-white shadow-xl shadow-white/10' 
                    : 'bg-white/5 text-[var(--muted-strong)] border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  All
                </button>
                {STICKER_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all sm:px-5 sm:py-2.5 ${
                      activeCategory === cat.id 
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xl shadow-[var(--accent)]/20' 
                      : 'bg-white/5 text-[var(--muted-strong)] border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Container */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-1 custom-scrollbar sm:p-6 lg:p-8 lg:pt-2 xl:p-10 xl:pt-2">
              {filteredStickers.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 xl:gap-5">
                  {filteredStickers.map(sticker => {
                    const rc = RARITY_CONFIG[sticker.rarity];
                    const isActive = hoveredSticker?.id === sticker.id;

                    return (
                      <div 
                        key={sticker.id}
                        className={`
                          relative aspect-square rounded-2xl border transition-all duration-500 cursor-pointer group sm:rounded-[2rem] xl:rounded-[2.5rem]
                          ${isActive ? 'scale-95 border-white/30' : 'hover:scale-[1.03] border-white/5'}
                          ${rc.bg} ${rc.glow}
                        `}
                        onMouseEnter={() => setHoveredSticker(sticker)}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <StickerVisual 
                            id={sticker.id}
                            visualId={sticker.visualId}
                            subVariant={sticker.subVariant}
                            color={sticker.color}
                            size={72}
                            rarity={sticker.rarity}
                            tier={sticker.tier || 1}
                          />
                        </div>
                        {isActive && <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                   <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                   </div>
                  <p className="text-sm font-black text-white uppercase tracking-[0.3em]">No Assets Found</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Inspector Section */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0b0e]">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-white/40 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 sm:h-12 sm:w-12 lg:right-8 lg:top-8 lg:hover:rotate-90"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {hoveredSticker ? (
              <div className="flex-1 overflow-y-auto p-5 pt-12 text-center animate-fade-in custom-scrollbar sm:p-8 sm:pt-14 lg:p-10 xl:p-12" key={hoveredSticker.id}>
                {(() => {
                  const squadProofs = (squadRewardHistory || []).filter((item) => item.stickerId === hoveredSticker.id);
                  const latestProof = squadProofs[0] || null;
                  return (
                    <>
                {/* Large Preview */}
                <div className="relative mx-auto mb-6 w-fit group sm:mb-8 xl:mb-10">
                   <div className={`absolute inset-0 blur-[100px] opacity-30 transition-opacity duration-1000 ${RARITY_CONFIG[hoveredSticker.rarity].bg}`} />
                   <div className="relative transform group-hover:scale-110 transition-transform duration-1000 ease-out">
                      <StickerVisual 
                        id={hoveredSticker.id}
                        visualId={hoveredSticker.visualId}
                        subVariant={hoveredSticker.subVariant}
                        color={hoveredSticker.color}
                        size={128}
                        rarity={hoveredSticker.rarity}
                        tier={hoveredSticker.tier || 1}
                      />
                   </div>
                </div>

                {/* Badge & Category */}
                <div className="mb-5 flex flex-wrap items-center justify-center gap-3 sm:mb-6">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${RARITY_CONFIG[hoveredSticker.rarity].badgeColor}`}>
                      {RARITY_CONFIG[hoveredSticker.rarity].label}
                   </span>
                   <div className="w-1 h-1 rounded-full bg-white/20" />
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                      {STICKER_CATEGORIES.find(c => c.id === hoveredSticker.category)?.name}
                   </span>
                </div>

                <h3 className="mx-auto mb-3 max-w-sm text-3xl font-black tracking-tight text-white sm:text-4xl xl:text-5xl">
                  {hoveredSticker.name}
                </h3>
                
                <p className="mx-auto mb-6 max-w-sm text-sm font-medium leading-6 text-white/50 sm:text-base xl:text-lg xl:leading-relaxed">
                  {hoveredSticker.description}
                </p>

                <div className="mx-auto mb-6 w-full max-w-md space-y-3 text-left">
                  {[
                    ['Earned for', formatStickerRequirement(hoveredSticker, { isUnlocked: true, squadProof: latestProof })],
                    ['Represents', getStickerMeaning(hoveredSticker, latestProof)],
                    ['Recruiter signal', getRecruiterStickerSignal(hoveredSticker, latestProof)]
                  ].map(([label, copy]) => (
                    <div key={label} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-5">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.35em] mb-2">{label}</p>
                      <p className="text-sm font-semibold leading-6 text-white/65">{copy}</p>
                    </div>
                  ))}
                  {latestProof && squadProofs.length > 1 ? (
                    <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[0.06] p-5">
                      <p className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.35em] mb-2">Reward history</p>
                      <p className="text-sm font-semibold leading-6 text-white/65">{squadProofs.length} verified squad reward months for this sticker.</p>
                    </div>
                  ) : null}
                </div>

                {latestProof ? (
                  <div className="mx-auto mb-6 w-full max-w-md rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[0.06] p-5 text-left">
                    <p className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.35em] mb-2">Verified squad proof</p>
                    <p className="text-base font-black text-white">{latestProof.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/55">Rank #{latestProof.rank} monthly squad - {latestProof.periodLabel || latestProof.period} - {latestProof.squadName}</p>
                  </div>
                ) : null}

                {/* Requirement Met Card */}
                {hoveredSticker.requirement && (
                  <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/[0.05] bg-white/[0.02] p-5 text-left transition-colors hover:border-white/10 sm:p-6">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--accent)] to-transparent opacity-60" />
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Milestone Cleared</p>
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-2xl shadow-inner">
                          {hoveredSticker.requirement.type === 'xp' && '⭐'}
                          {hoveredSticker.requirement.type === 'streak' && '🔥'}
                          {hoveredSticker.requirement.type === 'skill' && '⚔️'}
                          {!['xp', 'streak', 'skill'].includes(hoveredSticker.requirement.type) && '🏆'}
                       </div>
                       <div>
                          <p className="text-base font-black text-white tracking-tight">
                            {hoveredSticker.requirement.type === 'xp' && `${hoveredSticker.requirement.value.toLocaleString()} XP`}
                            {hoveredSticker.requirement.type === 'streak' && `${hoveredSticker.requirement.value} Day Streak`}
                            {hoveredSticker.requirement.type === 'skill' && `${hoveredSticker.requirement.value} Mastery`}
                            {!['xp', 'streak', 'skill'].includes(hoveredSticker.requirement.type) && 'Target Reached'}
                          </p>
                          <p className="text-[10px] font-bold text-white/20 uppercase mt-1 tracking-wider">Aptico Verified</p>
                       </div>
                    </div>
                  </div>
                )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-10">
                <div className="w-32 h-32 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center mb-8">
                   <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                   </svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Selection Required</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { 
          from { opacity: 0; transform: scale(0.97) translateY(20px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-subtle { animation: pulse-subtle 3s ease-in-out infinite; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(255, 255, 255, 0.05); 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
}
